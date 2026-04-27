-- Valhalla AI — Prometheus PR 3 (Infinity Loop): per-user provider key vault.
--
-- The Federation Matrix (9 providers) means a single global env var
-- per provider isn't sufficient: personal accounts will bring their
-- own keys for some providers (OpenAI, Perplexity Pro, …) while the
-- Valhalla operator continues to bankroll others (Anthropic, Cohere
-- free-tier, …).
--
-- Resolution order at runtime:
--   (a) per-user row here, scoped on (user_id, provider),
--   (b) process env var (e.g. OPENAI_API_KEY),
--   (c) MissingProviderKeyError → structured onboarding SSE event.
--
-- The table is service-role-only. RLS is enabled so even an
-- authenticated client with a leaked anon key cannot read keys —
-- writes go through the server-side `POST /api/secrets/[provider]`
-- route which authenticates the session before upserting.

create table if not exists public.valhalla_user_secrets (
  user_id text not null,
  provider text not null check (provider in (
    'anthropic',
    'openai',
    'google',
    'meta',
    'xai',
    'cohere',
    'perplexity',
    'mistral'
  )),
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create index if not exists valhalla_user_secrets_user_idx
  on public.valhalla_user_secrets (user_id);

alter table public.valhalla_user_secrets enable row level security;

-- No client-side read or write policies: everything goes through the
-- server with the service-role key. We DROP any pre-existing policies
-- (idempotent) so re-running this migration cannot widen access.
drop policy if exists "valhalla_user_secrets_self_select"
  on public.valhalla_user_secrets;
drop policy if exists "valhalla_user_secrets_self_modify"
  on public.valhalla_user_secrets;

grant select, insert, update, delete
  on public.valhalla_user_secrets
  to service_role;
