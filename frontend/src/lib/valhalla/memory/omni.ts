/**
 * Valhalla AI — Singularity Hotfix: EIVOR Omni-Memory dual-vector store.
 *
 * Two pools live on the SAME `valhalla_memories` table, discriminated
 * by `memory_scope`:
 *
 *   - session      — per-chat episodic memory (the legacy behavior).
 *                    Auto-written at the end of every swarm turn.
 *   - global_user  — enduring architectural decisions, user preferences,
 *                    past project schemas. Written ONLY via the
 *                    `store_global_memory` tool that EIVOR exposes to
 *                    herself. High-trust pool — a false positive here
 *                    poisons every future chat, so callers are expected
 *                    to gate against a stricter similarity threshold
 *                    and always HEIMDALL-audit the content before
 *                    persisting.
 *
 * On every new chat init, `fetchGlobalUserContext` is called BEFORE
 * the swarm boots. Its formatted markdown block is prepended inside
 * ODIN's cached (`cache_control: ephemeral`) system prompt so repeat
 * turns still enjoy the ~70% prompt-cache hit rate.
 *
 * The module degrades gracefully: every call returns `[] / null` when
 * Supabase credentials or Voyage credentials are missing, mirroring
 * the pattern in `memory/store.ts`.
 */
import { embedText, VOYAGE_DIM } from './voyage';

export type MemoryScope = 'session' | 'global_user';

export interface OmniMemoryRecord {
  id?: string;
  userId: string;
  sessionId: string;
  kind: 'plan' | 'code' | 'critique' | 'counterexample' | 'turn';
  content: string;
  scope: MemoryScope;
  createdAt?: string;
  /** Cosine similarity (0..1) returned by the match RPCs. */
  similarity?: number;
}

interface SupabaseHeaders extends Record<string, string> {
  apikey: string;
  Authorization: string;
  'Content-Type': string;
}

interface SupabaseConfig {
  url: string;
  key: string;
  headers: SupabaseHeaders;
}

