/**
 * Client-side helper for driving `/api/swarm/zero-touch`.
 *
 * Subscribes to the SSE stream and dispatches typed events to the
 * caller. Non-React; a `useZeroTouch` hook on top is provided in
 * `use-zero-touch.ts` for the Forge UI.
 */

export type ZeroTouchEvent =
  | { type: 'started'; repoFullName: string; baseBranch: string | null; headBranch: string }
  | { type: 'commit_pushed'; commitSha: string; commitUrl: string; fileCount: number }
  | { type: 'pr_opened'; prNumber: number; prUrl: string }
  | { type: 'preview_poll'; attempt: number }
  | { type: 'preview_url'; url: string; project?: string; commentId: number }
  | { type: 'preview_timeout'; waitedMs: number }
  | { type: 'done'; ok: true }
  | { type: 'error'; message: string; status?: number | null; detail?: string | null };

export interface ZeroTouchRequest {
  repoFullName?: string;
  baseBranch?: string;
  headBranch?: string;
  commitMessage: string;
  prTitle?: string;
  prBody: string;
  draft?: boolean;
  files: Array<{ path: string; content: string; mode?: '100644' | '100755' }>;
  deletePaths?: string[];
  skipPreviewWait?: boolean;
  previewTimeoutMs?: number;
}

export interface StreamZeroTouchOptions {
  endpoint?: string;
  signal?: AbortSignal;
  onEvent: (event: ZeroTouchEvent) => void;
}

/**
 * POST to `/api/swarm/zero-touch` and stream SSE events back via
 * `onEvent`. Resolves when the stream terminates; rejects on network
 * failure. Upstream errors are delivered as an `error` event — the
 * returned Promise still resolves normally in that case.
 */
export async function streamZeroTouch(
  req: ZeroTouchRequest,
  opts: StreamZeroTouchOptions,
): Promise<void> {
  const endpoint = opts.endpoint ?? '/api/swarm/zero-touch';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    opts.onEvent({
      type: 'error',
      message: `zero-touch request failed ${res.status}: ${text.slice(0, 400)}`,
      status: res.status,
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line.
    let sepIndex;
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload) as ZeroTouchEvent;
        opts.onEvent(parsed);
      } catch {
        // Drop malformed frames; they're non-fatal for the client.
      }
    }
  }
}
