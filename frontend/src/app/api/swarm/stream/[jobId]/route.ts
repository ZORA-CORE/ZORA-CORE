/**
 * Valhalla AI — Prometheus PR 1: SSE replay endpoint.
 *
 * The browser opens this endpoint as soon as POST /api/swarm returns
 * a `jobId`. It polls `valhalla_swarm_events` for new rows and emits
 * them to the client as `event: message` SSE frames in the exact
 * shape the chat surface already understands (one frame per
 * `SwarmEvent`).
 *
 * Decoupling note: this endpoint is NOT the worker. It only reads
 * events and triggers the worker if it observes the job is queued
 * or running with a stale heartbeat. That means the user-perceived
 * SSE stream survives the worker dying — events that landed in the
 * table are replayed from disk, and a new worker is kicked
 * automatically.
 */
import { NextRequest } from 'next/server';
import { getJob, listEvents } from '@/lib/valhalla/jobs/store';
import { kickWorker } from '@/lib/valhalla/jobs/scheduler';
import type { SwarmEvent } from '@/lib/valhalla/agents/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Pro-plan ceiling. Most jobs complete in ~3-5 minutes, well under
// this. If the SSE endpoint hits the ceiling before the job
// completes, the client auto-reconnects (swarmStream.ts) and resumes
// from the last seq id it received, so no events are lost.
export const maxDuration = 300;
// Polling cadence. Aggressive enough that the user perceives
// near-real-time streaming (the worker writes to PG every 30-90 s
// per agent, but ranges of events arrive in bursts). Going lower
// burns Supabase egress without UX win.
const POLL_INTERVAL_MS = 500;
// Heartbeat keeps the SSE socket warm across intermediate proxies.
const HEARTBEAT_INTERVAL_MS = 10_000;
// If the job is queued or `running` with a heartbeat older than
// this, kick a worker. Mirrors the worker route's stale threshold.
const STALE_HEARTBEAT_MS = 60_000;
// How often to evaluate whether the worker needs a re-kick.
const KICK_CHECK_INTERVAL_MS = 15_000;
const PAGE_SIZE = 200;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

function encodeSSE(event: SwarmEvent | { type: string; [k: string]: unknown }): string {
  return `event: message\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  const { jobId } = await ctx.params;
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing jobId.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // Resume cursor: if the client reconnects after a Vercel-imposed
  // close, it can pass `?afterId=N` to skip events it already saw.
  const url = new URL(req.url);
  const afterIdParam = url.searchParams.get('afterId');
  const initialCursor = afterIdParam ? Number(afterIdParam) : 0;

  const job = await getJob(jobId).catch(() => null);
  if (!job) {
    return new Response(JSON.stringify({ error: 'Unknown jobId.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let cursor = Number.isFinite(initialCursor) ? initialCursor : 0;

      const safeEnqueue = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* controller closed */
        }
      };

      // Heartbeat — same shape as the legacy POST /api/swarm path.
      const heartbeat = setInterval(() => {
        safeEnqueue(`: keepalive ${Date.now()}\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      // Periodically re-kick the worker if it appears stuck. We do
      // this from the SSE endpoint because the browser is the most
      // reliable trigger we have on Vercel — as long as the user has
      // the chat open, this loop is alive.
      const kickTimer = setInterval(() => {
        if (closed) return;
        void (async () => {
          try {
            const j = await getJob(jobId);
            if (!j) return;
            if (j.status === 'completed' || j.status === 'failed') return;
            const age = Date.now() - new Date(j.lastHeartbeatAt).getTime();
            if (j.status === 'queued' || age > STALE_HEARTBEAT_MS) {
              kickWorker(req, jobId);
            }
          } catch {
            /* swallow */
          }
        })();
      }, KICK_CHECK_INTERVAL_MS);

      // Close hooks: flush a cursor cookie so the client can resume.
      const cleanup = (): void => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(kickTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Abort propagation: when the browser disconnects, stop polling.
      req.signal.addEventListener('abort', cleanup, { once: true });

      try {
        // Initial kick: if the job is still queued when the SSE opens,
        // make sure a worker is running. The POST handler already
        // tries this, but a missed kick (e.g. cold-start jitter)
        // recovers here.
        if (job.status === 'queued') {
          kickWorker(req, jobId);
        }

        // Main poll loop.
        while (!closed) {
          const rows = await listEvents(jobId, cursor, PAGE_SIZE).catch(
            () => [] as Awaited<ReturnType<typeof listEvents>>,
          );
          for (const r of rows) {
            safeEnqueue(encodeSSE(r.event));
            cursor = r.id;
            // Embed the seq id as a periodic SSE comment so the
            // client can record it for resume.
            safeEnqueue(`: seq ${r.id}\n\n`);
          }

          // If a swarm_done event has been streamed, we can close.
          // We also close on terminal job status with no pending
          // events to drain.
          let job2;
          try {
            job2 = await getJob(jobId);
          } catch {
            job2 = null;
          }
          if (
            job2 &&
            (job2.status === 'completed' || job2.status === 'failed')
          ) {
            // Drain any remaining events one more time before close.
            const tail = await listEvents(jobId, cursor, PAGE_SIZE).catch(
              () => [],
            );
            for (const r of tail) {
              safeEnqueue(encodeSSE(r.event));
              cursor = r.id;
            }
            // If terminal but no swarm_done emitted (failure path),
            // synthesize one so the client closes cleanly.
            const sawDone = tail.some((r) => r.event.type === 'swarm_done');
            const allEvents = await listEvents(jobId, 0, 1).catch(() => []);
            void allEvents;
            if (!sawDone && job2.status !== 'completed') {
              safeEnqueue(encodeSSE({ type: 'swarm_done', at: Date.now() }));
            }
            cleanup();
            break;
          }

          await new Promise<void>((resolve) =>
            setTimeout(resolve, POLL_INTERVAL_MS),
          );
        }
      } finally {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
