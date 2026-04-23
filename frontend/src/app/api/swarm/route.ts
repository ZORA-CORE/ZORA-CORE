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
import { runSwarm } from '@/lib/valhalla/agents';
import type { SwarmEvent, SwarmRunRequest } from '@/lib/valhalla/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runSwarm(parsed)) {
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
