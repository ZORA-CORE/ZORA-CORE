/**
 * Bifrost Types - The Rainbow Bridge to GitHub
 * Sovereign Datalayer for ZORA CORE: Aesir Genesis
 */

export interface GitHubFileChange {
  path: string;
  contents: string;
  encoding?: 'utf-8' | 'base64';
}

export interface GitHubFileDeletion {
  path: string;
}

export interface CommitInput {
  branch: string;
  message: {
    headline: string;
    body?: string;
  };
  fileChanges: {
    additions?: GitHubFileChange[];
    deletions?: GitHubFileDeletion[];
  };
  expectedHeadOid: string;
}

export interface CommitResult {
  success: boolean;
  commitOid?: string;
  commitUrl?: string;
  error?: string;
}

export interface BranchInfo {
  name: string;
  oid: string;
  protected: boolean;
}

export interface RepositoryInfo {
  owner: string;
  name: string;
  defaultBranch: string;
  branches: BranchInfo[];
}

export interface FileContent {
  path: string;
  content: string;
  oid: string;
  size: number;
  encoding: string;
}

export interface TreeEntry {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  oid: string;
  size?: number;
}

export interface BifrostConfig {
  owner: string;
  repo: string;
  token: string;
  defaultBranch?: string;
}

export interface AtomicOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  timestamp: number;
  status: 'pending' | 'committed' | 'failed';
  error?: string;
}

export interface AtomicBatch {
  id: string;
  operations: AtomicOperation[];
  message: string;
  branch: string;
  status: 'pending' | 'committed' | 'failed' | 'rolled_back';
  commitOid?: string;
  createdAt: number;
  completedAt?: number;
}

export interface VerificationResult {
  valid: boolean;
  signature?: {
    verified: boolean;
    signer?: string;
    keyId?: string;
  };
  architecturalIntegrity: boolean;
  errors: string[];
}

export type BifrostEventType = 
  | 'commit:start'
  | 'commit:success'
  | 'commit:failure'
  | 'batch:start'
  | 'batch:complete'
  | 'verification:start'
  | 'verification:complete';

export interface BifrostEvent {
  type: BifrostEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export type BifrostEventHandler = (event: BifrostEvent) => void;
