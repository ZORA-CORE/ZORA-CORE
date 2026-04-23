/**
 * Valhalla AI — Valkyrie 2.0: GitHub atomic shipper.
 *
 * Given a fresh set of Valkyrie file entries and a fine-grained PAT,
 * creates a new repo under the target owner (org or user) and lands
 * every file in a single atomic commit via the Git Data API.
 *
 * Why atomic-via-Git-Data rather than per-file Contents API:
 *   - Contents API needs one request per file and ships a separate
 *     commit for each → polluted history, higher latency, higher
 *     rate-limit exposure.
 *   - Git Data API does blobs → tree → commit → update-ref in exactly
 *     four round-trips regardless of file count.
 *
 * Security:
 *   - Repo name is sanitized; we refuse any caller-supplied slug that
 *     doesn't match `/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/`.
 *   - The PAT is only read from the `pat` argument (caller is
 *     responsible for pulling it from `process.env.GITHUB_VALHALLA_PAT`
 *     on the server; we never read it ourselves so this module stays
 *     unit-testable).
 *   - Errors from GitHub are wrapped as `ShipError` with the HTTP
 *     status so the route handler can decide what to surface.
 */

import type { ValkyrieFile } from './files';

export class ShipError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly githubBody?: string,
  ) {
    super(message);
    this.name = 'ShipError';
  }
}

const GH = 'https://api.github.com';

export interface ShipOptions {
  pat: string;
  /** GitHub user or org that will own the new repo. */
  owner: string;
  /** Whether `owner` is an organization (affects the create-repo path). */
  ownerIsOrg: boolean;
  /** New repo slug. Sanitized against `/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/`. */
  repo: string;
  /** Optional description for the new repo. */
  description?: string;
  /** If true, the repo is created private. */
  private?: boolean;
  /** Branch the atomic commit lands on. Defaults to `main`. */
  branch?: string;
  /** Commit message for the atomic landing. */
  commitMessage?: string;
  files: ValkyrieFile[];
  /** Optional AbortSignal to cancel in-flight requests. */
  signal?: AbortSignal;
}

export interface ShipResult {
  repoFullName: string;
  repoUrl: string;
  branch: string;
  commitSha: string;
  commitUrl: string;
  fileCount: number;
}

const VALID_REPO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function ghHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'valhalla-valkyrie/2.0',
  };
}

async function ghJson<T>(
  method: string,
  url: string,
  pat: string,
  body: unknown,
  signal: AbortSignal | undefined,
  contextLabel: string,
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { ...ghHeaders(pat), 'Content-Type': 'application/json' },
    signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ShipError(
      `GitHub ${contextLabel} failed with ${res.status}`,
      res.status,
      text.slice(0, 600),
    );
  }
  return res.json() as Promise<T>;
}

function toUtf8Base64(s: string): string {
  // Node 18+ (Next.js server runtime) exposes Buffer. Avoid btoa which
  // mishandles non-Latin-1 characters.
  return Buffer.from(s, 'utf-8').toString('base64');
}

/**
 * Ship a Valkyrie bundle to GitHub. Returns the new repo + commit URL
 * on success; throws `ShipError` on any failure.
 */
