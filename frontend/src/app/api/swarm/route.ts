/**
 * Valhalla AI — Infinity Engine: `/api/swarm` SSE endpoint.
 *
 * This is the sovereign route that replaces Dify's `/v1/chat-messages`.
 * It runs the native Claude orchestrator (EIVOR → ODIN → HEIMDALL →
 * LOKI → THOR) and streams one SSE `event: message` per agent step.
 *
 * Runtime: Node (the Anthropic SDK uses `node:stream` internals and
 * will not run on the Edge runtime at the SDK version we pin).
 *
 * The endpoint is gated behind the `VALHALLA_NATIVE_SWARM` env flag
 * so it's a no-op in production until we flip the toggle. That lets
 * us ship the orchestrator in parallel with the existing Dify proxy
 * without regressing zoracore.dk.
 */

import { NextRequest } from 'next/server';
import { runSwarm, runSwarmToolUse, isToolUseEnabled } from '@/lib/valhalla/agents';
import type { SwarmEvent, SwarmRunRequest } from '@/lib/valhalla/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A full Plan→Critique→Counterexample cycle plus THOR's E2B forge can
// take 3–4 minutes end-to-end on a non-trivial prompt (each Anthropic
// turn is 30–60 s). Vercel's default Node function timeout truncates
// the SSE stream long before THOR finishes, so the browser sees the
// connection drop mid-cycle and the assistant bubble freezes at the
// last `agent_response` it received. 300 s is the Pro-plan ceiling.
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

/** Encode a single orchestrator event as an SSE frame. */
function encodeSSE(event: SwarmEvent): string {
  // Single event type (`message`) with a JSON payload is the same
  // shape the existing Dify proxy emits, so the frontend reuses
  // its stream parser verbatim once we wire the UI toggle.
  return `event: message\ndata: ${JSON.stringify(event)}\n\n`;
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

  const encoder = new TextEncoder();
  // Dispatch: Devin-mode (E2B sandbox + Anthropic Tool Use per agent)
  // when VALHALLA_TOOL_USE=1 AND E2B_API_KEY is set, else structured-
  // output path from PR #113/#114. Both yield the same SwarmEvent
  // shape so the frontend parser is identical.
  const useToolUse = isToolUseEnabled();
  const runner = useToolUse ? runSwarmToolUse : runSwarm;
  // Thread the request's AbortSignal through so Voyage / Supabase /
  // Claude / E2B calls get cancelled the moment the browser
  // disconnects (closing the tab, navigating away, refreshing).
  // Without this the swarm would keep burning tokens + sandbox time
  // after the client is gone.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Anthropic blocking calls inside a single agent take 30–60 s with
      // no intermediate writes to the wire. Some intermediate proxies
      // (and some browser/network stacks) treat that as an idle stream
      // and close the connection, so the browser sees the SSE drop
      // mid-cycle. A 10 s heartbeat (`: keepalive` SSE comment) keeps
      // the socket warm without producing user-visible events. The
      // ticker is cleared in `finally` to avoid writing after close.
      let closed = false;
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          // Controller already closed (e.g. client disconnect): swallow.
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
