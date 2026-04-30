import type { MirrorAgentName, MirrorEvent } from './events';

export type MirrorRuntimeTool =
  | 'terminal_send'
  | 'terminal_read'
  | 'terminal_interrupt'
  | 'editor_open'
  | 'editor_write'
  | 'browser_open'
  | 'browser_click'
  | 'browser_type'
  | 'browser_screenshot'
  | 'git_status'
  | 'ci_watch';

export interface MirrorRuntimeSession {
  sessionId: string;
  agent: MirrorAgentName;
  provider: 'e2b' | 'cloudflare-container' | 'fly' | string;
  runtimeId: string | null;
  sandboxId: string | null;
  workdir: string;
}

export interface MirrorRuntimeCommand {
  tool: MirrorRuntimeTool;
  input: Record<string, unknown>;
}

export interface MirrorRuntimeObservation {
  ok: boolean;
  summary: string;
  output?: string;
  events: MirrorEvent[];
}

export interface MirrorRuntimeGateway {
  ensureSession(params: {
    agent: MirrorAgentName;
    userId: string;
    chatSessionId?: string | null;
    swarmJobId?: string | null;
  }): Promise<MirrorRuntimeSession>;
  invoke(
    session: MirrorRuntimeSession,
    command: MirrorRuntimeCommand,
  ): Promise<MirrorRuntimeObservation>;
  heartbeat(session: MirrorRuntimeSession): Promise<void>;
  stop(session: MirrorRuntimeSession): Promise<void>;
}

export class MirrorRuntimeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MirrorRuntimeUnavailableError';
  }
}

export function createRuntimeUnavailableGateway(): MirrorRuntimeGateway {
  return {
    async ensureSession(params) {
      return {
        sessionId: `mirror-${params.agent}`,
        agent: params.agent,
        provider: 'e2b',
        runtimeId: null,
        sandboxId: null,
        workdir: '/home/user/valhalla',
      };
    },
    async invoke(session, command) {
      const summary = `${command.tool} awaits persistent runtime gateway wiring`;
      return {
        ok: false,
        summary,
        events: [
          {
            type: 'autonomy_observation',
            agent: session.agent,
            sessionId: session.sessionId,
            step: 0,
            kind: 'tool_result',
            summary,
            recoverable: true,
            at: Date.now(),
          },
        ],
      };
    },
    async heartbeat() {
      return undefined;
    },
    async stop() {
      return undefined;
    },
  };
}
