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
import { lookup } from 'node:dns/promises';

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

function isPrivateIPv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  if (a === 10) return true; //  10.0.0.0/8
  if (a === 127) return true; //  loopback
  if (a === 0) return true; //  0.0.0.0/8
  if (a === 169 && b === 254) return true; //  link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; //  172.16.0.0/12
  if (a === 192 && b === 168) return true; //  192.168.0.0/16
  return false;
}

function parseIPv4(s: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const nums = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] as const;
  if (nums.some((n) => n < 0 || n > 255)) return null;
  return nums as unknown as [number, number, number, number];
}

/**
 * Best-effort block for IPv6 SSRF vectors. The WHATWG URL parser hands
 * us bracketed hostnames like `"[::1]"` and `"[::ffff:a9fe:a9fe]"` — the
 * latter is an IPv4-mapped address equivalent to 169.254.169.254 (cloud
 * metadata). We check the stripped form against well-known unsafe
 * prefixes and, for IPv4-mapped addresses, also run the inner IPv4
 * through the private-range test.
 */
function isDisallowedIPv6(stripped: string): boolean {
  const h = stripped.toLowerCase();
  if (h === '::' || h === '::1' || h === '0:0:0:0:0:0:0:0' || h === '0:0:0:0:0:0:0:1') return true;
  if (h.startsWith('fe80:')) return true; //  link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true; //  unique-local (fc00::/7)
  if (h.startsWith('ff')) return true; //  multicast
  // IPv4-mapped (::ffff:x.x.x.x or ::ffff:aabb:ccdd)
  if (h.startsWith('::ffff:') || h.startsWith('0:0:0:0:0:ffff:')) {
    const tail = h.replace(/^::ffff:/, '').replace(/^0:0:0:0:0:ffff:/, '');
    const dotted = parseIPv4(tail);
    if (dotted && isPrivateIPv4(dotted)) return true;
    // hex form like "a9fe:a9fe" → 169.254.169.254
    const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(tail);
    if (hex) {
      const left = parseInt(hex[1], 16);
      const right = parseInt(hex[2], 16);
      const ipv4: [number, number, number, number] = [
        (left >> 8) & 0xff,
        left & 0xff,
        (right >> 8) & 0xff,
        right & 0xff,
      ];
      if (isPrivateIPv4(ipv4)) return true;
    }
  }
  return false;
}

function isAllowedUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // URL.hostname returns IPv6 addresses wrapped in brackets, e.g. "[::1]".
  // Strip them before running string/IP checks so `host === '::1'` actually
  // matches and we can run the IPv6 blocklist.
  const rawHost = u.hostname.toLowerCase();
  const host = rawHost.replace(/^\[|\]$/g, '');

  // Named hosts we never want to reach.
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'metadata.google.internal'
  ) {
    return null;
  }

  // IPv4 literal (including 0.0.0.0, 127.*, 10.*, 172.16-31.*, 192.168.*,
  // 169.254.* which covers the EC2/GCP metadata endpoint 169.254.169.254).
  const v4 = parseIPv4(host);
  if (v4) {
    if (isPrivateIPv4(v4)) return null;
    return u;
  }

  // IPv6 literal (bracketed in the raw hostname). Covers ::1, ::ffff:…
  // IPv4-mapped addresses, link-local, unique-local, multicast.
  if (rawHost.startsWith('[') && rawHost.endsWith(']')) {
    if (isDisallowedIPv6(host)) return null;
  }

  return u;
}

/**
 * Resolve the hostname via the OS resolver and verify every returned
 * address is in a public range. This closes the DNS-rebinding SSRF
 * bypass where `evil.example.com` resolves to 169.254.169.254: the
 * hostname-only blocklist in `isAllowedUrl` would pass it, but the
 * fetch would then connect to the metadata endpoint. We resolve here
 * and reject if ANY returned address is private / link-local / loopback
 * / multicast / IPv4-mapped private.
 *
 * Note on TOCTOU: a truly adversarial DNS server could return a public
 * IP to this lookup and a private IP to the subsequent fetch. Fully
 * closing that requires a custom `undici` connect callback that checks
 * the actually-connected socket address. This implementation raises
 * the bar to "cooperative attacker with a compliant DNS record" which
 * matches the threat model of a user-pasted URL on a non-critical
 * read-only extractor.
 */
async function hostResolvesToAllowed(hostname: string): Promise<boolean> {
  // If the hostname is already an IP literal, `isAllowedUrl` handled it.
  const stripped = hostname.replace(/^\[|\]$/g, '');
  if (parseIPv4(stripped)) return true;
  if (stripped.includes(':')) return true; //  already an IPv6 literal
  try {
    const addrs = await lookup(hostname, { all: true });
    if (addrs.length === 0) return false;
    for (const a of addrs) {
      if (a.family === 4) {
        const v4 = parseIPv4(a.address);
        if (!v4) return false; //  unparseable, treat as unsafe
        if (isPrivateIPv4(v4)) return false;
      } else if (a.family === 6) {
        if (isDisallowedIPv6(a.address.toLowerCase())) return false;
      } else {
        return false;
      }
    }
    return true;
  } catch {
    return false; //  NXDOMAIN / DNS failure → refuse the fetch
  }
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

  // Manually follow redirects so each hop is re-validated against the SSRF
  // blocklist (otherwise an attacker could return a 302 pointing at
  // 169.254.169.254 or an RFC1918 host and bypass isAllowedUrl).
  const MAX_REDIRECTS = 5;
  let response: Response;
  let currentUrl = parsed;
  try {
    let redirects = 0;
    for (;;) {
      // DNS-rebinding guard: verify the hostname resolves to a public
      // address before each fetch, including after every redirect hop.
      const dnsOk = await hostResolvesToAllowed(currentUrl.hostname);
      if (!dnsOk) {
        return jsonError(
          'Hostname resolves to a disallowed address (SSRF guard).',
          400,
        );
      }
      response = await fetch(currentUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'ValhallaAI-SiteAnalysis/1.0 (+https://zoracore.dk)',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return jsonError('Redirect response missing Location header.', 502);
        }
        redirects += 1;
        if (redirects > MAX_REDIRECTS) {
          return jsonError(
            `Too many redirects (> ${MAX_REDIRECTS}).`,
            502,
          );
        }
        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          return jsonError('Redirect Location was not a valid URL.', 502);
        }
        const validated = isAllowedUrl(nextUrl.toString());
        if (!validated) {
          return jsonError(
            'Redirect points to a disallowed host (SSRF guard).',
            400,
          );
        }
        currentUrl = validated;
        continue;
      }
      break;
    }
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
