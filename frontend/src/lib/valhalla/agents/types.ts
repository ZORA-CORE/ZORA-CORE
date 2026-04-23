/**
 * Valhalla AI — Infinity Engine: native agent types.
 *
 * This is the sovereign layer that replaces Dify. Every native Claude
 * agent emits a STRUCTURED response via Anthropic's tool-use API so
 * we never have to parse markdown fences to get at reasoning or code.
 *
 * The schema below is the contract enforced by the `emit_structured_response`
 * tool each agent is given: Claude is instructed to call that tool on
 * every turn with the fields defined here.
 */

/** The six Valhalla agents. Ordered roughly by execution stage. */
export type AgentName =
  | 'eivor'    //  memory + context
  | 'odin'     //  architect
  | 'heimdall' //  security / invariants auditor
  | 'loki'     //  adversarial counterexample generator
  | 'thor'     //  code forger
  | 'freja'; //  UI / UX shaper

/**
 * The structured response every native agent must emit. This is the
 * JSON schema registered as `emit_structured_response`'s input_schema
 * with the Anthropic SDK — any deviation is rejected at the API layer,
 * not parsed out of free-form text.
 */
export interface AgentResponse {
  /** Which agent produced this response. */
  agent: AgentName;
  /** Free-form internal reasoning / chain-of-thought for the user to see. */
  reasoning: string;
  /**
   * Structured plan for this turn. The shape is intentionally loose
   * because different agents contribute different kinds of plans
   * (architecture diagrams, invariants, counterexamples, code diffs);
   * specific agents narrow it further in their own tool schema.
   */
  plan: Record<string, unknown>;
  /**
   * Concrete artifacts this agent produced. Usually source code or
   * config; empty for agents whose role is purely deliberative
   * (EIVOR, LOKI, HEIMDALL).
   */
  code?: string;
  /**
   * Verification criteria that the NEXT agent (or the user) can use
   * to decide whether this output is acceptable. Example: for ODIN,
   * "The architecture must preserve RLS on all user-owned tables."
   */
  verification_criteria: string;
}

/** A single SSE event emitted by the orchestrator. */
export type SwarmEvent =
  | { type: 'agent_start'; agent: AgentName; at: number }
  | { type: 'agent_delta'; agent: AgentName; text: string }
  | { type: 'agent_response'; agent: AgentName; response: AgentResponse; at: number }
  | { type: 'agent_error'; agent: AgentName; message: string; at: number }
  | { type: 'swarm_done'; at: number };

/** Input to the orchestrator's `run()` method. */
export interface SwarmRunRequest {
  userId: string;
  sessionId: string;
  query: string;
  /**
   * Conversation history so far (not used for retrieval yet — that's
   * PR 2's Supabase/pgvector integration — but shaped right so the
   * contract doesn't churn later).
   */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}
