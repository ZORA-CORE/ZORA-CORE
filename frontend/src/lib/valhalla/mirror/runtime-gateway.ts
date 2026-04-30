import type { MirrorAgentName, MirrorEvent } from './events';
import {
  createSandbox,
  isSandboxEnabled,
  type SandboxHandle,
} from '../sandbox/e2b';

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

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function terminalEvent(params: {
  agent: MirrorAgentName;
  sessionId: string;
  terminalId: string;
  stream: 'stdin' | 'stdout' | 'stderr' | 'system';
  chunk: string;
}): MirrorEvent {
  return {
    type: 'terminal_chunk',
    agent: params.agent,
    sessionId: params.sessionId,
    terminalId: params.terminalId,
    stream: params.stream,
    chunk: params.chunk,
    at: Date.now(),
  };
}

export class E2BMirrorRuntimeGateway implements MirrorRuntimeGateway {
  private readonly sessions = new Map<string, MirrorRuntimeSession>();
  private readonly pendingSessions = new Map<string, Promise<MirrorRuntimeSession>>();
  private readonly sandboxes = new Map<string, SandboxHandle>();
  private readonly sessionKeys = new Map<string, string>();

  async ensureSession(params: {
    agent: MirrorAgentName;
    userId: string;
    chatSessionId?: string | null;
    swarmJobId?: string | null;
  }): Promise<MirrorRuntimeSession> {
    const key = `${params.userId}:${params.chatSessionId ?? 'standalone'}:${params.agent}`;
    const existing = this.sessions.get(key);
    if (existing) return existing;
    const pending = this.pendingSessions.get(key);
    if (pending) return pending;
    if (!isSandboxEnabled()) {
      throw new MirrorRuntimeUnavailableError('E2B_API_KEY is not configured.');
    }

    const promise = createSandbox({ agent: params.agent })
      .then((sandbox) => {
        const session: MirrorRuntimeSession = {
          sessionId: `mirror-${params.agent}-${sandbox.id}`,
          agent: params.agent,
          provider: 'e2b',
          runtimeId: sandbox.id,
          sandboxId: sandbox.id,
          workdir: sandbox.workdir,
        };
        this.sessions.set(key, session);
        this.sandboxes.set(session.sessionId, sandbox);
        this.sessionKeys.set(session.sessionId, key);
        return session;
      })
      .finally(() => {
        this.pendingSessions.delete(key);
      });

    this.pendingSessions.set(key, promise);
    return promise;
  }

