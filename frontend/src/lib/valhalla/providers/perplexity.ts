/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): Perplexity adapter.
 *
 * Powers HUGIN and MUNIN — the Ravens — that fly out and bring back
 * fresh information. Perplexity's `sonar` family does live web
 * retrieval inside the model, so structured-output JSON via
 * `response_format: { type: 'json_object' }` returns answers grounded
 * in current internet sources.
 *
 * Perplexity does NOT support tool calling. We instruct the model in
 * the system prompt to return JSON matching the schema, then parse +
 * (loose) shape-check the result. The Ravens use a simpler schema
 * than Anthropic / OpenAI agents — they return facts and source URLs,
 * not full Plan→Critique payloads.
 */

import type {
  ProviderAdapter,
  ProviderName,
  RunStructuredArgs,
  StructuredResult,
} from './types';
import { MissingProviderKeyError } from './errors';
import { PROVIDER_REGISTRY } from './registry';
import { resolveProviderKey } from '../secrets/userSecrets';

const NAME: ProviderName = 'perplexity';
export const DEFAULT_PERPLEXITY_MODEL = 'sonar-pro';

interface PerplexityResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  citations?: string[];
  error?: { message: string; type?: string };
}

/**
 * Compose a JSON-mode system prompt: the persona prompt plus an
 * explicit schema block that the model is asked to fill verbatim.
 */
function composeJsonSystemPrompt(args: RunStructuredArgs): string {
  return [
    args.systemPrompt,
    '',
    '## OUTPUT FORMAT (STRICT)',
    '',
    'Reply with a SINGLE JSON object that exactly matches this schema.',
    'Do not wrap it in markdown fences. Do not add commentary outside',
    'the JSON. Every required field must be present.',
    '',
    '```json',
    JSON.stringify(args.inputSchema, null, 2),
    '```',
  ].join('\n');
}

/** Pull a JSON object out of a (possibly fenced) string. */
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  // Find the outermost {...}.
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last <= first) return candidate;
  return candidate.slice(first, last + 1);
}

export const perplexityAdapter: ProviderAdapter = {
  name: NAME,
  defaultModel: DEFAULT_PERPLEXITY_MODEL,
  envKey: PROVIDER_REGISTRY[NAME].envKey,

  async isConfigured(userId?: string): Promise<boolean> {
    const k = await resolveProviderKey({
      provider: NAME,
      envKey: this.envKey,
      userId,
    });
    return Boolean(k);
  },

  async runStructured<T>(
    args: RunStructuredArgs,
  ): Promise<StructuredResult<T>> {
    const apiKey = await resolveProviderKey({
      provider: NAME,
      envKey: this.envKey,
      userId: args.userId,
      signal: args.signal,
    });
    if (!apiKey) {
      throw new MissingProviderKeyError(NAME, PROVIDER_REGISTRY[NAME]);
    }
    const model = args.model ?? DEFAULT_PERPLEXITY_MODEL;

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: args.maxTokens ?? 2048,
        // Perplexity's response_format only accepts 'text' / 'json_schema'
        // / 'regex' (json_object is rejected with HTTP 400). We rely on
        // the system prompt + extractJsonObject() to obtain a JSON object
        // from the text response — same pattern Anthropic uses for
        // structured-output adapters.
        messages: [
          { role: 'system', content: composeJsonSystemPrompt(args) },
          { role: 'user', content: args.userPrompt },
        ],
      }),
      signal: args.signal,
    });

    const json = (await res.json()) as PerplexityResponse;
    if (!res.ok || json.error) {
      throw new Error(
        `Perplexity ${res.status}: ${json.error?.message ?? 'unknown error'}`,
      );
    }
    const content = json.choices?.[0]?.message?.content ?? '';
    const jsonStr = extractJsonObject(content);
    let output: T;
    try {
      output = JSON.parse(jsonStr) as T;
    } catch (err) {
      throw new Error(
        `Perplexity returned non-JSON content: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    // Best-effort: surface citations to the caller as part of `text`
    // so the orchestrator can attach source links to the bubble.
    const citationsBlock =
      Array.isArray(json.citations) && json.citations.length > 0
        ? '\n\nSources:\n' + json.citations.map((c, i) => `[${i + 1}] ${c}`).join('\n')
        : '';
    return {
      output,
      text: content + citationsBlock,
      usage: {
        input: json.usage?.prompt_tokens ?? 0,
        output: json.usage?.completion_tokens ?? 0,
      },
      provider: NAME,
      model,
    };
  },
};
