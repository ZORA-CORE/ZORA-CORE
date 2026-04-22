/**
 * Dify.ai Chat Proxy (SSE)
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
 *     inputs?: Record<string, unknown>
 *   }
 *
 * Response: `text/event-stream` that proxies Dify's SSE events verbatim.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DIFY_API_BASE =
  process.env.DIFY_API_BASE_URL?.replace(/\/+$/, '') || 'https://api.dify.ai/v1';

interface ChatRequestBody {
  query?: string;
  user?: string;
  conversation_id?: string;
  inputs?: Record<string, unknown>;
  files?: unknown[];
}

function sseError(message: string, status = 500): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const payload = JSON.stringify({ event: 'error', message });
      controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    return sseError(
      'Dify proxy is not configured. Set DIFY_API_KEY on the server.',
      500,
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return sseError('Invalid JSON body.', 400);
  }

  const query = (body.query ?? '').trim();
  if (!query) {
    return sseError('`query` is required.', 400);
  }

  const user = body.user?.trim() || 'zoracore-anon';
  const conversationId = body.conversation_id ?? '';
  const inputs = body.inputs ?? {};

  const upstream = await fetch(`${DIFY_API_BASE}/chat-messages`, {
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
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return sseError(
      `Dify upstream error (${upstream.status}): ${text.slice(0, 500) || upstream.statusText}`,
      upstream.status || 502,
    );
  }

  // Pass the SSE stream through. Dify already emits `data: {...}\n\n` frames.
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
  return new Response(
    JSON.stringify({
      service: 'zoracore-chat-proxy',
      upstream: DIFY_API_BASE,
      configured: Boolean(process.env.DIFY_API_KEY),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
