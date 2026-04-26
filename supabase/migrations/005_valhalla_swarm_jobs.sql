-- Valhalla AI — Prometheus PR 1: durable swarm-job state.
--
-- Lifts the Vercel 300 s ceiling that was preventing FREJA from ever
-- reaching the user. Before this migration, `runSwarm` was bound to
-- the lifetime of a single HTTP request: a 2-cycle Plan→Critique→
-- Counterexample loop + THOR + FREJA empirically blew past the
-- Pro-plan 300 s `maxDuration` (FREJA started at t≈291 s and her
-- response landed beyond the cutoff). Decoupling the orchestrator
-- from the request lifetime requires:
--
--   1. A `valhalla_swarm_jobs` row that survives across function
--      invocations and tracks "where are we in the pipeline".
--   2. A `valhalla_swarm_events` event log that captures every
--      `SwarmEvent` the orchestrator emits, so the client SSE
--      endpoint can replay them WITHOUT being tied to the running
--      worker. The browser stays connected to the events table, not
--      to the worker function. If the worker dies, the next
--      continuation invocation picks up at `current_stage`.
--   3. RLS policies that grant the service_role full access (the
--      Next.js orchestrator runs with the service-role key
--      server-side) and deny everything else by default.
--
-- The schema is deliberately minimal — `current_stage` is a free-
-- form string the orchestrator owns, not a Postgres enum. That
-- keeps stage names additive without schema migrations every time
-- the cycle layout changes (e.g. when Mimir Mode adds parallel
-- THOR sandboxes in a future PR).

create table if not exists public.valhalla_swarm_jobs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null,
  session_id          text not null,
  query               text not null,
  history             jsonb not null default '[]'::jsonb,
  -- Recalled-memory markdown is computed once at job init and
  -- replayed into every stage's prompt so subsequent stage
  -- invocations can rebuild `basePrompt` deterministically.
  recalled_markdown   text not null default '',
  -- Free-form stage label owned by the orchestrator state machine
  -- (e.g. 'init', 'eivor', 'cycle1_odin', 'thor', 'freja', 'done').
  current_stage       text not null default 'init',
  -- Status drives whether `/api/swarm/run` will pick this row up.
  --   queued    — created, no worker running yet
  --   running   — a worker is actively executing the current_stage
  --   completed — orchestrator emitted swarm_done
  --   failed    — orchestrator hit a fatal error (see error_message)
  status              text not null default 'queued'
                        check (status in ('queued','running','completed','failed')),
  -- True when the original POST was routed through the Devin-mode
  -- (Anthropic Tool Use) runner. Persisted so the resume worker
  -- picks the same runner on every continuation.
  use_tool_use        boolean not null default false,
  error_message       text,
  -- Liveness signal so a watchdog can detect a crashed worker that
  -- never marked the job 'failed'. Updated on every stage tick.
  last_heartbeat_at   timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists valhalla_swarm_jobs_user_id_idx
  on public.valhalla_swarm_jobs (user_id, created_at desc);

create index if not exists valhalla_swarm_jobs_status_idx
  on public.valhalla_swarm_jobs (status, last_heartbeat_at);

create table if not exists public.valhalla_swarm_events (
  -- Sequence-id is bigserial so the natural sort order matches
  -- emission order; the client streams in (job_id, id) order.
  id          bigserial primary key,
  job_id      uuid not null references public.valhalla_swarm_jobs(id) on delete cascade,
  -- The full SwarmEvent JSON (type, agent, payload, at). Stored
  -- as jsonb so the events table is forward-compatible with new
  -- SwarmEvent variants without column-level migrations.
  event       jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists valhalla_swarm_events_job_id_idx
  on public.valhalla_swarm_events (job_id, id);

alter table public.valhalla_swarm_jobs enable row level security;
alter table public.valhalla_swarm_events enable row level security;

-- Reset policies so re-running this migration doesn't stack duplicates.
drop policy if exists valhalla_swarm_jobs_service_all on public.valhalla_swarm_jobs;
drop policy if exists valhalla_swarm_events_service_all on public.valhalla_swarm_events;

-- Service-role only, mirroring valhalla_memories. The Next.js worker
-- talks to Supabase with the service-role key server-side; the
-- browser never reads these tables directly (it talks to the SSE
-- endpoint /api/swarm/stream/[jobId] which proxies the read).
create policy valhalla_swarm_jobs_service_all
  on public.valhalla_swarm_jobs
  for all
  to service_role
  using (true)
  with check (true);

create policy valhalla_swarm_events_service_all
  on public.valhalla_swarm_events
  for all
  to service_role
  using (true)
  with check (true);

-- updated_at maintenance: bumped automatically on row update so the
-- watchdog can compare against `now() - interval '60 seconds'` to
-- detect stuck jobs. The trigger is a no-op on insert.
create or replace function public.valhalla_swarm_jobs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists valhalla_swarm_jobs_touch_updated_at on public.valhalla_swarm_jobs;
create trigger valhalla_swarm_jobs_touch_updated_at
  before update on public.valhalla_swarm_jobs
  for each row execute function public.valhalla_swarm_jobs_touch_updated_at();
