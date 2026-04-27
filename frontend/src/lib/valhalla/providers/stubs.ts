/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): unimplemented-provider stubs.
 *
 * The Federation Matrix lists 9 providers. PR 3 ships fully-working
 * adapters for Anthropic, OpenAI, and Perplexity. The remaining five
 * (Google Gemini, Meta Llama via Together, xAI Grok, Cohere Command R+,
 * Mistral) get stub adapters here that ALWAYS throw
 * `MissingProviderKeyError` with the correct provisioning metadata.
 *
 * That way:
 *   - the orchestrator can already route any agent to any provider in
 *     the Federation Matrix,
 *   - missing-key onboarding fires identically for "key missing" vs
 *     "adapter not yet implemented",
 *   - and the user gets a structured, actionable next step in chat
 *     instead of a silent fallback to Claude.
 *
 * PR 3b adds real adapters here once the user provisions the keys.
 */

import type {
  ProviderAdapter,
  ProviderName,
  StructuredResult,
} from './types';
import { MissingProviderKeyError } from './errors';
import { PROVIDER_REGISTRY } from './registry';

function makeStub(
  name: ProviderName,
  defaultModel: string,
): ProviderAdapter {
  return {
    name,
    defaultModel,
    envKey: PROVIDER_REGISTRY[name].envKey,
    async isConfigured(): Promise<boolean> {
      // Always return false: even with the key set the adapter can't
      // run yet. This forces the missing-key onboarding event so the
      // user knows to wait for PR 3b — not to think their key is bad.
      return false;
    },
    async runStructured<T>(): Promise<StructuredResult<T>> {
      throw new MissingProviderKeyError(name, {
        ...PROVIDER_REGISTRY[name],
        instruction:
          PROVIDER_REGISTRY[name].instruction +
          ' (Adapter not yet implemented in this build — provisioning the ' +
          'key still helps: it will activate automatically when PR 3b ships.)',
      });
    },
  };
}

export const googleAdapter = makeStub('google', 'gemini-1.5-pro-latest');
export const metaAdapter = makeStub(
  'meta',
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
);
export const xaiAdapter = makeStub('xai', 'grok-2-latest');
export const cohereAdapter = makeStub('cohere', 'command-r-plus');
export const mistralAdapter = makeStub('mistral', 'mistral-large-latest');
