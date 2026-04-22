/**
 * Valhalla AI — Dify file-upload proxy.
 *
 * Accepts a multipart/form-data POST with a single `file` field and proxies
 * it to Dify's `/v1/files/upload` endpoint. The Dify API key stays
 * server-side. Returns the raw Dify response body so the client can attach
 * the returned file id to the next chat-messages request.
 *
 * Request: multipart/form-data with fields
 *   file: File          (required, <= 20 MB)
 *   user: string        (required; stable per-user id)
 *
 * Response: the upstream JSON from Dify, e.g.
 *   { id, name, size, extension, mime_type, created_by, created_at }
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DIFY_API_BASE =
  process.env.DIFY_API_BASE_URL?.replace(/\/+$/, '') || 'https://api.dify.ai/v1';
const DIFY_TIMEOUT_MS = Number(process.env.DIFY_TIMEOUT_MS || 45_000);
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError('Expected multipart/form-data.', 400);
  }

  const file = form.get('file');
  const user = String(form.get('user') ?? '').trim() || 'valhalla-anon';
  if (!(file instanceof File)) {
    return jsonError('`file` field is required.', 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(
      `File too large (${file.size} bytes > ${MAX_UPLOAD_BYTES} bytes).`,
      413,
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.append('file', file, file.name);
  upstreamForm.append('user', user);

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
    upstream = await fetch(`${DIFY_API_BASE}/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
      signal: upstreamController.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', onClientAbort);
    const reason = err instanceof Error ? err.message : 'Unknown upstream error';
    const isTimeout = /timeout/i.test(reason);
    return jsonError(
      isTimeout
        ? `Upstream Dify upload timed out after ${DIFY_TIMEOUT_MS}ms.`
        : `Upstream Dify upload failed: ${reason}`,
      504,
    );
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', onClientAbort);
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return jsonError(
      `Dify upload error (${upstream.status}): ${text.slice(0, 500) || upstream.statusText}`,
      upstream.status || 502,
    );
  }

  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
