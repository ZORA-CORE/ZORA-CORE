/**
 * Valhalla AI — Infinity Engine: Supabase-backed episodic memory.
 *
 * EIVOR calls `recallTopK` on every turn to pull the most similar past
 * memories for the current user, and the orchestrator calls
 * `storeMemory` at the end of every turn to persist the final
 * plan + code so the NEXT turn can retrieve it.
 *
 * Schema (see supabase/migrations/002_valhalla_memories.sql):
 *   valhalla_memories (
 *     id uuid pk,
 *     user_id text not null,
 *     session_id text not null,
 *     kind text not null check (kind in ('plan','code','critique','counterexample','turn')),
 *     content text not null,
 *     embedding vector(1024) not null,
 *     created_at timestamptz default now()
 *   )
 *
 * Retrieval uses the `valhalla_memory_match` RPC which performs an
 * ivfflat ANN search scoped to `user_id`, returning (content, kind,
 * similarity) ordered by similarity desc.
 *
 * The module degrades gracefully: if `SUPABASE_URL` or
 * `SUPABASE_SERVICE_ROLE_KEY` are missing, every call is a no-op
 * (recall returns `[]`, store resolves). This keeps the native swarm
 * runnable locally without the full infra.
 */
import { embedText, VOYAGE_DIM } from './voyage';

export interface MemoryRecord {
  id?: string;
  userId: string;
  sessionId: string;
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
 * Retrieve the top-K memories closest to `query` for this user.
 *
 * Returns `[]` if the store is not configured — callers should treat
 * the empty result as "no prior context", not as a failure. Real
 * transport errors ARE thrown because those usually indicate a
 * misconfiguration the operator should see.
 */
export async function recallTopK(params: {
  userId: string;
  query: string;
  k?: number;
  signal?: AbortSignal;
}): Promise<MemoryRecord[]> {
  const { userId, query } = params;
  const k = Math.max(1, Math.min(25, params.k ?? 8));
  const cfg = supabaseConfig();
  if (!cfg) return [];
  if (!process.env.VOYAGE_API_KEY) return [];

  const embedding = await embedText(query, 'query', params.signal);
  const res = await fetch(`${cfg.url}/rest/v1/rpc/valhalla_memory_match`, {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify({
      p_user_id: userId,
      p_query_embedding: embedding,
      p_match_count: k,
    }),
    signal: params.signal,
  });
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
    kind: MemoryRecord['kind'];
    content: string;
    created_at: string;
    similarity: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    kind: r.kind,
    content: r.content,
    createdAt: r.created_at,
    similarity: r.similarity,
  }));
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
  const content = rec.content.length > 16_000 ? rec.content.slice(0, 16_000) : rec.content;
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
