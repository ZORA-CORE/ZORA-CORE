import type { MirrorEvent, MirrorAgentName, PlannerItemStatus } from './events';

export type MirrorReplaySource = 'database' | 'seed';

export interface MirrorAgentWorkspace {
  id: MirrorAgentName;
  label: string;
  role: string;
  status: 'running' | 'ready' | 'blocked';
  accent: string;
  runtime: string;
  planner: Array<{
    id: string;
    title: string;
    detail: string;
    status: PlannerItemStatus;
  }>;
  terminal: string[];
  files: Array<{ path: string; language: string; lines: number; status: string }>;
  browser: { url: string; title: string; summary: string };
}

export interface MirrorReplaySnapshot {
  source: MirrorReplaySource;
  events: MirrorEvent[];
}

export const MIRROR_SAMPLE_EVENTS: MirrorEvent[] = [
  {
    type: 'planner_item_created',
    agent: 'odin',
    sessionId: 'mirror-odin',
    item: {
      id: 'schema',
      title: 'Create durable mirror schema',
      status: 'completed',
      position: 1,
    },
    at: 120_000,
  },
  {
    type: 'terminal_chunk',
    agent: 'thor',
    sessionId: 'mirror-thor',
    terminalId: 'thor-shell',
    stream: 'stdout',
    chunk: 'npm run build -> waiting for persistent gateway',
    at: 75_000,
  },
  {
    type: 'browser_frame',
    agent: 'freja',
    sessionId: 'mirror-freja',
    browserId: 'freja-chrome',
    url: 'https://zoracore.dk/chat/mirror',
    title: 'Cognition Mirror',
    at: 30_000,
  },
];

export const MIRROR_EVENT_TIME_LABELS: Record<MirrorEvent['type'], string> = {
  mirror_session_started: 'T-02:30',
  mirror_session_status: 'T-02:15',
  planner_item_created: 'T-02:00',
  planner_item_updated: 'T-01:45',
  workspace_file_opened: 'T-01:30',
  workspace_file_changed: 'T-01:25',
  terminal_chunk: 'T-01:15',
  terminal_exit: 'T-01:05',
  browser_frame: 'T-00:30',
  browser_dom: 'T-00:25',
  mirror_tool_call: 'T-00:20',
  mirror_tool_result: 'T-00:15',
  approval_required: 'T-00:10',
  git_status: 'T-00:08',
  pull_request_opened: 'T-00:06',
  ci_status: 'T-00:05',
  preview_url: 'T-00:01',
  autonomy_loop_status: 'T-00:04',
  autonomy_observation: 'T-00:03',
};

function cloneAgent(agent: MirrorAgentWorkspace): MirrorAgentWorkspace {
  return {
    ...agent,
    planner: agent.planner.map((item) => ({ ...item })),
    terminal: [...agent.terminal],
    files: agent.files.map((file) => ({ ...file })),
    browser: { ...agent.browser },
  };
}

function lineCount(content: string | undefined): number {
  if (!content) return 0;
  return content.split('\n').length;
}

function upsertFile(
  agent: MirrorAgentWorkspace,
  file: { path: string; language: string; content?: string; status: string },
): void {
  const existing = agent.files.find((candidate) => candidate.path === file.path);
  const lines = lineCount(file.content);
  if (existing) {
    existing.language = file.language;
    existing.status = file.status;
    if (lines > 0) existing.lines = lines;
    return;
  }
  agent.files.unshift({
    path: file.path,
    language: file.language,
    lines,
    status: file.status,
  });
}

function statusFromSession(status: MirrorEvent & { type: 'mirror_session_status' }) {
  if (status.status === 'running') return 'running';
  if (status.status === 'blocked' || status.status === 'failed') return 'blocked';
  return 'ready';
}