  async invoke(
    session: MirrorRuntimeSession,
    command: MirrorRuntimeCommand,
  ): Promise<MirrorRuntimeObservation> {
    const sandbox = this.sandboxes.get(session.sessionId);
    if (!sandbox) {
      throw new MirrorRuntimeUnavailableError(`No sandbox for ${session.sessionId}.`);
    }

    switch (command.tool) {
      case 'terminal_send': {
        const terminalId = asString(command.input.terminalId) ?? `${session.agent}-terminal`;
        const cmd = asString(command.input.command) ?? '';
        const result = await sandbox.exec(cmd, {
          cwd: asString(command.input.cwd) ?? undefined,
          timeoutMs: asNumber(command.input.timeoutMs) ?? undefined,
        });
        const events: MirrorEvent[] = [
          terminalEvent({
            agent: session.agent,
            sessionId: session.sessionId,
            terminalId,
            stream: 'stdin',
            chunk: cmd,
          }),
          terminalEvent({
            agent: session.agent,
            sessionId: session.sessionId,
            terminalId,
            stream: 'stdout',
            chunk: result.stdout,
          }),
        ];
        if (result.stderr) {
          events.push(
            terminalEvent({
              agent: session.agent,
              sessionId: session.sessionId,
              terminalId,
              stream: 'stderr',
              chunk: result.stderr,
            }),
          );
        }
        events.push({
          type: 'terminal_exit',
          agent: session.agent,
          sessionId: session.sessionId,
          terminalId,
          command: cmd,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          at: Date.now(),
        });
        return {
          ok: result.exitCode === 0,
          summary: `terminal_send exit=${result.exitCode}`,
          output: [result.stdout, result.stderr].filter(Boolean).join('\n'),
          events,
        };
      }
      case 'terminal_read':
        return {
          ok: true,
          summary: 'terminal_read heartbeat',
          events: [
            terminalEvent({
              agent: session.agent,
              sessionId: session.sessionId,
              terminalId: asString(command.input.terminalId) ?? `${session.agent}-terminal`,
              stream: 'system',
              chunk: 'persistent terminal ready',
            }),
          ],
        };
      case 'terminal_interrupt':
        return {
          ok: true,
          summary: 'terminal_interrupt acknowledged',
          events: [
            terminalEvent({
              agent: session.agent,
              sessionId: session.sessionId,
              terminalId: asString(command.input.terminalId) ?? `${session.agent}-terminal`,
              stream: 'system',
              chunk: 'interrupt requested',
            }),
          ],
        };
      case 'editor_open': {
        const path = asString(command.input.path) ?? 'untitled';
        const content = await sandbox.readFile(path, { maxBytes: 262_144 });
        return {
          ok: true,
          summary: `opened ${path}`,
          output: content,
          events: [
            {
              type: 'workspace_file_opened',
              agent: session.agent,
              sessionId: session.sessionId,
              path,
              language: asString(command.input.language) ?? 'text',
              content,
              at: Date.now(),
            },
          ],
        };
      }
      case 'editor_write': {
        const path = asString(command.input.path) ?? 'untitled';
        const content = asString(command.input.content) ?? '';
        await sandbox.writeFile(path, content);
        return {
          ok: true,
          summary: `wrote ${path}`,
          events: [
            {
              type: 'workspace_file_changed',
              agent: session.agent,
              sessionId: session.sessionId,
              path,
              language: asString(command.input.language) ?? 'text',
              content,
              previousContent: asString(command.input.previousContent) ?? undefined,
              isDirty: false,
              at: Date.now(),
            },
          ],
        };
      }
      case 'browser_open':
      case 'browser_screenshot': {
        const url = asString(command.input.url) ?? 'about:blank';
        const screenshot = await sandbox.screenshot(url, {
          fullPage: asBoolean(command.input.fullPage),
        });
        return {
          ok: true,
          summary: `captured ${url}`,
          events: [
            {
              type: 'browser_frame',
              agent: session.agent,
              sessionId: session.sessionId,
              browserId: asString(command.input.browserId) ?? `${session.agent}-browser`,
              url,
              title: asString(command.input.title) ?? url,
              imageBase64: screenshot.base64,
              viewport: screenshot.viewport,
              at: Date.now(),
            },
          ],
        };
      }
      case 'browser_click':
      case 'browser_type':
        return {
          ok: false,
          summary: `${command.tool} requires persistent browser page state`,
          events: [
            {
              type: 'autonomy_observation',
              agent: session.agent,
              sessionId: session.sessionId,
              step: 0,
              kind: 'browser_state',
              summary: `${command.tool} queued for persistent browser provider`,
              recoverable: true,
              at: Date.now(),
            },
          ],
        };
      case 'git_status': {
        const result = await sandbox.exec('git status --short --branch', {
          timeoutMs: 30_000,
        });
        return {
          ok: result.exitCode === 0,
          summary: 'git status captured',
          output: result.stdout || result.stderr,
          events: [
            {
              type: 'git_status',
              agent: session.agent,
              sessionId: session.sessionId,
              branch: 'runtime',
              summary: result.stdout || result.stderr || '(empty status)',
              changedFiles: [],
              at: Date.now(),
            },
          ],
        };
      }
      case 'ci_watch':
        return {
          ok: true,
          summary: 'ci_watch registered',
          events: [
            {
              type: 'ci_status',
              agent: session.agent,
              sessionId: session.sessionId,
              provider: asString(command.input.provider) ?? 'github',
              status: 'queued',
              summary: 'CI watcher queued for runtime provider',
              at: Date.now(),
            },
          ],
        };
    }
  }

  async heartbeat(): Promise<void> {
    return undefined;
  }

  async stop(session: MirrorRuntimeSession): Promise<void> {
    const sandbox = this.sandboxes.get(session.sessionId);
    if (sandbox) await sandbox.kill();
    const sessionKey = this.sessionKeys.get(session.sessionId);
    if (sessionKey) {
      this.sessions.delete(sessionKey);
      this.pendingSessions.delete(sessionKey);
    }
    this.sessionKeys.delete(session.sessionId);
    this.sandboxes.delete(session.sessionId);
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
