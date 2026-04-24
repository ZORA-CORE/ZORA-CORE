/**
 * Valhalla AI — Master Protocol PR 4: Zero-Touch PR GitHub client.
 *
 * Takes a batch of file edits plus a PR title/body and:
 *
 *   1. Creates a fresh branch off the target base (default `main`).
 *   2. Lands every edit in one atomic commit via the Git Data API
 *      (blobs -> tree -> commit -> refs).
 *   3. Opens a pull request on the existing repository.
 *
 * Why this exists:
 *   The Master Protocol's zero-touch rule is "the Swarm NEVER deploys
 *   to production directly. ODIN opens a GitHub PR". This helper is
 *   the moving-parts-contained version of that rule — the caller only
 *   supplies the PR contents and a PAT; everything else (branch
 *   naming, ref resolution, atomicity, error wrapping) is handled
 *   here.
 *
 * Reused patterns from `valkyrie/github.ts`:
 *   - `ghHeaders` shape and `User-Agent` branding.
 *   - `ShipError` semantics: `status` is the upstream HTTP code,
 *     `githubBody` is the truncated response body for operator sight.
 *   - Atomic commit via Git Data API (blobs -> tree -> commit) so an
 *     N-file change produces exactly one commit regardless of N.
 */

export class ZeroTouchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly githubBody?: string,
  ) {
    super(message);
    this.name = 'ZeroTouchError';
  }
}

const GH = 'https://api.github.com';

export interface ZeroTouchFile {
  /** Repo-relative POSIX path, e.g. `frontend/src/lib/foo.ts`. */
  path: string;
  /** UTF-8 file content. Use the special sentinel in `deletePaths` to remove files instead. */
  content: string;
  /** If set, git tree mode override (e.g. `100755` for executables). Defaults to `100644`. */
  mode?: '100644' | '100755';
}

export interface OpenZeroTouchPROptions {
  pat: string;
  /** Repo in `owner/name` shape. */
  repoFullName: string;
  /** Branch to fork from. Defaults to the repo's configured default branch. */
  baseBranch?: string;
  /** New branch slug. MUST match `/^[a-zA-Z0-9/_.-]{1,120}$/`. */
  headBranch: string;
  /** Commit message for the single atomic commit on the new branch. */
  commitMessage: string;
  /** Human-readable PR title. */
  prTitle: string;
  /** Markdown PR body. */
  prBody: string;
  /** Whether to open the PR as a draft. Default `false`. */
  draft?: boolean;
  /** Files to write or overwrite. */
  files: ZeroTouchFile[];
  /** Paths to delete from the base tree. */
  deletePaths?: string[];
  /** Optional AbortSignal to cancel in-flight requests. */
  signal?: AbortSignal;
}

export interface OpenZeroTouchPRResult {
  prNumber: number;
  prUrl: string;
  headBranch: string;
  baseBranch: string;
  commitSha: string;
  commitUrl: string;
  fileCount: number;
}

const VALID_BRANCH = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,119}$/;

function ghHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'valhalla-zero-touch/1.0',
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
    throw new ZeroTouchError(
      `GitHub ${contextLabel} failed with ${res.status}`,
      res.status,
      text.slice(0, 600),
    );
  }
  return res.json() as Promise<T>;
}

function toUtf8Base64(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64');
}

/**
 * Open a zero-touch PR: commit `files` (and optionally delete
 * `deletePaths`) onto a fresh branch, then open a PR back to
 * `baseBranch`. Throws `ZeroTouchError` on any failure.
 */
