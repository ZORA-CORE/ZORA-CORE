/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): Anthropic adapter.
 *
 * Native Anthropic Messages API + tool_use forced via
 * `tool_choice: { type: 'tool', name }`. This is the gold-standard
 * structured-output mechanism — Anthropic refuses any response that
 * does not match the registered tool's input_schema.
 *
 * This adapter is what every BaseAgent used to call directly via
 * `runClaudeTool` in PR 1/2; PR 3 routes the same code through the
 * provider router so non-ODIN agents can target other providers.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ProviderAdapter,
  ProviderName,
  RunStructuredArgs,
  StructuredResult,
} from './types';
import { MissingProviderKeyError } from './errors';
import { PROVIDER_REGISTRY } from './registry';
import { resolveProviderKey } from '../secrets/userSecrets';

const NAME: ProviderName = 'anthropic';

/**
 * Default model. `claude-sonnet-4-5-20250929` is current SOTA for
 * coding + tool use (Anthropic retired the `-latest` alias in 2024).
 */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

export const anthropicAdapter: ProviderAdapter = {
  name: NAME,
  defaultModel: DEFAULT_ANTHROPIC_MODEL,
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
    const client = new Anthropic({ apiKey });
    const model = args.model ?? DEFAULT_ANTHROPIC_MODEL;
    const result = await client.messages.create(
      {
        model,
        max_tokens: args.maxTokens ?? 4096,
        system: args.systemPrompt,
        tools: [
          {
            name: args.toolName,
            description: args.toolDescription,
            input_schema:
              args.inputSchema as Anthropic.Messages.Tool.InputSchema,
          },
        ],
        // Force tool invocation so the model cannot answer in free text.
        tool_choice: { type: 'tool', name: args.toolName },
        messages: [{ role: 'user', content: args.userPrompt }],
      },
      { signal: args.signal },
    );

    let output: T | undefined;
    const textParts: string[] = [];
    for (const block of result.content) {
      if (block.type === 'tool_use' && block.name === args.toolName) {
        output = block.input as T;
      } else if (block.type === 'text') {
        textParts.push(block.text);
      }
    }
    if (output === undefined) {
      throw new Error(
        `Anthropic did not invoke tool "${args.toolName}". ` +
          'Should be impossible with tool_choice forced.',
      );
    }
    return {
      output,
      text: textParts.join('\n'),
      usage: {
        input: result.usage.input_tokens,
        output: result.usage.output_tokens,
      },
      provider: NAME,
      model,
    };
  },
};
