/**
 * Valhalla AI — Infinity Engine: BaseAgent.
 *
 * Every native agent extends this class. Subclasses provide:
 *   - `name`: their canonical agent name (odin, thor, etc.)
 *   - `systemPrompt`: the sovereign persona / role directive
 *   - `describe()`: a short description used for log + UI tags
 *
 * The shared `run()` method wraps `runClaudeTool` with the standard
 * `emit_structured_response` schema so every agent's output conforms
 * to `AgentResponse` without each subclass rewriting the schema.
 */

import { runClaudeTool } from './claude';
import type { AgentName, AgentResponse } from './types';

/**
 * The canonical structured-output schema every agent uses. Individual
 * agents MAY override to narrow `plan`, but the core fields are fixed.
 */
const STRUCTURED_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    agent: {
      type: 'string',
      description: 'Which Valhalla agent produced this response.',
      enum: ['eivor', 'odin', 'heimdall', 'loki', 'thor', 'freja'],
    },
    reasoning: {
      type: 'string',
      description:
        'Your internal reasoning — chain-of-thought that the user can see. ' +
        'Speak as the named agent.',
    },
    plan: {
      type: 'object',
      description:
        'Structured plan contents. Shape depends on agent role. ' +
        'Keys: any — values: any JSON.',
      additionalProperties: true,
    },
    code: {
      type: 'string',
      description:
        'Concrete code / config artifact this agent produced. ' +
        'Empty string if the agent is purely deliberative.',
    },
    verification_criteria: {
      type: 'string',
      description:
        'Concrete, checkable criteria the NEXT agent (or the user) should ' +
        'use to decide whether this output is acceptable. Think pre/post ' +
        'conditions, invariants, tests.',
    },
  },
  required: ['agent', 'reasoning', 'plan', 'verification_criteria'],
  additionalProperties: false,
};

export abstract class BaseAgent {
  abstract readonly name: AgentName;
  abstract readonly systemPrompt: string;
  abstract describe(): string;

  /** Runs the agent and returns a validated `AgentResponse`. */
  async run(userPrompt: string): Promise<AgentResponse> {
    const { output } = await runClaudeTool<AgentResponse>({
      systemPrompt: this.systemPrompt,
      userPrompt,
      toolName: 'emit_structured_response',
      toolDescription:
        'Emit your structured Valhalla-agent response. You MUST call this ' +
        'tool exactly once with all required fields.',
      inputSchema: STRUCTURED_RESPONSE_SCHEMA,
    });
    // Defensive: even though the tool forces `agent`, pin it to the
    // class's canonical name so a renamed Claude response can't
    // masquerade as a different agent.
    return { ...output, agent: this.name };
  }
}
