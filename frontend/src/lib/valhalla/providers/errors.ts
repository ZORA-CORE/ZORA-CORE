/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): provider errors.
 *
 * When an agent is invoked and its provider's API key is missing, the
 * adapter MUST throw `MissingProviderKeyError`. The orchestrator
 * catches this, converts it into a structured `agent_error` SSE event
 * carrying everything the UI needs to render a one-click onboarding
 * prompt: the env var name, the dashboard URL where the user creates
 * the key, the exact `valhalla_user_secrets` row to write into, and
 * the curl-equivalent POST endpoint that does the write server-side.
 *
 * Per the Apex Directive's "Critical Security & Onboarding Requirement":
 *   "If an agent is called and its API key is missing, you must
 *    explicitly prompt me for the required API key for that specific
 *    provider and tell me exactly where and how to add it to the
 *    valhalla_user_secrets vault."
 */

import type { ProviderName } from './types';

export interface ProviderProvisioning {
  /** The env var (or user-secret column) that holds the key. */
  envKey: string;
  /** Human-readable provider name. */
  displayName: string;
  /** URL where the user creates / copies the key. */
  dashboardUrl: string;
  /** One-line instruction to paste under the key field in the UI. */
  instruction: string;
  /** API endpoint the user secret POST hits. */
  secretApiEndpoint: string;
}

export class MissingProviderKeyError extends Error {
  readonly provider: ProviderName;
  readonly provisioning: ProviderProvisioning;
  constructor(provider: ProviderName, provisioning: ProviderProvisioning) {
    super(
      `Missing API key for ${provisioning.displayName} (${provisioning.envKey}). ` +
        `Provision at ${provisioning.dashboardUrl} and POST to ${provisioning.secretApiEndpoint}.`,
    );
    this.name = 'MissingProviderKeyError';
    this.provider = provider;
    this.provisioning = provisioning;
  }
}

/**
 * Predicate used by the orchestrator's catch block to decide whether
 * to emit a structured onboarding event vs a plain `agent_error`.
 */
export function isMissingProviderKeyError(
  err: unknown,
): err is MissingProviderKeyError {
  return err instanceof MissingProviderKeyError;
}
