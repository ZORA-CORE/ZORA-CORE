/**
 * Valhalla AI — Infinity Engine PR 2: Devin-mode orchestrator.
 *
 * The structured-output orchestrator (`runSwarm` in `orchestrator.ts`)
 * runs agents as a single Claude call returning one JSON envelope.
 * This orchestrator runs every agent as a multi-turn Tool Use loop
 * inside an E2B sandbox so each agent can read / edit / execute real
 * code exactly the way Devin does.
 *
 * Invocation is gated behind `VALHALLA_TOOL_USE=1` and `E2B_API_KEY`
 * so production stays on the structured-output path until the user
 * flips the switch. Both paths coexist and share `SwarmEvent` so the
 * same frontend renders either transcript.
 */
import { createSandbox, isSandboxEnabled, type SandboxHandle } from '../sandbox/e2b';
import type { AgentResponse, Flaw, SwarmEvent, SwarmRunRequest } from './types';
import { DEVIN_MODE_AGENTS } from './tool-classes';
import type { ToolUseAgent } from './tool-agent';
import type { AgentToolContext } from './tools';
import {
  isMemoryEnabled,
  recallTopK,
  storeMemory,
  type MemoryRecord,
} from '../memory/store';
import { fetchGlobalUserContext } from '../memory/omni';

// See orchestrator.ts for the full rationale: HEIMDALL+LOKI are
// persona-tuned to find flaws aggressively, so 3 cycles + THOR + FREJA
// exhausts Vercel's 300 s Pro maxDuration. Capping at 2 keeps the
// design gate (one revision round) while leaving budget for the build
// phase. Background-job decoupling in Prometheus PR 1 will lift this.
export const MAX_CYCLES = 2;
/** Hard cap on tool-use steps per agent. Safety net against runaway loops. */
export const MAX_STEPS_PER_AGENT = 16;

function highFlaws(flaws: Flaw[] | undefined): Flaw[] {
  return Array.isArray(flaws) ? flaws.filter((f) => f.severity === 'high') : [];
}

function stringifyPrior(response: AgentResponse): string {
  return ['```json', JSON.stringify(response, null, 2), '```'].join('\n');
}

interface RecalledSection {
  memories: MemoryRecord[];
  markdown: string;
}

