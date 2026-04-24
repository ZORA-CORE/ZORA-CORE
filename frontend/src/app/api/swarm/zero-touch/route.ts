/**
 * POST /api/swarm/zero-touch
 *
 * Master Protocol PR 4 — Zero-Touch Deployment.
 *
 * Given a set of file edits, a PR title, and a PR body, this route:
 *
 *   1. Streams progress back to the client over SSE.
 *   2. Opens a pull request on the Valhalla-owned repo via the Git
 *      Data API (atomic single-commit branch + PR).
 *   3. Polls the PR for a `vercel[bot]` comment until a Preview URL
 *      is ready (or times out).
 *   4. Emits a terminal `preview_url` SSE event so the Forge UI can
 *      pop the "Open Preview" pill above the input.
 *
 * Gating:
 *   - `VALHALLA_ZERO_TOUCH=1` master flag; 503 when off.
 *   - `GITHUB_VALHALLA_PAT` required at runtime; 503 when missing.
 *
 * SSE event types (JSON bodies):
 *   - `started`         : { repoFullName, baseBranch, headBranch }
 *   - `commit_pushed`   : { commitSha, commitUrl, fileCount }
 *   - `pr_opened`       : { prNumber, prUrl }
 *   - `preview_poll`    : { attempt }
 *   - `preview_url`     : { url, project, commentId }
 *   - `preview_timeout` : { waitedMs }
 *   - `done`            : { ok: true }
 *   - `error`           : { message, status?, detail? }
 *
 * Every SSE frame is UTF-8 JSON; the server terminates with the
 * canonical SSE comment ping `:done\n\n` before closing the stream.
 */

import {
  openZeroTouchPR,
  waitForVercelPreviewUrl,
  ZeroTouchError,
  type ZeroTouchFile,
} from '@/lib/valhalla/zero-touch/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ZeroTouchRequestBody {
  repoFullName?: string;
  baseBranch?: string;
  headBranch?: string;
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  draft?: boolean;
  files?: Array<{ path: string; content: string; mode?: '100644' | '100755' }>;
  deletePaths?: string[];
  /** If true, skip the preview-URL wait (useful for draft PRs that won't deploy). */
  skipPreviewWait?: boolean;
  /** Override the default 240s Vercel preview wait. */
  previewTimeoutMs?: number;
}

function isValidFile(x: unknown): x is ZeroTouchFile {
  if (!x || typeof x !== 'object') return false;
  const f = x as Record<string, unknown>;
  return (
    typeof f.path === 'string' &&
    f.path.length > 0 &&
    typeof f.content === 'string' &&
    (f.mode === undefined || f.mode === '100644' || f.mode === '100755')
  );
}

function encodeEvent(type: string, payload: unknown): Uint8Array {
  const body = JSON.stringify({ type, ...(payload as object) });
  return new TextEncoder().encode(`event: ${type}\ndata: ${body}\n\n`);
}

export async function POST(req: Request): Promise<Response> {
  if (process.env.VALHALLA_ZERO_TOUCH !== '1') {
    return Response.json(
      {
        error: 'zero_touch_disabled',
        message:
          'Valhalla zero-touch flow is disabled. Set VALHALLA_ZERO_TOUCH=1 to enable.',
      },
      { status: 503 },
    );
  }
  const pat = process.env.GITHUB_VALHALLA_PAT;
  if (!pat) {
    return Response.json(
      {
        error: 'github_pat_missing',
        message:
          'GITHUB_VALHALLA_PAT is not set on the server. Add a fine-grained PAT with Contents: write + Pull requests: write on the target repo.',
      },
      { status: 503 },
    );
  }

  let body: ZeroTouchRequestBody;
  try {
    body = (await req.json()) as ZeroTouchRequestBody;
  } catch {
    return Response.json(
      { error: 'invalid_json', message: 'Body must be valid JSON.' },
      { status: 400 },
    );
  }

  const repoFullName =
    body.repoFullName?.trim() ||
    process.env.VALHALLA_ZERO_TOUCH_REPO ||
    'ZORA-CORE/ZORA-CORE';
  const headBranch =
    body.headBranch?.trim() ||
    `valhalla/zero-touch/${Date.now()}`;
  const commitMessage = body.commitMessage?.trim() || 'chore(valhalla): zero-touch patch';
  const prTitle = body.prTitle?.trim() || commitMessage;
  const prBody = body.prBody ?? '';
  const files = Array.isArray(body.files) ? body.files.filter(isValidFile) : [];
  const deletePaths = Array.isArray(body.deletePaths)
    ? body.deletePaths.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : [];

  if (files.length === 0 && deletePaths.length === 0) {
    return Response.json(
      {
        error: 'no_changes',
        message: 'Refusing to open an empty PR: `files` and `deletePaths` are both empty.',
      },
      { status: 400 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (type: string, payload: unknown) => {
        controller.enqueue(encodeEvent(type, payload));
      };
      try {
        send('started', {
          repoFullName,
          baseBranch: body.baseBranch ?? null,
          headBranch,
        });

        const prResult = await openZeroTouchPR({
          pat,
          repoFullName,
          baseBranch: body.baseBranch,
          headBranch,
          commitMessage,
          prTitle,
          prBody,
          draft: body.draft ?? false,
          files,
          deletePaths,
          signal: req.signal,
        });
        send('commit_pushed', {
          commitSha: prResult.commitSha,
          commitUrl: prResult.commitUrl,
          fileCount: prResult.fileCount,
        });
        send('pr_opened', {
          prNumber: prResult.prNumber,
          prUrl: prResult.prUrl,
        });

        if (body.skipPreviewWait) {
          send('done', { ok: true });
          controller.close();
          return;
        }

        const previewTimeoutMs =
          typeof body.previewTimeoutMs === 'number' &&
          body.previewTimeoutMs > 0 &&
          body.previewTimeoutMs <= 240_000
            ? body.previewTimeoutMs
            : 240_000;

        const preview = await waitForVercelPreviewUrl({
          pat,
          repoFullName,
          prNumber: prResult.prNumber,
          timeoutMs: previewTimeoutMs,
          signal: req.signal,
          onPoll: (attempt) => send('preview_poll', { attempt }),
        });

        if (preview) {
          send('preview_url', preview);
        } else {
          send('preview_timeout', { waitedMs: previewTimeoutMs });
        }

        send('done', { ok: true });
        controller.close();
      } catch (err) {
        if (err instanceof ZeroTouchError) {
          send('error', {
            message: err.message,
            status: err.status ?? null,
            detail: err.githubBody ?? null,
          });
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          send('error', { message: msg });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function GET(): Promise<Response> {
  return Response.json(
    {
      ok: true,
      route: '/api/swarm/zero-touch',
      method: 'POST',
      description:
        'Opens a zero-touch PR on the Valhalla repo and streams its Vercel Preview URL over SSE. Gated behind VALHALLA_ZERO_TOUCH=1 + GITHUB_VALHALLA_PAT.',
    },
    { status: 200 },
  );
}
