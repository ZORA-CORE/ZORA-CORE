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

import { runStructuredAgent } from '../providers/router';
import type { FederationRole } from '../providers/federation';
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
    flaws: {
      type: 'array',
      description:
        'Flaws discovered by this agent. HEIMDALL fills this with security ' +
        'and invariant violations; LOKI fills it with adversarial ' +
        'counterexamples. Other agents leave it empty. A single flaw of ' +
        'severity "high" forces another Plan→Critique→Counterexample cycle.',
      items: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description:
              'high = blocks build; medium = must be addressed; low = nit.',
          },
          description: {
            type: 'string',
            description:
              'Precise, actionable description of what is wrong. Include ' +
              'the invariant violated or the concrete input that breaks it.',
          },
        },
        required: ['severity', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['agent', 'reasoning', 'plan', 'verification_criteria'],
  additionalProperties: false,
};

export abstract class BaseAgent {
  abstract readonly name: AgentName;
  abstract readonly systemPrompt: string;
  abstract describe(): string;

  /**
   * Federation role used to look up the (provider, model) tuple in
   * the Federation Matrix. Defaults to the agent's name; PR 5
   * personas (BRAGE, SAGA) and the Ravens override this.
   */
  protected get federationRole(): FederationRole {
    return this.name;
  }

  /**
   * Runs the agent and returns a validated `AgentResponse`. The
   * provider router routes the call through the (provider, model)
   * pinned in the Federation Matrix; missing-key configuration
   * surfaces as `MissingProviderKeyError` so the orchestrator can
   * stream a structured onboarding event to the chat.
   */
  async run(userPrompt: string, opts: { userId?: string; signal?: AbortSignal } = {}): Promise<AgentResponse> {
    const { output } = await runStructuredAgent<AgentResponse>({
      role: this.federationRole,
      systemPrompt: this.systemPrompt,
      userPrompt,
      toolName: 'emit_structured_response',
      toolDescription:
        'Emit your structured Valhalla-agent response. You MUST call this ' +
        'tool exactly once with all required fields.',
      inputSchema: STRUCTURED_RESPONSE_SCHEMA,
      userId: opts.userId,
      signal: opts.signal,
    });
    // Defensive: even though the tool forces `agent`, pin it to the
    // class's canonical name so a renamed model response can't
    // masquerade as a different agent.
    return { ...output, agent: this.name };
  }
}
