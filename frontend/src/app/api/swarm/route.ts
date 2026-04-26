/**
 * Valhalla AI — Prometheus PR 1: thin enqueue handler.
 *
 * Before this PR, POST /api/swarm ran the full `runSwarm` orchestrator
 * inside the request lifetime and streamed `SwarmEvent`s back as SSE.
 * That meant the entire 6-persona pipeline had to fit inside Vercel's
 * 300 s `maxDuration` ceiling, which empirically is impossible for any
 * non-trivial prompt (FREJA started at t≈291 s on a tiny "ProgressBar"
 * prompt and her response landed beyond the cutoff).
 *
 * The new flow:
 *   1. POST /api/swarm validates the request, runs episodic-memory
 *      recall ONCE (so the result is durable across worker
 *      invocations), persists everything into `valhalla_swarm_jobs`,
 *      and fires-and-forgets the worker route.
 *   2. POST returns JSON `{ jobId, streamUrl }` immediately.
 *   3. The browser opens the SSE replay at `streamUrl` which polls
 *      `valhalla_swarm_events`, so the user-perceived stream is
 *      decoupled from the worker's 300 s ceiling.
 *
 * Backward compatibility: when the durable jobs store is not
 * configured (no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) the route
 * falls back to the legacy synchronous SSE stream so local dev still
 * works without Supabase.
 */
import { NextRequest } from 'next/server';
import {
  isToolUseEnabled,
  runSwarm,
  runSwarmToolUse,
} from '@/lib/valhalla/agents';
import type { SwarmEvent, SwarmRunRequest } from '@/lib/valhalla/agents';
import { isMemoryEnabled, recallTopK } from '@/lib/valhalla/memory/store';
import {
  appendEvent,
  createJob,
  isJobsStoreEnabled,
} from '@/lib/valhalla/jobs/store';
import { kickWorker, sweepStalledJobs } from '@/lib/valhalla/jobs/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Memory recall + job-row insert + fire-and-forget kick should
// finish well under 30 s. The legacy fallback path (no jobs store)
// still needs the full 300 s ceiling for synchronous SSE.
export const maxDuration = 300;

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isSwarmEnabled(): boolean {
  const raw = process.env.VALHALLA_NATIVE_SWARM ?? '';
  return raw === '1' || raw.toLowerCase() === 'true';
}

function parseRequest(body: unknown): SwarmRunRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const query = typeof b.query === 'string' ? b.query.trim() : '';
  if (!query) return null;
  const userId = typeof b.userId === 'string' && b.userId ? b.userId : 'anonymous';
  const sessionId =
    typeof b.sessionId === 'string' && b.sessionId ? b.sessionId : 'ephemeral';
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(b.history)) {
    for (const raw of b.history) {
      if (
        typeof raw === 'object' &&
        raw !== null &&
        'role' in raw &&
        'content' in raw
      ) {
        const r = raw as { role: unknown; content: unknown };
        if (
          (r.role === 'user' || r.role === 'assistant') &&
          typeof r.content === 'string'
        ) {
          history.push({ role: r.role, content: r.content });
        }
      }
    }
  }
  return { userId, sessionId, query, history };
}

function encodeSSE(event: SwarmEvent): string {
  return `event: message\ndata: ${JSON.stringify(event)}\n\n`;
}

/** Build the recalled-memory markdown the orchestrator prepends to base prompt. */
async function buildRecalled(
  req: SwarmRunRequest,
  signal: AbortSignal,
): Promise<{ markdown: string; recallEvent: SwarmEvent | null }> {
  if (!isMemoryEnabled()) return { markdown: '', recallEvent: null };
  let memories;
  try {
    memories = await recallTopK({
      userId: req.userId,
      query: req.query,
      k: 8,
      signal,
    });
  } catch {
    return { markdown: '', recallEvent: null };
  }
  if (memories.length === 0) return { markdown: '', recallEvent: null };
  const blocks = memories.map((m, i) => {
    const sim =
      typeof m.similarity === 'number' ? m.similarity.toFixed(3) : 'n/a';
    const snippet =
      m.content.length > 500 ? `${m.content.slice(0, 500)}…` : m.content;
    return `### Memory ${i + 1} — kind=${m.kind}, similarity=${sim}\n${snippet}`;
  });
  return {
    markdown: ['## Recalled memories', ...blocks].join('\n\n'),
    recallEvent: {
      type: 'memory_recall',
      count: memories.length,
      summaries: memories.map((m) => ({
        kind: m.kind,
        snippet:
          m.content.length > 160 ? `${m.content.slice(0, 160)}…` : m.content,
        similarity: m.similarity ?? 0,
      })),
      at: Date.now(),
    },
  };
}

