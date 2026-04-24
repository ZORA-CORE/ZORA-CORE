/**
 * Valhalla AI — Master Protocol PR 3: The Pain Receptor
 * (`/api/swarm/error-handler`).
 *
 * Ingests structured error payloads from the frontend (hydration
 * errors, `onerror` / `unhandledrejection`, explicit `logError(...)`
 * calls) and server middleware (500s). Every accepted ingest is
 * persisted to `valhalla_incidents`. When severity is >= error AND
 * `VALHALLA_PAIN_AUTOWAKE=1` is set, the Pain Receptor can later
 * enqueue a swarm run (wiring deferred to PR 4 — today we only
 * record the intent via the `swarm_triggered=true` flag).
 *
 * Authentication:
 *   * If `VALHALLA_INGEST_SECRET` is set we require a matching
 *     `x-valhalla-secret` header. HMAC comparison is constant-time.
 *   * Otherwise we accept same-origin POSTs (Next.js handles CORS
 *     automatically for same-origin fetches from our own pages).
 *
 * Runtime: Node (we use `crypto.timingSafeEqual`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import {
  insertIncident,
  isSingularityStoreEnabled,
  type IncidentInput,
} from '@/lib/valhalla/singularity/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

function isPainReceptorEnabled(): boolean {
  const raw = process.env.VALHALLA_PAIN_RECEPTOR ?? '';
  return raw === '1' || raw.toLowerCase() === 'true';
}

function authorized(req: NextRequest): boolean {
  const expected = process.env.VALHALLA_INGEST_SECRET;
  if (!expected) return true;
  const actual = req.headers.get('x-valhalla-secret') ?? '';
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseSeverity(raw: unknown): IncidentInput['severity'] {
  const v = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (v === 'fatal' || v === 'error' || v === 'warning' || v === 'info') return v;
  return 'error';
}

function parseSource(raw: unknown): IncidentInput['source'] {
  const v = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (
    v === 'frontend_error' ||
    v === 'api_500' ||
    v === 'hydration' ||
    v === 'manual' ||
    v === 'other'
  ) {
    return v;
  }
  return 'other';
}

function fingerprintOf(message: string, stack?: string): string {
  const first = (stack ?? '').split('\n').find((line) => line.includes('at ')) ?? '';
  return `${message.slice(0, 120)}|${first.trim().slice(0, 200)}`;
}

function shouldWakeSwarm(severity: IncidentInput['severity']): boolean {
  const autowake = process.env.VALHALLA_PAIN_AUTOWAKE;
  if (autowake !== '1' && autowake?.toLowerCase() !== 'true') return false;
  return severity === 'error' || severity === 'fatal';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isPainReceptorEnabled()) {
    return NextResponse.json(
      {
        error:
          'The Pain Receptor is disabled. Set VALHALLA_PAIN_RECEPTOR=1 to enable incident ingest.',
      },
      { status: 503 },
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSingularityStoreEnabled()) {
    return NextResponse.json(
      { error: 'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    raw = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Field "message" is required' }, { status: 400 });
  }
  const stack = typeof body.stack === 'string' ? body.stack : undefined;
  const severity = parseSeverity(body.severity);
  const source = parseSource(body.source);
  const input: IncidentInput = {
    source,
    severity,
    message,
    stack,
    url: typeof body.url === 'string' ? body.url : undefined,
    userAgent:
      typeof body.userAgent === 'string'
        ? body.userAgent
        : (req.headers.get('user-agent') ?? undefined),
    userId: typeof body.userId === 'string' ? body.userId : undefined,
    sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
    fingerprint:
      typeof body.fingerprint === 'string'
        ? body.fingerprint
        : fingerprintOf(message, stack),
    context:
      typeof body.context === 'object' && body.context !== null
        ? (body.context as Record<string, unknown>)
        : undefined,
    swarmTriggered: shouldWakeSwarm(severity),
  };

  try {
    const row = await insertIncident(input);
    return NextResponse.json(
      {
        ok: true,
        id: row?.id ?? null,
        fingerprint: row?.fingerprint ?? input.fingerprint ?? null,
        swarmTriggered: row?.swarm_triggered ?? input.swarmTriggered ?? false,
      },
      { status: 202 },
    );
  } catch (err) {
    const messageOut = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: messageOut }, { status: 500 });
  }
}
