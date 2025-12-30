/**
 * Bifrost Atomic Batch Manager
 * Ensures all file changes are committed atomically - no partial commits
 * The Rainbow Bridge to GitHub - Sovereign Datalayer for ZORA CORE: Aesir Genesis
 */

import type {
  AtomicBatch,
  AtomicOperation,
  CommitResult,
  GitHubFileChange,
  GitHubFileDeletion,
} from './types';
import { BifrostGitHubClient } from './github-client';

function generateId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export class AtomicBatchManager {
  private client: BifrostGitHubClient;
  private pendingBatches: Map<string, AtomicBatch> = new Map();
  private completedBatches: AtomicBatch[] = [];

  constructor(client: BifrostGitHubClient) {
    this.client = client;
  }

  createBatch(branch: string, message: string): AtomicBatch {
    const batch: AtomicBatch = {
      id: generateId(),
      operations: [],
      message,
      branch,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.pendingBatches.set(batch.id, batch);
    return batch;
  }

  addOperation(
    batchId: string,
    type: 'create' | 'update' | 'delete',
    path: string,
    content?: string
  ): AtomicOperation {
    const batch = this.pendingBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    if (batch.status !== 'pending') {
      throw new Error(`Cannot add operations to batch with status: ${batch.status}`);
    }

    const operation: AtomicOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      path,
      content,
      timestamp: Date.now(),
      status: 'pending',
    };

    batch.operations.push(operation);
    return operation;
  }

  addFile(batchId: string, path: string, content: string): AtomicOperation {
    return this.addOperation(batchId, 'create', path, content);
  }

  updateFile(batchId: string, path: string, content: string): AtomicOperation {
    return this.addOperation(batchId, 'update', path, content);
  }

  deleteFile(batchId: string, path: string): AtomicOperation {
    return this.addOperation(batchId, 'delete', path);
  }

  async commitBatch(batchId: string): Promise<CommitResult> {
    const batch = this.pendingBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    if (batch.status !== 'pending') {
      throw new Error(`Cannot commit batch with status: ${batch.status}`);
    }

    if (batch.operations.length === 0) {
      throw new Error('Cannot commit empty batch');
    }

    try {
      const headOid = await this.client.getBranchHead(batch.branch);

      const additions: GitHubFileChange[] = [];
      const deletions: GitHubFileDeletion[] = [];

      for (const op of batch.operations) {
        if (op.type === 'create' || op.type === 'update') {
          if (!op.content) {
            throw new Error(`Operation ${op.id} requires content for ${op.type}`);
          }
          additions.push({
            path: op.path,
            contents: op.content,
          });
        } else if (op.type === 'delete') {
          deletions.push({ path: op.path });
        }
      }

      const result = await this.client.createAtomicCommit({
        branch: batch.branch,
        message: {
          headline: batch.message,
          body: `Atomic batch commit with ${batch.operations.length} operations\n\nOperations:\n${batch.operations.map(op => `- ${op.type}: ${op.path}`).join('\n')}`,
        },
        fileChanges: {
          additions: additions.length > 0 ? additions : undefined,
          deletions: deletions.length > 0 ? deletions : undefined,
        },
        expectedHeadOid: headOid,
      });

      if (result.success) {
        batch.status = 'committed';
        batch.commitOid = result.commitOid;
        batch.completedAt = Date.now();
        batch.operations.forEach(op => (op.status = 'committed'));
      } else {
        batch.status = 'failed';
        batch.operations.forEach(op => {
          op.status = 'failed';
          op.error = result.error;
        });
      }

      this.pendingBatches.delete(batchId);
      this.completedBatches.push(batch);

      return result;
    } catch (error) {
      batch.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      batch.operations.forEach(op => {
        op.status = 'failed';
        op.error = errorMessage;
      });

      this.pendingBatches.delete(batchId);
      this.completedBatches.push(batch);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async rollbackBatch(batchId: string): Promise<void> {
    const batch = this.pendingBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    batch.status = 'rolled_back';
    batch.completedAt = Date.now();
    this.pendingBatches.delete(batchId);
    this.completedBatches.push(batch);
  }

  getBatch(batchId: string): AtomicBatch | undefined {
    return this.pendingBatches.get(batchId) || 
           this.completedBatches.find(b => b.id === batchId);
  }

  getPendingBatches(): AtomicBatch[] {
    return Array.from(this.pendingBatches.values());
  }

  getCompletedBatches(): AtomicBatch[] {
    return [...this.completedBatches];
  }

  validateBatch(batchId: string): { valid: boolean; errors: string[] } {
    const batch = this.pendingBatches.get(batchId);
    if (!batch) {
      return { valid: false, errors: ['Batch not found'] };
    }

    const errors: string[] = [];

    if (batch.operations.length === 0) {
      errors.push('Batch has no operations');
    }

    const paths = new Set<string>();
    for (const op of batch.operations) {
      if (paths.has(op.path)) {
        errors.push(`Duplicate path in batch: ${op.path}`);
      }
      paths.add(op.path);

      if ((op.type === 'create' || op.type === 'update') && !op.content) {
        errors.push(`Operation ${op.type} on ${op.path} requires content`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export function createAtomicBatchManager(client: BifrostGitHubClient): AtomicBatchManager {
  return new AtomicBatchManager(client);
}
