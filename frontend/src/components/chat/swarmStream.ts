/**
 * Valhalla AI — Native swarm SSE bridge for the chat UI.
 *
 * Translates the `/api/swarm` event stream (SwarmEvent shape) into the
 * two side-effects the chat surface cares about: appending content to
 * the assistant message and pushing an entry into the inner-monologue
 * panel. Keeps ChatContainer agnostic of the agents/types.ts schema
 * so future SwarmEvent variants only require an edit here.
 *
 * Gating:
 *   - `NEXT_PUBLIC_VALHALLA_NATIVE_SWARM=1` flips the client to call
 *     `/api/swarm` for new turns. When unset (or the server returns
 *     503 because `VALHALLA_NATIVE_SWARM` is off there too), the
 *     caller falls back to the legacy Dify proxy at `/api/chat`.
 */

import type { ThoughtEvent } from './artifacts';

type AgentName = 'eivor' | 'odin' | 'heimdall' | 'loki' | 'thor' | 'freja';

interface ToolCallPayload {
  callId: string;
  tool: string;
  input: Record<string, unknown>;
}

interface ToolResultPayload {
  callId: string;
  tool: string;
  summary: string;
  payload: Record<string, unknown>;
  isError: boolean;
  durationMs: number;
}

interface AgentResponse {
  agent: AgentName;
  reasoning: string;
  plan: Record<string, unknown>;
  code?: string;
  verification_criteria: string;
}

type SwarmEvent =
  | { type: 'agent_start'; agent: AgentName; at: number }
  | { type: 'agent_delta'; agent: AgentName; text: string }
  | { type: 'agent_response'; agent: AgentName; response: AgentResponse; at: number }
  | { type: 'agent_error'; agent: AgentName; message: string; at: number }
  | { type: 'agent_thought'; agent: AgentName; text: string; at: number }
  | { type: 'agent_tool_call'; agent: AgentName; call: ToolCallPayload; at: number }
  | { type: 'agent_tool_result'; agent: AgentName; result: ToolResultPayload; at: number }
  | {
      type: 'memory_recall';
      count: number;
      summaries: Array<{ kind: string; snippet: string; similarity: number }>;
      at: number;
    }
  | { type: 'cycle_start'; cycle: number; max_cycles: number; at: number }
  | {
      type: 'cycle_end';
      cycle: number;
      reason: 'clean' | 'max_cycles' | 'aborted';
      high_flaws: number;
      at: number;
    }
  | {
      type: 'sandbox_start';
      agent: AgentName;
      sandboxId: string;
      workdir: string;
      at: number;
    }
  | { type: 'sandbox_end'; agent: AgentName; sandboxId: string; at: number }
  | { type: 'swarm_done'; at: number };

const AGENT_LABEL: Record<AgentName, string> = {
  eivor: 'EIVOR',
  odin: 'ODIN',
  heimdall: 'HEIMDALL',
  loki: 'LOKI',
  thor: 'THOR',
  freja: 'FREJA',
};

function previewInput(input: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(input, null, 2);
    return json.length > 600 ? `${json.slice(0, 600)}…` : json;
  } catch {
    return '[unserializable]';
  }
}

/**
 * Translate one SwarmEvent into chat side-effects.
 *
 * Returns `done` when the orchestrator emits `swarm_done` so the
 * caller can break out of its read loop. Throws on `agent_error`
 * with no surviving response so the catch path renders an error
 * bubble — same UX as the Dify path.
 */
