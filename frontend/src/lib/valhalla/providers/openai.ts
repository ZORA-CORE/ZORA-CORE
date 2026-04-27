/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): OpenAI adapter.
 *
 * OpenAI's Chat Completions API supports forced tool use via
 * `tool_choice: { type: 'function', function: { name } }`. The
 * function-calling API parses arguments as JSON; we pass our schema
 * verbatim and parse `arguments` on the way back.
 *
 * Used by THOR (gpt-4o) for backend code synthesis per the
 * Federation Matrix.
 *
 * No new SDK dependency — we already pull in `@ai-sdk/openai` via
 * `next/ai`, but for direct REST control we hit the public endpoint
 * with `fetch`. That keeps build-size flat and avoids a coupling on
 * the AI-SDK's evolving streaming surface.
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

const NAME: ProviderName = 'openai';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o';

interface OpenAIChatCompletion {
  choices: Array<{
    message: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message: string; type?: string; code?: string };
}

export const openaiAdapter: ProviderAdapter = {
  name: NAME,
  defaultModel: DEFAULT_OPENAI_MODEL,
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
    const model = args.model ?? DEFAULT_OPENAI_MODEL;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: args.maxTokens ?? 4096,
        messages: [
          { role: 'system', content: args.systemPrompt },
          { role: 'user', content: args.userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: args.toolName,
              description: args.toolDescription,
              parameters: args.inputSchema,
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: args.toolName },
        },
      }),
      signal: args.signal,
    });

    const json = (await res.json()) as OpenAIChatCompletion;
    if (!res.ok || json.error) {
      throw new Error(
        `OpenAI ${res.status}: ${json.error?.message ?? 'unknown error'}`,
      );
    }
    const choice = json.choices?.[0];
    const call = choice?.message?.tool_calls?.find(
      (c) => c.function.name === args.toolName,
    );
    if (!call) {
      throw new Error(
        `OpenAI did not invoke tool "${args.toolName}". ` +
          'Should be impossible with tool_choice forced.',
      );
    }
    let output: T;
    try {
      output = JSON.parse(call.function.arguments) as T;
    } catch (err) {
      throw new Error(
        `OpenAI returned malformed JSON for tool "${args.toolName}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return {
      output,
      text: typeof choice?.message.content === 'string' ? choice.message.content : '',
      usage: {
        input: json.usage?.prompt_tokens ?? 0,
        output: json.usage?.completion_tokens ?? 0,
      },
      provider: NAME,
      model,
    };
  },
};
