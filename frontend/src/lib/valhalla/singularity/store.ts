/**
 * Valhalla AI — Master Protocol PR 3 (The Singularity): Supabase helpers.
 *
 * Thin REST client for the three tables introduced in
 * `supabase/migrations/003_valhalla_singularity.sql`:
 *
 *   - valhalla_ast_nodes   / valhalla_ast_edges   (the AST graph)
 *   - valhalla_tech_debt                           (ODIN's Pulse findings)
 *   - valhalla_incidents                           (The Pain Receptor)
 *
 * Matches the graceful-degrade pattern in `memory/store.ts`: when
 * `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are missing every call
 * is a no-op so the cron and webhook routes can boot cleanly in
 * local dev without Supabase wired up.
 */

interface SupabaseConfig {
  url: string;
  headers: {
    apikey: string;
    Authorization: string;
    'Content-Type': string;
    Prefer?: string;
  };
}

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };
}

export function isSingularityStoreEnabled(): boolean {
  return supabaseConfig() !== null;
}

// ---------------------------------------------------------------------
// AST graph summary (consumed by the Pulse cron)
// ---------------------------------------------------------------------

export interface AstGraphSummary {
  nodeCount: number;
  edgeCount: number;
  topFanIn: Array<{ path: string; in: number }>;
  topFanOut: Array<{ path: string; out: number }>;
  recentFiles: Array<{ path: string; updatedAt: string }>;
}

export async function fetchAstSummary(repo: string): Promise<AstGraphSummary> {
  const cfg = supabaseConfig();
  if (!cfg) {
    return { nodeCount: 0, edgeCount: 0, topFanIn: [], topFanOut: [], recentFiles: [] };
  }

  const countNodes = await fetch(
    `${cfg.url}/rest/v1/valhalla_ast_nodes?repo=eq.${encodeURIComponent(repo)}&kind=eq.file&select=path,updated_at&order=updated_at.desc&limit=25`,
    { headers: { ...cfg.headers, Prefer: 'count=exact' } },
  );
  const recentRows = (await countNodes.json()) as Array<{ path: string; updated_at: string }>;
  const nodeCount = Number(countNodes.headers.get('content-range')?.split('/')[1] ?? 0);

  const countEdges = await fetch(
    `${cfg.url}/rest/v1/valhalla_ast_edges?repo=eq.${encodeURIComponent(repo)}&select=source_path,target_path&limit=20000`,
    { headers: cfg.headers },
  );
  const edgeRows = (await countEdges.json()) as Array<{ source_path: string; target_path: string }>;

  const inCount = new Map<string, number>();
  const outCount = new Map<string, number>();
  for (const e of edgeRows) {
    inCount.set(e.target_path, (inCount.get(e.target_path) ?? 0) + 1);
    outCount.set(e.source_path, (outCount.get(e.source_path) ?? 0) + 1);
  }
  const topFanIn = [...inCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, n]) => ({ path, in: n }));
  const topFanOut = [...outCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, n]) => ({ path, out: n }));

  return {
    nodeCount,
    edgeCount: edgeRows.length,
    topFanIn,
    topFanOut,
    recentFiles: recentRows.slice(0, 15).map((r) => ({ path: r.path, updatedAt: r.updated_at })),
  };
}

// ---------------------------------------------------------------------
// Tech debt (Pulse findings)
// ---------------------------------------------------------------------

export interface TechDebtFinding {
  repo: string;
  path?: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  reasoning: string;
  suggestedFix?: string;
}

export async function insertTechDebt(findings: TechDebtFinding[]): Promise<number> {
  if (findings.length === 0) return 0;
  const cfg = supabaseConfig();
  if (!cfg) return 0;

  const rows = findings.map((f) => ({
    repo: f.repo,
    path: f.path ?? null,
    severity: f.severity,
    category: f.category,
    title: f.title.slice(0, 500),
    reasoning: f.reasoning.slice(0, 8_000),
    suggested_fix: f.suggestedFix?.slice(0, 8_000) ?? null,
  }));

  const res = await fetch(`${cfg.url}/rest/v1/valhalla_tech_debt`, {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`insertTechDebt failed ${res.status}: ${body.slice(0, 400)}`);
  }
  return rows.length;
}

// ---------------------------------------------------------------------
// Incidents (Pain Receptor)
// ---------------------------------------------------------------------

export interface IncidentInput {
  source: 'frontend_error' | 'api_500' | 'hydration' | 'manual' | 'other';
  severity: 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  fingerprint?: string;
  context?: Record<string, unknown>;
  swarmTriggered?: boolean;
}

export interface IncidentRow {
  id: string;
  fingerprint: string | null;
  swarm_triggered: boolean;
}

export async function insertIncident(input: IncidentInput): Promise<IncidentRow | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;

  const row = {
    source: input.source,
    severity: input.severity,
    message: input.message.slice(0, 4_000),
    stack: input.stack?.slice(0, 32_000) ?? null,
    url: input.url?.slice(0, 2_000) ?? null,
    user_agent: input.userAgent?.slice(0, 1_000) ?? null,
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    fingerprint: input.fingerprint ?? null,
    context: input.context ?? null,
    swarm_triggered: input.swarmTriggered ?? false,
  };

  const res = await fetch(`${cfg.url}/rest/v1/valhalla_incidents`, {
    method: 'POST',
    headers: { ...cfg.headers, Prefer: 'return=representation' },
    body: JSON.stringify([row]),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`insertIncident failed ${res.status}: ${body.slice(0, 400)}`);
  }
  const rows = (await res.json()) as IncidentRow[];
  return rows[0] ?? null;
}
