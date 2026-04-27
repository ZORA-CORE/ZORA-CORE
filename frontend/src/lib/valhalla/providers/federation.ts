/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): Federation Matrix.
 *
 * Single source of truth for which provider + model each Valhalla
 * agent (and Raven) targets by default. The mapping is locked in by
 * the Apex Directive:
 *
 *   ODIN          → Anthropic claude-sonnet-4-5
 *   THOR          → OpenAI gpt-4o
 *   FREJA         → Google gemini-1.5-pro      (stub until PR 3b)
 *   HEIMDALL      → Meta llama-3.1-405b        (stub until PR 3b)
 *   LOKI          → xAI grok-2                 (stub until PR 3b)
 *   EIVOR         → Cohere command-r-plus      (stub until PR 3b)
 *   HUGIN/MUNIN   → Perplexity sonar-large-online
 *   BRAGE         → Mistral mistral-large-2    (stub until PR 3b)
 *   SAGA          → Anthropic claude-3-opus
 *
 * Until the stub providers ship real adapters, the safe-fallback
 * environment variable `VALHALLA_FEDERATION_FALLBACK=anthropic`
 * routes any stubbed agent through Anthropic instead of throwing
 * MissingProviderKeyError. This is opt-in — the default is to fail
 * loudly per the Apex Directive's "no silent fallback" rule.
 */

import type { AgentName } from '../agents/types';
import type { ProviderName } from './types';

/** Roles in the federation that route through providers. */
export type FederationRole =
  | AgentName
  | 'hugin'
  | 'munin'
  | 'brage'
  | 'saga';

export interface FederationEntry {
  provider: ProviderName;
  /**
   * Federation-default model. May be `undefined` when only the
   * provider was overridden via `VALHALLA_FORCE_PROVIDER_<ROLE>` —
   * in that case the adapter falls back to its own `defaultModel`,
   * since the matrix model is provider-specific (e.g. `gpt-4o` is
   * not a valid Anthropic model).
   */
  model: string | undefined;
}

export const FEDERATION_MATRIX: Record<FederationRole, FederationEntry> = {
  // Existing 6 personas
  eivor: { provider: 'cohere', model: 'command-r-plus' },
  odin: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  heimdall: {
    provider: 'meta',
    model: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  },
  loki: { provider: 'xai', model: 'grok-2-latest' },
  thor: { provider: 'openai', model: 'gpt-4o' },
  freja: { provider: 'google', model: 'gemini-1.5-pro-latest' },

  // PR 3 Ravens
  hugin: { provider: 'perplexity', model: 'sonar-pro' },
  munin: { provider: 'perplexity', model: 'sonar-pro' },

  // PR 5 future personas (declared up-front so the matrix is total).
  brage: { provider: 'mistral', model: 'mistral-large-latest' },
  saga: { provider: 'anthropic', model: 'claude-3-opus-20240229' },
};

/**
 * Returns the federation entry for `role`, optionally overriding the
 * provider via env. Useful in dev: setting
 * `VALHALLA_FORCE_PROVIDER_THOR=anthropic` keeps THOR on Claude while
 * gpt-4o is unprovisioned.
 */
export function resolveFederation(role: FederationRole): FederationEntry {
  const upper = role.toUpperCase();
  // Use `||` not `??` so that empty-string env vars (e.g. `VALHALLA_
  // FORCE_PROVIDER_THOR=` in a Docker env file) fall back to the
  // matrix default instead of being treated as a valid provider name.
  const overrideProviderRaw = process.env[`VALHALLA_FORCE_PROVIDER_${upper}`];
  const overrideModel = process.env[`VALHALLA_FORCE_MODEL_${upper}`];
  const base = FEDERATION_MATRIX[role];
  const overrideProvider =
    (overrideProviderRaw as ProviderName | undefined) || undefined;
  // If only the provider was overridden, drop the matrix model — it
  // is keyed to the original provider (e.g. `gpt-4o` for THOR), and
  // sending it to a different provider would produce an invalid-model
  // API error. The adapter's `defaultModel` will be used instead.
  const model = overrideProvider
    ? overrideModel || undefined
    : overrideModel || base.model;
  return {
    provider: overrideProvider || base.provider,
    model,
  };
}

/**
 * Global fallback used when the resolved provider is a stub adapter
 * that can't actually run. Set `VALHALLA_FEDERATION_FALLBACK=anthropic`
 * to route stubbed agents through Anthropic; leave unset to surface
 * the structured missing-key onboarding event instead.
 */
export function federationFallback(): ProviderName | null {
  const v = process.env.VALHALLA_FEDERATION_FALLBACK;
  if (v === 'anthropic' || v === 'openai' || v === 'perplexity') {
    return v;
  }
  return null;
}
