import { NextRequest, NextResponse } from 'next/server';
import { createMirrorAgentSession, isMirrorStoreEnabled } from '@/lib/valhalla/mirror/store';
import type { MirrorAgentName } from '@/lib/valhalla/mirror/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIRROR_AGENTS = new Set<MirrorAgentName>([
  'eivor',
  'odin',
  'heimdall',
  'loki',
  'thor',
  'freja',
  'hugin',
  'munin',
]);

function isMirrorAgentName(value: unknown): value is MirrorAgentName {
  return typeof value === 'string' && MIRROR_AGENTS.has(value as MirrorAgentName);
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    userId?: unknown;
    agent?: unknown;
    title?: unknown;
    chatSessionId?: unknown;
    swarmJobId?: unknown;
  } | null;

  if (!body || typeof body.userId !== 'string' || !isMirrorAgentName(body.agent)) {
    return NextResponse.json(
      { error: 'Expected userId and a valid Mirror agent.' },
      { status: 400 },
    );
  }

  if (!isMirrorStoreEnabled()) {
    return NextResponse.json(
      { error: 'Mirror store is not configured.' },
      { status: 503 },
    );
  }

  const session = await createMirrorAgentSession({
    userId: body.userId,
    agent: body.agent,
    title: typeof body.title === 'string' ? body.title : undefined,
    chatSessionId: typeof body.chatSessionId === 'string' ? body.chatSessionId : null,
    swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
  });

  return NextResponse.json({ session });
}
