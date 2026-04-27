/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): per-user secret vault.
 *
 * Resolution order for any provider API key:
 *   1. Per-user row in `valhalla_user_secrets` (if `userId` is set).
 *   2. Process env (e.g. `ANTHROPIC_API_KEY`).
 *   3. `null` — caller throws `MissingProviderKeyError` so the
 *      orchestrator can stream a structured onboarding event.
 *
 * Schema (see supabase/migrations/007_valhalla_user_secrets.sql):
 *   valhalla_user_secrets (
 *     user_id    text not null,
 *     provider   text not null,         -- 'anthropic'|'openai'|...
 *     api_key    text not null,         -- stored verbatim; service-role only
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now(),
 *     primary key (user_id, provider)
 *   )
 *
 * The table is `service_role` only — never readable from the client
 * — and the `POST /api/secrets/[provider]` route requires the same
 * authenticated session as the chat surface, so a user can only ever
 * write their own key.
 */

import type { ProviderName } from '../providers/types';

interface SupabaseHeaders extends Record<string, string> {
  apikey: string;
  Authorization: string;
  'Content-Type': string;
  Prefer: string;
}

function supabaseConfig():
  | { url: string; key: string; headers: SupabaseHeaders }
  | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    url,
    key,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  };
}

/**
 * Resolve the API key for `provider` against `userId`'s vault, falling
 * back to env. Returns `null` if neither source has a key.
 */
export async function resolveProviderKey(params: {
  provider: ProviderName;
  envKey: string;
  userId?: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  const { provider, envKey, userId, signal } = params;
  if (userId) {
    const cfg = supabaseConfig();
    if (cfg) {
      const url =
        `${cfg.url}/rest/v1/valhalla_user_secrets` +
        `?user_id=eq.${encodeURIComponent(userId)}` +
        `&provider=eq.${encodeURIComponent(provider)}` +
        `&select=api_key&limit=1`;
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: cfg.headers,
          signal,
          cache: 'no-store',
        });
        if (res.ok) {
          const rows = (await res.json()) as Array<{ api_key?: string }>;
          const k = rows[0]?.api_key;
          if (typeof k === 'string' && k.length > 0) return k;
        }
      } catch {
        // Vault read errors fall through to env.
      }
    }
  }
  const fromEnv = process.env[envKey];
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : null;
}

/**
 * Server-side write of a user's provider key. Used by
 * `POST /api/secrets/[provider]`. Returns `true` on success.
 */
export async function upsertProviderKey(params: {
  userId: string;
  provider: ProviderName;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<boolean> {
  const cfg = supabaseConfig();
  if (!cfg) return false;
  const url =
    `${cfg.url}/rest/v1/valhalla_user_secrets` +
    `?on_conflict=user_id,provider`;
  const body = JSON.stringify({
    user_id: params.userId,
    provider: params.provider,
    api_key: params.apiKey,
    updated_at: new Date().toISOString(),
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...cfg.headers,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body,
    signal: params.signal,
    cache: 'no-store',
  });
  return res.ok;
}

/**
 * Server-side delete of a user's provider key. Used by
 * `DELETE /api/secrets/[provider]` for key rotation.
 */
export async function deleteProviderKey(params: {
  userId: string;
  provider: ProviderName;
  signal?: AbortSignal;
}): Promise<boolean> {
  const cfg = supabaseConfig();
  if (!cfg) return false;
  const url =
    `${cfg.url}/rest/v1/valhalla_user_secrets` +
    `?user_id=eq.${encodeURIComponent(params.userId)}` +
    `&provider=eq.${encodeURIComponent(params.provider)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: cfg.headers,
    signal: params.signal,
    cache: 'no-store',
  });
  return res.ok;
}
