/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): provider abstraction.
 *
 * Every native Valhalla agent emits a STRUCTURED response via a tool /
 * function-call against an LLM provider. PR 1/2 hard-coded Anthropic
 * Claude as the only provider. PR 3 lifts that into a federation:
 *
 *   ODIN          → Anthropic claude-sonnet-4-5
 *   THOR          → OpenAI gpt-4o
 *   FREJA         → Google gemini-1.5-pro
 *   HEIMDALL      → Meta llama-3.1-405b
 *   LOKI          → xAI grok-2
 *   EIVOR         → Cohere command-r-plus
 *   HUGIN/MUNIN   → Perplexity sonar-large-online
 *   BRAGE         → Mistral mistral-large-2
 *   SAGA          → Anthropic claude-3-opus
 *
 * The contract every adapter implements is `runStructured`:
 *   (system + user prompt + JSON schema) → strongly typed object.
 *
 * Adapters are responsible for translating the schema into the
 * provider's native structured-output mechanism (Anthropic tool_use,
 * OpenAI tool/function calling, Gemini function calling, Cohere
 * tool use, Perplexity JSON-mode, etc.) and for surfacing missing-key
 * configuration as a `MissingProviderKeyError` so the orchestrator can
 * stream a structured onboarding event to the chat.
 */

/** Federation providers. */
export type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'meta'
  | 'xai'
  | 'cohere'
  | 'perplexity'
  | 'mistral';

/** Single structured-output call. */
export interface RunStructuredArgs {
  systemPrompt: string;
  userPrompt: string;
  /** Tool/function name the model is forced to call. */
  toolName: string;
  /** Tool/function description shown to the model. */
  toolDescription: string;
  /** JSON schema (object root) the response must match. */
  inputSchema: Record<string, unknown>;
  /** Override the provider's default model. */
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /**
   * If set, the adapter resolves the API key from the user's
   * `valhalla_user_secrets` row before falling back to env. This is
   * how the federation supports per-user keys for personal accounts.
   */
  userId?: string;
}

export interface StructuredResult<T> {
  /** Parsed structured payload validated against `inputSchema`. */
  output: T;
  /** Free-form text emitted alongside the structured call (often empty). */
  text: string;
  /** Token accounting for cost / observability. */
  usage: { input: number; output: number };
  /** Resolved provider + model so the UI can attribute the response. */
  provider: ProviderName;
  model: string;
}

/**
 * Provider adapter contract. Each provider implements this and
 * registers itself in `providers/router.ts`.
 */
export interface ProviderAdapter {
  readonly name: ProviderName;
  /** Default model when the federation entry doesn't pin one. */
  readonly defaultModel: string;
  /** Env var that holds the provider API key. */
  readonly envKey: string;
  /**
   * Whether the adapter has enough configuration (env or user secret)
   * to actually run. False adapters surface a MissingProviderKeyError.
   */
  isConfigured(userId?: string): Promise<boolean>;
  /**
   * Execute the structured call. Throws `MissingProviderKeyError`
   * with provisioning instructions if the key is unavailable.
   */
  runStructured<T>(args: RunStructuredArgs): Promise<StructuredResult<T>>;
}