export function eventLabel(event: MirrorEvent): string {
  switch (event.type) {
    case 'planner_item_created':
      return `${event.agent.toUpperCase()} created planner item: ${event.item.title}`;
    case 'planner_item_updated':
      return `${event.agent.toUpperCase()} updated planner item: ${event.itemId}`;
    case 'workspace_file_opened':
      return `${event.agent.toUpperCase()} opened file: ${event.path}`;
    case 'workspace_file_changed':
      return `${event.agent.toUpperCase()} changed file: ${event.path}`;
    case 'terminal_chunk':
      return `${event.agent.toUpperCase()} terminal ${event.stream}: ${event.chunk}`;
    case 'terminal_exit':
      return `${event.agent.toUpperCase()} terminal exited ${event.exitCode}: ${event.command}`;
    case 'browser_frame':
      return `${event.agent.toUpperCase()} browser frame: ${event.title ?? event.url}`;
    case 'browser_dom':
      return `${event.agent.toUpperCase()} browser DOM: ${event.url}`;
    case 'mirror_tool_call':
      return `${event.agent.toUpperCase()} called tool: ${event.call.tool}`;
    case 'mirror_tool_result':
      return `${event.agent.toUpperCase()} observed tool result: ${event.result.summary}`;
    case 'approval_required':
      return `${event.agent.toUpperCase()} needs approval: ${event.action}`;
    case 'git_status':
      return `${event.agent.toUpperCase()} git status: ${event.summary}`;
    case 'pull_request_opened':
      return `${event.agent.toUpperCase()} opened PR #${event.prNumber}`;
    case 'ci_status':
      return `${event.agent.toUpperCase()} CI ${event.status}: ${event.summary ?? event.provider}`;
    case 'preview_url':
      return `${event.agent.toUpperCase()} preview URL: ${event.url}`;
    case 'autonomy_loop_status':
      return `${event.agent.toUpperCase()} loop ${event.status}: ${event.summary}`;
    case 'autonomy_observation':
      return `${event.agent.toUpperCase()} observed ${event.kind}: ${event.summary}`;
    case 'mirror_session_started':
      return `${event.agent.toUpperCase()} mirror session started`;
    case 'mirror_session_status':
      return `${event.agent.toUpperCase()} mirror session ${event.status}`;
  }
}

export function reduceMirrorAgents(
  seedAgents: MirrorAgentWorkspace[],
  events: MirrorEvent[],
): MirrorAgentWorkspace[] {
  const agents = seedAgents.map(cloneAgent);
  const byId = new Map<MirrorAgentName, MirrorAgentWorkspace>(
    agents.map((agent) => [agent.id, agent]),
  );

  for (const event of events) {
    const agent = byId.get(event.agent);
    if (!agent) continue;

    switch (event.type) {
      case 'mirror_session_started':
        agent.status = 'running';
        agent.runtime = event.runtimeProvider;
        break;
      case 'mirror_session_status':
        agent.status = statusFromSession(event);
        if (event.message) agent.terminal.push(event.message);
        break;
      case 'planner_item_created': {
        const existing = agent.planner.find((item) => item.id === event.item.id);
        if (!existing) {
          agent.planner.push({
            id: event.item.id,
            title: event.item.title,
            detail: event.item.detail ?? '',
            status: event.item.status,
          });
        }
        break;
      }
      case 'planner_item_updated': {
        const existing = agent.planner.find((item) => item.id === event.itemId);
        if (existing) {
          existing.title = event.patch.title ?? existing.title;
          existing.detail = event.patch.detail ?? existing.detail;
          existing.status = event.patch.status ?? existing.status;
        }
        break;
      }
      case 'workspace_file_opened':
        upsertFile(agent, {
          path: event.path,
          language: event.language,
          content: event.content,
          status: 'open',
        });
        break;
      case 'workspace_file_changed':
        upsertFile(agent, {
          path: event.path,
          language: event.language,
          content: event.content,
          status: event.isDirty ? 'dirty' : 'saved',
        });
        break;
      case 'terminal_chunk':
        agent.terminal.push(event.chunk);
        break;
      case 'terminal_exit':
        agent.terminal.push(`exit ${event.exitCode}: ${event.command}`);
        break;
      case 'browser_frame':
        agent.browser = {
          url: event.url,
          title: event.title ?? agent.browser.title,
          summary: 'Live browser frame replayed from the Mirror event stream.',
        };
        break;
      case 'browser_dom':
        agent.browser = {
          url: event.url,
          title: agent.browser.title,
          summary: event.text.slice(0, 180),
        };
        break;
      case 'mirror_tool_call':
        agent.terminal.push(`tool_call ${event.call.tool}`);
        break;
      case 'mirror_tool_result':
        agent.terminal.push(`tool_result ${event.result.tool}: ${event.result.summary}`);
        break;
      case 'approval_required':
        agent.status = 'blocked';
        agent.terminal.push(`approval_required ${event.action}: ${event.reason}`);
        break;
      case 'git_status':
        agent.terminal.push(`git ${event.branch}: ${event.summary}`);
        break;
      case 'pull_request_opened':
        agent.terminal.push(`pr ${event.prNumber}: ${event.prUrl}`);
        break;
      case 'ci_status':
        agent.terminal.push(`ci ${event.provider}: ${event.status}`);
        break;
      case 'preview_url':
        agent.terminal.push(`preview ${event.url}`);
        break;
      case 'autonomy_loop_status':
        if (event.status === 'blocked' || event.status === 'failed') {
          agent.status = 'blocked';
        } else if (event.status === 'completed') {
          agent.status = 'ready';
        } else {
          agent.status = 'running';
        }
        agent.terminal.push(`loop ${event.step} ${event.status}: ${event.summary}`);
        break;
      case 'autonomy_observation':
        agent.terminal.push(`observe ${event.kind}: ${event.summary}`);
        break;
    }
  }

  return agents;
}