function supabaseConfig(): SupabaseConfig | null {
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

/** True when both Supabase + Voyage are configured. */
export function isOmniMemoryEnabled(): boolean {
  return supabaseConfig() !== null && Boolean(process.env.VOYAGE_API_KEY);
}

/**
 * Default cosine-similarity thresholds.
 * Global is stricter — a false positive leaks the user's preferences
 * into every future chat. Session is looser because hallucinated
 * context only affects the current conversation.
 */
export const SESSION_SIM_THRESHOLD = 0.70;
export const GLOBAL_SIM_THRESHOLD = 0.78;

/** Recency decay half-life (days) applied as a multiplier on similarity. */
export const GLOBAL_HALF_LIFE_DAYS = 30;

function decayMultiplier(createdAt: string | undefined, halfLifeDays: number): number {
  if (!createdAt) return 1;
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return 1;
  const days = (Date.now() - ts) / (24 * 60 * 60 * 1000);
  if (days <= 0) return 1;
  return Math.pow(0.5, days / halfLifeDays);
}

interface RpcRow {
  id: string;
  user_id: string;
  session_id: string;
  kind: OmniMemoryRecord['kind'];
  content: string;
  memory_scope: MemoryScope;
  created_at: string;
  similarity: number;
}

function rowToRecord(r: RpcRow): OmniMemoryRecord {
  return {
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    kind: r.kind,
    content: r.content,
    scope: r.memory_scope,
    createdAt: r.created_at,
    similarity: r.similarity,
  };
}

async function callRpc<T>(
  cfg: SupabaseConfig,
  name: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Supabase rpc ${name} failed ${res.status}: ${text.slice(0, 400)}`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Retrieve session-scoped memories (this chat only) closest to `query`.
 * Caller normally composes these into EIVOR's prompt.
 */
export async function recallSessionMemories(params: {
  userId: string;
  sessionId: string;
  query: string;
  k?: number;
  threshold?: number;
  signal?: AbortSignal;
}): Promise<OmniMemoryRecord[]> {
  const cfg = supabaseConfig();
  if (!cfg || !process.env.VOYAGE_API_KEY) return [];
  const k = Math.max(1, Math.min(25, params.k ?? 8));
  const threshold = params.threshold ?? SESSION_SIM_THRESHOLD;
  const embedding = await embedText(params.query, 'query', params.signal);
  const rows = await callRpc<RpcRow[]>(
    cfg,
    'valhalla_memory_match_session',
    {
      p_user_id: params.userId,
      p_session_id: params.sessionId,
      p_query_embedding: embedding,
      p_match_count: k,
    },
    params.signal,
  );
  return rows
    .map(rowToRecord)
    .filter((r) => (r.similarity ?? 0) >= threshold);
}

/**
 * Retrieve global-user memories spanning ALL sessions of this user.
 * Results are re-ranked by `similarity × exp(-ln(2) * days / half_life)`
 * so stale preferences don't dominate fresh ones with equal relevance.
 */
export async function recallGlobalUserMemories(params: {
  userId: string;
  query: string;
  k?: number;
  threshold?: number;
  halfLifeDays?: number;
  signal?: AbortSignal;
}): Promise<OmniMemoryRecord[]> {
  const cfg = supabaseConfig();
  if (!cfg || !process.env.VOYAGE_API_KEY) return [];
  const k = Math.max(1, Math.min(12, params.k ?? 5));
  const threshold = params.threshold ?? GLOBAL_SIM_THRESHOLD;
  const halfLife = params.halfLifeDays ?? GLOBAL_HALF_LIFE_DAYS;
  const embedding = await embedText(params.query, 'query', params.signal);
  const rows = await callRpc<RpcRow[]>(
    cfg,
    'valhalla_memory_match_global',
    {
      p_user_id: params.userId,
      p_query_embedding: embedding,
      p_match_count: k,
    },
    params.signal,
  );
  return rows
    .map(rowToRecord)
    .filter((r) => (r.similarity ?? 0) >= threshold)
    .map((r) => ({
      ...r,
      similarity:
        (r.similarity ?? 0) * decayMultiplier(r.createdAt, halfLife),
    }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
}

/**
 * Persist a memory with explicit scope. Embeds via Voyage and inserts
 * into `valhalla_memories`. Returns the inserted row id, or `null` if
 * the store is not configured.
 */
export async function storeOmniMemory(
  rec: Omit<OmniMemoryRecord, 'id' | 'createdAt' | 'similarity'>,
  signal?: AbortSignal,
): Promise<string | null> {
  const cfg = supabaseConfig();
  if (!cfg || !process.env.VOYAGE_API_KEY) return null;

  const content =
    rec.content.length > 16_000 ? rec.content.slice(0, 16_000) : rec.content;
  const embedding = await embedText(content, 'document', signal);
  if (embedding.length !== VOYAGE_DIM) {
    throw new Error(
      `Refusing to store memory: embedding length ${embedding.length} !== ${VOYAGE_DIM}.`,
    );
  }

  const res = await fetch(`${cfg.url}/rest/v1/valhalla_memories`, {
    method: 'POST',
    headers: { ...cfg.headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: rec.userId,
      session_id: rec.sessionId,
      kind: rec.kind,
      content,
      embedding,
      memory_scope: rec.scope,
    }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Supabase memory insert failed ${res.status}: ${text.slice(0, 400)}`,
    );
  }
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

/**
 * Fetch top-N global memories and render them as a markdown block
 * suitable for prepending to ODIN's cached system prompt. Empty string
 * when there are no qualifying matches (callers should NOT inject an
 * empty section — it wastes prompt-cache capacity).
 */
export async function fetchGlobalUserContext(params: {
  userId: string;
  query: string;
  k?: number;
  signal?: AbortSignal;
}): Promise<{ markdown: string; memories: OmniMemoryRecord[] }> {
  if (!isOmniMemoryEnabled()) return { markdown: '', memories: [] };
  let memories: OmniMemoryRecord[];
  try {
    memories = await recallGlobalUserMemories({
      userId: params.userId,
      query: params.query,
      k: params.k ?? 5,
      signal: params.signal,
    });
  } catch {
    return { markdown: '', memories: [] };
  }
  if (memories.length === 0) return { markdown: '', memories };
  const lines: string[] = [
    '## EIVOR global-user context (persistent preferences + decisions)',
    '',
    'The following memories were promoted to this user\'s GLOBAL pool across past chats.',
    'Treat them as durable ground truth about the user unless the current turn explicitly overrides one.',
    '',
  ];
  memories.forEach((m, i) => {
    const sim = (m.similarity ?? 0).toFixed(3);
    const snippet = m.content.length > 600 ? `${m.content.slice(0, 600)}…` : m.content;
    lines.push(`### Global memory ${i + 1} — kind=${m.kind}, score=${sim}`);
    lines.push(snippet);
    lines.push('');
  });
  return { markdown: lines.join('\n'), memories };
}
