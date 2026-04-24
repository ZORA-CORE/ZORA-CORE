-- Valhalla AI — Singularity Hotfix: EIVOR Omni-Memory (dual-vector).
--
-- Extends `valhalla_memories` with a `memory_scope` discriminator so
-- a single table can hold BOTH session-scoped memories (what the
-- user said in this chat) and global-user memories (enduring
-- architectural decisions, coding preferences, past project schemas).
--
-- Adds two RPCs so the query planner picks the right partial path:
--   * valhalla_memory_match_session  — scoped to (user_id, session_id)
--   * valhalla_memory_match_global   — scoped to (user_id, scope='global_user')
--
-- Idempotent & safe to re-run. Degrades gracefully: the legacy
-- `valhalla_memory_match` RPC from migration 002 keeps working
-- untouched so existing code paths continue to function.

alter table public.valhalla_memories
  add column if not exists memory_scope text
    not null default 'session';

do $$ begin
  begin
    alter table public.valhalla_memories
      add constraint valhalla_memories_scope_check
      check (memory_scope in ('session','global_user'));
  exception when duplicate_object then null;
  end;
end $$;

-- Session memories are the existing rows (kept as default).
-- Global memories are explicitly written by EIVOR via `store_global_memory`.
create index if not exists valhalla_memories_scope_user_idx
  on public.valhalla_memories (user_id, memory_scope, created_at desc);

-- Partial ivfflat index for the global pool. Because global memories
-- are rare (~tens per user, not thousands), a dedicated index keeps
-- the retrieval hot path fast without competing with the session
-- corpus.
create index if not exists valhalla_memories_global_embedding_idx
  on public.valhalla_memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50)
  where memory_scope = 'global_user';

-- Session scoped search. Stricter than the legacy RPC — narrows to
-- the current session_id so cross-session leakage can't happen.
create or replace function public.valhalla_memory_match_session(
  p_user_id          text,
  p_session_id       text,
  p_query_embedding  vector(1024),
  p_match_count      int default 8
)
returns table (
  id            uuid,
  user_id       text,
  session_id    text,
  kind          text,
  content       text,
  memory_scope  text,
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
    m.kind,
    m.content,
    m.memory_scope,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding)::float4 as similarity
  from public.valhalla_memories m
  where m.user_id = p_user_id
    and m.session_id = p_session_id
    and m.memory_scope = 'session'
  order by m.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 25));
$$;

grant execute on function public.valhalla_memory_match_session(text, text, vector(1024), int)
  to service_role;

-- Global-user (omni) memory search. Spans all sessions for this user,
-- but only returns rows explicitly promoted to the global pool.
create or replace function public.valhalla_memory_match_global(
  p_user_id          text,
  p_query_embedding  vector(1024),
  p_match_count      int default 5
)
returns table (
  id            uuid,
  user_id       text,
  session_id    text,
  kind          text,
  content       text,
  memory_scope  text,
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
    m.kind,
    m.content,
    m.memory_scope,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding)::float4 as similarity
  from public.valhalla_memories m
  where m.user_id = p_user_id
    and m.memory_scope = 'global_user'
  order by m.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 12));
$$;

grant execute on function public.valhalla_memory_match_global(text, vector(1024), int)
  to service_role;

-- Chat sessions table so the sidebar can persist /chat/[chatId]
-- threads across devices. Optional — if the client is offline or
-- the table is absent, the app falls back to the existing
-- localStorage thread store.
create table if not exists public.valhalla_chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  title           text not null default 'New chat',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz,
  archived        boolean not null default false
);

create index if not exists valhalla_chat_sessions_user_updated_idx
  on public.valhalla_chat_sessions (user_id, updated_at desc)
  where archived = false;

alter table public.valhalla_chat_sessions enable row level security;
drop policy if exists valhalla_chat_sessions_service_all on public.valhalla_chat_sessions;
create policy valhalla_chat_sessions_service_all
  on public.valhalla_chat_sessions
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.valhalla_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.valhalla_chat_sessions(id) on delete cascade,
  user_id     text not null,
  role        text not null check (role in ('user','assistant','system')),
  content     text not null,
  artifacts   jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists valhalla_chat_messages_session_idx
  on public.valhalla_chat_messages (session_id, created_at);

alter table public.valhalla_chat_messages enable row level security;
drop policy if exists valhalla_chat_messages_service_all on public.valhalla_chat_messages;
create policy valhalla_chat_messages_service_all
  on public.valhalla_chat_messages
  for all
  to service_role
  using (true)
  with check (true);
