import type {
  MirrorAgentSession,
  MirrorEvent,
  MirrorRuntimeResource,
  MirrorToolEventRow,
  MirrorWorkspaceFile,
  MirrorWorkspaceSnapshot,
  MirrorPlannerItem,
} from './events';

interface SupabaseHeaders extends Record<string, string> {
  apikey: string;
  Authorization: string;
  'Content-Type': string;
}

function supabaseConfig():
  | { url: string; key: string; headers: SupabaseHeaders }
  | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    url,
    key,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };
}

export function isMirrorStoreEnabled(): boolean {
  return supabaseConfig() !== null;
}

interface SupabaseAgentSessionShape {
  id: string;
  user_id: string;
  chat_session_id: string | null;
  swarm_job_id: string | null;
  agent: MirrorAgentSession['agent'];
  title: string;
  status: MirrorAgentSession['status'];
  runtime_provider: string;
  runtime_id: string | null;
  sandbox_id: string | null;
  workdir: string;
  current_branch: string | null;
  base_branch: string | null;
  pull_request_url: string | null;
  preview_url: string | null;
  last_event_id: number | null;
  last_heartbeat_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabasePlannerItemShape {
  id: string;
  agent_session_id: string;
  parent_id: string | null;
  position: number;
  title: string;
  detail: string | null;
  status: MirrorPlannerItem['status'];
  source_event_id: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface SupabaseWorkspaceFileShape {
  id: string;
  agent_session_id: string;
  path: string;
  language: string;
  content: string;
  previous_content: string | null;
  source: MirrorWorkspaceFile['source'];
  is_dirty: boolean;
  is_deleted: boolean;
  source_event_id: number | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseRuntimeResourceShape {
  id: string;
  agent_session_id: string;
  kind: MirrorRuntimeResource['kind'];
  provider: string;
  external_id: string | null;
  status: MirrorRuntimeResource['status'];
  metadata: Record<string, unknown>;
  last_heartbeat_at: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseToolEventShape {
  id: number;
  agent_session_id: string;
  swarm_job_id: string | null;
  agent: MirrorToolEventRow['agent'];
  event_type: MirrorEvent['type'];
  tool_name: string | null;
  planner_item_id: string | null;
  resource_id: string | null;
  seq: number;
  event: MirrorEvent;
  created_at: string;
}

function sessionFromSupabase(row: SupabaseAgentSessionShape): MirrorAgentSession {
  return {
    id: row.id,
    userId: row.user_id,
    chatSessionId: row.chat_session_id,
    swarmJobId: row.swarm_job_id,
    agent: row.agent,
    title: row.title,
    status: row.status,
    runtimeProvider: row.runtime_provider,
    runtimeId: row.runtime_id,
    sandboxId: row.sandbox_id,
    workdir: row.workdir,
    currentBranch: row.current_branch,
    baseBranch: row.base_branch,
    pullRequestUrl: row.pull_request_url,
    previewUrl: row.preview_url,
    lastEventId: row.last_event_id,
    lastHeartbeatAt: row.last_heartbeat_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function plannerItemFromSupabase(row: SupabasePlannerItemShape): MirrorPlannerItem {
  return {
    id: row.id,
    agentSessionId: row.agent_session_id,
    parentId: row.parent_id,
    position: row.position,
    title: row.title,
    detail: row.detail,
    status: row.status,
    sourceEventId: row.source_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function fileFromSupabase(row: SupabaseWorkspaceFileShape): MirrorWorkspaceFile {
  return {
    id: row.id,
    agentSessionId: row.agent_session_id,
    path: row.path,
    language: row.language,
    content: row.content,
    previousContent: row.previous_content,
    source: row.source,
    isDirty: row.is_dirty,
    isDeleted: row.is_deleted,
    sourceEventId: row.source_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resourceFromSupabase(row: SupabaseRuntimeResourceShape): MirrorRuntimeResource {
  return {
    id: row.id,
    agentSessionId: row.agent_session_id,
    kind: row.kind,
    provider: row.provider,
    externalId: row.external_id,
    status: row.status,
    metadata: row.metadata,
    lastHeartbeatAt: row.last_heartbeat_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toolEventFromSupabase(row: SupabaseToolEventShape): MirrorToolEventRow {
  return {
    id: row.id,
    agentSessionId: row.agent_session_id,
    swarmJobId: row.swarm_job_id,
    agent: row.agent,
    eventType: row.event_type,
    toolName: row.tool_name,
    plannerItemId: row.planner_item_id,
    resourceId: row.resource_id,
    seq: row.seq,
    event: row.event,
    createdAt: row.created_at,
  };
}

async function readRows<T>(path: string): Promise<T[]> {
  const cfg = supabaseConfig();
  if (!cfg) return [];
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    headers: cfg.headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase mirror read failed ${res.status}: ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T[];
}

export async function getMirrorWorkspaceSnapshot(params: {
  userId: string;
  chatSessionId?: string | null;
  swarmJobId?: string | null;
}): Promise<MirrorWorkspaceSnapshot | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;

  const filters = [`user_id=eq.${encodeURIComponent(params.userId)}`];
  if (params.chatSessionId) {
    filters.push(`chat_session_id=eq.${encodeURIComponent(params.chatSessionId)}`);
  }
  if (params.swarmJobId) {
    filters.push(`swarm_job_id=eq.${encodeURIComponent(params.swarmJobId)}`);
  }

  const sessions = (
    await readRows<SupabaseAgentSessionShape>(
      `valhalla_agent_sessions?${filters.join('&')}&select=*&order=created_at.desc&limit=24`,
    )
  ).map(sessionFromSupabase);

  if (sessions.length === 0) {
    return { sessions: [], plannerItems: [], files: [], resources: [], events: [] };
  }

  const sessionIds = sessions.map((session) => session.id).join(',');
  const idFilter = `agent_session_id=in.(${sessionIds})`;
  const [plannerItems, files, resources, events] = await Promise.all([
    readRows<SupabasePlannerItemShape>(
      `valhalla_planner_items?${idFilter}&select=*&order=position.asc`,
    ),
    readRows<SupabaseWorkspaceFileShape>(
      `valhalla_workspace_files?${idFilter}&select=*&order=updated_at.desc`,
    ),
    readRows<SupabaseRuntimeResourceShape>(
      `valhalla_runtime_resources?${idFilter}&select=*&order=created_at.asc`,
    ),
    readRows<SupabaseToolEventShape>(
      `valhalla_tool_events?${idFilter}&select=*&order=id.asc&limit=500`,
    ),
  ]);

  return {
    sessions,
    plannerItems: plannerItems.map(plannerItemFromSupabase),
    files: files.map(fileFromSupabase),
    resources: resources.map(resourceFromSupabase),
    events: events.map(toolEventFromSupabase),
  };
}
