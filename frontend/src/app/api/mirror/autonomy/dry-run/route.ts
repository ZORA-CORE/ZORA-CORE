import { NextRequest, NextResponse } from 'next/server';
import { AutonomyKernel, type AutonomyDecision } from '@/lib/valhalla/mirror/autonomy-kernel';
import type { MirrorAgentName } from '@/lib/valhalla/mirror/events';
import { createRuntimeUnavailableGateway } from '@/lib/valhalla/mirror/runtime-gateway';
import { appendMirrorEvents, createMirrorAgentSession, isMirrorStoreEnabled } from '@/lib/valhalla/mirror/store';

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
    prompt?: unknown;
    chatSessionId?: unknown;
    swarmJobId?: unknown;
  } | null;

  if (!body || typeof body.userId !== 'string' || !isMirrorAgentName(body.agent)) {
    return NextResponse.json(
      { error: 'Expected userId and a valid Mirror agent.' },
      { status: 400 },
    );
  }

  let called = false;
  const kernel = new AutonomyKernel();
  const result = await kernel.run({
    agent: body.agent,
    userId: body.userId,
    chatSessionId: typeof body.chatSessionId === 'string' ? body.chatSessionId : null,
    swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
    maxSteps: 2,
    gateway: createRuntimeUnavailableGateway(),
    policy: {
      async decide(): Promise<AutonomyDecision> {
        if (called) {
          return { kind: 'finish', summary: 'Dry-run AutonomyKernel loop reached closure.' };
        }
        called = true;
        return {
          kind: 'act',
          summary: 'Probe persistent terminal runtime gateway contract',
          command: {
            tool: 'terminal_read',
            input: { terminalId: `${body.agent}-terminal` },
          },
        };
      },
    },
  });

  if (!isMirrorStoreEnabled()) {
    return NextResponse.json({ source: 'seed', result });
  }

  const session = await createMirrorAgentSession({
    userId: body.userId,
    agent: body.agent,
    title: `${body.agent.toUpperCase()} AutonomyKernel dry-run`,
    chatSessionId: typeof body.chatSessionId === 'string' ? body.chatSessionId : null,
    swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
  });

  const persisted = session
    ? await appendMirrorEvents({
        agentSessionId: session.id,
        swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
        events: result.events.map((event) => ({ ...event, sessionId: session.id })),
      })
    : [];

  return NextResponse.json({ source: 'database', result, persisted });
}
