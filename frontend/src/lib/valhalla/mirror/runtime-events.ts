import type { MirrorAgentName, MirrorEvent } from './events';
import type { MirrorRuntimeCommand } from './runtime-gateway';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

export function commandToMirrorEvent(params: {
  agent: MirrorAgentName;
  sessionId: string;
  command: MirrorRuntimeCommand;
}): MirrorEvent {
  const { agent, sessionId, command } = params;
  const at = Date.now();

  switch (command.tool) {
    case 'terminal_send':
      return {
        type: 'terminal_chunk',
        agent,
        sessionId,
        terminalId: asString(command.input.terminalId) ?? `${agent}-terminal`,
        stream: 'stdin',
        chunk: asString(command.input.command) ?? '',
        at,
      };
    case 'terminal_read':
      return {
        type: 'terminal_chunk',
        agent,
        sessionId,
        terminalId: asString(command.input.terminalId) ?? `${agent}-terminal`,
        stream: 'system',
        chunk: 'terminal_read requested',
        at,
      };
    case 'terminal_interrupt':
      return {
        type: 'terminal_chunk',
        agent,
        sessionId,
        terminalId: asString(command.input.terminalId) ?? `${agent}-terminal`,
        stream: 'system',
        chunk: 'interrupt requested',
        at,
      };
    case 'editor_open':
      return {
        type: 'workspace_file_opened',
        agent,
        sessionId,
        path: asString(command.input.path) ?? 'untitled',
        language: asString(command.input.language) ?? 'text',
        content: asString(command.input.content) ?? undefined,
        at,
      };
    case 'editor_write':
      return {
        type: 'workspace_file_changed',
        agent,
        sessionId,
        path: asString(command.input.path) ?? 'untitled',
        language: asString(command.input.language) ?? 'text',
        content: asString(command.input.content) ?? '',
        previousContent: asString(command.input.previousContent) ?? undefined,
        isDirty: asBoolean(command.input.isDirty),
        at,
      };
    case 'browser_open':
    case 'browser_click':
    case 'browser_type':
    case 'browser_screenshot':
      return {
        type: 'browser_frame',
        agent,
        sessionId,
        browserId: asString(command.input.browserId) ?? `${agent}-browser`,
        url: asString(command.input.url) ?? 'about:blank',
        title: asString(command.input.title) ?? command.tool,
        at,
      };
    case 'git_status':
      return {
        type: 'git_status',
        agent,
        sessionId,
        branch: asString(command.input.branch) ?? 'main',
        summary: asString(command.input.summary) ?? 'git_status requested',
        changedFiles: [],
        at,
      };
    case 'ci_watch':
      return {
        type: 'ci_status',
        agent,
        sessionId,
        provider: asString(command.input.provider) ?? 'github',
        status: 'queued',
        summary: 'ci_watch requested',
        at,
      };
  }
}
