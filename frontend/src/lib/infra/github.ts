/**
 * THOR GitHub Engine - Atomic Commit Operations
 * Extends Bifrost with Server Action support and integrity checks
 * ZORA CORE: Aesir Genesis - Sovereign Infra Level
 */

import type { AtomicCommitRequest, AtomicCommitResult } from './types';

export interface GitHubConfig {
  token?: string;
  owner: string;
  repo: string;
  apiBaseUrl?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; type?: string }>;
}

interface CreateCommitResponse {
  createCommitOnBranch: {
    commit: {
      oid: string;
      url: string;
      signature?: {
        isValid: boolean;
        signer?: {
          login: string;
        };
      };
    };
  } | null;
}

interface GetBranchResponse {
  repository: {
    ref: {
      target: {
        oid: string;
      };
    } | null;
  };
}

export class ThorGitHubEngine {
  private config: GitHubConfig;
  private reasoningTrace: string[] = [];

  constructor(config: GitHubConfig) {
    this.config = {
      apiBaseUrl: 'https://api.github.com/graphql',
      ...config,
    };
  }

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] ${message}`);
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<GraphQLResponse<T>> {
    if (!this.config.token) {
      this.addTrace('Warning: No GitHub token configured - using simulation mode');
      return { errors: [{ message: 'No token configured' }] };
    }

    try {
      const response = await fetch(this.config.apiBaseUrl!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        this.addTrace(`GitHub API error: ${response.status} ${response.statusText}`);
        return { errors: [{ message: `HTTP ${response.status}` }] };
      }

      return response.json();
    } catch (error) {
      this.addTrace(`GitHub API request failed: ${error}`);
      return { errors: [{ message: String(error) }] };
    }
  }

  async getBranchHead(branch: string): Promise<string | null> {
    this.addTrace(`Getting HEAD OID for branch: ${branch}`);

    const query = `
      query GetBranchHead($owner: String!, $repo: String!, $branch: String!) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $branch) {
            target {
              oid
            }
          }
        }
      }
    `;

    const response = await this.graphql<GetBranchResponse>(query, {
      owner: this.config.owner,
      repo: this.config.repo,
      branch: `refs/heads/${branch}`,
    });

    if (response.errors || !response.data?.repository.ref) {
      this.addTrace(`Failed to get branch HEAD: ${response.errors?.[0]?.message || 'Branch not found'}`);
      return null;
    }

    const oid = response.data.repository.ref.target.oid;
    this.addTrace(`Branch HEAD OID: ${oid}`);
    return oid;
  }

  async verifyExpectedHead(branch: string, expectedOid: string): Promise<boolean> {
    this.addTrace(`Verifying expected HEAD OID: ${expectedOid}`);
    
    const currentOid = await this.getBranchHead(branch);
    
    if (!currentOid) {
      this.addTrace('Could not verify HEAD - branch not found');
      return false;
    }
    
    const matches = currentOid === expectedOid;
    
    if (!matches) {
      this.addTrace(`HEAD OID mismatch! Expected: ${expectedOid}, Current: ${currentOid}`);
      this.addTrace('Race condition detected - another commit was pushed');
    } else {
      this.addTrace('HEAD OID verified - safe to proceed');
    }
    
    return matches;
  }

  async createAtomicCommit(request: AtomicCommitRequest): Promise<AtomicCommitResult> {
    this.addTrace('=== THOR Atomic Commit Operation ===');
    this.addTrace(`Branch: ${request.branch}`);
    this.addTrace(`Message: ${request.message.headline}`);
    this.addTrace(`Files: ${request.files.length}`);
    this.addTrace(`Expected HEAD: ${request.expected_head_oid}`);

    const isHeadValid = await this.verifyExpectedHead(request.branch, request.expected_head_oid);
    
    if (!isHeadValid) {
      return {
        success: false,
        error: 'Expected HEAD OID does not match current branch HEAD - race condition prevented',
        reasoning_trace: this.getReasoningTrace(),
      };
    }

    const additions = request.files
      .filter(f => f.operation === 'add' || f.operation === 'update')
      .map(f => ({
        path: f.path,
        contents: Buffer.from(f.content).toString('base64'),
      }));

    const deletions = request.files
      .filter(f => f.operation === 'delete')
      .map(f => ({ path: f.path }));

    const mutation = `
      mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            oid
            url
            signature {
              isValid
              signer {
                login
              }
            }
          }
        }
      }
    `;

    const input = {
      branch: {
        repositoryNameWithOwner: `${this.config.owner}/${this.config.repo}`,
        branchName: request.branch,
      },
      message: request.message,
      expectedHeadOid: request.expected_head_oid,
      fileChanges: {
        additions: additions.length > 0 ? additions : undefined,
        deletions: deletions.length > 0 ? deletions : undefined,
      },
    };

    this.addTrace('Executing createCommitOnBranch mutation...');

    const response = await this.graphql<CreateCommitResponse>(mutation, { input });

    if (response.errors || !response.data?.createCommitOnBranch?.commit) {
      const errorMsg = response.errors?.[0]?.message || 'Unknown error';
      this.addTrace(`Commit failed: ${errorMsg}`);
      
      if (!this.config.token) {
        this.addTrace('Simulating successful commit (no token configured)');
        const simulatedOid = `sim_${Date.now().toString(16)}`;
        return {
          success: true,
          commit_oid: simulatedOid,
          commit_url: `https://github.com/${this.config.owner}/${this.config.repo}/commit/${simulatedOid}`,
          verified: false,
          reasoning_trace: this.getReasoningTrace(),
        };
      }
      
      return {
        success: false,
        error: errorMsg,
        reasoning_trace: this.getReasoningTrace(),
      };
    }

    const commit = response.data.createCommitOnBranch.commit;
    this.addTrace(`Commit created: ${commit.oid}`);
    this.addTrace(`Commit URL: ${commit.url}`);
    
    if (commit.signature) {
      this.addTrace(`Signature valid: ${commit.signature.isValid}`);
      if (commit.signature.signer) {
        this.addTrace(`Signed by: ${commit.signature.signer.login}`);
      }
    }

    return {
      success: true,
      commit_oid: commit.oid,
      commit_url: commit.url,
      verified: commit.signature?.isValid || false,
      reasoning_trace: this.getReasoningTrace(),
    };
  }

  async createBranch(branchName: string, fromBranch: string = 'main'): Promise<boolean> {
    this.addTrace(`Creating branch: ${branchName} from ${fromBranch}`);

    const sourceOid = await this.getBranchHead(fromBranch);
    if (!sourceOid) {
      this.addTrace(`Source branch ${fromBranch} not found`);
      return false;
    }

    const mutation = `
      mutation CreateRef($input: CreateRefInput!) {
        createRef(input: $input) {
          ref {
            name
          }
        }
      }
    `;

    const response = await this.graphql<{ createRef: { ref: { name: string } } }>(mutation, {
      input: {
        repositoryId: await this.getRepositoryId(),
        name: `refs/heads/${branchName}`,
        oid: sourceOid,
      },
    });

    if (response.errors) {
      this.addTrace(`Failed to create branch: ${response.errors[0]?.message}`);
      return false;
    }

    this.addTrace(`Branch created: ${branchName}`);
    return true;
  }

  async deleteBranch(branchName: string): Promise<boolean> {
    this.addTrace(`Deleting branch: ${branchName}`);

    const refId = await this.getRefId(branchName);
    if (!refId) {
      this.addTrace(`Branch ${branchName} not found`);
      return false;
    }

    const mutation = `
      mutation DeleteRef($input: DeleteRefInput!) {
        deleteRef(input: $input) {
          clientMutationId
        }
      }
    `;

    const response = await this.graphql<{ deleteRef: { clientMutationId: string } }>(mutation, {
      input: { refId },
    });

    if (response.errors) {
      this.addTrace(`Failed to delete branch: ${response.errors[0]?.message}`);
      return false;
    }

    this.addTrace(`Branch deleted: ${branchName}`);
    return true;
  }

  private async getRepositoryId(): Promise<string | null> {
    const query = `
      query GetRepoId($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          id
        }
      }
    `;

    const response = await this.graphql<{ repository: { id: string } }>(query, {
      owner: this.config.owner,
      repo: this.config.repo,
    });

    return response.data?.repository?.id || null;
  }

  private async getRefId(branchName: string): Promise<string | null> {
    const query = `
      query GetRefId($owner: String!, $repo: String!, $ref: String!) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $ref) {
            id
          }
        }
      }
    `;

    const response = await this.graphql<{ repository: { ref: { id: string } | null } }>(query, {
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `refs/heads/${branchName}`,
    });

    return response.data?.repository?.ref?.id || null;
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createThorGitHubEngine(config: GitHubConfig): ThorGitHubEngine {
  return new ThorGitHubEngine(config);
}

export const THOR_GITHUB_VERSION = '1.0.0';
