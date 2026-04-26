/**
 * Valhalla AI — Infinity Engine: orchestrator (PR 2).
 *
 * PR 1 shipped a flat sequential pipeline. PR 2 replaces it with the
 * full Plan → Critique → Counterexample → Build recursive loop, plus
 * Supabase/Voyage episodic memory for EIVOR:
 *
 *   EIVOR  (reads recalled memories, extracts context)
 *     ┌─────────── cycle 1..MAX_CYCLES ─────────────┐
 *     │  ODIN     (plans, informed by prior flaws)  │
 *     │  HEIMDALL (audits, emits flaws[])           │
 *     │  LOKI     (counterexamples, emits flaws[])  │
 *     │  break early when zero `high`-severity flaws│
 *     └──────────────────────────────────────────────┘
 *   THOR   (forges backend code against the final, clean plan)
 *   FREJA  (forges the frontend / Tailwind component against THOR's API)
 *   storeMemory(final turn)  — persists plan+code for future recall
 *
 * Cycles terminate when either (a) HEIMDALL and LOKI both return with
 * no `high`-severity flaws or (b) we hit MAX_CYCLES. Termination
 * reason is emitted as a `cycle_end` event so the UI can render it.
 *
 * Memory is best-effort: if Supabase or Voyage is unconfigured the
 * `recallTopK` / `storeMemory` calls no-op and the loop still runs.
 */

import { Eivor } from './eivor';
import { Odin } from './odin';
import { Heimdall } from './heimdall';
import { Loki } from './loki';
import { Thor } from './thor';
import { Freja } from './freja';
import type {
  AgentResponse,
  Flaw,
  SwarmEvent,
  SwarmRunRequest,
} from './types';
import {
  isMemoryEnabled,
  recallTopK,
  storeMemory,
  type MemoryRecord,
} from '../memory/store';

/**
 * Max number of Plan→Critique→Counterexample cycles before forcing
 * THOR + FREJA. HEIMDALL and LOKI are persona-tuned to find flaws
 * aggressively, so cycle counts of 3+ almost always exhaust their
 * full budget. Combined with FREJA being added after THOR, that
 * blows past Vercel's 300 s Pro `maxDuration`. Empirical 290 s probes
 * with `MAX_CYCLES = 3` exited mid-cycle-3 HEIMDALL with zero
 * THOR/FREJA reach. Capping at 2 keeps the design gate (one revision
 * round) while leaving ~140 s for the build phase.
 *
 * Background-job decoupling in Prometheus PR 1 will lift this cap.
 */
export const MAX_CYCLES = 2;

/** Small helper: filter flaws by severity. */
function highFlaws(flaws: Flaw[] | undefined): Flaw[] {
  return Array.isArray(flaws) ? flaws.filter((f) => f.severity === 'high') : [];
}

/** Pretty-print a small JSON summary so prompts stay legible. */
function stringifyPrior(response: AgentResponse): string {
  return [
    '```json',
    JSON.stringify(response, null, 2),
    '```',
  ].join('\n');
}

interface RecalledSection {
  memories: MemoryRecord[];
  markdown: string;
}

async function loadRecalled(
  req: SwarmRunRequest,
  signal: AbortSignal,
): Promise<RecalledSection> {
  if (!isMemoryEnabled()) {
    return { memories: [], markdown: '' };
  }
  let memories: MemoryRecord[];
  try {
    memories = await recallTopK({ userId: req.userId, query: req.query, k: 8, signal });
  } catch {
    // Fail-open: retrieval errors should not kill the turn.
    return { memories: [], markdown: '' };
  }
  if (memories.length === 0) return { memories, markdown: '' };
  const blocks = memories.map((m, i) => {
    const sim =
      typeof m.similarity === 'number' ? m.similarity.toFixed(3) : 'n/a';
    const snippet = m.content.length > 500 ? `${m.content.slice(0, 500)}…` : m.content;
    return `### Memory ${i + 1} — kind=${m.kind}, similarity=${sim}\n${snippet}`;
  });
  return {
    memories,
    markdown: ['## Recalled memories', ...blocks].join('\n\n'),
  };
}