function applyEvent(
  evt: SwarmEvent,
  idx: number,
  onContent: (delta: string) => void,
  onThought: (thought: ThoughtEvent) => void,
): { done: boolean } {
  const at = 'at' in evt ? evt.at : Date.now();
  const id = `s-${idx}`;

  switch (evt.type) {
    case 'agent_start':
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} starting`,
        at,
      });
      return { done: false };

    case 'sandbox_start':
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} sandbox boot`,
        detail: `id ${evt.sandboxId} • cwd ${evt.workdir}`,
        at,
      });
      return { done: false };

    case 'sandbox_end':
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} sandbox closed`,
        at,
      });
      return { done: false };

    case 'agent_thought':
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} thinking`,
        detail: evt.text,
        at,
      });
      return { done: false };

    case 'agent_delta':
      // Streamed token from the active agent — append directly.
      if (evt.text) onContent(evt.text);
      return { done: false };

    case 'agent_tool_call':
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} → ${evt.call.tool}`,
        detail: previewInput(evt.call.input),
        at,
      });
      return { done: false };

    case 'agent_tool_result':
      onThought({
        id,
        event: evt.type,
        label: `${evt.result.tool} ${evt.result.isError ? 'FAILED' : 'ok'} (${evt.result.durationMs}ms)`,
        detail: evt.result.summary,
        at,
      });
      return { done: false };

    case 'memory_recall':
      onThought({
        id,
        event: evt.type,
        label: `EIVOR recalled ${evt.count} memories`,
        detail:
          evt.summaries
            .slice(0, 6)
            .map(
              (s) =>
                `[${s.kind} • ${(s.similarity * 100).toFixed(1)}%] ${s.snippet}`,
            )
            .join('\n') || undefined,
        at,
      });
      return { done: false };

    case 'cycle_start':
      onThought({
        id,
        event: evt.type,
        label: `Cycle ${evt.cycle}/${evt.max_cycles} start`,
        at,
      });
      return { done: false };

    case 'cycle_end':
      onThought({
        id,
        event: evt.type,
        label: `Cycle ${evt.cycle} ${evt.reason}`,
        detail: `${evt.high_flaws} high-severity flaws carried forward`,
        at,
      });
      return { done: false };

    case 'agent_response': {
      const r = evt.response;
      const header = `\n\n### ${AGENT_LABEL[evt.agent]}\n`;
      const reasoning = r.reasoning?.trim() ? `${r.reasoning.trim()}\n` : '';
      const code = r.code?.trim()
        ? `\n\`\`\`\n${r.code.trim()}\n\`\`\`\n`
        : '';
      onContent(header + reasoning + code);
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} response`,
        detail: r.verification_criteria || undefined,
        at,
      });
      return { done: false };
    }

    case 'agent_error':
      onThought({
        id,
        event: evt.type,
        label: `${AGENT_LABEL[evt.agent]} error`,
        detail: evt.message,
        at,
      });
      // Don't throw — orchestrator may recover into the next cycle.
      // The error is surfaced in the thought stream so the user sees it.
      return { done: false };

    case 'swarm_done':
      onThought({
        id,
        event: evt.type,
        label: 'Swarm complete',
        at,
      });
      return { done: true };

    default: {
      // Type-level exhaustiveness check.
      const _exhaustive: never = evt;
      void _exhaustive;
      return { done: false };
    }
  }
}

export interface StreamSwarmOptions {
  query: string;
  userId: string;
  sessionId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal: AbortSignal;
  onContent: (delta: string) => void;
  onThought: (thought: ThoughtEvent) => void;
}

export type StreamSwarmResult =
  | { ok: true }
  | { ok: false; reason: 'disabled'; message: string }
  | { ok: false; reason: 'error'; message: string };

/**
 * Open an SSE connection to `/api/swarm` and pump events through
 * `onContent` / `onThought` until the stream closes or `signal`
 * aborts. The caller is responsible for falling back to the Dify
 * proxy when the result is `{ok:false, reason:'disabled'}`.
 */
export async function streamSwarm(
  opts: StreamSwarmOptions,
): Promise<StreamSwarmResult> {
  let res: Response;
  try {
    res = await fetch('/api/swarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: opts.query,
        userId: opts.userId,
        sessionId: opts.sessionId,
        history: opts.history,
      }),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  if (res.status === 503) {
    // VALHALLA_NATIVE_SWARM is off on the server — treat as soft
    // disable so the caller can fall back to Dify without bubbling a
    // visible error to the user.
    const text = await res.text().catch(() => '');
    return { ok: false, reason: 'disabled', message: text };
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = parsed.error || parsed.message || text;
    } catch {
      /* not JSON, use raw text */
    }
    return {
      ok: false,
      reason: 'error',
      message: message || `Swarm request failed with status ${res.status}`,
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let counter = 0;
  let finishedCleanly = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator: number;
    while ((separator = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);

      const dataStr = frame
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');

      if (!dataStr || dataStr === '[DONE]') continue;

      let evt: SwarmEvent;
      try {
        evt = JSON.parse(dataStr) as SwarmEvent;
      } catch {
        continue;
      }

      const { done: streamDone } = applyEvent(
        evt,
        counter++,
        opts.onContent,
        opts.onThought,
      );
      if (streamDone) {
        finishedCleanly = true;
      }
    }
  }

  if (!finishedCleanly) {
    // Stream closed without an explicit swarm_done — still treat as
    // success because the orchestrator may have terminated normally
    // after the last event. The caller will finalize an empty content
    // bubble with the existing fallback message.
  }
  return { ok: true };
}

/**
 * Read the client-side feature flag. We deliberately use the
 * `NEXT_PUBLIC_` prefix so this resolves at build time on Vercel and
 * does not require a runtime probe of the server. The server-side
 * gate (`VALHALLA_NATIVE_SWARM`) is independent — if the client flag
 * is on but the server flag is off, `/api/swarm` will 503 and we
 * fall back to Dify automatically.
 */
export function isClientSwarmEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_VALHALLA_NATIVE_SWARM ?? '';
  return raw === '1' || raw.toLowerCase() === 'true';
}
