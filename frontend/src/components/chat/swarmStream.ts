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
      reason: 'clean' | 'flaws_remaining' | 'max_cycles' | 'aborted';
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
  | {
      type: 'raven_research';
      raven: 'hugin' | 'munin';
      query: string;
      findings: string;
      citations: string[];
      at: number;
    }
  | {
      type: 'provider_key_missing';
      agent: string;
      provider: string;
      envKey: string;
      displayName: string;
      dashboardUrl: string;
      instruction: string;
      secretApiEndpoint: string;
      at: number;
    }
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

    case 'raven_research': {
      const ravenName = evt.raven === 'hugin' ? 'HUGIN' : 'MUNIN';
      onThought({
        id,
        event: evt.type,
        label: `${ravenName} research`,
        detail:
          evt.findings.length > 240
            ? `${evt.findings.slice(0, 240)}…`
            : evt.findings,
        at,
        payload: {
          kind: 'raven_research',
          raven: evt.raven,
          query: evt.query,
          findings: evt.findings,
          citations: evt.citations,
        },
      });
      return { done: false };
    }

    case 'provider_key_missing':
      onThought({
        id,
        event: evt.type,
        label: `${evt.displayName} key missing for ${evt.agent.toUpperCase()}`,
        detail: `${evt.envKey} not configured · ${evt.instruction}`,
        at,
        payload: {
          kind: 'provider_key_missing',
          agent: evt.agent,
          provider: evt.provider,
          envKey: evt.envKey,
          displayName: evt.displayName,
          dashboardUrl: evt.dashboardUrl,
          instruction: evt.instruction,
          secretApiEndpoint: evt.secretApiEndpoint,
        },
      });
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
 * Pump SSE frames from a `Response` body through `applyEvent`. Used
 * by both the legacy synchronous /api/swarm path and the new
 * /api/swarm/stream/[jobId] replay endpoint. Returns whether the
 * stream observed an explicit `swarm_done` event and the highest
 * `seq` id observed (encoded as `: seq <id>` SSE comments by the
 * stream replay endpoint) so the caller can resume cleanly across
 * reconnects.
 */
async function pumpSseStream(
  res: Response,
  opts: StreamSwarmOptions,
  startCounter: number,
): Promise<{ done: boolean; counter: number; lastSeq: number }> {
  if (!res.body) return { done: false, counter: startCounter, lastSeq: 0 };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let counter = startCounter;
  let done = false;
  let lastSeq = 0;

  while (true) {
    const { value, done: readDone } = await reader.read();
    if (readDone) break;
    buffer += decoder.decode(value, { stream: true });

    let separator: number;
    while ((separator = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);

      // Capture seq cursors emitted by /api/swarm/stream/[jobId] so
      // we can resume with `?afterId=N` if Vercel closes the SSE.
      for (const line of frame.split('\n')) {
        if (line.startsWith(': seq ')) {
          const n = Number(line.slice(6).trim());
          if (Number.isFinite(n) && n > lastSeq) lastSeq = n;
        }
      }

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
      if (streamDone) done = true;
    }
  }

  return { done, counter, lastSeq };
}

/** Derive the job-status URL from a stream URL. */
function jobStatusUrl(streamUrl: string): string {
  // streamUrl looks like `/api/swarm/stream/<jobId>` (relative) or an
  // absolute origin form. Replace the `/stream/` segment with `/jobs/`.
  return streamUrl.replace('/api/swarm/stream/', '/api/swarm/jobs/');
}

/**
 * Final-fallback: ask the server for the job status directly. Used
 * when the SSE replay stream has been cut more than `MAX_RECONNECTS`
 * times in a row without producing any new events — at that point
 * the worker has either completed (browser missed the synthesized
 * `swarm_done`) or is genuinely stalled. Returns true if terminal.
 */
async function jobIsTerminal(
  streamUrl: string,
  signal: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(jobStatusUrl(streamUrl), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as
      | { status?: string }
      | null;
    return body?.status === 'completed' || body?.status === 'failed';
  } catch {
    return false;
  }
}