/** Legacy synchronous SSE path for local dev without Supabase. */
function legacyStreamingResponse(
  req: NextRequest,
  parsed: SwarmRunRequest,
): Response {
  const encoder = new TextEncoder();
  const useToolUse = isToolUseEnabled();
  const runner = useToolUse ? runSwarmToolUse : runSwarm;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          /* closed */
        }
      }, 10_000);
      try {
        for await (const event of runner(parsed, { signal: req.signal })) {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(
            encodeSSE({
              type: 'agent_error',
              agent: 'odin',
              message,
              at: Date.now(),
            }),
          ),
        );
      } finally {
        closed = true;
        clearInterval(heartbeat);
        controller.close();
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

export async function POST(req: NextRequest): Promise<Response> {
  if (!isSwarmEnabled()) {
    return jsonError(
      'Native Valhalla swarm is disabled. Set VALHALLA_NATIVE_SWARM=1 to enable.',
      503,
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError('ANTHROPIC_API_KEY is not set on the server.', 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Expected JSON body.', 400);
  }
  const parsed = parseRequest(body);
  if (!parsed) {
    return jsonError('Missing or invalid `query` field.', 400);
  }

  // Fallback: when the durable jobs store is unconfigured (e.g. local
  // dev without Supabase), preserve the legacy SSE behavior so the
  // chat surface still works end-to-end.
  if (!isJobsStoreEnabled()) {
    return legacyStreamingResponse(req, parsed);
  }

  // Memory recall is the only blocking work we do in the request
  // lifetime: it's bounded (Voyage embed + a single PG RPC) so it
  // fits comfortably in the enqueue handler. Persisting the result
  // on the job row means the worker doesn't pay for it again across
  // resumes.
  let recalled: { markdown: string; recallEvent: SwarmEvent | null };
  try {
    recalled = await buildRecalled(parsed, req.signal);
  } catch {
    recalled = { markdown: '', recallEvent: null };
  }

  let job;
  try {
    job = await createJob({
      request: parsed,
      recalledMarkdown: recalled.markdown,
      useToolUse: isToolUseEnabled(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return jsonError(`Failed to enqueue swarm job: ${msg}`, 500);
  }

  // Persist the recall event so the SSE replay surface includes it
  // even if the worker hasn't started yet.
  if (recalled.recallEvent) {
    try {
      await appendEvent(job.id, recalled.recallEvent);
    } catch {
      /* best-effort */
    }
  }

  // Fire-and-forget kick of the worker. The stream endpoint also
  // re-kicks on stale heartbeat so a missed kick here recovers
  // automatically when the client opens the SSE.
  kickWorker(req, job.id);

  // Inline watchdog: best-effort sweep of any other stalled jobs in
  // the cluster. Replaces the Vercel Cron we couldn't ship on Hobby
  // (daily-only schedules). Every new chat request becomes an
  // organic watchdog tick — covers the common stall scenario where
  // a user closed a tab mid-run and the worker had no SSE client
  // refreshing the heartbeat. Safe to fire on every request because
  // claimJob is atomic and listStalledJobs filter excludes anything
  // that has heartbeated within the last 90s.
  sweepStalledJobs(req);

  return new Response(
    JSON.stringify({
      jobId: job.id,
      streamUrl: `/api/swarm/stream/${job.id}`,
      status: job.status,
    }),
    {
      status: 202,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
