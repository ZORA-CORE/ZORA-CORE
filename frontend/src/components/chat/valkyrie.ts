/**
 * Valhalla AI — Valkyrie Bundle.
 *
 * Extends the standard session zip with everything needed to take a
 * forged project from "code in chat" to "running in production" without
 * hand-wiring the infra:
 *
 *   .github/workflows/deploy.yml   — Vercel + Wrangler + Supabase CI
 *   workers/api/worker.ts          — Cloudflare Worker skeleton
 *   workers/api/wrangler.toml      — Worker config
 *   supabase/migrations/001_init.sql — pgvector + starter tables
 *   scripts/deploy.sh              — one-shot manual deploy
 *   VALKYRIE.md                    — activation steps
 *
 * The Valkyrie files live *alongside* the standard bundle output, so a
 * developer can unzip and immediately:
 *   1. Set VERCEL_TOKEN / CF_API_TOKEN / SUPABASE_ACCESS_TOKEN secrets
 *   2. Run `scripts/deploy.sh` or let the GH Action pick it up
 *
 * Nothing here is Dify-specific; it's a generic Vercel + Cloudflare
 * Workers + Supabase triad, which is the ZORA CORE stack.
 */
import JSZip from 'jszip';
import type { Artifact } from './artifacts';
import type { ChatMessage } from './types';
import { buildSessionBundle } from './bundle';

const GITHUB_ACTION_YAML = `name: Valkyrie Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install deps
        run: npm ci --legacy-peer-deps || npm install --legacy-peer-deps

      # ---- Vercel (frontend) ----
      - name: Deploy to Vercel
        if: env.VERCEL_TOKEN != ''
        env:
          VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
        run: npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"

      # ---- Cloudflare Workers (API) ----
      - name: Deploy Cloudflare Worker
        if: env.CF_API_TOKEN != ''
        env:
          CF_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
        working-directory: workers/api
        run: npx wrangler@latest deploy

      # ---- Supabase (DB migrations) ----
      - name: Apply Supabase migrations
        if: env.SUPABASE_ACCESS_TOKEN != ''
        env:
          SUPABASE_ACCESS_TOKEN: \${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_URL: \${{ secrets.SUPABASE_DB_URL }}
        run: npx supabase@latest db push --db-url "$SUPABASE_DB_URL" --include-all
`;

const WORKER_TS = `/**
 * Valkyrie Worker — minimal Hono-compatible handler.
 *
 * Replace with generated code from the session. Kept dependency-free so
 * \`wrangler deploy\` works out of the box.
 */
export default {
  async fetch(request: Request, env: Record<string, string>): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'valkyrie-worker' });
    }

    if (url.pathname === '/echo') {
      const body = await request.text();
      return Response.json({ echoed: body, method: request.method });
    }

    return new Response('Not found', { status: 404 });
  },
};
`;

const WRANGLER_TOML = `# Cloudflare Worker config for the Valkyrie bundle.
# After unzipping:
#   1. npm i -D wrangler
#   2. npx wrangler login (one-time)
#   3. npx wrangler deploy
name = "valkyrie-api"
main = "worker.ts"
compatibility_date = "2025-01-01"

# [vars]
# SUPABASE_URL = ""

# [[kv_namespaces]]
# binding = "CACHE"
# id = ""
`;

const SUPABASE_MIGRATION = `-- Valkyrie starter migration.
--
-- Enables pgvector for EIVOR-style semantic memory, plus two tables that
-- most forged projects can build on without further wiring:
--
--   * sessions       — per-user work sessions (auth.users joined 1:N)
--   * session_events — append-only log (decisions, artifacts, errors)
--   * memories       — embedded text + metadata for semantic recall
--
-- Safe to run multiple times; all creates are IF NOT EXISTS.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions (id) on delete cascade,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists session_events_session_idx
  on public.session_events (session_id, created_at desc);

create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete cascade,
  kind        text not null,
  content     text not null,
  embedding   vector(1536),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists memories_embedding_idx
  on public.memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists memories_user_kind_idx
  on public.memories (user_id, kind, created_at desc);

-- Row-level security: users only see their own rows; the service role
-- bypasses RLS for server-side access.
alter table public.sessions        enable row level security;
alter table public.session_events  enable row level security;
alter table public.memories        enable row level security;

do $$ begin
  create policy "own sessions" on public.sessions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own memories" on public.memories
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "events by session owner" on public.session_events
    for all using (
      exists (select 1 from public.sessions s
              where s.id = session_events.session_id and s.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
`;

