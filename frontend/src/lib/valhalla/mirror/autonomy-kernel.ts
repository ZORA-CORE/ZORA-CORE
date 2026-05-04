import type { MirrorAgentName, MirrorEvent } from './events';
import type {
  MirrorRuntimeCommand,
  MirrorRuntimeGateway,
  MirrorRuntimeSession,
} from './runtime-gateway';

export type AutonomyDecision =
  | { kind: 'act'; summary: string; command: MirrorRuntimeCommand }
  | { kind: 'finish'; summary: string }
  | { kind: 'block'; summary: string; reason: string };

export interface AutonomyRuntimeObservation {
  ok: boolean;
  summary: string;
  output?: string;
  events: MirrorEvent[];
}

export interface AutonomyKernelState {
  agent: MirrorAgentName;
  sessionId: string;
  step: number;
  prompt: string;
  observations: AutonomyRuntimeObservation[];
}

export interface AutonomyPolicy {
  decide(state: AutonomyKernelState): Promise<AutonomyDecision>;
}

export interface AutonomyKernelEventSink {
  append(events: MirrorEvent[]): Promise<void>;
}

export interface AutonomyKernelOptions {
  agent: MirrorAgentName;
  userId: string;
  chatSessionId?: string | null;
  swarmJobId?: string | null;
  prompt?: string;
  maxSteps?: number;
  gateway: MirrorRuntimeGateway;
  policy: AutonomyPolicy;
  eventSink?: AutonomyKernelEventSink;
}

export interface AutonomyKernelResult {
  session: MirrorRuntimeSession;
  status: 'completed' | 'blocked' | 'failed';
  events: MirrorEvent[];
}

function statusEvent(params: {
  agent: MirrorAgentName;
  sessionId: string;
  step: number;
  status: 'thinking' | 'acting' | 'observing' | 'recovering' | 'blocked' | 'completed' | 'failed';
  summary: string;
}): MirrorEvent {
  return {
    type: 'autonomy_loop_status',
    agent: params.agent,
    sessionId: params.sessionId,
    step: params.step,
    status: params.status,
    summary: params.summary,
    at: Date.now(),
  };
}

function plannerItemId(step: number, suffix: string): string {
  return `autonomy-step-${step}-${suffix}`;
}

function plannerCreatedEvent(params: {
  agent: MirrorAgentName;
  sessionId: string;
  step: number;
  title: string;
}): MirrorEvent {
  return {
    type: 'planner_item_created',
    agent: params.agent,
    sessionId: params.sessionId,
    item: {
      id: plannerItemId(params.step, 'action'),
      title: params.title,
      status: 'in_progress',
      position: params.step,
    },
    at: Date.now(),
  };
}

function plannerUpdatedEvent(params: {
  agent: MirrorAgentName;
  sessionId: string;
  step: number;
  status: 'completed' | 'blocked';
  detail: string;
}): MirrorEvent {
  return {
    type: 'planner_item_updated',
    agent: params.agent,
    sessionId: params.sessionId,
    itemId: plannerItemId(params.step, 'action'),
    patch: {
      status: params.status,
      detail: params.detail,
    },
    at: Date.now(),
  };
}

export class AutonomyKernel {
  async run(options: AutonomyKernelOptions): Promise<AutonomyKernelResult> {
    const maxSteps = options.maxSteps ?? 16;
    const session = await options.gateway.ensureSession({
      agent: options.agent,
      userId: options.userId,
      chatSessionId: options.chatSessionId,
      swarmJobId: options.swarmJobId,
    });

    const events: MirrorEvent[] = [
      {
        type: 'mirror_session_started',
        agent: session.agent,
        sessionId: session.sessionId,
        runtimeProvider: session.provider,
        runtimeId: session.runtimeId ?? undefined,
        sandboxId: session.sandboxId ?? undefined,
        workdir: session.workdir,
        at: Date.now(),
      },
    ];
    await options.eventSink?.append(events);

    const state: AutonomyKernelState = {
      agent: session.agent,
      sessionId: session.sessionId,
      step: 0,
      prompt: options.prompt ?? '',
      observations: [],
    };

    for (let step = 1; step <= maxSteps; step++) {
      state.step = step;
      const thinkingEvents = [
        statusEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: 'thinking',
          summary: 'Choosing next tool action from planner and observations',
        }),
      ];
      events.push(...thinkingEvents);
      await options.eventSink?.append(thinkingEvents);

      const decision = await options.policy.decide(state);
      if (decision.kind === 'finish') {
        const completedEvents = [
          statusEvent({
            agent: session.agent,
            sessionId: session.sessionId,
            step,
            status: 'completed',
            summary: decision.summary,
          }),
          {
            type: 'mirror_session_status',
            agent: session.agent,
            sessionId: session.sessionId,
            status: 'completed',
            message: decision.summary,
            at: Date.now(),
          } satisfies MirrorEvent,
        ];
        events.push(...completedEvents);
        await options.eventSink?.append(completedEvents);
        return { session, status: 'completed', events };
      }

      if (decision.kind === 'block') {
        const blockedEvents = [
          statusEvent({
            agent: session.agent,
            sessionId: session.sessionId,
            step,
            status: 'blocked',
            summary: decision.reason,
          }),
          {
            type: 'mirror_session_status',
            agent: session.agent,
            sessionId: session.sessionId,
            status: 'blocked',
            message: decision.reason,
            at: Date.now(),
          } satisfies MirrorEvent,
        ];
        events.push(...blockedEvents);
        await options.eventSink?.append(blockedEvents);
        return { session, status: 'blocked', events };
      }

      const actionEvents = [
        plannerCreatedEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          title: decision.summary,
        }),
        statusEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: 'acting',
          summary: decision.summary,
        }),
      ];
      events.push(...actionEvents);
      await options.eventSink?.append(actionEvents);

      const observation = await options.gateway.invoke(session, decision.command);
      const observedEvents: MirrorEvent[] = [
        ...observation.events,
        plannerUpdatedEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: observation.ok ? 'completed' : 'blocked',
          detail: observation.summary,
        }),
      ];
      events.push(...observedEvents);
      state.observations.push(observation);
      await options.eventSink?.append(observedEvents);

      const recoveryEvents = [
        statusEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: observation.ok ? 'observing' : 'recovering',
          summary: observation.summary,
        }),
      ];
      events.push(...recoveryEvents);
      await options.eventSink?.append(recoveryEvents);
    }

    const failedEvents = [
      statusEvent({
        agent: session.agent,
        sessionId: session.sessionId,
        step: maxSteps,
        status: 'failed',
        summary: `AutonomyKernel exhausted ${maxSteps} steps without finishing`,
      }),
      {
        type: 'mirror_session_status',
        agent: session.agent,
        sessionId: session.sessionId,
        status: 'failed',
        message: `AutonomyKernel exhausted ${maxSteps} steps without finishing`,
        at: Date.now(),
      } satisfies MirrorEvent,
    ];
    events.push(...failedEvents);
    await options.eventSink?.append(failedEvents);
    return { session, status: 'failed', events };
  }
}