/** Auto-reconnecting SSE consumer for the durable replay endpoint. */
async function consumeReplayStream(
  streamUrl: string,
  opts: StreamSwarmOptions,
): Promise<StreamSwarmResult> {
  let counter = 0;
  let lastSeq = 0;
  // Vercel can close the SSE at the 300 s ceiling; the worker may
  // still be running. Reconnect with `?afterId=` so the user
  // perceives a continuous stream. Once the orchestrator emits
  // `swarm_done` the loop breaks regardless of remaining attempts.
  //
  // PR 1E: bumped from 4 to 8 and reset the counter when we observe
  // any new events on a connection — a long job that needs N>4
  // reconnects shouldn't bail just because each individual
  // connection hits the timeout. Combined with the
  // `jobIsTerminal()` fallback, the client now agrees with the
  // server-side state instead of giving up.
  const MAX_CONSECUTIVE_EMPTY_RECONNECTS = 8;
  let consecutiveEmpty = 0;
  while (consecutiveEmpty <= MAX_CONSECUTIVE_EMPTY_RECONNECTS) {
    const url = lastSeq > 0 ? `${streamUrl}?afterId=${lastSeq}` : streamUrl;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: opts.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      // Exponential backoff capped at 4 s.
      const wait = Math.min(4000, 500 * 2 ** consecutiveEmpty);
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
      consecutiveEmpty += 1;
      continue;
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        reason: 'error',
        message: text || `Swarm stream failed with status ${res.status}`,
      };
    }

    const seqBefore = lastSeq;
    const result = await pumpSseStream(res, opts, counter);
    counter = result.counter;
    lastSeq = Math.max(lastSeq, result.lastSeq);
    if (result.done) return { ok: true };
    if (lastSeq > seqBefore) {
      // Made progress this connection — reset the empty counter so
      // a long job that legitimately needs many reconnects can keep
      // going.
      consecutiveEmpty = 0;
    } else {
      consecutiveEmpty += 1;
      const wait = Math.min(4000, 500 * 2 ** consecutiveEmpty);
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    // Stream closed without `swarm_done` — likely Vercel hit its
    // 300 s ceiling on this connection. Reconnect with the cursor.
  }
  // Exhausted consecutive-empty reconnects. Disambiguate: if the
  // job is already terminal the worker has finished and we just
  // missed the synthesized `swarm_done`; treat as success. If still
  // running, surface the stall as an error so the user knows
  // something went wrong instead of a silent empty bubble.
  if (await jobIsTerminal(streamUrl, opts.signal)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: 'error',
    message:
      'Swarm stream lost connection and the job is still running. ' +
      'Refresh and try again.',
  };
}

/**
 * Open an SSE connection to `/api/swarm` and pump events through
 * `onContent` / `onThought` until the stream closes or `signal`
 * aborts. The caller is responsible for falling back to the Dify
 * proxy when the result is `{ok:false, reason:'disabled'}`.
 *
 * Two server flavors are handled transparently:
 *   - Legacy `text/event-stream` response (no Supabase configured):
 *     pump frames inline.
 *   - New `application/json` enqueue response with `{jobId, streamUrl}`:
 *     open the durable replay stream and reconnect on Vercel
 *     timeouts using the `seq` cursor.
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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = parsed.error || parsed.message || text;
    } catch {
      /* not JSON */
    }
    return {
      ok: false,
      reason: 'error',
      message: message || `Swarm request failed with status ${res.status}`,
    };
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    // Enqueue mode (Prometheus PR 1): durable job + SSE replay.
    const body = (await res.json().catch(() => ({}))) as {
      jobId?: string;
      streamUrl?: string;
      error?: string;
    };
    if (!body.jobId || !body.streamUrl) {
      return {
        ok: false,
        reason: 'error',
        message: body.error ?? 'Swarm enqueue returned an invalid response.',
      };
    }
    return consumeReplayStream(body.streamUrl, opts);
  }

  if (!res.body) {
    return {
      ok: false,
      reason: 'error',
      message: 'Swarm response had no body.',
    };
  }

  // Legacy synchronous SSE path.
  const result = await pumpSseStream(res, opts, 0);
  void result;
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
