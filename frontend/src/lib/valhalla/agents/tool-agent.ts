/**
 * Valhalla AI — Infinity Engine PR 2: ToolUseAgent base.
 *
 * The "Devin-mode" agent. Extends the structured-output path with a
 * multi-turn Anthropic Tool Use loop bound to an E2B cloud sandbox.
 *
 * Loop:
 *   1. Call Claude with the agent's system prompt + tools + the running
 *      conversation.
 *   2. Claude responds with zero or more `text` blocks (the agent's
 *      inner monologue / `<think>` — emitted as `agent_thought`) and
 *      zero or more `tool_use` blocks.
 *   3. Each `tool_use` block is dispatched to the matching ValhallaTool
 *      against the sandbox. The result is appended to the next turn as
 *      a `tool_result` content block.
 *   4. Loop until Claude either calls `finish`, returns no more
 *      `tool_use` blocks (stop_reason=end_turn), or we hit MAX_STEPS.
 *
 * Prompt caching:
 *   - System prompts flagged `cacheable` are sent with
 *     `cache_control: { type: 'ephemeral' }` so Anthropic caches the
 *     prefix for 5 minutes. ODIN and EIVOR have the biggest prompts
 *     and benefit the most (≈70% reduction in input tokens on repeat
 *     turns).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { SandboxHandle } from '../sandbox/e2b';
import { getClaude, DEFAULT_CLAUDE_MODEL } from './claude';
import {
  selectTools,
  toolsForAnthropic,
  type ToolContext,
  type ToolName,
  type ToolResult,
  type ValhallaTool,
} from './tools';
import type {
  AgentName,
  AgentResponse,
  SwarmEvent,
  ToolCallPayload,
  ToolResultPayload,
} from './types';

/** Hard cap on Claude↔tool round trips before we force termination. */
export const MAX_STEPS = 16;

export interface ToolUseRunResult {
  /** Events the orchestrator should stream verbatim, in order. */
  events: SwarmEvent[];
  /** The `finish` tool's last input, normalized to AgentResponse. */
  response: AgentResponse;
  /** Token accounting across the full loop. */
  usage: { input: number; output: number };
}

export interface ToolUseRunParams {
  sandbox: SandboxHandle;
  userPrompt: string;
  /** Abort mid-loop when the client disconnects. */
  signal?: AbortSignal;
  /** Override the default Sonnet model (e.g. Haiku for EIVOR). */
  model?: string;
  /** Override the default 16-step cap. */
  maxSteps?: number;
  /**
   * User identity threaded through to orchestration-aware tools
   * (e.g. `store_global_memory`). Required when the agent has a tool
   * that depends on a user, otherwise optional.
   */
  userId?: string;
  /** Session identity (chat id). Optional — defaults to 'ephemeral'. */
  sessionId?: string;
  /**
   * SwarmEvent sink for tools that emit additional events (e.g.
   * `expose_port` → `preview_url`, `store_global_memory` →
   * `global_memory_stored`). Events go into the same `events[]`
   * returned from this run.
   */
  onEvent?: (event: SwarmEvent) => void;
}

