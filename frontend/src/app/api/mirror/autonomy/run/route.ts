import { NextRequest, NextResponse } from 'next/server';
import {
  AutonomyKernel,
  type AutonomyDecision,
  type AutonomyKernelState,
} from '@/lib/valhalla/mirror/autonomy-kernel';
import type { MirrorAgentName, MirrorEvent } from '@/lib/valhalla/mirror/events';
import {
  E2BMirrorRuntimeGateway,
  MirrorRuntimeUnavailableError,
  type MirrorRuntimeCommand,
} from '@/lib/valhalla/mirror/runtime-gateway';
import {
  appendMirrorEvents,
  createMirrorAgentSession,
  isMirrorStoreEnabled,
} from '@/lib/valhalla/mirror/store';

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

const e2bGateway = new E2BMirrorRuntimeGateway();

function isMirrorAgentName(value: unknown): value is MirrorAgentName {
  return typeof value === 'string' && MIRROR_AGENTS.has(value as MirrorAgentName);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function commandForState(state: AutonomyKernelState): MirrorRuntimeCommand {
  const previous = state.observations.at(-1);
  if (!previous) {
    return {
      tool: 'terminal_send',
      input: {
        terminalId: `${state.agent}-autonomy`,
        command: `printf '%s\\n' ${shellQuote(
          `mirror-autonomy:${state.agent}:${state.prompt}`,
        )}`,
        timeoutMs: 30_000,
      },
    };
  }

  if (previous.ok) {
    return {
      tool: 'terminal_read',
      input: {
        terminalId: `${state.agent}-autonomy`,
      },
    };
  }

  return {
    tool: 'terminal_send',
    input: {
      terminalId: `${state.agent}-autonomy`,
      command: 'pwd && ls -la | head',
      timeoutMs: 30_000,
    },
  };
}

function createPolicy(maxActions: number) {
  return {
    async decide(state: AutonomyKernelState): Promise<AutonomyDecision> {
      if (state.observations.length >= maxActions) {
        return {
          kind: 'finish',
          summary: `AutonomyKernel completed ${state.observations.length} tool observation(s).`,
        };
      }

      const previous = state.observations.at(-1);
      if (previous && !previous.ok && state.observations.length >= 2) {
        return {
          kind: 'block',
          summary: 'Runtime command remained unhealthy after recovery.',
          reason: previous.summary,
        };
      }

      return {
        kind: 'act',
        summary:
          previous && !previous.ok
            ? 'Recover from failed runtime observation'
            : 'Probe persistent Mirror runtime and capture observation',
        command: commandForState(state),
      };
    },
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    userId?: unknown;
    agent?: unknown;
    prompt?: unknown;
    chatSessionId?: unknown;
    swarmJobId?: unknown;
    maxSteps?: unknown;
  } | null;

  const userId = stringValue(body?.userId);
  if (!body || !userId || !isMirrorAgentName(body.agent)) {
    return NextResponse.json(
      { error: 'Expected userId and a valid Mirror agent.' },
      { status: 400 },
    );
  }

  const agent = body.agent;
  const prompt = stringValue(body.prompt) ?? 'Cognition Mirror autonomy probe';
  const chatSessionId = stringValue(body.chatSessionId);
  const swarmJobId = stringValue(body.swarmJobId);
  const maxSteps = Math.min(numberValue(body.maxSteps) ?? 3, 8);
  const maxActions = Math.max(1, maxSteps - 1);
  const persistedEvents: MirrorEvent[] = [];
  const persistedSession = isMirrorStoreEnabled()
    ? await createMirrorAgentSession({
        userId,
        agent,
        title: `${agent.toUpperCase()} AutonomyKernel run`,
        chatSessionId,
        swarmJobId,
      })
    : null;

  const kernel = new AutonomyKernel();

  try {
    const result = await kernel.run({
      agent,
      userId,
      chatSessionId,
      swarmJobId,
      prompt,
      maxSteps,
      gateway: e2bGateway,
      policy: createPolicy(maxActions),
      eventSink: persistedSession
        ? {
            async append(events) {
              const remapped = events.map((event) => ({
                ...event,
                sessionId: persistedSession.id,
              }));
              await appendMirrorEvents({
                agentSessionId: persistedSession.id,
                swarmJobId,
                events: remapped,
              });
              persistedEvents.push(...remapped);
            },
          }
        : undefined,
    });

    return NextResponse.json({
      source: persistedSession ? 'database' : 'seed',
      status: result.status,
      runtimeSession: result.session,
      events: persistedSession ? persistedEvents : result.events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const event: MirrorEvent = {
      type: 'autonomy_observation',
      agent,
      sessionId: persistedSession?.id ?? `mirror-${agent}-unavailable`,
      step: 0,
      kind: 'tool_result',
      summary:
        err instanceof MirrorRuntimeUnavailableError
          ? message
          : `AutonomyKernel failed before closure: ${message}`,
      recoverable: true,
      at: Date.now(),
    };

    if (persistedSession) {
      await appendMirrorEvents({
        agentSessionId: persistedSession.id,
        swarmJobId,
        events: [event],
      });
    }

    return NextResponse.json(
      {
        source: persistedSession ? 'database' : 'seed',
        status: 'failed',
        error: message,
        events: [event],
      },
      { status: err instanceof MirrorRuntimeUnavailableError ? 503 : 500 },
    );
  }
}