export async function shipValkyrieToGitHub(
  opts: ShipOptions,
): Promise<ShipResult> {
  const {
    pat, owner, ownerIsOrg, files,
    description,
    branch = 'main',
    commitMessage = 'feat: Valkyrie 2.0 bootstrap from Valhalla AI',
    signal,
  } = opts;

  if (!pat) throw new ShipError('Missing GitHub PAT.');
  if (!owner || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner)) {
    throw new ShipError(`Invalid GitHub owner "${owner}".`);
  }
  const repo = opts.repo.trim();
  if (!VALID_REPO.test(repo)) {
    throw new ShipError(
      `Invalid repo name "${repo}". Must match /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.`,
    );
  }
  if (files.length === 0) throw new ShipError('Refusing to ship empty bundle.');

  // ---- 1. Create the repo (with auto_init so we get a starting commit). ----
  const createUrl = ownerIsOrg
    ? `${GH}/orgs/${owner}/repos`
    : `${GH}/user/repos`;
  const created = await ghJson<{ full_name: string; html_url: string; default_branch: string }>(
    'POST',
    createUrl,
    pat,
    {
      name: repo,
      description: description ?? 'Forged by Valhalla AI (Valkyrie 2.0)',
      private: opts.private ?? false,
      auto_init: true,
    },
    signal,
    'create-repo',
  );
  const repoFullName = created.full_name;
  const defaultBranch = created.default_branch || 'main';
  const targetBranch = branch || defaultBranch;

  // ---- 2. Get the SHA of the initial commit on the default branch. ----
  // Small retry loop: immediately-after-create the ref sometimes 404s
  // for a beat while GitHub finishes propagating the initial commit.
  let baseCommitSha = '';
  for (let attempt = 0; attempt < 5 && !baseCommitSha; attempt++) {
    try {
      const ref = await ghJson<{ object: { sha: string } }>(
        'GET',
        `${GH}/repos/${repoFullName}/git/ref/heads/${defaultBranch}`,
        pat,
        undefined,
        signal,
        'get-default-ref',
      );
      baseCommitSha = ref.object.sha;
    } catch (err) {
      if (err instanceof ShipError && err.status === 404 && attempt < 4) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  if (!baseCommitSha) {
    throw new ShipError(
      'Repo was created but the initial commit never propagated.',
    );
  }
  const baseCommit = await ghJson<{ tree: { sha: string } }>(
    'GET',
    `${GH}/repos/${repoFullName}/git/commits/${baseCommitSha}`,
    pat,
    undefined,
    signal,
    'get-base-commit',
  );
  const baseTreeSha = baseCommit.tree.sha;

  // ---- 3. Create a blob per file (parallel). ----
  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await ghJson<{ sha: string }>(
        'POST',
        `${GH}/repos/${repoFullName}/git/blobs`,
        pat,
        { content: toUtf8Base64(f.content), encoding: 'base64' },
        signal,
        `create-blob:${f.path}`,
      );
      // scripts/deploy.sh wants the executable bit. Everything else is
      // a normal file (100644). `100755` = executable file in a tree.
      const mode = f.path === 'scripts/deploy.sh' ? '100755' : '100644';
      return { path: f.path, sha: blob.sha, mode };
    }),
  );

  // ---- 4. Build the new tree off the initial commit's tree. ----
  const tree = await ghJson<{ sha: string }>(
    'POST',
    `${GH}/repos/${repoFullName}/git/trees`,
    pat,
    {
      base_tree: baseTreeSha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: b.mode,
        type: 'blob',
        sha: b.sha,
      })),
    },
    signal,
    'create-tree',
  );

  // ---- 5. Commit it with the initial commit as parent. ----
  const commit = await ghJson<{ sha: string; html_url: string }>(
    'POST',
    `${GH}/repos/${repoFullName}/git/commits`,
    pat,
    {
      message: commitMessage,
      tree: tree.sha,
      parents: [baseCommitSha],
    },
    signal,
    'create-commit',
  );

  // ---- 6. Move the branch pointer. If we're shipping to a non-default
  //        branch, create the ref; otherwise update the default. ------
  if (targetBranch === defaultBranch) {
    await ghJson<unknown>(
      'PATCH',
      `${GH}/repos/${repoFullName}/git/refs/heads/${defaultBranch}`,
      pat,
      { sha: commit.sha, force: false },
      signal,
      'update-default-ref',
    );
  } else {
    await ghJson<unknown>(
      'POST',
      `${GH}/repos/${repoFullName}/git/refs`,
      pat,
      { ref: `refs/heads/${targetBranch}`, sha: commit.sha },
      signal,
      'create-branch-ref',
    );
  }

  return {
    repoFullName,
    repoUrl: created.html_url,
    branch: targetBranch,
    commitSha: commit.sha,
    commitUrl: commit.html_url,
    fileCount: files.length,
  };
}
