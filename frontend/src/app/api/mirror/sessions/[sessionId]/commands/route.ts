import { NextRequest, NextResponse } from 'next/server';
import type { MirrorAgentName } from '@/lib/valhalla/mirror/events';
import { commandToMirrorEvent } from '@/lib/valhalla/mirror/runtime-events';
import type { MirrorRuntimeCommand, MirrorRuntimeTool } from '@/lib/valhalla/mirror/runtime-gateway';
import { appendMirrorEvents, isMirrorStoreEnabled } from '@/lib/valhalla/mirror/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const MIRROR_RUNTIME_TOOLS = new Set<MirrorRuntimeTool>([
  'terminal_send',
  'terminal_read',
  'terminal_interrupt',
  'editor_open',
  'editor_write',
  'browser_open',
  'browser_click',
  'browser_type',
  'browser_screenshot',
  'git_status',
  'ci_watch',
]);

function isRuntimeTool(value: unknown): value is MirrorRuntimeTool {
  return typeof value === 'string' && MIRROR_RUNTIME_TOOLS.has(value as MirrorRuntimeTool);
}

function isRuntimeCommand(value: unknown): value is MirrorRuntimeCommand {
  return (
    typeof value === 'object' &&
    value !== null &&
    isRuntimeTool((value as { tool?: unknown }).tool) &&
    typeof (value as { input?: unknown }).input === 'object' &&
    (value as { input?: unknown }).input !== null
  );
}

export async function POST(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const { sessionId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    agent?: unknown;
    command?: unknown;
    swarmJobId?: unknown;
  } | null;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 });
  }
  if (!body || typeof body.agent !== 'string' || !isRuntimeCommand(body.command)) {
    return NextResponse.json(
      { error: 'Expected agent and runtime command.' },
      { status: 400 },
    );
  }

  const event = commandToMirrorEvent({
    agent: body.agent as MirrorAgentName,
    sessionId,
    command: body.command,
  });

  if (!isMirrorStoreEnabled()) {
    return NextResponse.json({
      source: 'seed',
      observation: {
        ok: false,
        summary: `${body.command.tool} accepted; Mirror store is not configured.`,
        events: [event],
      },
    });
  }

  const rows = await appendMirrorEvents({
    agentSessionId: sessionId,
    swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
    events: [event],
  });

  return NextResponse.json({
    source: 'database',
    observation: {
      ok: true,
      summary: `${body.command.tool} persisted`,
      events: rows,
    },
  });
}
