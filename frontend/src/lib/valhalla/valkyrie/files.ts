/**
 * Valhalla AI — Valkyrie 2.0: server-safe file layout.
 *
 * Produces the exact list of `{path, content}` entries that make up a
 * Valkyrie bundle. Both the browser-side zip generator (`components/
 * chat/valkyrie.ts`) and the server-side GitHub atomic-commit shipper
 * (`app/api/valkyrie/ship/route.ts`) can consume the same layout,
 * guaranteeing the zip you download and the repo you ship are byte-
 * identical.
 *
 * No DOM, no JSZip, no Anthropic SDK — just plain strings so it builds
 * under Next.js server runtime and can be unit-tested in isolation.
 */

export interface ValkyrieFile {
  path: string;
  content: string;
}

export interface SessionArtifact {
  id: string;
  kind: 'code' | 'mermaid';
  language: string;
  code: string;
  messageId: string;
  index: number;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | number;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  typescript: 'ts', ts: 'ts', tsx: 'tsx',
  javascript: 'js', js: 'js', jsx: 'jsx',
  python: 'py', py: 'py',
  rust: 'rs', rs: 'rs',
  go: 'go', java: 'java', kotlin: 'kt', swift: 'swift',
  ruby: 'rb', rb: 'rb',
  csharp: 'cs', cs: 'cs',
  cpp: 'cpp', 'c++': 'cpp', c: 'c',
  html: 'html', css: 'css', scss: 'scss', sass: 'sass',
  json: 'json', yaml: 'yaml', yml: 'yml', toml: 'toml',
  sql: 'sql', bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh',
  dockerfile: 'Dockerfile', makefile: 'Makefile',
  markdown: 'md', md: 'md', mermaid: 'mmd',
  xml: 'xml', vue: 'vue', svelte: 'svelte',
  php: 'php', r: 'r', scala: 'scala', lua: 'lua',
  dart: 'dart', elixir: 'ex', ex: 'ex',
};

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-/]+/g, '_').replace(/^\/+/, '');
}

