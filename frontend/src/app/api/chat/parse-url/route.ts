/**
 * Valhalla AI — server-side URL content extractor.
 *
 * Fetches a URL server-side, extracts readable text (stripping scripts,
 * styles, nav boilerplate, and HTML tags), and returns it for injection
 * as chat context on the next turn. This lets the user paste a URL for
 * "site analysis" without the swarm having to fetch it client-side
 * (which would hit CORS for most domains).
 *
 * Request JSON: { url: string }
 * Response 200: { ok: true, url, title, characters, truncated, text }
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_CHARS = 40_000;
const MAX_FETCH_BYTES = 5 * 1024 * 1024;

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isAllowedUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // Block private/loopback hostnames to prevent SSRF.
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    // Metadata endpoints
    host === '169.254.169.254' ||
    host === 'metadata.google.internal'
  ) {
    return null;
  }
  return u;
}

function extractReadable(html: string): { title: string; text: string } {
  // Strip <script>/<style>/<noscript>/<template> blocks entirely.
  let cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(cleaned);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

  // Prefer <main> / <article> if present, else use <body>.
  const mainMatch =
    /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(cleaned) ??
    /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(cleaned) ??
    /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(cleaned);
  if (mainMatch) cleaned = mainMatch[1];

  // Replace block-level tags with newlines, then strip everything else.
  const text = cleaned
    .replace(/<(br|p|div|section|h[1-6]|li|tr)\b[^>]*>/gi, '\n')
    .replace(/<\/(p|div|section|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return { title, text };
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return jsonError('Expected JSON body with `url` field.', 400);
  }

  const parsed = isAllowedUrl(body.url ?? '');
  if (!parsed) {
    return jsonError('Invalid or disallowed URL.', 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('timeout')),
    FETCH_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'ValhallaAI-SiteAnalysis/1.0 (+https://zoracore.dk)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const reason = err instanceof Error ? err.message : 'Unknown fetch error';
    const isTimeout = /timeout/i.test(reason);
    return jsonError(
      isTimeout ? `Fetch timed out after ${FETCH_TIMEOUT_MS}ms.` : `Fetch failed: ${reason}`,
      isTimeout ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return jsonError(`Upstream returned ${response.status} ${response.statusText}.`, 502);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!/text\/html|application\/xhtml/i.test(contentType)) {
    return jsonError(`Unsupported content-type: ${contentType || 'unknown'}`, 415);
  }

  // Cap body size.
  const reader = response.body?.getReader();
  if (!reader) return jsonError('Upstream returned no body.', 502);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_FETCH_BYTES) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  if (total >= MAX_FETCH_BYTES) {
    try { await reader.cancel(); } catch { /* ignore */ }
  }
  const rawHtml = new TextDecoder('utf-8', { fatal: false }).decode(
    chunks.reduce(
      (acc, c) => {
        const next = new Uint8Array(acc.length + c.length);
        next.set(acc, 0);
        next.set(c, acc.length);
        return next;
      },
      new Uint8Array(0),
    ),
  );

  const { title, text: extractedText } = extractReadable(rawHtml);
  const truncated = extractedText.length > MAX_RESPONSE_CHARS;
  const text = truncated
    ? extractedText.slice(0, MAX_RESPONSE_CHARS) +
      `\n\n… [truncated at ${MAX_RESPONSE_CHARS.toLocaleString()} chars]`
    : extractedText;

  return new Response(
    JSON.stringify({
      ok: true,
      url: parsed.toString(),
      title,
      characters: text.length,
      truncated,
      text,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
