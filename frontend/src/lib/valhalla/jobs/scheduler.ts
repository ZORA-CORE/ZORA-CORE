/**
 * Valhalla AI — Prometheus PR 1: worker scheduling helpers.
 *
 * Centralizes the "fire-and-forget kick" pattern that POST /api/swarm
 * and GET /api/swarm/stream/[jobId] both use to (re-)spawn the
 * background worker. Vercel Node functions are not Edge so we cannot
 * use `event.waitUntil`, but a `fetch()` issued without `await` will
 * still send before the lambda is frozen as long as the caller has
 * already returned its response. We additionally hand off via
 * `setImmediate` to push the kick past the response flush.
 */
import type { NextRequest } from 'next/server';

/** Best-effort base URL of the deployment, derived from request headers. */
export function deploymentBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host =
    req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  if (host) return `${proto}://${host}`;
  // Vercel injects VERCEL_URL but it's the deployment URL, not the
  // production domain. Use as a final fallback.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

/**
 * Fire-and-forget POST to the worker route for the given job. Returns
 * a promise that resolves immediately so the caller can return its
 * own response without waiting on the kick. Errors are swallowed —
 * if the kick is missed, the SSE stream endpoint will retry it on
 * its next heartbeat poll.
 */
export function kickWorker(req: NextRequest, jobId: string): void {
  const base = deploymentBaseUrl(req);
  if (!base) return;
  const url = `${base}/api/swarm/run/${encodeURIComponent(jobId)}`;
  // Defer the actual fetch one tick so the calling response can be
  // flushed first; helps Vercel keep the lambda warm long enough
  // for the request to leave.
  setImmediate(() => {
    void fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Internal kicks are unauthenticated. The route itself
        // checks the request shape and the job state to decide
        // whether to act.
        'x-valhalla-internal': '1',
      },
      // Do not propagate any body — the worker reads everything from
      // the persisted job row.
    }).catch(() => {
      /* swallow — stream endpoint will retry */
    });
  });
}