/** Random, short call id — stable enough within a stream. */
function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Sanitize tool inputs for the SSE stream (truncate huge strings). */
function summarizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && v.length > 500) {
      out[k] = `${v.slice(0, 500)}… (${v.length} chars total)`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Short, human-readable one-liner for tool_result events. */
function summarizeResult(toolName: string, result: ToolResult): string {
  switch (toolName) {
    case 'execute_bash': {
      const exit = (result.payload.exitCode as number) ?? -1;
      const timedOut = (result.payload.timedOut as boolean) ?? false;
      return `exit=${exit}${timedOut ? ' TIMEOUT' : ''}`;
    }
    case 'read_file':
      return `read ${result.payload.bytes as number} bytes from ${result.payload.path as string}`;
    case 'list_dir':
      return `listed ${result.payload.count as number} entries in ${result.payload.path as string}`;
    case 'write_file':
      return `wrote ${result.payload.bytes as number} bytes to ${result.payload.path as string}`;
    case 'patch_file':
      return `patched ${result.payload.path as string}`;
    case 'screenshot_page':
      return `captured ${(result.payload.viewport as { width: number; height: number }).width}x${(result.payload.viewport as { width: number; height: number }).height} screenshot`;
    case 'finish':
      return 'agent finished';
    case 'expose_port':
      return `exposed :${result.payload.port as number} → ${result.payload.url as string}`;
    case 'store_global_memory':
      return `stored global memory (${result.payload.bytes as number} chars)`;
    default:
      return `${toolName} done`;
  }
}

/**
 * Non-apology enforcement: when a tool errors, we append an explicit
 * instruction to the next user-role turn telling Claude to re-read
 * the stderr, diagnose in a `<think>` block, and retry — never to
 * apologize and stop. This mirrors the system-prompt directive but
 * also reaches agents whose system prompts predate the hotfix.
 */
const AUTONOMOUS_RETRY_DIRECTIVE =
  'The tool call above errored. DO NOT apologize and stop. Re-read the ' +
  'stderr you just received, emit a `<think>…</think>` block that ' +
  'analyzes the root cause, form a concrete hypothesis, and invoke the ' +
  'appropriate tool again with a corrected input. Keep iterating until ' +
  'the verifying command exits 0 or you have exhausted your step budget.';

export abstract class ToolUseAgent {
  abstract readonly name: AgentName;
  abstract readonly systemPrompt: string;
  /** Subset of ValhallaTool names this agent is allowed to invoke. */
  abstract readonly allowedTools: readonly ToolName[];
  /** Whether to wrap the system prompt in an ephemeral cache breakpoint. */
  readonly cacheable: boolean = false;
  /** Human-readable description used in log rows / tooltips. */
  abstract describe(): string;

  async run(params: ToolUseRunParams): Promise<ToolUseRunResult> {
    const {
      sandbox,
      userPrompt,
      signal,
      model = DEFAULT_CLAUDE_MODEL,
      maxSteps = MAX_STEPS,
      userId = 'anonymous',
      sessionId = 'ephemeral',
      onEvent,
    } = params;
    const tools = selectTools([...this.allowedTools, 'finish']);
    const toolByName = new Map<string, ValhallaTool>(
      tools.map((t) => [t.name, t]),
    );
    const anthropicTools = toolsForAnthropic(tools);
    const client = getClaude();
    const events: SwarmEvent[] = [];

    // Build the ToolContext once — it is stateless apart from its
    // event emitter. Every tool.run() receives the same reference.
    const toolCtx: ToolContext = {
      agent: this.name,
      userId,
      sessionId,
      signal,
      emit: (event) => {
        // The emit() signature is `Record<string, unknown>` so tools
        // can stay decoupled from SwarmEvent's discriminated union.
        // Since we fully control what the in-repo tools emit, we can
        // safely upcast here.
        const typed = event as SwarmEvent;
        events.push(typed);
        onEvent?.(typed);
      },
    };

    const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
      this.cacheable
        ? {
            type: 'text',
            text: this.systemPrompt,
            cache_control: { type: 'ephemeral' },
          }
        : { type: 'text', text: this.systemPrompt },
    ];

    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ];

    let finishResponse: AgentResponse | null = null;
    let totalInput = 0;
    let totalOutput = 0;

    for (let step = 0; step < maxSteps; step++) {
      if (signal?.aborted) {
        throw new Error(`${this.name} aborted at step ${step}.`);
      }
      const reply = await client.messages.create(
        {
          model,
          max_tokens: 4096,
          system: systemBlocks,
          tools: anthropicTools,
          messages,
        },
        { signal },
      );
      totalInput += reply.usage.input_tokens;
      totalOutput += reply.usage.output_tokens;

      // Emit text blocks as `<think>` events. Tool-use blocks dispatch.
      const assistantContent: Anthropic.Messages.ContentBlockParam[] = [];
      const toolUses: Anthropic.Messages.ToolUseBlock[] = [];
      for (const block of reply.content) {
        if (block.type === 'text') {
          const text = block.text.trim();
          if (text) {
            events.push({
              type: 'agent_thought',
              agent: this.name,
              text,
              at: Date.now(),
            });
          }
          assistantContent.push({ type: 'text', text: block.text });
        } else if (block.type === 'tool_use') {
          toolUses.push(block);
          assistantContent.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }
      messages.push({ role: 'assistant', content: assistantContent });

      if (toolUses.length === 0) {
        // Claude didn't call a tool. Treat this as an implicit end of
        // turn. Synthesize a finish response from whatever text it
        // emitted so the orchestrator still has an AgentResponse.
        const narration = reply.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n\n')
          .trim();
        finishResponse = {
          agent: this.name,
          reasoning: narration || '(agent ended turn without calling finish)',
          plan: { note: 'no finish tool call' },
          verification_criteria:
            'Agent ended without explicit verification criteria.',
        };
        break;
      }

      const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        const tool = toolByName.get(use.name);
        const callPayload: ToolCallPayload = {
          callId: use.id,
          tool: use.name,
          input: summarizeInput((use.input ?? {}) as Record<string, unknown>),
        };
        events.push({
          type: 'agent_tool_call',
          agent: this.name,
          call: callPayload,
          at: Date.now(),
        });
        const startedAt = Date.now();
        if (!tool) {
          const summary = `unknown tool: ${use.name}`;
          const resultPayload: ToolResultPayload = {
            callId: use.id,
            tool: use.name,
            summary,
            payload: { error: summary },
            isError: true,
            durationMs: 0,
          };
          events.push({
            type: 'agent_tool_result',
            agent: this.name,
            result: resultPayload,
            at: Date.now(),
          });
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: summary,
            is_error: true,
          });
          continue;
        }
        try {
          const result = await tool.run(
            sandbox,
            (use.input ?? {}) as Record<string, unknown>,
            toolCtx,
          );
          const durationMs = Date.now() - startedAt;
          const resultPayload: ToolResultPayload = {
            callId: use.id,
            tool: use.name,
            summary: summarizeResult(use.name, result),
            payload: result.payload,
            isError: false,
            durationMs,
          };
          events.push({
            type: 'agent_tool_result',
            agent: this.name,
            result: resultPayload,
            at: Date.now(),
          });

          if (use.name === 'finish') {
            const planRaw = result.payload as Record<string, unknown>;
            finishResponse = {
              agent: this.name,
              reasoning: String(planRaw.summary ?? ''),
              plan: {
                summary: planRaw.summary ?? '',
                verification: planRaw.verification ?? '',
                open_questions: planRaw.openQuestions ?? null,
              },
              verification_criteria: String(planRaw.verification ?? ''),
            };
            // Still push a tool_result so Anthropic sees closure;
            // orchestrator breaks immediately after this loop.
            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: use.id,
              content: result.content,
              is_error: false,
            });
            continue;
          }

          const toolResultContent: Anthropic.Messages.ToolResultBlockParam['content'] =
            result.image
              ? [
                  { type: 'text', text: result.content },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: result.image.mediaType,
                      data: result.image.base64,
                    },
                  },
                ]
              : result.content;
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: toolResultContent,
            is_error: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const durationMs = Date.now() - startedAt;
          const resultPayload: ToolResultPayload = {
            callId: use.id,
            tool: use.name,
            summary: `error: ${message.slice(0, 160)}`,
            payload: { error: message },
            isError: true,
            durationMs,
          };
          events.push({
            type: 'agent_tool_result',
            agent: this.name,
            result: resultPayload,
            at: Date.now(),
          });
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: message,
            is_error: true,
          });
        }
      }

      // Autonomous-retry reinforcement: if ANY tool call in this step
      // errored (either by throwing or by returning a non-zero exit
      // from execute_bash), append an extra text block to the
      // tool_result user turn telling Claude to diagnose + retry
      // rather than apologize and stop. This survives system-prompt
      // drift and directly backs the "no apology, no stop" rule.
      //
      // The directive lives as a trailing `{type: 'text', text: …}`
      // block on the same user message so Anthropic's alternating
      // role invariant is preserved.
      const anyErrored = toolResultBlocks.some(
        (b) => b.is_error === true,
      );
      const anyNonZeroExit = toolUses.some((use) => {
        if (use.name !== 'execute_bash') return false;
        const ev = events.find(
          (e) =>
            e.type === 'agent_tool_result' &&
            e.result.callId === use.id,
        );
        if (!ev || ev.type !== 'agent_tool_result') return false;
        const payload = ev.result.payload as { exitCode?: number };
        return typeof payload.exitCode === 'number' && payload.exitCode !== 0;
      });

      const nextUserContent: Anthropic.Messages.ContentBlockParam[] = [
        ...toolResultBlocks,
      ];
      if (anyErrored || anyNonZeroExit) {
        nextUserContent.push({
          type: 'text',
          text: AUTONOMOUS_RETRY_DIRECTIVE,
        });
      }
      messages.push({ role: 'user', content: nextUserContent });

      if (finishResponse) break;
    }

    if (!finishResponse) {
      finishResponse = {
        agent: this.name,
        reasoning:
          `Exhausted ${maxSteps} tool-use steps without calling \`finish\`. ` +
          'Stopping to avoid runaway cost.',
        plan: { truncated: true },
        verification_criteria:
          'Agent exceeded step budget; caller must decide whether to retry.',
      };
    }

    return {
      events,
      response: finishResponse,
      usage: { input: totalInput, output: totalOutput },
    };
  }
}

/** Unused callId helper — exported for tests and future per-tool ids. */
export { randomId };
