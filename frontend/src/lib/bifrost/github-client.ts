/**
 * Bifrost GitHub GraphQL Client
 * Implements atomic, GPG-signed commits via createCommitOnBranch mutation
 * The Rainbow Bridge to GitHub - Sovereign Datalayer for ZORA CORE: Aesir Genesis
 */

import type {
  BifrostConfig,
  CommitInput,
  CommitResult,
  RepositoryInfo,
  BranchInfo,
  FileContent,
  TreeEntry,
  VerificationResult,
  BifrostEvent,
  BifrostEventHandler,
  BifrostEventType,
} from './types';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

const CREATE_COMMIT_MUTATION = `
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
        verification {
          verified
          reason
          signature
        }
      }
    }
  }
`;

const GET_REPOSITORY_QUERY = `
  query GetRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        name
        target {
          oid
        }
      }
      refs(refPrefix: "refs/heads/", first: 100) {
        nodes {
          name
          target {
            oid
          }
          branchProtectionRule {
            id
          }
        }
      }
    }
  }
`;

const GET_BRANCH_HEAD_QUERY = `
  query GetBranchHead($owner: String!, $name: String!, $branch: String!) {
    repository(owner: $owner, name: $name) {
      ref(qualifiedName: $branch) {
        target {
          oid
        }
      }
    }
  }
`;

const GET_FILE_CONTENT_QUERY = `
  query GetFileContent($owner: String!, $name: String!, $expression: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $expression) {
        ... on Blob {
          text
          oid
          byteSize
          isBinary
        }
      }
    }
  }
`;

const GET_TREE_QUERY = `
  query GetTree($owner: String!, $name: String!, $expression: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $expression) {
        ... on Tree {
          entries {
            name
            path
            type
            oid
            object {
              ... on Blob {
                byteSize
              }
            }
          }
        }
      }
    }
  }
`;

export class BifrostGitHubClient {
  private config: BifrostConfig;
  private eventHandlers: Map<BifrostEventType, Set<BifrostEventHandler>> = new Map();

  constructor(config: BifrostConfig) {
    this.config = config;
  }

  private emit(type: BifrostEventType, data: Record<string, unknown>): void {
    const event: BifrostEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  on(type: BifrostEventType, handler: BifrostEventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);
    return () => this.eventHandlers.get(type)?.delete(handler);
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data as T;
  }

  async getRepositoryInfo(): Promise<RepositoryInfo> {
    const data = await this.graphql<{
      repository: {
        defaultBranchRef: { name: string; target: { oid: string } };
        refs: {
          nodes: Array<{
            name: string;
            target: { oid: string };
            branchProtectionRule: { id: string } | null;
          }>;
        };
      };
    }>(GET_REPOSITORY_QUERY, {
      owner: this.config.owner,
      name: this.config.repo,
    });

    const branches: BranchInfo[] = data.repository.refs.nodes.map(node => ({
      name: node.name,
      oid: node.target.oid,
      protected: node.branchProtectionRule !== null,
    }));

    return {
      owner: this.config.owner,
      name: this.config.repo,
      defaultBranch: data.repository.defaultBranchRef.name,
      branches,
    };
  }

  async getBranchHead(branch: string): Promise<string> {
    const qualifiedName = branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
    
    const data = await this.graphql<{
      repository: {
        ref: { target: { oid: string } } | null;
      };
    }>(GET_BRANCH_HEAD_QUERY, {
      owner: this.config.owner,
      name: this.config.repo,
      branch: qualifiedName,
    });

    if (!data.repository.ref) {
      throw new Error(`Branch not found: ${branch}`);
    }

    return data.repository.ref.target.oid;
  }

  async getFileContent(path: string, branch?: string): Promise<FileContent | null> {
    const ref = branch || this.config.defaultBranch || 'main';
    const expression = `${ref}:${path}`;

    const data = await this.graphql<{
      repository: {
        object: {
          text: string | null;
          oid: string;
          byteSize: number;
          isBinary: boolean;
        } | null;
      };
    }>(GET_FILE_CONTENT_QUERY, {
      owner: this.config.owner,
      name: this.config.repo,
      expression,
    });

    if (!data.repository.object) {
      return null;
    }

    const obj = data.repository.object;
    return {
      path,
      content: obj.text || '',
      oid: obj.oid,
      size: obj.byteSize,
      encoding: obj.isBinary ? 'base64' : 'utf-8',
    };
  }

