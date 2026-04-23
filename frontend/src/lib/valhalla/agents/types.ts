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

/** Severity for HEIMDALL / LOKI flaws. `high` forces another cycle. */
export type FlawSeverity = 'high' | 'medium' | 'low';

export interface Flaw {
  severity: FlawSeverity;
  description: string;
}

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
  /**
   * Optional list of flaws discovered by this agent. HEIMDALL and LOKI
   * populate this to feed the recursive Plan→Critique→Counterexample
   * →Build loop: any flaw with severity `high` forces another cycle
   * before THOR is allowed to forge code. Other agents leave it empty.
   */
  flaws?: Flaw[];
}

/**
 * Payload for `agent_tool_call` / `agent_tool_result` events. Mirrors the
 * Devin-style execution log: agents think (`agent_thought`), invoke a
 * tool (`agent_tool_call`), and receive a result (`agent_tool_result`).
 */
export interface ToolCallPayload {
  /** Stable id so a result can be linked back to its call in the UI. */
  callId: string;
  /** Tool name (read_file, list_dir, write_file, patch_file, execute_bash, …). */
  tool: string;
  /** Sanitized input — large strings are truncated for the stream. */
  input: Record<string, unknown>;
}

export interface ToolResultPayload {
  callId: string;
  tool: string;
  /** Short, human-readable summary of what happened. */
  summary: string;
  /** Structured payload for the UI (exit code, bytes, path, …). */
  payload: Record<string, unknown>;
  /** True if the tool raised. */
  isError: boolean;
  /** Wall time in ms from call to result. */
  durationMs: number;
}

/** A single SSE event emitted by the orchestrator. */
export type SwarmEvent =
  | { type: 'agent_start'; agent: AgentName; at: number }
  | { type: 'agent_delta'; agent: AgentName; text: string }
  | { type: 'agent_response'; agent: AgentName; response: AgentResponse; at: number }
  | { type: 'agent_error'; agent: AgentName; message: string; at: number }
  /** Inner monologue (`<think>` block) emitted before a tool call. */
  | { type: 'agent_thought'; agent: AgentName; text: string; at: number }
  /** Agent invoked a tool against the E2B sandbox. */
  | { type: 'agent_tool_call'; agent: AgentName; call: ToolCallPayload; at: number }
  /** Tool result streamed back so the terminal can render success/error. */
  | { type: 'agent_tool_result'; agent: AgentName; result: ToolResultPayload; at: number }
  /** Emitted when EIVOR finishes loading recalled memories. */
  | {
      type: 'memory_recall';
      count: number;
      summaries: Array<{ kind: string; snippet: string; similarity: number }>;
      at: number;
    }
  /** Emitted at the start of each Plan→Critique→Counterexample cycle. */
  | { type: 'cycle_start'; cycle: number; max_cycles: number; at: number }
  /** Emitted when a cycle ends, including why it terminated. */
  | {
      type: 'cycle_end';
      cycle: number;
      reason: 'clean' | 'max_cycles' | 'aborted';
      high_flaws: number;
      at: number;
    }
  /** Emitted when an E2B sandbox boots for an agent turn. */
  | {
      type: 'sandbox_start';
      agent: AgentName;
      sandboxId: string;
      workdir: string;
      at: number;
    }
  /** Emitted when an E2B sandbox is torn down. */
  | { type: 'sandbox_end'; agent: AgentName; sandboxId: string; at: number }
  | { type: 'swarm_done'; at: number };

/** Input to the orchestrator's `run()` method. */
export interface SwarmRunRequest {
  userId: string;
  sessionId: string;
  query: string;
  /** Conversation history so far. */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}
