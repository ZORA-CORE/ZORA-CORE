-- Valhalla AI — Hotfix: EIVOR Omni-Memory (Dual-Vector LTM).
--
-- The original episodic memory (002_valhalla_memories.sql) only stored
-- session-scoped context. The "Forever Context" hotfix introduces a
-- second vector pool — `global_user` — that persists across every chat
-- and is auto-injected into ODIN's boot prompt. EIVOR gets a
-- `store_global_memory` tool for consolidating major architectural
-- decisions into this global pool.
--
-- This migration is idempotent: safe to re-run. It:
--   1. Adds a `memory_scope` column (default 'session') to
--      `valhalla_memories`, constrained to 'session' | 'global_user'.
--   2. Adds an index on `(user_id, memory_scope, created_at desc)` so
--      the global-retrieval query stays sub-ms at scale.
--   3. Replaces `valhalla_memory_match` with a scope-aware variant
--      (backward compatible — the original signature is kept as a
--      wrapper defaulting to scope='session').
--   4. Adds a new `valhalla_memory_match_scoped` RPC used by
--      `recallGlobalMemories`.

alter table public.valhalla_memories
  add column if not exists memory_scope text
  not null default 'session';

alter table public.valhalla_memories
  drop constraint if exists valhalla_memories_memory_scope_check;

alter table public.valhalla_memories
  add constraint valhalla_memories_memory_scope_check
  check (memory_scope in ('session', 'global_user'));

create index if not exists valhalla_memories_user_scope_idx
  on public.valhalla_memories (user_id, memory_scope, created_at desc);

-- Scope-aware similarity RPC. Returns the top-N rows for a user
-- within the given scope, ordered by cosine similarity desc.
create or replace function public.valhalla_memory_match_scoped(
  p_user_id          text,
  p_scope            text,
  p_query_embedding  vector(1024),
  p_match_count      int default 8
)
returns table (
  id            uuid,
  user_id       text,
  session_id    text,
  memory_scope  text,
  kind          text,
  content       text,
  created_at    timestamptz,
  similarity    float4
)
language sql
stable
as $$
  select
    m.id,
    m.user_id,
    m.session_id,
    m.memory_scope,
    m.kind,
    m.content,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding)::float4 as similarity
  from public.valhalla_memories m
  where m.user_id = p_user_id
    and m.memory_scope = p_scope
  order by m.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 25));
$$;

grant execute on function public.valhalla_memory_match_scoped(
  text, text, vector(1024), int
) to service_role;

-- Backward-compatible wrapper for the original session-only RPC. The
-- existing `recallTopK` continues to work without changes.
create or replace function public.valhalla_memory_match(
  p_user_id          text,
  p_query_embedding  vector(1024),
  p_match_count      int default 8
)
returns table (
  id           uuid,
  user_id      text,
  session_id   text,
  kind         text,
  content      text,
  created_at   timestamptz,
  similarity   float4
)
language sql
stable
as $$
  select
    m.id,
    m.user_id,
    m.session_id,
    m.kind,
    m.content,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding)::float4 as similarity
  from public.valhalla_memories m
  where m.user_id = p_user_id
    and m.memory_scope = 'session'
  order by m.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 25));
$$;

grant execute on function public.valhalla_memory_match(text, vector(1024), int)
  to service_role;
