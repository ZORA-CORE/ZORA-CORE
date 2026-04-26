/**
 * Valhalla AI — Prometheus PR 1: durable swarm-job state.
 *
 * Thin Supabase REST helpers for the `valhalla_swarm_jobs` and
 * `valhalla_swarm_events` tables. Mirrors the patterns in
 * `lib/valhalla/memory/store.ts` (service-role-only, fail-open
 * when unconfigured) so the swarm degrades gracefully when
 * Supabase is unavailable.
 *
 * Why a separate module: the orchestrator state machine must
 * persist its progress somewhere durable so that:
 *   1. The SSE client at `/api/swarm/stream/[jobId]` can replay
 *      events even after the running worker has been killed by
 *      Vercel's 300 s `maxDuration`.
 *   2. A continuation worker can resume at the next stage by
 *      reading `current_stage` and rebuilding `priors` from the
 *      event log, without keeping any process-local state.
 */
import type { SwarmEvent, SwarmRunRequest } from '../agents/types';

export type SwarmJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SwarmJobRow {
  id: string;
  userId: string;
  sessionId: string;
  query: string;
  history: SwarmRunRequest['history'];
  recalledMarkdown: string;
  currentStage: string;
  status: SwarmJobStatus;
  useToolUse: boolean;
  errorMessage: string | null;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

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

/** True when the durable jobs store is configured. */
export function isJobsStoreEnabled(): boolean {
  return supabaseConfig() !== null;
}

interface SupabaseJobShape {
  id: string;
  user_id: string;
  session_id: string;
  query: string;
  history: SwarmRunRequest['history'];
  recalled_markdown: string;
  current_stage: string;
  status: SwarmJobStatus;
  use_tool_use: boolean;
  error_message: string | null;
  last_heartbeat_at: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function rowFromSupabase(r: SupabaseJobShape): SwarmJobRow {
  return {
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    query: r.query,
    history: Array.isArray(r.history) ? r.history : [],
    recalledMarkdown: r.recalled_markdown ?? '',
    currentStage: r.current_stage,
    status: r.status,
    useToolUse: Boolean(r.use_tool_use),
    errorMessage: r.error_message,
    lastHeartbeatAt: r.last_heartbeat_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
  };
}

/**
 * Create a new job row in `queued` status. Returns the row's UUID so
 * the caller can hand it back to the client and to the worker.
 */
export async function createJob(params: {
  request: SwarmRunRequest;
  recalledMarkdown: string;
  useToolUse: boolean;
}): Promise<SwarmJobRow> {
  const cfg = supabaseConfig();
  if (!cfg) {
    throw new Error(
      'Cannot create swarm job: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset.',
    );
  }
  const res = await fetch(`${cfg.url}/rest/v1/valhalla_swarm_jobs`, {
    method: 'POST',
    headers: { ...cfg.headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: params.request.userId,
      session_id: params.request.sessionId,
      query: params.request.query,
      history: params.request.history,
      recalled_markdown: params.recalledMarkdown,
      current_stage: 'init',
      status: 'queued',
      use_tool_use: params.useToolUse,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Supabase swarm-job insert failed ${res.status}: ${body.slice(0, 400)}`,
    );
  }
  const rows = (await res.json()) as SupabaseJobShape[];
  const row = rows[0];
  if (!row) throw new Error('Supabase returned no row from swarm-job insert.');
  return rowFromSupabase(row);
}

/** Read a single job by id, or null if it doesn't exist. */
export async function getJob(jobId: string): Promise<SwarmJobRow | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const res = await fetch(
    `${cfg.url}/rest/v1/valhalla_swarm_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`,
    { headers: cfg.headers },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Supabase swarm-job read failed ${res.status}: ${body.slice(0, 400)}`,
    );
  }
  const rows = (await res.json()) as SupabaseJobShape[];
  return rows[0] ? rowFromSupabase(rows[0]) : null;
}

/**
 * Update the job state. The continuation worker uses this between
 * stages to (a) advance `current_stage`, (b) bump `last_heartbeat_at`
 * so the watchdog knows the worker is alive, and (c) flip status to
 * `completed`/`failed` at the terminal stage.
 */
export async function updateJob(
  jobId: string,
  patch: Partial<{
    currentStage: string;
    status: SwarmJobStatus;
    errorMessage: string | null;
    completedAt: string | null;
  }>,
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;
  const body: Record<string, unknown> = {
    last_heartbeat_at: new Date().toISOString(),
  };
  if (patch.currentStage !== undefined) body.current_stage = patch.currentStage;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.errorMessage !== undefined) body.error_message = patch.errorMessage;
  if (patch.completedAt !== undefined) body.completed_at = patch.completedAt;

  const res = await fetch(
    `${cfg.url}/rest/v1/valhalla_swarm_jobs?id=eq.${encodeURIComponent(jobId)}`,
    {
      method: 'PATCH',
      headers: { ...cfg.headers, Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Supabase swarm-job update failed ${res.status}: ${text.slice(0, 400)}`,
    );
  }
}

/** Append a single SwarmEvent to the durable event log. */
export async function appendEvent(
  jobId: string,
  event: SwarmEvent,
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;
  const res = await fetch(`${cfg.url}/rest/v1/valhalla_swarm_events`, {
    method: 'POST',
    headers: { ...cfg.headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ job_id: jobId, event }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Supabase swarm-event insert failed ${res.status}: ${text.slice(0, 400)}`,
    );
  }
}

export interface SwarmEventRow {
  /** Bigserial id; clients use this as a cursor for incremental polling. */
  id: number;
  jobId: string;
  event: SwarmEvent;
  createdAt: string;
}

interface SupabaseEventShape {
  id: number;
  job_id: string;
  event: SwarmEvent;
  created_at: string;
}

/**
 * Read events for a job whose `id` is greater than `afterId`. The
 * SSE replay endpoint polls this in a loop with the last id it
 * forwarded to the browser as the cursor.
 */
export async function listEvents(
  jobId: string,
  afterId: number,
  limit = 200,
): Promise<SwarmEventRow[]> {
  const cfg = supabaseConfig();
  if (!cfg) return [];
  const params = new URLSearchParams({
    job_id: `eq.${jobId}`,
    id: `gt.${afterId}`,
    select: '*',
    order: 'id.asc',
    limit: String(limit),
  });
  const res = await fetch(
    `${cfg.url}/rest/v1/valhalla_swarm_events?${params.toString()}`,
    { headers: cfg.headers },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Supabase swarm-event list failed ${res.status}: ${text.slice(0, 400)}`,
    );
  }
  const rows = (await res.json()) as SupabaseEventShape[];
  return rows.map((r) => ({
    id: r.id,
    jobId: r.job_id,
    event: r.event,
    createdAt: r.created_at,
  }));
}
