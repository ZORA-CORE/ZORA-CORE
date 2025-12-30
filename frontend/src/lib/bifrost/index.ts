/**
 * Bifrost - The Rainbow Bridge to GitHub
 * Sovereign Datalayer for ZORA CORE: Aesir Genesis
 * 
 * This module provides atomic, GPG-signed commits via GitHub GraphQL API
 * with high-speed Vercel KV caching for sub-millisecond data retrieval.
 */

export * from './types';
export * from './github-client';
export * from './atomic-batch';
export * from './cache';

import { BifrostGitHubClient, createBifrostClient } from './github-client';
import { AtomicBatchManager, createAtomicBatchManager } from './atomic-batch';
import { ContentCache, createContentCache, type CacheConfig } from './cache';
import type { BifrostConfig, CommitResult, FileContent, TreeEntry } from './types';

export interface BifrostInstance {
  client: BifrostGitHubClient;
  batchManager: AtomicBatchManager;
  cache: ContentCache;
  
  getFile(path: string, branch?: string): Promise<FileContent | null>;
  getTree(path: string, branch?: string): Promise<TreeEntry[]>;
  commitFile(path: string, content: string, message: string, branch?: string): Promise<CommitResult>;
  commitFiles(files: Array<{ path: string; content: string }>, message: string, branch?: string): Promise<CommitResult>;
}

export interface CreateBifrostOptions {
  github: BifrostConfig;
  cache?: CacheConfig;
}

export function createBifrost(options: CreateBifrostOptions): BifrostInstance {
  const client = createBifrostClient(options.github);
  const batchManager = createAtomicBatchManager(client);
  const cache = createContentCache(options.cache);

  return {
    client,
    batchManager,
    cache,

    async getFile(path: string, branch?: string): Promise<FileContent | null> {
      const cacheKey = `${branch || 'main'}:${path}`;
      const cached = await cache.getFile(path, branch);
      if (cached) {
        return {
          path,
          content: cached,
          oid: '',
          size: cached.length,
          encoding: 'utf-8',
        };
      }

      const file = await client.getFileContent(path, branch);
      if (file) {
        await cache.setFile(path, file.content, branch);
      }
      return file;
    },

    async getTree(path: string, branch?: string): Promise<TreeEntry[]> {
      const cached = await cache.getTree(path, branch);
      if (cached) {
        return cached as TreeEntry[];
      }

      const tree = await client.getTree(path, branch);
      await cache.setTree(path, tree, branch);
      return tree;
    },

    async commitFile(path: string, content: string, message: string, branch?: string): Promise<CommitResult> {
      const targetBranch = branch || options.github.defaultBranch || 'main';
      const headOid = await client.getBranchHead(targetBranch);

      const result = await client.createAtomicCommit({
        branch: targetBranch,
        message: { headline: message },
        fileChanges: {
          additions: [{ path, contents: content }],
        },
        expectedHeadOid: headOid,
      });

      if (result.success) {
        await cache.setFile(path, content, targetBranch);
      }

      return result;
    },

    async commitFiles(
      files: Array<{ path: string; content: string }>,
      message: string,
      branch?: string
    ): Promise<CommitResult> {
      const targetBranch = branch || options.github.defaultBranch || 'main';
      const batch = batchManager.createBatch(targetBranch, message);

      for (const file of files) {
        batchManager.addFile(batch.id, file.path, file.content);
      }

      const result = await batchManager.commitBatch(batch.id);

      if (result.success) {
        for (const file of files) {
          await cache.setFile(file.path, file.content, targetBranch);
        }
      }

      return result;
    },
  };
}

export const BIFROST_VERSION = '1.0.0';
export const BIFROST_CODENAME = 'Aesir Genesis';