const DEPLOY_SH = `#!/usr/bin/env bash
# Valkyrie one-shot deploy.
# Requires: VERCEL_TOKEN, CF_API_TOKEN (or CLOUDFLARE_API_TOKEN),
#           SUPABASE_DB_URL in the environment.
set -euo pipefail

here="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

echo "▶ Valkyrie deploy starting"

if [[ -n "\${VERCEL_TOKEN:-}" ]]; then
  echo "  → Vercel"
  npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
else
  echo "  (skipping Vercel: no VERCEL_TOKEN)"
fi

if [[ -n "\${CF_API_TOKEN:-}\${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "  → Cloudflare Worker"
  (cd workers/api && CLOUDFLARE_API_TOKEN="\${CF_API_TOKEN:-\$CLOUDFLARE_API_TOKEN}" npx wrangler@latest deploy)
else
  echo "  (skipping Worker: no CF_API_TOKEN)"
fi

if [[ -n "\${SUPABASE_DB_URL:-}" ]]; then
  echo "  → Supabase migrations"
  npx supabase@latest db push --db-url "$SUPABASE_DB_URL" --include-all
else
  echo "  (skipping Supabase: no SUPABASE_DB_URL)"
fi

echo "✓ Valkyrie deploy complete"
`;

const VALKYRIE_MD = `# Valkyrie Bundle

This is the **production** flavour of the Valhalla session export. In
addition to the standard \`code/\`, \`TRANSCRIPT.md\`, and \`ARCHITECTURE.md\`
outputs, the Valkyrie bundle includes the infrastructure needed to ship
the work to real environments:

- \`.github/workflows/deploy.yml\` — CI pipeline (Vercel + Wrangler + Supabase)
- \`workers/api/worker.ts\` + \`wrangler.toml\` — Cloudflare Worker skeleton
- \`supabase/migrations/001_init.sql\` — pgvector, sessions, events, memories
- \`scripts/deploy.sh\` — one-shot local deploy
- \`vercel.json\` — frontend deployment config (from standard bundle)

## Activation

1. Unzip and \`git init && git add . && git commit -m "Valkyrie bootstrap"\`.
2. In your GitHub repo settings, add the following Action secrets:
   - \`VERCEL_TOKEN\`, \`VERCEL_ORG_ID\`, \`VERCEL_PROJECT_ID\`
   - \`CF_API_TOKEN\` (Cloudflare API token with \`Workers Scripts: Edit\`)
   - \`SUPABASE_DB_URL\` (postgres connection string with schema access)
3. Push to \`main\` — the workflow deploys all three services in parallel.
4. Or run \`bash scripts/deploy.sh\` locally after exporting the same env vars.

## Safety notes

- The Supabase migration is **idempotent** (\`create … if not exists\`) and
  enables Row-Level Security on every table.
- The GitHub Action checks \`if: env.<TOKEN> != ''\` before each deploy step,
  so missing secrets degrade gracefully instead of failing the job.
- \`scripts/deploy.sh\` uses \`set -euo pipefail\` and prints skipped steps
  explicitly so there's no silent no-op.

## Hand-off to the swarm

If you want the swarm to own the deployment loop, attach this bundle to a
new Valhalla session and ask **Heimdall** to validate the migration and
**Thor** to fill in \`worker.ts\` with the real API routes. Eivor will
remember the schema for every future session against this project.
`;

export interface ValkyrieBundleResult {
  blob: Blob;
  filename: string;
  artifactCount: number;
  mermaidCount: number;
}

export async function buildValkyrieBundle(
  artifacts: Artifact[],
  messages: ChatMessage[],
): Promise<ValkyrieBundleResult> {
  // Start from the standard session zip and layer the infra on top.
  const base = await buildSessionBundle(artifacts, messages);
  const zip = await JSZip.loadAsync(base.blob);

  zip.file('.github/workflows/deploy.yml', GITHUB_ACTION_YAML);
  zip.file('workers/api/worker.ts', WORKER_TS);
  zip.file('workers/api/wrangler.toml', WRANGLER_TOML);
  zip.file('supabase/migrations/001_init.sql', SUPABASE_MIGRATION);

  const scripts = zip.folder('scripts');
  // JSZip's unixPermissions maps to the tar/zip external attr; 0o755 keeps
  // the file executable when extracted on *nix.
  scripts?.file('deploy.sh', DEPLOY_SH, { unixPermissions: 0o755 });

  zip.file('VALKYRIE.md', VALKYRIE_MD);

  // platform: 'UNIX' is required for JSZip to encode unixPermissions
  // into the zip's external file attributes. With the default ('DOS')
  // the 0o755 mode on scripts/deploy.sh is silently discarded and the
  // extracted file comes out without the executable bit set.
  const blob = await zip.generateAsync({ type: 'blob', platform: 'UNIX' });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  return {
    blob,
    filename: `valkyrie-bundle-${stamp}.zip`,
    artifactCount: base.artifactCount,
    mermaidCount: base.mermaidCount,
  };
}
