import { NextRequest, NextResponse } from 'next/server';
import { appendMirrorEvents, isMirrorStoreEnabled } from '@/lib/valhalla/mirror/store';
import type { MirrorEvent } from '@/lib/valhalla/mirror/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

function isMirrorEvent(value: unknown): value is MirrorEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    typeof (value as { agent?: unknown }).agent === 'string' &&
    typeof (value as { sessionId?: unknown }).sessionId === 'string' &&
    typeof (value as { at?: unknown }).at === 'number'
  );
}

export async function POST(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const { sessionId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    events?: unknown;
    swarmJobId?: unknown;
  } | null;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 });
  }
  if (!body || !Array.isArray(body.events) || !body.events.every(isMirrorEvent)) {
    return NextResponse.json({ error: 'Expected events: MirrorEvent[].' }, { status: 400 });
  }
  if (!isMirrorStoreEnabled()) {
    return NextResponse.json(
      { error: 'Mirror store is not configured.' },
      { status: 503 },
    );
  }

  const rows = await appendMirrorEvents({
    agentSessionId: sessionId,
    swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
    events: body.events,
  });

  return NextResponse.json({ events: rows });
}
