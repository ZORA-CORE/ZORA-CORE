-- Valhalla AI — Prometheus PR 1B: worker-token CAS for swarm jobs.
--
-- Problem this fixes: under PR 1's chunked-worker design two workers
-- can race each other on the same job. Specifically the SSE stream
-- endpoint's kickTimer fires `kickWorker` whenever it observes a
-- stale heartbeat; that kick may collide with an in-flight worker
-- that simply happens to be inside a slow Anthropic call. The
-- in-loop heartbeat-fresh check in route.ts cannot eliminate this
-- window because the SSE kickTimer fires on the SECOND-tier window
-- (heartbeat older than 60s) — a stage that takes 65s+ to write its
-- next event is enough to lose the lock.
--
-- Postgres advisory locks would be the textbook fix but they are
-- session/transaction-scoped, and our worker is composed of many
-- separate REST calls into Supabase rather than one long-lived
-- session. So the durable equivalent is a worker-token CAS pattern:
--   * each worker generates a UUID at start
--   * the claim is atomic via this RPC (FOR UPDATE row-lock + insert
--     of the new token)
--   * every subsequent updateJob filters on `worker_token = <our>`
--     so a preempted worker simply 0-rows on its writes and exits
--   * a continuation chain (PR #132's SOFT_BUDGET hand-off) passes
--     its parent token so the inheriting worker is allowed to take
--     over without collision

alter table public.valhalla_swarm_jobs
  add column if not exists worker_token uuid;

create or replace function public.valhalla_claim_swarm_job(
  p_job_id uuid,
  p_new_token uuid,
  p_stale_seconds int,
  p_parent_token uuid
)
returns boolean
language plpgsql
as $$
declare
  v_status text;
  v_token uuid;
  v_age_seconds numeric;
begin
  select status,
         worker_token,
         extract(epoch from (now() - last_heartbeat_at))
    into v_status, v_token, v_age_seconds
    from public.valhalla_swarm_jobs
   where id = p_job_id
   for update;

  if not found then
    return false;
  end if;

  if v_status in ('completed', 'failed') then
    return false;
  end if;

  -- Continuation handoff: caller is our own self-chain, so let it
  -- take ownership atomically without a collision check.
  if p_parent_token is not null
     and v_token is not null
     and p_parent_token = v_token then
    update public.valhalla_swarm_jobs
       set worker_token = p_new_token,
           status = 'running',
           last_heartbeat_at = now()
     where id = p_job_id;
    return true;
  end if;

  -- A different worker is alive and writing recently; back off.
  if v_status = 'running' and v_age_seconds < p_stale_seconds then
    return false;
  end if;

  -- Either queued, or a stale running worker we are taking over.
  update public.valhalla_swarm_jobs
     set worker_token = p_new_token,
         status = 'running',
         last_heartbeat_at = now()
   where id = p_job_id;
  return true;
end;
$$;

grant execute on function public.valhalla_claim_swarm_job(uuid, uuid, int, uuid) to service_role;
