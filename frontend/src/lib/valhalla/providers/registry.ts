/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): provider registry.
 *
 * Single source of truth for:
 *   - the env var each provider reads,
 *   - the dashboard URL where the user creates the key,
 *   - the human-readable display name,
 *   - the row name in `valhalla_user_secrets`.
 *
 * The orchestrator uses this metadata to compose the structured
 * `agent_error` onboarding event when a key is missing, and the
 * `POST /api/secrets/[provider]` route uses it to validate the
 * provider name on the path.
 */

import type { ProviderName } from './types';
import type { ProviderProvisioning } from './errors';

export const PROVIDER_REGISTRY: Record<ProviderName, ProviderProvisioning> = {
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    displayName: 'Anthropic Claude',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    instruction:
      'Create a key in the Anthropic console (free tier supported). ' +
      'Used by ODIN and SAGA.',
    secretApiEndpoint: '/api/secrets/anthropic',
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    displayName: 'OpenAI',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    instruction:
      'Create a key in the OpenAI dashboard (requires billing for gpt-4o). ' +
      'Used by THOR for backend code synthesis.',
    secretApiEndpoint: '/api/secrets/openai',
  },
  google: {
    envKey: 'GOOGLE_API_KEY',
    displayName: 'Google Gemini',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    instruction:
      'Generate a Gemini API key in Google AI Studio (free tier supported). ' +
      'Used by FREJA for multimodal UI/UX.',
    secretApiEndpoint: '/api/secrets/google',
  },
  meta: {
    envKey: 'TOGETHER_API_KEY',
    displayName: 'Meta Llama (via Together)',
    dashboardUrl: 'https://api.together.xyz/settings/api-keys',
    instruction:
      'Llama 3.1 405B is hosted on Together AI. Create a Together key ' +
      '(free trial credit). Used by HEIMDALL for open-source auditing.',
    secretApiEndpoint: '/api/secrets/meta',
  },
  xai: {
    envKey: 'XAI_API_KEY',
    displayName: 'xAI Grok',
    dashboardUrl: 'https://console.x.ai',
    instruction:
      'Create a Grok API key in the xAI console. ' +
      'Used by LOKI for adversarial counterexample generation.',
    secretApiEndpoint: '/api/secrets/xai',
  },
  cohere: {
    envKey: 'COHERE_API_KEY',
    displayName: 'Cohere',
    dashboardUrl: 'https://dashboard.cohere.com/api-keys',
    instruction:
      'Create a Cohere production key (Command R+ has a free trial tier). ' +
      'Used by EIVOR for memory & RAG context extraction.',
    secretApiEndpoint: '/api/secrets/cohere',
  },
  perplexity: {
    envKey: 'PERPLEXITY_API_KEY',
    displayName: 'Perplexity Sonar',
    dashboardUrl: 'https://www.perplexity.ai/settings/api',
    instruction:
      'Subscribe to Perplexity Pro (or buy API credit) and create a key. ' +
      'Used by HUGIN and MUNIN — the Ravens — for live internet research.',
    secretApiEndpoint: '/api/secrets/perplexity',
  },
  mistral: {
    envKey: 'MISTRAL_API_KEY',
    displayName: 'Mistral',
    dashboardUrl: 'https://console.mistral.ai/api-keys',
    instruction:
      'Create a Mistral API key in la Plateforme. ' +
      'Used by BRAGE for creative + multilingual content.',
    secretApiEndpoint: '/api/secrets/mistral',
  },
};

export function isKnownProvider(name: string): name is ProviderName {
  return Object.prototype.hasOwnProperty.call(PROVIDER_REGISTRY, name);
}