function filenameForArtifact(a: SessionArtifact, index: number): string {
  const firstLine = a.code.split(/\r?\n/, 1)[0] ?? '';
  const hint = firstLine.match(
    /(?:\/\/|#|--|\/\*)\s*(?:filename|path|file)\s*[:=]\s*([A-Za-z0-9._\-\/]+)/i,
  );
  if (hint) return sanitizeName(hint[1]);
  const lang = (a.language ?? '').toLowerCase();
  const ext =
    LANGUAGE_EXTENSIONS[lang] ?? (lang.replace(/[^a-z0-9]+/g, '') || 'txt');
  const padded = String(index + 1).padStart(2, '0');
  return `snippet-${padded}.${ext}`;
}

function renderTranscript(messages: SessionMessage[]): string {
  const lines: string[] = ['# Transcript\n'];
  for (const m of messages) {
    const who = m.role === 'user' ? '## You' : '## Valhalla';
    lines.push(who);
    const ts = new Date(m.createdAt).toISOString();
    lines.push(`_${ts}_`, '', m.content || '_(empty)_', '');
  }
  return lines.join('\n');
}

function renderArchitecture(mermaid: SessionArtifact[]): string | null {
  if (mermaid.length === 0) return null;
  const parts: string[] = ['# Architecture\n'];
  mermaid.forEach((a, i) => {
    parts.push(
      `## Diagram ${i + 1}\n`,
      '```mermaid',
      a.code.trim(),
      '```',
      '',
    );
  });
  return parts.join('\n');
}

const README_MD = `# Valhalla AI — Session Bundle

This archive was forged by the Valhalla Infinity Engine. It contains:

- \`code/\` — every fenced code block produced in this conversation.
- \`ARCHITECTURE.md\` — Mermaid diagrams from the session (if any).
- \`TRANSCRIPT.md\` — the full human-readable transcript.
- \`.github/workflows/deploy.yml\` — CI pipeline (Vercel + Cloudflare + Supabase).
- \`workers/api/\` — Cloudflare Worker skeleton + \`wrangler.toml\`.
- \`supabase/migrations/001_init.sql\` — pgvector, sessions, events, memories.
- \`scripts/deploy.sh\` — one-shot local deploy.
- \`VALKYRIE.md\` — activation instructions.
`;

const DEPLOY_MD = `# Ship to Vercel

\`\`\`bash
npx vercel@latest            # preview deploy
npx vercel@latest --prod     # production deploy
\`\`\`

If your code references env vars, set them via:

\`\`\`bash
npx vercel env add VARIABLE_NAME preview
npx vercel env add VARIABLE_NAME production
\`\`\`
`;

const VERCEL_JSON = JSON.stringify(
  { $schema: 'https://openapi.vercel.sh/vercel.json', framework: null, public: true },
  null,
  2,
);

// Valkyrie CI pipeline. The `secrets` context is referenced directly
// in `if:` because GH Actions evaluates `if` before step-level `env`.
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

      - name: Deploy to Vercel
        if: \${{ secrets.VERCEL_TOKEN != '' }}
        env:
          VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
        run: npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"

      - name: Deploy Cloudflare Worker
        if: \${{ secrets.CF_API_TOKEN != '' }}
        env:
          CF_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
        working-directory: workers/api
        run: npx wrangler@latest deploy

      - name: Apply Supabase migrations
        if: \${{ secrets.SUPABASE_ACCESS_TOKEN != '' }}
        env:
          SUPABASE_ACCESS_TOKEN: \${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_URL: \${{ secrets.SUPABASE_DB_URL }}
        run: npx supabase@latest db push --db-url "$SUPABASE_DB_URL" --include-all
`;

const WORKER_TS = `/**
 * Valkyrie Worker — minimal Hono-compatible handler. Replace with
 * generated code from the session.
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

const WRANGLER_TOML = `name = "valkyrie-api"
main = "worker.ts"
compatibility_date = "2025-01-01"
`;

const SUPABASE_MIGRATION = `-- Valkyrie starter migration. Safe to re-run.
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
`;

const DEPLOY_SH = `#!/usr/bin/env bash
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
fi
if [[ -n "\${SUPABASE_DB_URL:-}" ]]; then
  echo "  → Supabase"
  npx supabase@latest db push --db-url "$SUPABASE_DB_URL" --include-all
fi
echo "✓ Valkyrie deploy complete"
`;

const VALKYRIE_MD = `# Valkyrie Bundle

Forged by the Valhalla Infinity Engine. Contents:

- \`.github/workflows/deploy.yml\` — CI (Vercel + Wrangler + Supabase)
- \`workers/api/worker.ts\` + \`wrangler.toml\` — Cloudflare Worker skeleton
- \`supabase/migrations/001_init.sql\` — pgvector starter schema
- \`scripts/deploy.sh\` — one-shot local deploy
- \`vercel.json\` — Vercel config

## Activation

1. In your GitHub repo settings, add Action secrets: \`VERCEL_TOKEN\`,
   \`VERCEL_ORG_ID\`, \`VERCEL_PROJECT_ID\`, \`CF_API_TOKEN\`,
   \`SUPABASE_DB_URL\`.
2. Push to \`main\` — CI deploys all three services.
3. Or run \`bash scripts/deploy.sh\` locally after exporting the same
   env vars.
`;

/**
 * Render the full Valkyrie file layout for a session. Output is
 * deterministic: identical `(artifacts, messages)` → identical bytes.
 */
export function buildValkyrieFileEntries(
  artifacts: SessionArtifact[],
  messages: SessionMessage[],
): ValkyrieFile[] {
  const code = artifacts.filter((a) => a.kind === 'code');
  const mermaid = artifacts.filter((a) => a.kind === 'mermaid');

  const files: ValkyrieFile[] = [];
  const usedNames = new Set<string>();
  code.forEach((a, i) => {
    let name = filenameForArtifact(a, i);
    const base = name;
    let attempt = 1;
    while (usedNames.has(name)) {
      const dot = base.lastIndexOf('.');
      name =
        dot > 0
          ? `${base.slice(0, dot)}-${attempt}${base.slice(dot)}`
          : `${base}-${attempt}`;
      attempt += 1;
    }
    usedNames.add(name);
    files.push({ path: `code/${name}`, content: a.code });
  });

  files.push({ path: 'README.md', content: README_MD });
  files.push({ path: 'TRANSCRIPT.md', content: renderTranscript(messages) });
  const arch = renderArchitecture(mermaid);
  if (arch) files.push({ path: 'ARCHITECTURE.md', content: arch });
  files.push({ path: 'DEPLOY.md', content: DEPLOY_MD });
  files.push({ path: 'vercel.json', content: VERCEL_JSON });
  files.push({ path: '.github/workflows/deploy.yml', content: GITHUB_ACTION_YAML });
  files.push({ path: 'workers/api/worker.ts', content: WORKER_TS });
  files.push({ path: 'workers/api/wrangler.toml', content: WRANGLER_TOML });
  files.push({ path: 'supabase/migrations/001_init.sql', content: SUPABASE_MIGRATION });
  files.push({ path: 'scripts/deploy.sh', content: DEPLOY_SH });
  files.push({ path: 'VALKYRIE.md', content: VALKYRIE_MD });

  return files;
}
