/**
 * Valhalla AI — Prometheus PR 1: chunked worker route.
 *
 * Consumes a `valhalla_swarm_jobs` row, runs as many stages as fit
 * inside this Vercel function's 300 s ceiling, persists every event
 * to `valhalla_swarm_events`, and self-chains via fire-and-forget
 * fetch when the budget exhausts before the job is terminal.
 *
 * Why this exists: the orchestrator's full pipeline (EIVOR + 2
 * cycles + THOR + FREJA) empirically takes ≥320 s end-to-end, so a
 * single function invocation cannot complete it. By cutting the
 * pipeline into resumable stages whose state lives in Postgres,
 * each stage gets its own fresh 300 s budget — eliminating the
 * Vercel ceiling as a constraint on swarm completeness.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  appendEvent,
  getJob,
  listEvents,
  updateJob,
} from '@/lib/valhalla/jobs/store';
import { runStage, type SwarmStage } from '@/lib/valhalla/jobs/stages';
import { kickWorker } from '@/lib/valhalla/jobs/scheduler';
import type { SwarmEvent } from '@/lib/valhalla/agents/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Stage chaining keeps each invocation under this ceiling; we still
// declare the Pro-plan max so a single very-slow stage (e.g. THOR
// with E2B sandbox boot + Anthropic Tool Use) has runway.
export const maxDuration = 300;
// Soft budget: hand off to a continuation invocation if we get
// within 60 s of the ceiling. Stages run sequentially so this needs
// to be conservative — a THOR turn with sandbox can take 60+ s on
// its own.
const SOFT_BUDGET_MS = 240_000;
// If the job is currently `running` but its heartbeat is older than
// this many milliseconds, treat the previous worker as dead and take
// over. Matches the SSE stream endpoint's stale-heartbeat threshold.
const STALE_HEARTBEAT_MS = 60_000;
// Page size when reading the persisted event log to rebuild context.
// At ~6 events per agent × ~12 agent stages, the worst case is
// well under 200 events; pagination is purely defensive.
const EVENT_PAGE_SIZE = 1000;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

async function loadAllEvents(jobId: string): Promise<SwarmEvent[]> {
  const events: SwarmEvent[] = [];
  let cursor = 0;
  // Defensive cap on iterations so a runaway insert can't loop us.
  for (let i = 0; i < 20; i++) {
    const rows = await listEvents(jobId, cursor, EVENT_PAGE_SIZE);
    if (rows.length === 0) break;
    for (const r of rows) events.push(r.event);
    cursor = rows[rows.length - 1]!.id;
    if (rows.length < EVENT_PAGE_SIZE) break;
  }
  return events;
}

async function processJob(req: NextRequest, jobId: string): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    const job = await getJob(jobId);
    if (!job) return;
    if (job.status === 'completed' || job.status === 'failed') return;

    // Acquire-or-skip: if another worker has updated the row in the
    // last STALE_HEARTBEAT_MS, assume it's still alive and back off.
    if (job.status === 'running') {
      const heartbeatAge = Date.now() - new Date(job.lastHeartbeatAt).getTime();
      if (heartbeatAge < STALE_HEARTBEAT_MS) {
        // Another worker is alive; do nothing.
        return;
      }
    }

    // Mark running (and refresh heartbeat) before invoking the stage.
    await updateJob(jobId, { status: 'running' });

    const stage = job.currentStage as SwarmStage;
    if (stage === 'done') {
      // Idempotent finalization. Emit swarm_done if it isn't already
      // present, then mark completed.
      const events = await loadAllEvents(jobId);
      if (!events.some((e) => e.type === 'swarm_done')) {
        await appendEvent(jobId, { type: 'swarm_done', at: Date.now() });
      }
      await updateJob(jobId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      return;
    }

    const priorEvents = await loadAllEvents(jobId);

    let result;
    try {
      result = await runStage(stage, {
        job,
        priorEvents,
        signal: req.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Persist the failure so the SSE replay surface shows it.
      await appendEvent(jobId, {
        type: 'agent_error',
        agent: 'odin',
        message,
        at: Date.now(),
      });
      await appendEvent(jobId, { type: 'swarm_done', at: Date.now() });
      await updateJob(jobId, {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date().toISOString(),
      });
      return;
    }

    for (const evt of result.events) {
      try {
        await appendEvent(jobId, evt);
      } catch {
        // A failed event insert is non-fatal — heartbeat staleness
        // will cause the SSE endpoint to re-kick this worker.
      }
    }

    if (result.terminal === 'failed') {
      await updateJob(jobId, {
        currentStage: result.nextStage,
        status: 'failed',
        errorMessage: result.errorMessage ?? null,
        completedAt: new Date().toISOString(),
      });
      return;
    }

    // Advance the job's stage pointer (and refresh heartbeat).
    await updateJob(jobId, {
      currentStage: result.nextStage,
      status: result.terminal === 'completed' ? 'completed' : 'running',
      ...(result.terminal === 'completed'
        ? { completedAt: new Date().toISOString() }
        : {}),
    });

    if (result.terminal === 'completed') return;

    // Budget check: if we're past the soft budget, hand off to a
    // continuation worker. This keeps a single chain of invocations
    // moving the job forward without any one of them exceeding 300 s.
    if (Date.now() - startedAt > SOFT_BUDGET_MS) {
      kickWorker(req, jobId);
      return;
    }
  }
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  const { jobId } = await ctx.params;
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId.' }, { status: 400 });
  }

  try {
    await processJob(req, jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Worker failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, jobId });
}

// Allow GET for manual debugging (curl https://.../api/swarm/run/JOB_ID).
export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  return POST(req, ctx);
}
