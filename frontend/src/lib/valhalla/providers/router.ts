/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): provider router.
 *
 * One entry point for all structured-output calls in the Valhalla
 * stack. Given a `FederationRole`, the router:
 *
 *   1. resolves the (provider, model) from the Federation Matrix,
 *   2. checks the corresponding adapter is configured (env or
 *      `valhalla_user_secrets` row),
 *   3. if not, optionally falls through to the global fallback
 *      provider (`VALHALLA_FEDERATION_FALLBACK`),
 *   4. otherwise delegates to the adapter,
 *   5. lets `MissingProviderKeyError` bubble so the orchestrator can
 *      stream a structured `agent_error` onboarding event.
 *
 * The shape exposed to callers (`runStructuredAgent`) is intentionally
 * the same as the old `runClaudeTool` so the BaseAgent change is a
 * one-line swap.
 */

import { anthropicAdapter } from './anthropic';
import { openaiAdapter } from './openai';
import { perplexityAdapter } from './perplexity';
import {
  cohereAdapter,
  googleAdapter,
  metaAdapter,
  mistralAdapter,
  xaiAdapter,
} from './stubs';
import {
  type FederationRole,
  federationFallback,
  resolveFederation,
} from './federation';
import { MissingProviderKeyError } from './errors';
import type {
  ProviderAdapter,
  ProviderName,
  RunStructuredArgs,
  StructuredResult,
} from './types';

const ADAPTERS: Record<ProviderName, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  perplexity: perplexityAdapter,
  google: googleAdapter,
  meta: metaAdapter,
  xai: xaiAdapter,
  cohere: cohereAdapter,
  mistral: mistralAdapter,
};

export function getAdapter(provider: ProviderName): ProviderAdapter {
  const a = ADAPTERS[provider];
  if (!a) {
    throw new Error(`Unknown provider in federation: ${provider}`);
  }
  return a;
}

export interface RunStructuredAgentArgs
  extends Omit<RunStructuredArgs, 'model'> {
  /** Override the federation-matrix model for this call. */
  model?: string;
  /** The role being executed, used to look up the matrix entry. */
  role: FederationRole;
}

/**
 * Run a structured-output call routed through the Federation Matrix.
 * `role` selects the provider; `model` optionally overrides the
 * federation default. Throws `MissingProviderKeyError` if the
 * resolved provider has no key (and no fallback is configured).
 */
export async function runStructuredAgent<T>(
  args: RunStructuredAgentArgs,
): Promise<StructuredResult<T>> {
  const { role, ...rest } = args;
  const fed = resolveFederation(role);
  const primary = getAdapter(fed.provider);

  const isConfigured = await primary.isConfigured(args.userId);
  if (isConfigured) {
    return primary.runStructured<T>({
      ...rest,
      model: args.model ?? fed.model,
    });
  }

  // Primary unconfigured. Try fallback if the operator has opted in.
  const fb = federationFallback();
  if (fb && fb !== fed.provider) {
    const fallback = getAdapter(fb);
    if (await fallback.isConfigured(args.userId)) {
      return fallback.runStructured<T>({
        ...rest,
        // Use the fallback adapter's default model — the matrix model
        // is provider-specific.
        model: undefined,
      });
    }
  }

  // No fallback or fallback unconfigured. Surface the structured
  // missing-key onboarding error for the PRIMARY provider so the user
  // knows where to land their key.
  return primary.runStructured<T>({
    ...rest,
    model: args.model ?? fed.model,
  });
}

export { MissingProviderKeyError };
