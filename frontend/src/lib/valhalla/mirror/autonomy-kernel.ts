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

export interface AutonomyKernelState {
  agent: MirrorAgentName;
  sessionId: string;
  step: number;
  observations: string[];
}

export interface AutonomyPolicy {
  decide(state: AutonomyKernelState): Promise<AutonomyDecision>;
}

export interface AutonomyKernelOptions {
  agent: MirrorAgentName;
  userId: string;
  chatSessionId?: string | null;
  swarmJobId?: string | null;
  maxSteps?: number;
  gateway: MirrorRuntimeGateway;
  policy: AutonomyPolicy;
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

    const state: AutonomyKernelState = {
      agent: session.agent,
      sessionId: session.sessionId,
      step: 0,
      observations: [],
    };

    for (let step = 1; step <= maxSteps; step++) {
      state.step = step;
      events.push(
        statusEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: 'thinking',
          summary: 'Choosing next tool action from planner and observations',
        }),
      );

      const decision = await options.policy.decide(state);
      if (decision.kind === 'finish') {
        events.push(
          statusEvent({
            agent: session.agent,
            sessionId: session.sessionId,
            step,
            status: 'completed',
            summary: decision.summary,
          }),
        );
        return { session, status: 'completed', events };
      }

      if (decision.kind === 'block') {
        events.push(
          statusEvent({
            agent: session.agent,
            sessionId: session.sessionId,
            step,
            status: 'blocked',
            summary: decision.reason,
          }),
        );
        return { session, status: 'blocked', events };
      }

      events.push(
        statusEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: 'acting',
          summary: decision.summary,
        }),
      );

      const observation = await options.gateway.invoke(session, decision.command);
      events.push(...observation.events);
      state.observations.push(observation.summary);

      events.push(
        statusEvent({
          agent: session.agent,
          sessionId: session.sessionId,
          step,
          status: observation.ok ? 'observing' : 'recovering',
          summary: observation.summary,
        }),
      );
    }

    events.push(
      statusEvent({
        agent: session.agent,
        sessionId: session.sessionId,
        step: maxSteps,
        status: 'failed',
        summary: `AutonomyKernel exhausted ${maxSteps} steps without finishing`,
      }),
    );
    return { session, status: 'failed', events };
  }
}
