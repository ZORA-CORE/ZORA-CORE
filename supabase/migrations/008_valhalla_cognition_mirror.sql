-- Valhalla AI — Cognition Mirror PR 1: Devin-parity event contract.
--
-- This migration establishes the durable workspace model needed to
-- rebuild a Devin-like agent session after reload: planner state,
-- workspace files, runtime resources, and a rich event log that can
-- drive the quad-pane UI.

create table if not exists public.valhalla_agent_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null,
  chat_session_id        text,
  swarm_job_id           uuid references public.valhalla_swarm_jobs(id) on delete set null,
  agent                 text not null
                          check (agent in ('odin','thor','freja','eivor','heimdall','loki','hugin','munin')),
  title                 text not null default 'Cognition Mirror session',
  status                text not null default 'queued'
                          check (status in ('queued','running','blocked','completed','failed','cancelled')),
  runtime_provider      text not null default 'e2b',
  runtime_id            text,
  sandbox_id            text,
  workdir               text not null default '/home/user/valhalla',
  current_branch        text,
  base_branch           text,
  pull_request_url      text,
  preview_url           text,
  last_event_id         bigint,
  last_heartbeat_at     timestamptz not null default now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists valhalla_agent_sessions_user_created_idx
  on public.valhalla_agent_sessions (user_id, created_at desc);

create index if not exists valhalla_agent_sessions_swarm_job_idx
  on public.valhalla_agent_sessions (swarm_job_id, agent);

create index if not exists valhalla_agent_sessions_status_idx
  on public.valhalla_agent_sessions (status, last_heartbeat_at);

create table if not exists public.valhalla_planner_items (
  id                 uuid primary key default gen_random_uuid(),
  agent_session_id   uuid not null references public.valhalla_agent_sessions(id) on delete cascade,
  parent_id          uuid references public.valhalla_planner_items(id) on delete cascade,
  position           integer not null default 0,
  title              text not null,
  detail             text,
  status             text not null default 'pending'
                       check (status in ('pending','in_progress','completed','blocked','cancelled')),
  source_event_id    bigint,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);

create index if not exists valhalla_planner_items_session_position_idx
  on public.valhalla_planner_items (agent_session_id, position, created_at);

create index if not exists valhalla_planner_items_status_idx
  on public.valhalla_planner_items (agent_session_id, status);

create table if not exists public.valhalla_workspace_files (
  id                 uuid primary key default gen_random_uuid(),
  agent_session_id   uuid not null references public.valhalla_agent_sessions(id) on delete cascade,
  path               text not null,
  language           text not null default 'text',
  content            text not null default '',
  previous_content   text,
  source             text not null default 'agent'
                       check (source in ('agent','user','runtime','git','preview')),
  is_dirty           boolean not null default false,
  is_deleted         boolean not null default false,
  source_event_id    bigint,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (agent_session_id, path)
);

create index if not exists valhalla_workspace_files_session_updated_idx
  on public.valhalla_workspace_files (agent_session_id, updated_at desc);

create table if not exists public.valhalla_runtime_resources (
  id                 uuid primary key default gen_random_uuid(),
  agent_session_id   uuid not null references public.valhalla_agent_sessions(id) on delete cascade,
  kind               text not null
                       check (kind in ('terminal','browser','editor','filesystem','git','ci','preview')),
  provider           text not null default 'e2b',
  external_id        text,
  status             text not null default 'initializing'
                       check (status in ('initializing','ready','busy','stopped','failed')),
  metadata           jsonb not null default '{}'::jsonb,
  last_heartbeat_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists valhalla_runtime_resources_session_kind_idx
  on public.valhalla_runtime_resources (agent_session_id, kind, status);

create table if not exists public.valhalla_tool_events (
  id                 bigserial primary key,
  agent_session_id   uuid not null references public.valhalla_agent_sessions(id) on delete cascade,
  swarm_job_id        uuid references public.valhalla_swarm_jobs(id) on delete set null,
  agent              text not null,
  event_type          text not null,
  tool_name           text,
  planner_item_id     uuid references public.valhalla_planner_items(id) on delete set null,
  resource_id         uuid references public.valhalla_runtime_resources(id) on delete set null,
  seq                 bigint not null,
  event               jsonb not null,
  created_at          timestamptz not null default now(),
  unique (agent_session_id, seq)
);

create index if not exists valhalla_tool_events_session_id_idx
  on public.valhalla_tool_events (agent_session_id, id);

create index if not exists valhalla_tool_events_swarm_job_idx
  on public.valhalla_tool_events (swarm_job_id, id);

create index if not exists valhalla_tool_events_type_idx
  on public.valhalla_tool_events (agent_session_id, event_type, id);

alter table public.valhalla_agent_sessions enable row level security;
alter table public.valhalla_planner_items enable row level security;
alter table public.valhalla_workspace_files enable row level security;
alter table public.valhalla_runtime_resources enable row level security;
alter table public.valhalla_tool_events enable row level security;

drop policy if exists valhalla_agent_sessions_service_all on public.valhalla_agent_sessions;
drop policy if exists valhalla_planner_items_service_all on public.valhalla_planner_items;
drop policy if exists valhalla_workspace_files_service_all on public.valhalla_workspace_files;
drop policy if exists valhalla_runtime_resources_service_all on public.valhalla_runtime_resources;
drop policy if exists valhalla_tool_events_service_all on public.valhalla_tool_events;

create policy valhalla_agent_sessions_service_all
  on public.valhalla_agent_sessions
  for all
  to service_role
  using (true)
  with check (true);

create policy valhalla_planner_items_service_all
  on public.valhalla_planner_items
  for all
  to service_role
  using (true)
  with check (true);

create policy valhalla_workspace_files_service_all
  on public.valhalla_workspace_files
  for all
  to service_role
  using (true)
  with check (true);

create policy valhalla_runtime_resources_service_all
  on public.valhalla_runtime_resources
  for all
  to service_role
  using (true)
  with check (true);

create policy valhalla_tool_events_service_all
  on public.valhalla_tool_events
  for all
  to service_role
  using (true)
  with check (true);
