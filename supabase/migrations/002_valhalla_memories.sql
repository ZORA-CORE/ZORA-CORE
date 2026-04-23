-- Valhalla AI — Infinity Engine: episodic memory table + RPC.
--
-- This migration is idempotent and safe to re-run. It creates the
-- `valhalla_memories` table used by the native Claude orchestrator to
-- store and retrieve past plan/code/critique artifacts, along with:
--   - pgvector extension (if missing)
--   - IVFFlat index for fast ANN search scoped to a user
--   - A row-level security policy that only allows the service_role
--     (used server-side by the Next.js orchestrator) to read / write
--   - The `valhalla_memory_match` RPC used by `recallTopK`
--
-- Vector dimension is 1024 to match Voyage AI's `voyage-3` model.

create extension if not exists vector;

create table if not exists public.valhalla_memories (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  session_id    text not null,
  kind          text not null
                  check (kind in ('plan','code','critique','counterexample','turn')),
  content       text not null,
  embedding     vector(1024) not null,
  created_at    timestamptz not null default now()
);

create index if not exists valhalla_memories_user_id_idx
  on public.valhalla_memories (user_id, created_at desc);

-- IVFFlat index for cosine distance. `lists = 100` is appropriate up
-- to ~1M rows; retune with `alter index ... set (lists = …)` as the
-- corpus grows. `vector_cosine_ops` matches the distance operator the
-- RPC below uses (`<=>`).
create index if not exists valhalla_memories_embedding_idx
  on public.valhalla_memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.valhalla_memories enable row level security;

-- Reset policies so re-running this migration doesn't stack duplicates.
drop policy if exists valhalla_memories_service_all on public.valhalla_memories;

-- Service-role only: the Next.js orchestrator talks to Supabase using
-- the service_role key on the server. We deliberately do NOT grant
-- anon/auth access here — past agent plans may contain code or design
-- notes the user has not opted to expose to the browser.
create policy valhalla_memories_service_all
  on public.valhalla_memories
  for all
  to service_role
  using (true)
  with check (true);

-- Similarity-search RPC. Returns the top-N rows for a given user and
-- query embedding, ordered by cosine similarity desc. Cosine distance
-- `<=>` returns `[0,2]` where 0 = identical; similarity = 1 - distance.
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
  order by m.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 25));
$$;

grant execute on function public.valhalla_memory_match(text, vector(1024), int)
  to service_role;
