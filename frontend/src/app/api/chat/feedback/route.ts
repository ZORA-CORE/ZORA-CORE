/**
 * Valhalla AI — Dify feedback proxy.
 *
 * Forwards a per-message 'Correct the Gods' rating + optional content to
 * Dify's `/v1/messages/{message_id}/feedbacks` endpoint. This backs the
 * thumbs-up / thumbs-down + free-text modal on assistant messages so the
 * Dify workspace accumulates long-term memory of what worked and what
 * didn't for this user's workflow.
 *
 * Request body:
 *   {
 *     message_id: string,     // Dify message id (from SSE message_end)
 *     rating: 'like' | 'dislike' | null,
 *     user: string,           // stable per-user id
 *     content?: string,       // optional free-text explanation
 *   }
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DIFY_API_BASE =
  process.env.DIFY_API_BASE_URL?.replace(/\/+$/, '') || 'https://api.dify.ai/v1';
const DIFY_TIMEOUT_MS = Number(process.env.DIFY_TIMEOUT_MS || 45_000);

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

interface FeedbackBody {
  message_id?: string;
  rating?: 'like' | 'dislike' | null;
  user?: string;
  content?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    return jsonError(
      'Dify proxy is not configured. Set DIFY_API_KEY on the server.',
      500,
    );
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const messageId = (body.message_id ?? '').trim();
  if (!messageId) return jsonError('`message_id` is required.', 400);
  const user = (body.user ?? '').trim() || 'valhalla-anon';
  const rating = body.rating === 'like' || body.rating === 'dislike' ? body.rating : null;
  const content = typeof body.content === 'string' ? body.content.slice(0, 2000) : undefined;

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
    upstream = await fetch(
      `${DIFY_API_BASE}/messages/${encodeURIComponent(messageId)}/feedbacks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          user,
          ...(content ? { content } : {}),
        }),
        signal: upstreamController.signal,
      },
    );
  } catch (err) {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', onClientAbort);
    const reason = err instanceof Error ? err.message : 'Unknown upstream error';
    const isTimeout = /timeout/i.test(reason);
    return jsonError(
      isTimeout
        ? `Upstream Dify feedback timed out after ${DIFY_TIMEOUT_MS}ms.`
        : `Upstream Dify feedback failed: ${reason}`,
      504,
    );
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', onClientAbort);
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return jsonError(
      `Dify feedback error (${upstream.status}): ${text.slice(0, 500) || upstream.statusText}`,
      upstream.status || 502,
    );
  }

  return new Response(text || '{"result":"success"}', {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