function composeBasePrompt(
  req: SwarmRunRequest,
  recalled: RecalledSection,
): string {
  const lines: string[] = [];
  if (recalled.markdown) lines.push(recalled.markdown, '');
  lines.push(`## User request\n${req.query}`);
  if (req.history.length > 0) {
    lines.push('\n## Conversation so far');
    for (const m of req.history.slice(-6)) {
      lines.push(`- **${m.role}**: ${m.content}`);
    }
  }
  return lines.join('\n');
}

function composeWithPriors(
  base: string,
  priors: Array<{ agent: string; response: AgentResponse }>,
): string {
  if (priors.length === 0) return base;
  const blocks = priors.map(
    (p) => `\n## ${p.agent.toUpperCase()} said\n${stringifyPrior(p.response)}`,
  );
  return [base, ...blocks].join('\n');
}

/**
 * Run the full Infinity Engine swarm as an async generator of SSE
 * events. Caller is responsible for streaming them to the client and
 * for the top-level `AbortSignal` that cancels Voyage / Supabase /
 * Claude calls on disconnect.
 */
export async function* runSwarm(
  req: SwarmRunRequest,
  opts: { signal?: AbortSignal } = {},
): AsyncGenerator<SwarmEvent, void, void> {
  const signal = opts.signal ?? new AbortController().signal;

  // ───── Step 1: memory recall ────────────────────────────────────────
  const recalled = await loadRecalled(req, signal);
  if (recalled.memories.length > 0) {
    yield {
      type: 'memory_recall',
      count: recalled.memories.length,
      summaries: recalled.memories.map((m) => ({
        kind: m.kind,
        snippet:
          m.content.length > 160 ? `${m.content.slice(0, 160)}…` : m.content,
        similarity: m.similarity ?? 0,
      })),
      at: Date.now(),
    };
  }

  const basePrompt = composeBasePrompt(req, recalled);
  const priors: Array<{ agent: string; response: AgentResponse }> = [];

  // ───── Step 2: EIVOR ────────────────────────────────────────────────
  const eivor = new Eivor();
  yield { type: 'agent_start', agent: eivor.name, at: Date.now() };
  try {
    const response = await eivor.run(basePrompt);
    priors.push({ agent: eivor.name, response });
    yield {
      type: 'agent_response',
      agent: eivor.name,
      response,
      at: Date.now(),
    };
  } catch (err) {
    yield {
      type: 'agent_error',
      agent: eivor.name,
      message: err instanceof Error ? err.message : String(err),
      at: Date.now(),
    };
    yield { type: 'swarm_done', at: Date.now() };
    return;
  }

  // ───── Step 3: Plan → Critique → Counterexample recursive loop ─────
  let cycleTerminationReason: 'clean' | 'max_cycles' | 'aborted' = 'max_cycles';
  let lastHighFlaws = 0;

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    if (signal.aborted) {
      cycleTerminationReason = 'aborted';
      yield {
        type: 'cycle_end',
        cycle,
        reason: 'aborted',
        high_flaws: lastHighFlaws,
        at: Date.now(),
      };
      yield { type: 'swarm_done', at: Date.now() };
      return;
    }

    yield {
      type: 'cycle_start',
      cycle,
      max_cycles: MAX_CYCLES,
      at: Date.now(),
    };

    const cycleAgents = [new Odin(), new Heimdall(), new Loki()] as const;
    let cycleFailed = false;
    const cycleHighFlaws: Flaw[] = [];

    for (const agent of cycleAgents) {
      yield { type: 'agent_start', agent: agent.name, at: Date.now() };
      try {
        const prompt = composeWithPriors(basePrompt, priors);
        const response = await agent.run(prompt);
        priors.push({ agent: agent.name, response });
        yield {
          type: 'agent_response',
          agent: agent.name,
          response,
          at: Date.now(),
        };
        if (agent.name === 'heimdall' || agent.name === 'loki') {
          cycleHighFlaws.push(...highFlaws(response.flaws));
        }
      } catch (err) {
        yield {
          type: 'agent_error',
          agent: agent.name,
          message: err instanceof Error ? err.message : String(err),
          at: Date.now(),
        };
        cycleFailed = true;
        break;
      }
    }

    lastHighFlaws = cycleHighFlaws.length;
    if (cycleFailed) {
      yield {
        type: 'cycle_end',
        cycle,
        reason: 'aborted',
        high_flaws: lastHighFlaws,
        at: Date.now(),
      };
      yield { type: 'swarm_done', at: Date.now() };
      return;
    }

    if (lastHighFlaws === 0) {
      cycleTerminationReason = 'clean';
      yield {
        type: 'cycle_end',
        cycle,
        reason: 'clean',
        high_flaws: 0,
        at: Date.now(),
      };
      break;
    }

    // Non-clean cycle: append the flaws as an explicit instruction so
    // ODIN's NEXT plan has to address them.
    priors.push({
      agent: 'heimdall+loki',
      response: {
        agent: 'heimdall',
        reasoning:
          `Cycle ${cycle} surfaced ${lastHighFlaws} high-severity flaw(s). ` +
          'ODIN must revise the plan to close every one before the next cycle.',
        plan: { cycle_feedback: cycleHighFlaws },
        verification_criteria:
          'Every high-severity flaw above must be explicitly addressed in the next ODIN plan.',
      },
    });

    // Non-clean cycle: emit `flaws_remaining` so the UI doesn't
    // mislabel a flawed cycle as "clean". When we're at the cycle
    // budget the loop exits and `cycleTerminationReason` is
    // `max_cycles`; the per-cycle `cycle_end` event still records
    // why THIS cycle ended (flaws found), which is more useful for
    // the timeline than overwriting it with `max_cycles`.
    yield {
      type: 'cycle_end',
      cycle,
      reason: 'flaws_remaining',
      high_flaws: lastHighFlaws,
      at: Date.now(),
    };
    if (cycle === MAX_CYCLES) {
      cycleTerminationReason = 'max_cycles';
    }
  }
  // Suppress unused-var warning while keeping the value for future logging.
  void cycleTerminationReason;

  // ───── Step 4: THOR forges backend code ────────────────────────────
  const thor = new Thor();
  yield { type: 'agent_start', agent: thor.name, at: Date.now() };
  let thorResponse: AgentResponse | null = null;
  try {
    const prompt = composeWithPriors(basePrompt, priors);
    thorResponse = await thor.run(prompt);
    priors.push({ agent: thor.name, response: thorResponse });
    yield {
      type: 'agent_response',
      agent: thor.name,
      response: thorResponse,
      at: Date.now(),
    };
  } catch (err) {
    yield {
      type: 'agent_error',
      agent: thor.name,
      message: err instanceof Error ? err.message : String(err),
      at: Date.now(),
    };
    yield { type: 'swarm_done', at: Date.now() };
    return;
  }

  // ───── Step 5: FREJA forges the frontend (component / UX) ──────────
  // Sequential after THOR so FREJA can target THOR's actual API contract
  // and shape state around the verified backend. FREJA failures are
  // non-fatal — the swarm has already produced a usable backend at this
  // point; an error here surfaces to the UI but doesn't void the turn.
  const freja = new Freja();
  yield { type: 'agent_start', agent: freja.name, at: Date.now() };
  try {
    const prompt = composeWithPriors(basePrompt, priors);
    const frejaResponse = await freja.run(prompt);
    priors.push({ agent: freja.name, response: frejaResponse });
    yield {
      type: 'agent_response',
      agent: freja.name,
      response: frejaResponse,
      at: Date.now(),
    };
  } catch (err) {
    yield {
      type: 'agent_error',
      agent: freja.name,
      message: err instanceof Error ? err.message : String(err),
      at: Date.now(),
    };
  }

  // ───── Step 6: persist turn into episodic memory (best effort) ──────
  if (thorResponse && isMemoryEnabled()) {
    const planText = priors
      .filter((p) => p.agent === 'odin')
      .map((p) =>
        typeof p.response.plan === 'object'
          ? JSON.stringify(p.response.plan)
          : String(p.response.plan),
      )
      .join('\n\n');
    const codeText = thorResponse.code ?? '';
    const turnBlob = [
      `# user_query\n${req.query}`,
      `# final_plan\n${planText}`,
      `# final_code\n${codeText}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    try {
      await storeMemory(
        {
          userId: req.userId,
          sessionId: req.sessionId,
          kind: 'turn',
          content: turnBlob,
        },
        signal,
      );
    } catch {
      // Persist is best-effort; a failure must not fail the user turn.
    }
  }

  yield { type: 'swarm_done', at: Date.now() };
}
