/**
 * Valhalla AI — Prometheus PR 1D: stalled-job watchdog.
 *
 * Vercel Cron sweep that finds jobs whose worker went silent
 * mid-flight (SSE client disconnected, browser tab closed, etc.)
 * and re-kicks them so the swarm finishes autonomously without
 * needing the user to re-open the chat surface.
 *
 * A job is "stalled" when:
 *   - status = 'running'
 *   - last_heartbeat_at < now() - WATCHDOG_STALE_SECONDS
 *   - completed_at IS NULL
 *
 * Re-kick path: POST /api/swarm/run/[jobId] with no parentToken,
 * which routes through the `valhalla_claim_swarm_job` RPC. Because
 * the heartbeat has expired, the RPC's stale-running branch grants
 * the new worker token and the run resumes from `current_stage`.
 *
 * Auth: when `CRON_SECRET` is set we require `Authorization: Bearer ...`.
 * Vercel Cron rotates this header automatically. Local probes can
 * bypass auth by leaving CRON_SECRET unset (matches the existing
 * `/api/swarm/cron` Pulse handler convention).
 */
import { NextRequest, NextResponse } from 'next/server';
import { isJobsStoreEnabled, listStalledJobs } from '@/lib/valhalla/jobs/store';
import { kickWorker } from '@/lib/valhalla/jobs/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The watchdog itself is fast (one Supabase select + N fire-and-forget
// kicks); 60 s is plenty of headroom even if Supabase is slow.
export const maxDuration = 60;

// Heartbeats refresh every 20 s (HEARTBEAT_TICK_MS in the worker).
// 90 s = three missed ticks. Matches the SSE stream endpoint's
// stale-heartbeat threshold so the watchdog never preempts a worker
// that is still alive.
const WATCHDOG_STALE_SECONDS = 90;
// Per-sweep cap so a runaway insert can never explode into hundreds
// of parallel kicks.
const MAX_KICKS_PER_SWEEP = 25;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isJobsStoreEnabled()) {
    return NextResponse.json(
      { error: 'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  try {
    const stalled = await listStalledJobs({
      staleSeconds: WATCHDOG_STALE_SECONDS,
      limit: MAX_KICKS_PER_SWEEP,
    });

    // Fire-and-forget per job. claimJob in the worker route will
    // refuse the kick if the job is fresh-running (defence-in-depth)
    // so duplicate watchdog invocations within one stale window are
    // safe.
    for (const job of stalled) {
      kickWorker(req, job.id);
    }

    return NextResponse.json(
      {
        ok: true,
        kicked: stalled.length,
        staleSeconds: WATCHDOG_STALE_SECONDS,
        jobs: stalled.map((j) => ({
          id: j.id,
          currentStage: j.currentStage,
          lastHeartbeatAt: j.lastHeartbeatAt,
          ageSeconds: Math.round(
            (Date.now() - new Date(j.lastHeartbeatAt).getTime()) / 1000,
          ),
        })),
        durationMs: Date.now() - startedAt,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message, durationMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