  async getTree(path: string, branch?: string): Promise<TreeEntry[]> {
    const ref = branch || this.config.defaultBranch || 'main';
    const expression = path ? `${ref}:${path}` : ref;

    const data = await this.graphql<{
      repository: {
        object: {
          entries: Array<{
            name: string;
            path: string;
            type: string;
            oid: string;
            object: { byteSize?: number } | null;
          }>;
        } | null;
      };
    }>(GET_TREE_QUERY, {
      owner: this.config.owner,
      name: this.config.repo,
      expression,
    });

    if (!data.repository.object) {
      return [];
    }

    return data.repository.object.entries.map(entry => ({
      name: entry.name,
      path: entry.path,
      type: entry.type as 'blob' | 'tree',
      oid: entry.oid,
      size: entry.object?.byteSize,
    }));
  }

  async createAtomicCommit(input: CommitInput): Promise<CommitResult> {
    this.emit('commit:start', { branch: input.branch, message: input.message.headline });

    try {
      const fileChanges: {
        additions?: Array<{ path: string; contents: string }>;
        deletions?: Array<{ path: string }>;
      } = {};

      if (input.fileChanges.additions && input.fileChanges.additions.length > 0) {
        fileChanges.additions = input.fileChanges.additions.map(file => ({
          path: file.path,
          contents: file.encoding === 'base64' 
            ? file.contents 
            : Buffer.from(file.contents).toString('base64'),
        }));
      }

      if (input.fileChanges.deletions && input.fileChanges.deletions.length > 0) {
        fileChanges.deletions = input.fileChanges.deletions.map(file => ({
          path: file.path,
        }));
      }

      const mutationInput = {
        input: {
          branch: {
            repositoryNameWithOwner: `${this.config.owner}/${this.config.repo}`,
            branchName: input.branch,
          },
          message: input.message,
          fileChanges,
          expectedHeadOid: input.expectedHeadOid,
        },
      };

      const data = await this.graphql<{
        createCommitOnBranch: {
          commit: {
            oid: string;
            url: string;
            signature: { isValid: boolean; signer: { login: string } | null } | null;
            verification: { verified: boolean; reason: string; signature: string | null } | null;
          };
        };
      }>(CREATE_COMMIT_MUTATION, mutationInput);

      const commit = data.createCommitOnBranch.commit;
      
      this.emit('commit:success', {
        commitOid: commit.oid,
        commitUrl: commit.url,
        verified: commit.verification?.verified || false,
      });

      return {
        success: true,
        commitOid: commit.oid,
        commitUrl: commit.url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit('commit:failure', { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifyCommit(commitOid: string): Promise<VerificationResult> {
    this.emit('verification:start', { commitOid });

    const query = `
      query VerifyCommit($owner: String!, $name: String!, $oid: GitObjectID!) {
        repository(owner: $owner, name: $name) {
          object(oid: $oid) {
            ... on Commit {
              signature {
                isValid
                signer {
                  login
                }
                email
              }
              verification {
                verified
                reason
                signature
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.graphql<{
        repository: {
          object: {
            signature: {
              isValid: boolean;
              signer: { login: string } | null;
              email: string | null;
            } | null;
            verification: {
              verified: boolean;
              reason: string;
              signature: string | null;
            } | null;
          } | null;
        };
      }>(query, {
        owner: this.config.owner,
        name: this.config.repo,
        oid: commitOid,
      });

      const commit = data.repository.object;
      if (!commit) {
        return {
          valid: false,
          architecturalIntegrity: false,
          errors: ['Commit not found'],
        };
      }

      const result: VerificationResult = {
        valid: commit.verification?.verified || false,
        signature: commit.signature ? {
          verified: commit.signature.isValid,
          signer: commit.signature.signer?.login,
        } : undefined,
        architecturalIntegrity: true,
        errors: [],
      };

      if (!result.valid && commit.verification?.reason) {
        result.errors.push(`Verification failed: ${commit.verification.reason}`);
      }

      this.emit('verification:complete', { commitOid, result });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        architecturalIntegrity: false,
        errors: [errorMessage],
      };
    }
  }
}

export function createBifrostClient(config: BifrostConfig): BifrostGitHubClient {
  return new BifrostGitHubClient(config);
}
