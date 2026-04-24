/**
 * Valhalla AI — Infinity Engine: Supabase-backed episodic memory.
 *
 * Hotfix (Omni-Memory): the store now supports a `memory_scope` column
 * that splits the vector pool into two layers:
 *   - `session`     — episodic, per-chat recall (original behavior).
 *   - `global_user` — persistent "Forever Context" the swarm auto-injects
 *                     into every ODIN boot prompt. EIVOR consolidates
 *                     architectural decisions into this pool via the
 *                     `store_global_memory` tool.
 *
 * Schema (see supabase/migrations/002_valhalla_memories.sql and
 * 004_valhalla_memory_scope.sql):
 *   valhalla_memories (
 *     id uuid pk,
 *     user_id text not null,
 *     session_id text not null,
 *     memory_scope text not null check (memory_scope in ('session','global_user')),
 *     kind text not null check (kind in ('plan','code','critique','counterexample','turn')),
 *     content text not null,
 *     embedding vector(1024) not null,
 *     created_at timestamptz default now()
 *   )
 *
 * Retrieval uses the scope-aware `valhalla_memory_match_scoped` RPC for
 * both pools. The original `valhalla_memory_match` RPC is kept as a
 * backward-compatible wrapper over `scope='session'`.
 *
 * The module degrades gracefully: if `SUPABASE_URL` or
 * `SUPABASE_SERVICE_ROLE_KEY` are missing, every call is a no-op.
 */
import { embedText, VOYAGE_DIM } from './voyage';

export type MemoryScope = 'session' | 'global_user';

export interface MemoryRecord {
  id?: string;
  userId: string;
  sessionId: string;
  /** Which vector pool this record lives in. Defaults to 'session'. */
  scope?: MemoryScope;
  kind: 'plan' | 'code' | 'critique' | 'counterexample' | 'turn';
  content: string;
  createdAt?: string;
  /** Optional similarity score returned by recall (0..1). */
  similarity?: number;
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

/** Returns true when the memory store is configured and will do real work. */
export function isMemoryEnabled(): boolean {
  return supabaseConfig() !== null && Boolean(process.env.VOYAGE_API_KEY);
}

/**
 * Retrieve the top-K memories closest to `query` for this user in the
 * given scope. Defaults to `session` for backward compatibility.
 *
 * Returns `[]` if the store is not configured — callers should treat
 * the empty result as "no prior context", not as a failure.
 */
export async function recallTopK(params: {
  userId: string;
  query: string;
  k?: number;
  scope?: MemoryScope;
  signal?: AbortSignal;
}): Promise<MemoryRecord[]> {
  const { userId, query } = params;
  const scope: MemoryScope = params.scope ?? 'session';
  const k = Math.max(1, Math.min(25, params.k ?? 8));
  const cfg = supabaseConfig();
  if (!cfg) return [];
  if (!process.env.VOYAGE_API_KEY) return [];

  const embedding = await embedText(query, 'query', params.signal);
  const res = await fetch(
    `${cfg.url}/rest/v1/rpc/valhalla_memory_match_scoped`,
    {
      method: 'POST',
      headers: cfg.headers,
      body: JSON.stringify({
        p_user_id: userId,
        p_scope: scope,
        p_query_embedding: embedding,
        p_match_count: k,
      }),
      signal: params.signal,
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Supabase memory recall failed ${res.status}: ${body.slice(0, 400)}`,
    );
  }
  const rows = (await res.json()) as Array<{
    id: string;
    user_id: string;
    session_id: string;
    memory_scope: MemoryScope;
    kind: MemoryRecord['kind'];
    content: string;
    created_at: string;
    similarity: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    scope: r.memory_scope,
    kind: r.kind,
    content: r.content,
    createdAt: r.created_at,
    similarity: r.similarity,
  }));
}

/**
 * Convenience: pull the top-K `global_user` memories for a user. Used
 * by the orchestrator to inject persistent preferences into ODIN's
 * boot prompt on every new turn.
 */
export async function recallGlobalMemories(params: {
  userId: string;
  query: string;
  k?: number;
  signal?: AbortSignal;
}): Promise<MemoryRecord[]> {
  return recallTopK({ ...params, scope: 'global_user' });
}

/**
 * Persist a memory. Embeds `content` with Voyage then inserts into
 * `valhalla_memories`. No-ops (resolves to `null`) when the store
 * is unconfigured.
 */
export async function storeMemory(
  rec: Omit<MemoryRecord, 'id' | 'createdAt' | 'similarity'>,
  signal?: AbortSignal,
): Promise<string | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  if (!process.env.VOYAGE_API_KEY) return null;

  // Defensive truncation. Voyage has its own per-input token cap;
  // 16k chars is safely under voyage-3's 32k-token limit and also
  // keeps the row at a reasonable PG size for indexing.
  const content =
    rec.content.length > 16_000 ? rec.content.slice(0, 16_000) : rec.content;
  const embedding = await embedText(content, 'document', signal);
  if (embedding.length !== VOYAGE_DIM) {
    throw new Error(
      `Refusing to store memory: embedding length ${embedding.length} !== ${VOYAGE_DIM}.`,
    );
  }

  const scope: MemoryScope = rec.scope ?? 'session';
  const res = await fetch(`${cfg.url}/rest/v1/valhalla_memories`, {
    method: 'POST',
    headers: { ...cfg.headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: rec.userId,
      session_id: rec.sessionId,
      memory_scope: scope,
      kind: rec.kind,
      content,
      embedding,
    }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Supabase memory insert failed ${res.status}: ${body.slice(0, 400)}`,
    );
  }
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

/**
 * Convenience: persist a memory into the `global_user` scope. EIVOR
 * calls this via the `store_global_memory` tool to consolidate
 * architectural decisions into the Forever Context.
 */
export async function storeGlobalMemory(
  rec: Omit<MemoryRecord, 'id' | 'createdAt' | 'similarity' | 'scope'>,
  signal?: AbortSignal,
): Promise<string | null> {
  return storeMemory({ ...rec, scope: 'global_user' }, signal);
}
