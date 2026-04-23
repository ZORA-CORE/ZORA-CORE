/**
 * Valhalla AI — Infinity Engine: Anthropic SDK wrapper.
 *
 * Thin layer over @anthropic-ai/sdk that exposes one high-leverage
 * primitive: `runAgent(systemPrompt, userPrompt, toolName, inputSchema)`.
 *
 * The call forces Claude to answer exclusively by invoking the given
 * tool, so the return value is always a parsed object matching the
 * JSON schema. No markdown fence parsing, no regex extraction —
 * the Anthropic API rejects malformed outputs at its own layer.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. The Valhalla Infinity Engine ' +
        'requires a native Anthropic key; Dify is not consulted here.',
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Default model. Pinned to a dated version because Anthropic retired
 * the `-latest` alias and now returns 404 for `claude-3-5-sonnet-latest`.
 * Sonnet 4.5 is current SOTA for coding + tool use.
 */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

export interface ClaudeToolCallResult<T> {
  /** The parsed tool input, validated by Anthropic against the schema. */
  output: T;
  /** Free text emitted alongside the tool call (usually empty). */
  text: string;
  /** Token accounting for observability / cost tracking. */
  usage: { input: number; output: number };
}

/**
 * Run a single agent turn. `inputSchema` is the JSON Schema describing
 * what the tool expects; Anthropic will refuse to respond with anything
 * that doesn't match.
 */
export async function runClaudeTool<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
}): Promise<ClaudeToolCallResult<T>> {
  const claude = getClaude();
  const result = await claude.messages.create({
    model: params.model ?? DEFAULT_CLAUDE_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    system: params.systemPrompt,
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.inputSchema as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    // Force Claude to call OUR tool, not a tool of its choosing, not free text.
    tool_choice: { type: 'tool', name: params.toolName },
    messages: [{ role: 'user', content: params.userPrompt }],
  });

  let output: T | undefined;
  const textParts: string[] = [];
  for (const block of result.content) {
    if (block.type === 'tool_use' && block.name === params.toolName) {
      output = block.input as T;
    } else if (block.type === 'text') {
      textParts.push(block.text);
    }
  }
  if (output === undefined) {
    throw new Error(
      `Claude did not invoke tool "${params.toolName}". ` +
        'This should be impossible when tool_choice is forced.',
    );
  }
  return {
    output,
    text: textParts.join('\n'),
    usage: {
      input: result.usage.input_tokens,
      output: result.usage.output_tokens,
    },
  };
}
