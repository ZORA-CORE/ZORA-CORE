-- Valhalla AI — Master Protocol PR 3 (The Singularity).
--
-- Three new tables that power the autonomous awareness surfaces:
--
--   valhalla_ast_nodes    — files/exports/symbols discovered by the
--                           ts-morph indexer. Re-populated on every
--                           push to main via GitHub Actions. Keyed by
--                           `(repo, path)` for files and
--                           `(repo, path, name)` for symbols.
--
--   valhalla_ast_edges    — directed dependency edges (imports and
--                           re-exports today; callgraph later). Edges
--                           are truncated and re-inserted per indexing
--                           run because GitHub Actions holds a full
--                           snapshot of the tree.
--
--   valhalla_tech_debt    — ODIN's findings from the 12-hour cron
--                           ("The Pulse"). Each row captures a file,
--                           severity, reasoning, and suggested fix.
--
--   valhalla_incidents    — ingested by the error webhook ("The Pain
--                           Receptor"). Every 500 / hydration error
--                           from the frontend lands here with a
--                           severity and an optional stack trace.
--
-- All tables are server-side only: RLS is enabled and only the
-- service_role may read/write, matching `valhalla_memories`.

-- ---------------------------------------------------------------------
-- AST graph
-- ---------------------------------------------------------------------

create table if not exists public.valhalla_ast_nodes (
  id           uuid primary key default gen_random_uuid(),
  repo         text not null,
  path         text not null,
  kind         text not null
                 check (kind in ('file','export','class','function','interface','type','default_export')),
  name         text not null,
  line         int,
  content_hash text,
  updated_at   timestamptz not null default now()
);

create unique index if not exists valhalla_ast_nodes_uniq
  on public.valhalla_ast_nodes (repo, path, kind, name);

create index if not exists valhalla_ast_nodes_path_idx
  on public.valhalla_ast_nodes (repo, path);

create table if not exists public.valhalla_ast_edges (
  id           uuid primary key default gen_random_uuid(),
  repo         text not null,
  source_path  text not null,
  target_path  text not null,
  kind         text not null
                 check (kind in ('import','re_export','dynamic_import')),
  symbol       text,
  updated_at   timestamptz not null default now()
);

create index if not exists valhalla_ast_edges_source_idx
  on public.valhalla_ast_edges (repo, source_path);

create index if not exists valhalla_ast_edges_target_idx
  on public.valhalla_ast_edges (repo, target_path);

alter table public.valhalla_ast_nodes enable row level security;
alter table public.valhalla_ast_edges enable row level security;

drop policy if exists valhalla_ast_nodes_service_all on public.valhalla_ast_nodes;
create policy valhalla_ast_nodes_service_all
  on public.valhalla_ast_nodes for all to service_role
  using (true) with check (true);

drop policy if exists valhalla_ast_edges_service_all on public.valhalla_ast_edges;
create policy valhalla_ast_edges_service_all
  on public.valhalla_ast_edges for all to service_role
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- Tech debt (ODIN's Pulse findings)
-- ---------------------------------------------------------------------

create table if not exists public.valhalla_tech_debt (
  id           uuid primary key default gen_random_uuid(),
  repo         text not null,
  path         text,
  severity     text not null
                 check (severity in ('info','low','medium','high','critical')),
  category     text not null,
  title        text not null,
  reasoning    text not null,
  suggested_fix text,
  status       text not null default 'open'
                 check (status in ('open','acknowledged','fixed','wont_fix')),
  discovered_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists valhalla_tech_debt_status_idx
  on public.valhalla_tech_debt (status, severity, discovered_at desc);

alter table public.valhalla_tech_debt enable row level security;
drop policy if exists valhalla_tech_debt_service_all on public.valhalla_tech_debt;
create policy valhalla_tech_debt_service_all
  on public.valhalla_tech_debt for all to service_role
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- Incidents (The Pain Receptor)
-- ---------------------------------------------------------------------

create table if not exists public.valhalla_incidents (
  id           uuid primary key default gen_random_uuid(),
  source       text not null
                 check (source in ('frontend_error','api_500','hydration','manual','other')),
  severity     text not null
                 check (severity in ('info','warning','error','fatal')),
  message      text not null,
  stack        text,
  url          text,
  user_agent   text,
  user_id      text,
  session_id   text,
  fingerprint  text,
  context      jsonb,
  swarm_triggered boolean not null default false,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists valhalla_incidents_recent_idx
  on public.valhalla_incidents (created_at desc);

create index if not exists valhalla_incidents_fingerprint_idx
  on public.valhalla_incidents (fingerprint, created_at desc);

alter table public.valhalla_incidents enable row level security;
drop policy if exists valhalla_incidents_service_all on public.valhalla_incidents;
create policy valhalla_incidents_service_all
  on public.valhalla_incidents for all to service_role
  using (true) with check (true);