export async function openZeroTouchPR(
  opts: OpenZeroTouchPROptions,
): Promise<OpenZeroTouchPRResult> {
  const {
    pat,
    repoFullName,
    headBranch,
    commitMessage,
    prTitle,
    prBody,
    draft = false,
    files,
    deletePaths = [],
    signal,
  } = opts;

  if (!pat) throw new ZeroTouchError('Missing GitHub PAT.');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(repoFullName)) {
    throw new ZeroTouchError(`Invalid repo full name "${repoFullName}".`);
  }
  if (!VALID_BRANCH.test(headBranch)) {
    throw new ZeroTouchError(
      `Invalid head branch "${headBranch}". Must match /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,119}$/.`,
    );
  }
  if (files.length === 0 && deletePaths.length === 0) {
    throw new ZeroTouchError('Refusing to open an empty PR.');
  }

  // ---- 1. Resolve base branch. ----
  const baseBranch = opts.baseBranch
    ?? (await ghJson<{ default_branch: string }>(
      'GET',
      `${GH}/repos/${repoFullName}`,
      pat,
      undefined,
      signal,
      'get-repo',
    )).default_branch;

  // ---- 2. Get base branch ref + commit + tree. ----
  const baseRef = await ghJson<{ object: { sha: string } }>(
    'GET',
    `${GH}/repos/${repoFullName}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
    pat,
    undefined,
    signal,
    'get-base-ref',
  );
  const baseCommitSha = baseRef.object.sha;
  const baseCommit = await ghJson<{ tree: { sha: string } }>(
    'GET',
    `${GH}/repos/${repoFullName}/git/commits/${baseCommitSha}`,
    pat,
    undefined,
    signal,
    'get-base-commit',
  );
  const baseTreeSha = baseCommit.tree.sha;

  // ---- 3. Create blobs for every new/updated file in parallel. ----
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
      return {
        path: f.path,
        sha: blob.sha,
        mode: f.mode ?? '100644',
      };
    }),
  );

  // ---- 4. Build the new tree off the base tree. ----
  //    Deletions are expressed by writing a null sha + null mode in the
  //    tree entry, which GitHub interprets as "remove this path".
  interface TreeEntry {
    path: string;
    mode: string | null;
    type: 'blob';
    sha: string | null;
  }
  const treeEntries: TreeEntry[] = [
    ...blobs.map((b) => ({
      path: b.path,
      mode: b.mode,
      type: 'blob' as const,
      sha: b.sha,
    })),
    ...deletePaths.map((p) => ({
      path: p,
      mode: null,
      type: 'blob' as const,
      sha: null,
    })),
  ];
  const tree = await ghJson<{ sha: string }>(
    'POST',
    `${GH}/repos/${repoFullName}/git/trees`,
    pat,
    { base_tree: baseTreeSha, tree: treeEntries },
    signal,
    'create-tree',
  );

  // ---- 5. Commit with base as parent. ----
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

  // ---- 6. Create the head ref. If it already exists, fail loudly;
  //    never force-update someone else's branch. ----
  await ghJson<unknown>(
    'POST',
    `${GH}/repos/${repoFullName}/git/refs`,
    pat,
    { ref: `refs/heads/${headBranch}`, sha: commit.sha },
    signal,
    'create-head-ref',
  );

  // ---- 7. Open the PR. ----
  const pr = await ghJson<{ number: number; html_url: string }>(
    'POST',
    `${GH}/repos/${repoFullName}/pulls`,
    pat,
    {
      title: prTitle,
      head: headBranch,
      base: baseBranch,
      body: prBody,
      draft,
      maintainer_can_modify: true,
    },
    signal,
    'create-pull-request',
  );

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    headBranch,
    baseBranch,
    commitSha: commit.sha,
    commitUrl: commit.html_url,
    fileCount: files.length,
  };
}

// ---------------------------------------------------------------------
// Vercel preview-URL poller
// ---------------------------------------------------------------------

export interface PreviewUrlResult {
  /** The live Vercel Preview URL, if found. */
  url: string;
  /** Which Vercel "project" the URL points at (zora-core, ai, etc.). */
  project?: string;
  /** The id of the GitHub comment we scraped the URL from. */
  commentId: number;
}

/**
 * Poll a PR's issue comments for a `vercel[bot]` deployment-ready
 * comment that contains a Preview URL. Returns the first such URL
 * found or null after `timeoutMs` elapses.
 *
 * Vercel posts a status table with a column labelled "Preview" whose
 * cell is a markdown link of the form `[Visit Preview](https://...)`.
 * When a deployment is still building the same comment carries
 * "Status: Queued" or "Status: Building" without that link; we skip
 * those and wait for the ready state.
 */
export async function waitForVercelPreviewUrl(opts: {
  pat: string;
  repoFullName: string;
  prNumber: number;
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
  onPoll?: (attempt: number) => void;
}): Promise<PreviewUrlResult | null> {
  const {
    pat,
    repoFullName,
    prNumber,
    timeoutMs = 240_000,
    intervalMs = 6_000,
    signal,
    onPoll,
  } = opts;

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    onPoll?.(attempt);
    if (signal?.aborted) return null;
    try {
      const comments = await ghJson<Array<{ id: number; user: { login: string }; body: string }>>(
        'GET',
        `${GH}/repos/${repoFullName}/issues/${prNumber}/comments?per_page=100`,
        pat,
        undefined,
        signal,
        'list-pr-comments',
      );
      for (const c of comments) {
        if (c.user.login !== 'vercel[bot]') continue;
        const hit = extractPreviewUrl(c.body);
        if (hit) return { url: hit.url, project: hit.project, commentId: c.id };
      }
    } catch (err) {
      // Transient polling errors shouldn't kill the wait loop.
      if (err instanceof ZeroTouchError && err.status && err.status >= 500) {
        // fall through to sleep
      } else if (err instanceof ZeroTouchError && err.status === 404) {
        // PR not indexed yet, keep trying
      } else {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

/**
 * Pull the first real Preview URL from a vercel[bot] PR comment.
 *
 * Looks for `https://<sub>.vercel.app` links in the comment body that
 * are NOT inspector/log URLs. Returns null until the deployment has
 * actually produced a public Preview URL.
 */
export function extractPreviewUrl(body: string): { url: string; project?: string } | null {
  if (!body) return null;
  // Skip "Queued" / "Building" rows - the preview link isn't live yet.
  if (/Status:\s*(Queued|Building|Error)/i.test(body)) return null;

  const urlRe = /https:\/\/([a-z0-9-]+\.vercel\.app)[^\s)\]'">]*/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(body)) !== null) {
    const full = match[0];
    const host = match[1];
    // Inspector + deployment detail pages aren't the Preview itself.
    if (host.startsWith('vercel.com')) continue;
    if (/\/inspect\//.test(full)) continue;
    if (/vercel\.link/.test(full)) continue;
    // The subdomain usually encodes the project name as its last segment.
    const project = host.split('.')[0].split('-').slice(-1)[0] || undefined;
    return { url: full, project };
  }
  return null;
}
