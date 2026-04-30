import { NextRequest, NextResponse } from 'next/server';
import type { MirrorAgentName, MirrorEvent } from '@/lib/valhalla/mirror/events';
import { commandToMirrorEvent } from '@/lib/valhalla/mirror/runtime-events';
import {
  E2BMirrorRuntimeGateway,
  MirrorRuntimeUnavailableError,
  type MirrorRuntimeCommand,
  type MirrorRuntimeTool,
} from '@/lib/valhalla/mirror/runtime-gateway';
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

const e2bGateway = new E2BMirrorRuntimeGateway();

function isMirrorAgentName(value: unknown): value is MirrorAgentName {
  return typeof value === 'string' && MIRROR_AGENTS.has(value as MirrorAgentName);
}

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
    userId?: unknown;
    execute?: unknown;
    swarmJobId?: unknown;
  } | null;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 });
  }
  if (!body || !isMirrorAgentName(body.agent) || !isRuntimeCommand(body.command)) {
    return NextResponse.json(
      { error: 'Expected agent and runtime command.' },
      { status: 400 },
    );
  }

  const agent = body.agent;
  const shouldExecute = body.execute === true;

  let ok = true;
  let summary = `${body.command.tool} persisted`;
  let events: MirrorEvent[];

  if (shouldExecute) {
    try {
      const runtimeSession = await e2bGateway.ensureSession({
        agent,
        userId: typeof body.userId === 'string' ? body.userId : 'founder',
      });
      const observation = await e2bGateway.invoke(runtimeSession, body.command);
      ok = observation.ok;
      summary = observation.summary;
      events = observation.events.map((event) => ({ ...event, sessionId }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ok = false;
      summary = message;
      events = [
        {
          type: 'autonomy_observation',
          agent,
          sessionId,
          step: 0,
          kind: 'tool_result',
          summary:
            err instanceof MirrorRuntimeUnavailableError
              ? message
              : `runtime command failed: ${message}`,
          recoverable: true,
          at: Date.now(),
        },
      ];
    }
  } else {
    events = [
      commandToMirrorEvent({
        agent,
        sessionId,
        command: body.command,
      }),
    ];
  }

  if (!isMirrorStoreEnabled()) {
    return NextResponse.json({
      source: 'seed',
      observation: {
        ok,
        summary:
          summary === `${body.command.tool} persisted`
            ? `${body.command.tool} accepted; Mirror store is not configured.`
            : summary,
        events,
      },
    });
  }

  const rows = await appendMirrorEvents({
    agentSessionId: sessionId,
    swarmJobId: typeof body.swarmJobId === 'string' ? body.swarmJobId : null,
    events,
  });

  return NextResponse.json({
    source: 'database',
    observation: {
      ok,
      summary,
      events: rows,
    },
  });
}