async function loadRecalled(
  req: SwarmRunRequest,
  signal: AbortSignal,
): Promise<RecalledSection> {
  if (!isMemoryEnabled()) return { memories: [], markdown: '' };
  let memories: MemoryRecord[];
  try {
    memories = await recallTopK({ userId: req.userId, query: req.query, k: 8, signal });
  } catch {
    return { memories: [], markdown: '' };
  }
  if (memories.length === 0) return { memories, markdown: '' };
  const blocks = memories.map((m, i) => {
    const sim = typeof m.similarity === 'number' ? m.similarity.toFixed(3) : 'n/a';
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
 * Runs one agent in a fresh sandbox and yields its events.
 * Caller is responsible for aggregating into `priors[]`.
 */
async function* runOneAgent(
  agent: ToolUseAgent,
  userPrompt: string,
  signal: AbortSignal,
  toolContext: AgentToolContext,
): AsyncGenerator<SwarmEvent, AgentResponse | null, void> {
  yield { type: 'agent_start', agent: agent.name, at: Date.now() };
  let sandbox: SandboxHandle | null = null;
  try {
    sandbox = await createSandbox({
      agent: agent.name,
      timeoutMs: 10 * 60 * 1000,
    });
    yield {
      type: 'sandbox_start',
      agent: agent.name,
      sandboxId: sandbox.id,
      workdir: sandbox.workdir,
      at: Date.now(),
    };
    const { events, response } = await agent.run({
      sandbox,
      userPrompt,
      signal,
      maxSteps: MAX_STEPS_PER_AGENT,
      toolContext: { ...toolContext, agent: agent.name },
    });
    for (const e of events) yield e;
    yield {
      type: 'agent_response',
      agent: agent.name,
      response,
      at: Date.now(),
    };
    return response;
  } catch (err) {
    yield {
      type: 'agent_error',
      agent: agent.name,
      message: err instanceof Error ? err.message : String(err),
      at: Date.now(),
    };
    return null;
  } finally {
    if (sandbox) {
      const id = sandbox.id;
      try {
        await sandbox.kill();
      } catch {
        /* best effort */
      }
      yield {
        type: 'sandbox_end',
        agent: agent.name,
        sandboxId: id,
        at: Date.now(),
      };
    }
  }
}

export function isToolUseEnabled(): boolean {
  const raw = process.env.VALHALLA_TOOL_USE ?? '';
  return (raw === '1' || raw.toLowerCase() === 'true') && isSandboxEnabled();
}

/**
 * Run the full Devin-mode swarm. Mirrors `runSwarm`'s event-stream
 * contract so the client parser stays identical.
 */
export async function* runSwarmToolUse(
  req: SwarmRunRequest,
  opts: { signal?: AbortSignal } = {},
): AsyncGenerator<SwarmEvent, void, void> {
  const signal = opts.signal ?? new AbortController().signal;
  const toolContext: AgentToolContext = {
    userId: req.userId,
    sessionId: req.sessionId,
    agent: 'orchestrator',
  };

  // EIVOR Omni-Memory: global-user context is pulled BEFORE session
  // recall so it's available to prepend to ODIN's cached system prompt.
  // When the Omni store is unconfigured, `markdown` is '' and this
  // becomes a zero-cost no-op — the swarm runs exactly as before.
  const globalCtx = await fetchGlobalUserContext({
    userId: req.userId,
    query: req.query,
    signal,
  });
  if (globalCtx.memories.length > 0) {
    yield {
      type: 'memory_recall',
      count: globalCtx.memories.length,
      summaries: globalCtx.memories.map((m) => ({
        kind: m.kind,
        snippet:
          m.content.length > 160 ? `${m.content.slice(0, 160)}…` : m.content,
        similarity: m.similarity ?? 0,
      })),
      at: Date.now(),
    };
  }

  // Session memory recall (identical to structured-output path).
  const recalled = await loadRecalled(req, signal);
  if (recalled.memories.length > 0) {
    yield {
      type: 'memory_recall',
      count: recalled.memories.length,
      summaries: recalled.memories.map((m) => ({
        kind: m.kind,
        snippet: m.content.length > 160 ? `${m.content.slice(0, 160)}…` : m.content,
        similarity: m.similarity ?? 0,
      })),
      at: Date.now(),
    };
  }

  const basePrompt = composeBasePrompt(req, recalled);
  const globalBlock = globalCtx.markdown
    ? `${globalCtx.markdown}\n\n---\n\n`
    : '';
  const promptWithGlobal = globalBlock + basePrompt;
  const priors: Array<{ agent: string; response: AgentResponse }> = [];

  // EIVOR
  const eivor = new DEVIN_MODE_AGENTS.eivor();
  const eivorResponse = yield* runOneAgent(
    eivor,
    promptWithGlobal,
    signal,
    toolContext,
  );
  if (!eivorResponse) {
    yield { type: 'swarm_done', at: Date.now() };
    return;
  }
  priors.push({ agent: eivor.name, response: eivorResponse });

  // Plan → Critique → Counterexample loop
  let lastHighFlaws = 0;
  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    if (signal.aborted) {
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

    const cycleAgents: ToolUseAgent[] = [
      new DEVIN_MODE_AGENTS.odin(),
      new DEVIN_MODE_AGENTS.heimdall(),
      new DEVIN_MODE_AGENTS.loki(),
    ];
    const cycleHighFlaws: Flaw[] = [];
    let cycleFailed = false;

    for (const agent of cycleAgents) {
      const prompt = composeWithPriors(promptWithGlobal, priors);
      const resp = yield* runOneAgent(agent, prompt, signal, toolContext);
      if (!resp) {
        cycleFailed = true;
        break;
      }
      priors.push({ agent: agent.name, response: resp });
      if (agent.name === 'heimdall' || agent.name === 'loki') {
        cycleHighFlaws.push(...highFlaws(resp.flaws));
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
      yield {
        type: 'cycle_end',
        cycle,
        reason: 'clean',
        high_flaws: 0,
        at: Date.now(),
      };
      break;
    }

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

    // Non-clean cycle: HEIMDALL or LOKI surfaced high-severity flaws.
    // The previous emission labelled this `'clean'` (or `'max_cycles'` on
    // the final iteration), which the UI rendered as `Cycle N clean` —
    // misleading the user into believing the flaws were resolved when in
    // reality another cycle was being queued (or the cycle budget had
    // been exhausted with flaws still open). Mirroring the streaming
    // orchestrator: emit `'flaws_remaining'` so this cycle's outcome is
    // accurately reflected in the timeline. The `cycleTerminationReason`
    // (max_cycles vs clean) is owned at the outer loop level by the
    // streaming orchestrator; this tool-runner doesn't propagate one
    // outwards beyond the per-cycle event.
    yield {
      type: 'cycle_end',
      cycle,
      reason: 'flaws_remaining',
      high_flaws: lastHighFlaws,
      at: Date.now(),
    };
  }

  // THOR forges backend code
  const thor = new DEVIN_MODE_AGENTS.thor();
  const thorPrompt = composeWithPriors(promptWithGlobal, priors);
  const thorResponse = yield* runOneAgent(thor, thorPrompt, signal, toolContext);
  if (!thorResponse) {
    yield { type: 'swarm_done', at: Date.now() };
    return;
  }
  priors.push({ agent: thor.name, response: thorResponse });

  // FREJA forges the frontend / Tailwind component against THOR's API.
  // Sequential after THOR so she can target the verified API contract.
  // FREJA failures are non-fatal: the swarm has already produced a
  // usable backend, so we surface the error and continue to memory.
  const freja = new DEVIN_MODE_AGENTS.freja();
  const frejaPrompt = composeWithPriors(promptWithGlobal, priors);
  const frejaResponse = yield* runOneAgent(freja, frejaPrompt, signal, toolContext);
  if (frejaResponse) {
    priors.push({ agent: freja.name, response: frejaResponse });
  }

  // Persist episodic memory (best effort, same contract as structured path).
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
      /* best effort */
    }
  }

  yield { type: 'swarm_done', at: Date.now() };
}
