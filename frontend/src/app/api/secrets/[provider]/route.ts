/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): per-user secrets API.
 *
 * Endpoints:
 *   POST   /api/secrets/[provider]  body: { userId, apiKey }
 *   DELETE /api/secrets/[provider]  body: { userId }
 *
 * Authentication note:
 *   The Valhalla chat surface currently trusts the `userId` carried
 *   in the request body (same convention as `/api/swarm`). This is
 *   adequate for the personal-account model the app is in today —
 *   when the multi-tenant auth boundary lands (PR 4 / Saga), the
 *   secrets endpoint MUST switch to verifying a session cookie
 *   server-side before honoring the `userId`. HEIMDALL has flagged
 *   this in `valhalla-master-blueprint.md` as a known gap.
 *
 * The actual write goes through the service-role Supabase client in
 * `secrets/userSecrets.ts`. The `valhalla_user_secrets` table has
 * RLS enabled with no client policies, so even a leaked anon key
 * cannot read or write keys directly.
 */
import { NextRequest } from 'next/server';
import {
  upsertProviderKey,
  deleteProviderKey,
} from '@/lib/valhalla/secrets/userSecrets';
import { isKnownProvider, PROVIDER_REGISTRY } from '@/lib/valhalla/providers/registry';
import type { ProviderName } from '@/lib/valhalla/providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

interface RouteContext {
  params: Promise<{ provider: string }> | { provider: string };
}

async function resolveProviderParam(
  ctx: RouteContext,
): Promise<ProviderName | null> {
  const params = await ctx.params;
  const raw = typeof params.provider === 'string' ? params.provider : '';
  return isKnownProvider(raw) ? raw : null;
}

export async function POST(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const provider = await resolveProviderParam(ctx);
  if (!provider) {
    return json(
      {
        error: 'Unknown provider.',
        knownProviders: Object.keys(PROVIDER_REGISTRY),
      },
      400,
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON.' }, 400);
  }
  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Body must be an object.' }, 400);
  }
  const b = body as Record<string, unknown>;
  const userId = typeof b.userId === 'string' ? b.userId.trim() : '';
  const apiKey = typeof b.apiKey === 'string' ? b.apiKey.trim() : '';
  if (!userId) return json({ error: 'userId is required.' }, 400);
  if (!apiKey) return json({ error: 'apiKey is required.' }, 400);
  if (apiKey.length < 8 || apiKey.length > 4096) {
    return json({ error: 'apiKey must be 8-4096 chars.' }, 400);
  }

  const ok = await upsertProviderKey({ userId, provider, apiKey });
  if (!ok) {
    return json(
      {
        error:
          'Vault is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing). ' +
          'Set the env vars or add the key to .env.local.',
      },
      503,
    );
  }
  return json({
    ok: true,
    provider,
    displayName: PROVIDER_REGISTRY[provider].displayName,
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const provider = await resolveProviderParam(ctx);
  if (!provider) return json({ error: 'Unknown provider.' }, 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON.' }, 400);
  }
  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Body must be an object.' }, 400);
  }
  const userId =
    typeof (body as { userId?: unknown }).userId === 'string'
      ? ((body as { userId: string }).userId.trim())
      : '';
  if (!userId) return json({ error: 'userId is required.' }, 400);
  const ok = await deleteProviderKey({ userId, provider });
  if (!ok) {
    return json(
      {
        error:
          'Vault is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing). ' +
          'Set the env vars or add the key to .env.local.',
      },
      503,
    );
  }
  return json({ ok: true, provider });
}
