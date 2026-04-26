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
import { listStalledJobs } from './store';

// Heartbeats refresh every HEARTBEAT_TICK_MS = 20s in the worker.
// 90s = three missed ticks. Matches the SSE stream endpoint's
// stale-heartbeat threshold so the sweep never preempts a worker
// that is still alive.
const SWEEP_STALE_SECONDS = 90;
// Per-sweep cap so a runaway insert can never explode into hundreds
// of parallel kicks from one request.
const SWEEP_MAX_KICKS = 10;

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
 *
 * Pass `{ continuation: true }` when the caller is itself a worker
 * handing off at the soft-budget boundary; the continuation invocation
 * bypasses the heartbeat-fresh acquire check (which would otherwise
 * refuse to take over because the outgoing worker just refreshed the
 * heartbeat with its final updateJob).
 */
export function kickWorker(
  req: NextRequest,
  jobId: string,
  opts: { continuation?: boolean; parentToken?: string } = {},
): void {
  const base = deploymentBaseUrl(req);
  if (!base) return;
  const params = new URLSearchParams();
  if (opts.continuation) params.set('continuation', '1');
  if (opts.parentToken) params.set('parentToken', opts.parentToken);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const url = `${base}/api/swarm/run/${encodeURIComponent(jobId)}${qs}`;
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

/**
 * Fire-and-forget sweep of stalled swarm jobs. Replaces the Vercel
 * Cron we couldn't ship on Hobby (daily-only schedules). Called from
 * POST /api/swarm and the SSE stream endpoint so any active user
 * organically pumps the watchdog for everyone's stalled jobs.
 *
 * "Stalled" = status='running', last_heartbeat_at older than
 * SWEEP_STALE_SECONDS, completed_at IS NULL. The worker's claimJob
 * RPC routes through the stale-running branch and grants ownership
 * to the new worker; the run resumes from `current_stage`.
 *
 * Safe to call concurrently: claimJob is atomic so duplicate sweeps
 * within the same stale window don't produce duplicate workers.
 */
export function sweepStalledJobs(req: NextRequest): void {
  setImmediate(() => {
    void (async () => {
      try {
        const stalled = await listStalledJobs({
          staleSeconds: SWEEP_STALE_SECONDS,
          limit: SWEEP_MAX_KICKS,
        });
        for (const job of stalled) {
          kickWorker(req, job.id);
        }
      } catch {
        /* swallow — best-effort sweep */
      }
    })();
  });
}
