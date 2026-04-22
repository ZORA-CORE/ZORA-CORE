/**
 * Valhalla AI — Dify.ai Chat Proxy (SSE) v2
 *
 * Streams responses from the Dify.ai Workflow/Chat API back to the client as
 * Server-Sent Events. The Dify API key is read from `DIFY_API_KEY` on the
 * server and is never exposed to the client.
 *
 * Request body:
 *   {
 *     query: string,            // user message
 *     user: string,             // stable per-user identifier
 *     conversation_id?: string, // optional Dify conversation id
 *     inputs?: Record<string, unknown>,
 *     files?: unknown[]
 *   }
 *
 * Response: `text/event-stream` that proxies Dify's SSE events verbatim.
 *
 * v2 additions:
 *   - Upstream fetch timeout (DIFY_TIMEOUT_MS, default 45s) with structured
 *     JSON error when exceeded so the client renders a clean message.
 *   - Client abort (AbortController.signal) is forwarded to the upstream fetch
 *     so a cancelled request actually releases the Dify connection.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DIFY_API_BASE =
  process.env.DIFY_API_BASE_URL?.replace(/\/+$/, '') || 'https://api.dify.ai/v1';
const DIFY_TIMEOUT_MS = Number(process.env.DIFY_TIMEOUT_MS || 45_000);

interface ChatRequestBody {
  query?: string;
  user?: string;
  conversation_id?: string;
  inputs?: Record<string, unknown>;
  files?: unknown[];
}

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    return jsonError(
      'Dify proxy is not configured. Set DIFY_API_KEY on the server.',
      500,
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const query = (body.query ?? '').trim();
  if (!query) {
    return jsonError('`query` is required.', 400);
  }

  const user = body.user?.trim() || 'valhalla-anon';
  const conversationId = body.conversation_id ?? '';
  const inputs = body.inputs ?? {};

  // Upstream abort: either the client disconnects (req.signal) or the timeout
  // fires. Both trip the same controller so the upstream connection always
  // gets released.
  const upstreamController = new AbortController();
  const timeout = setTimeout(
    () => upstreamController.abort(new Error('timeout')),
    DIFY_TIMEOUT_MS,
  );
  const onClientAbort = (): void =>
    upstreamController.abort(new Error('client-abort'));
  req.signal.addEventListener('abort', onClientAbort);

  let upstream: Response;
  try {
    upstream = await fetch(`${DIFY_API_BASE}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        inputs,
        query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user,
        files: body.files ?? [],
        auto_generate_name: true,
      }),
      signal: upstreamController.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', onClientAbort);
    const reason =
      err instanceof Error ? err.message : 'Unknown upstream error';
    const isTimeout = /timeout/i.test(reason);
    const isClientAbort = /client-abort/i.test(reason);
    if (isClientAbort) {
      // The client went away; respond with 499-like status. The browser's
      // fetch will usually never see this because the socket is gone.
      return jsonError('Request cancelled by client.', 499);
    }
    return jsonError(
      isTimeout
        ? `Upstream Dify request timed out after ${DIFY_TIMEOUT_MS}ms.`
        : `Upstream Dify request failed: ${reason}`,
      504,
    );
  }

  // Clear the timeout now that we're streaming; closing the client connection
  // still aborts upstream via the existing listener.
  clearTimeout(timeout);

  if (!upstream.ok || !upstream.body) {
    req.signal.removeEventListener('abort', onClientAbort);
    const text = await upstream.text().catch(() => '');
    return jsonError(
      `Dify upstream error (${upstream.status}): ${text.slice(0, 500) || upstream.statusText}`,
      upstream.status || 502,
    );
  }

  // Pass the SSE stream through. Dify already emits `data: {...}\n\n` frames.
  // When the response body is garbage-collected the upstream connection
  // closes automatically; we keep the abort listener attached so explicit
  // client disconnects also tear down upstream.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function GET(): Promise<Response> {
  // Minimal healthcheck. Deliberately avoids leaking the upstream URL or
  // whether the API key is configured to unauthenticated callers.
  return new Response(
    JSON.stringify({ service: 'valhalla-chat-proxy', status: 'ok' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
