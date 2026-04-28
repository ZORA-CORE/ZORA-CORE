import type { AgentName, ToolCallPayload, ToolResultPayload } from '../agents/types';

export type MirrorAgentName = AgentName | 'hugin' | 'munin';

export type MirrorSessionStatus =
  | 'queued'
  | 'running'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PlannerItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'cancelled';

export type RuntimeResourceKind =
  | 'terminal'
  | 'browser'
  | 'editor'
  | 'filesystem'
  | 'git'
  | 'ci'
  | 'preview';

export type RuntimeResourceStatus =
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'stopped'
  | 'failed';

export interface MirrorAgentSession {
  id: string;
  userId: string;
  chatSessionId: string | null;
  swarmJobId: string | null;
  agent: MirrorAgentName;
  title: string;
  status: MirrorSessionStatus;
  runtimeProvider: 'e2b' | 'cloudflare-container' | 'fly' | string;
  runtimeId: string | null;
  sandboxId: string | null;
  workdir: string;
  currentBranch: string | null;
  baseBranch: string | null;
  pullRequestUrl: string | null;
  previewUrl: string | null;
  lastEventId: number | null;
  lastHeartbeatAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MirrorPlannerItem {
  id: string;
  agentSessionId: string;
  parentId: string | null;
  position: number;
  title: string;
  detail: string | null;
  status: PlannerItemStatus;
  sourceEventId: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface MirrorWorkspaceFile {
  id: string;
  agentSessionId: string;
  path: string;
  language: string;
  content: string;
  previousContent: string | null;
  source: 'agent' | 'user' | 'runtime' | 'git' | 'preview';
  isDirty: boolean;
  isDeleted: boolean;
  sourceEventId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MirrorRuntimeResource {
  id: string;
  agentSessionId: string;
  kind: RuntimeResourceKind;
  provider: string;
  externalId: string | null;
  status: RuntimeResourceStatus;
  metadata: Record<string, unknown>;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
}

export type MirrorEvent =
  | {
      type: 'mirror_session_started';
      agent: MirrorAgentName;
      sessionId: string;
      runtimeProvider: string;
      runtimeId?: string;
      sandboxId?: string;
      workdir: string;
      at: number;
    }
  | {
      type: 'mirror_session_status';
      agent: MirrorAgentName;
      sessionId: string;
      status: MirrorSessionStatus;
      message?: string;
      at: number;
    }
  | {
      type: 'planner_item_created';
      agent: MirrorAgentName;
      sessionId: string;
      item: {
        id: string;
        title: string;
        detail?: string;
        status: PlannerItemStatus;
        position: number;
        parentId?: string;
      };
      at: number;
    }
  | {
      type: 'planner_item_updated';
      agent: MirrorAgentName;
      sessionId: string;
      itemId: string;
      patch: {
        title?: string;
        detail?: string;
        status?: PlannerItemStatus;
        position?: number;
      };
      at: number;
    }
  | {
      type: 'workspace_file_opened';
      agent: MirrorAgentName;
      sessionId: string;
      path: string;
      language: string;
      content?: string;
      at: number;
    }
  | {
      type: 'workspace_file_changed';
      agent: MirrorAgentName;
      sessionId: string;
      path: string;
      language: string;
      content: string;
      previousContent?: string;
      isDirty: boolean;
      at: number;
    }
  | {
      type: 'terminal_chunk';
      agent: MirrorAgentName;
      sessionId: string;
      terminalId: string;
      stream: 'stdin' | 'stdout' | 'stderr' | 'system';
      chunk: string;
      at: number;
    }
  | {
      type: 'terminal_exit';
      agent: MirrorAgentName;
      sessionId: string;
      terminalId: string;
      command: string;
      exitCode: number;
      durationMs: number;
      at: number;
    }
  | {
      type: 'browser_frame';
      agent: MirrorAgentName;
      sessionId: string;
      browserId: string;
      url: string;
      title?: string;
      imageBase64?: string;
      viewport?: { width: number; height: number };
      at: number;
    }
  | {
      type: 'browser_dom';
      agent: MirrorAgentName;
      sessionId: string;
      browserId: string;
      url: string;
      text: string;
      selectors?: Array<{ selector: string; label: string; role?: string }>;
      at: number;
    }
  | {
      type: 'mirror_tool_call';
      agent: MirrorAgentName;
      sessionId: string;
      call: ToolCallPayload;
      at: number;
    }
  | {
      type: 'mirror_tool_result';
      agent: MirrorAgentName;
      sessionId: string;
      result: ToolResultPayload;
      at: number;
    }
  | {
      type: 'approval_required';
      agent: MirrorAgentName;
      sessionId: string;
      approvalId: string;
      action: string;
      reason: string;
      risk: 'low' | 'medium' | 'high';
      at: number;
    }
  | {
      type: 'git_status';
      agent: MirrorAgentName;
      sessionId: string;
      branch: string;
      summary: string;
      changedFiles: string[];
      at: number;
    }
  | {
      type: 'pull_request_opened';
      agent: MirrorAgentName;
      sessionId: string;
      prNumber: number;
      prUrl: string;
      branch: string;
      at: number;
    }
  | {
      type: 'ci_status';
      agent: MirrorAgentName;
      sessionId: string;
      provider: string;
      status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled';
      detailsUrl?: string;
      summary?: string;
      at: number;
    }
  | {
      type: 'preview_url';
      agent: MirrorAgentName;
      sessionId: string;
      url: string;
      provider?: string;
      at: number;
    };

export interface MirrorToolEventRow {
  id: number;
  agentSessionId: string;
  swarmJobId: string | null;
  agent: MirrorAgentName;
  eventType: MirrorEvent['type'];
  toolName: string | null;
  plannerItemId: string | null;
  resourceId: string | null;
  seq: number;
  event: MirrorEvent;
  createdAt: string;
}

export interface MirrorWorkspaceSnapshot {
  sessions: MirrorAgentSession[];
  plannerItems: MirrorPlannerItem[];
  files: MirrorWorkspaceFile[];
  resources: MirrorRuntimeResource[];
  events: MirrorToolEventRow[];
}
