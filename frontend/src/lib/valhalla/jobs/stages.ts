/**
 * Valhalla AI — Prometheus PR 1: orchestrator state machine.
 *
 * The original `runSwarm` async generator (orchestrator.ts) ran the
 * full EIVOR → cycle 1..N → THOR → FREJA pipeline inside a single
 * HTTP request, which empirically blew past Vercel's 300 s
 * `maxDuration` for any non-trivial prompt. This module decomposes
 * that pipeline into a *resumable* state machine where each stage
 * runs ONE Claude turn (≤90 s in practice) and the worker chains
 * stages until either the swarm completes or its budget exhausts —
 * at which point the next continuation invocation picks up cleanly
 * by reading the persisted job + event log.
 *
 * Stages:
 *   init           — already done at job-creation time (memory recall)
 *   eivor          — single EIVOR turn
 *   cycle1_odin/heimdall/loki — three turns, may emit cycle_end and
 *                    advance to either thor (clean) or cycle2_*
 *   cycle2_odin/heimdall/loki — same shape; cycle_end always advances
 *                    to thor (MAX_CYCLES = 2)
 *   thor           — backend forge
 *   freja          — frontend forge
 *   memory_store   — persist final turn to valhalla_memories
 *   done           — emit swarm_done, mark job completed
 *
 * Why not split each cycle further (e.g. eval as its own stage):
 * the eval step is pure synchronous logic (filter flaws, decide
 * next stage), so doing it inside the loki stage keeps the state
 * machine compact without affecting the runtime budget.
 */
import { Eivor } from '../agents/eivor';
import { Odin } from '../agents/odin';
import { Heimdall } from '../agents/heimdall';
import { Loki } from '../agents/loki';
import { Thor } from '../agents/thor';
import { Freja } from '../agents/freja';
import { MAX_CYCLES } from '../agents/orchestrator';
import type {
  AgentName,
  AgentResponse,
  Flaw,
  SwarmEvent,
  SwarmRunRequest,
} from '../agents/types';
import { isMemoryEnabled, storeMemory } from '../memory/store';
import { isMissingProviderKeyError } from '../providers/errors';
import type { SwarmJobRow } from './store';

export type SwarmStage =
  | 'init'
  | 'eivor'
  | 'cycle1_odin'
  | 'cycle1_heimdall'
  | 'cycle1_loki'
  | 'cycle2_odin'
  | 'cycle2_heimdall'
  | 'cycle2_loki'
  | 'thor'
  | 'freja'
  | 'memory_store'
  | 'done';

export interface StageContext {
  job: SwarmJobRow;
  /** Every event emitted for this job so far, in order. */
  priorEvents: SwarmEvent[];
  signal?: AbortSignal;
}

export interface StageResult {
  events: SwarmEvent[];
  nextStage: SwarmStage;
  /** True when the next stage is `done` and the job should be marked
   *  completed; populated with `failed` if a fatal error happened. */
  terminal?: 'completed' | 'failed';
  errorMessage?: string;
}

/** Reconstruct the prior list and base prompt from the persisted job + event log. */
export function rebuildContext(ctx: StageContext): {
  basePrompt: string;
  priors: Array<{ agent: string; response: AgentResponse }>;
} {
  const req: SwarmRunRequest = {
    userId: ctx.job.userId,
    sessionId: ctx.job.sessionId,
    query: ctx.job.query,
    history: ctx.job.history,
  };
  const lines: string[] = [];
  if (ctx.job.recalledMarkdown) lines.push(ctx.job.recalledMarkdown, '');
  lines.push(`## User request\n${req.query}`);
  if (req.history.length > 0) {
    lines.push('\n## Conversation so far');
    for (const m of req.history.slice(-6)) {
      lines.push(`- **${m.role}**: ${m.content}`);
    }
  }
  const basePrompt = lines.join('\n');

  const priors: Array<{ agent: string; response: AgentResponse }> = [];
  // Track per-cycle high-severity flaws so we can synthesize the same
  // "Cycle N surfaced X flaw(s)" prior the original orchestrator
  // injected before the next ODIN plan.
  let cycleAccumulator: { cycle: number; flaws: Flaw[] } | null = null;
  for (const evt of ctx.priorEvents) {
    if (evt.type === 'cycle_start') {
      cycleAccumulator = { cycle: evt.cycle, flaws: [] };
      continue;
    }
    if (evt.type === 'agent_response') {
      priors.push({ agent: evt.response.agent, response: evt.response });
      if (
        cycleAccumulator &&
        (evt.response.agent === 'heimdall' || evt.response.agent === 'loki') &&
        Array.isArray(evt.response.flaws)
      ) {
        cycleAccumulator.flaws.push(
          ...evt.response.flaws.filter((f) => f.severity === 'high'),
        );
      }
      continue;
    }
    if (evt.type === 'cycle_end') {
      if (
        cycleAccumulator &&
        evt.reason === 'flaws_remaining' &&
        cycleAccumulator.flaws.length > 0
      ) {
        priors.push({
          agent: 'heimdall+loki',
          response: {
            agent: 'heimdall',
            reasoning:
              `Cycle ${cycleAccumulator.cycle} surfaced ${cycleAccumulator.flaws.length} high-severity flaw(s). ` +
              'ODIN must revise the plan to close every one before the next cycle.',
            plan: { cycle_feedback: cycleAccumulator.flaws },
            verification_criteria:
              'Every high-severity flaw above must be explicitly addressed in the next ODIN plan.',
          },
        });
      }
      cycleAccumulator = null;
    }
  }
  return { basePrompt, priors };
}

function composeWithPriors(
  base: string,
  priors: Array<{ agent: string; response: AgentResponse }>,
): string {
  if (priors.length === 0) return base;
  const blocks = priors.map((p) =>
    [
      `\n## ${p.agent.toUpperCase()} said`,
      '```json',
      JSON.stringify(p.response, null, 2),
      '```',
    ].join('\n'),
  );
  return [base, ...blocks].join('\n');
}

/** Map a stage to the agent that runs in it, or null for non-agent stages. */
function agentForStage(
  stage: SwarmStage,
): {
  name: AgentName;
  ctor: () => {
    name: AgentName;
    run: (
      p: string,
      opts?: { userId?: string; signal?: AbortSignal },
    ) => Promise<AgentResponse>;
  };
} | null {
  switch (stage) {
    case 'eivor':
      return { name: 'eivor', ctor: () => new Eivor() };
    case 'cycle1_odin':
    case 'cycle2_odin':
      return { name: 'odin', ctor: () => new Odin() };
    case 'cycle1_heimdall':
    case 'cycle2_heimdall':
      return { name: 'heimdall', ctor: () => new Heimdall() };
    case 'cycle1_loki':
    case 'cycle2_loki':
      return { name: 'loki', ctor: () => new Loki() };
    case 'thor':
      return { name: 'thor', ctor: () => new Thor() };
    case 'freja':
      return { name: 'freja', ctor: () => new Freja() };
    default:
      return null;
  }
}

/** Run a single stage of the swarm. Pure: never touches Supabase. */
export async function runStage(
  stage: SwarmStage,
  ctx: StageContext,
): Promise<StageResult> {
  const now = (): number => Date.now();

  if (stage === 'init') {
    // Init runs at job-creation time (POST /api/swarm); the worker
    // should never re-run it. Emit memory_recall here only if the
    // event log doesn't already contain one (defensive).
    const hasRecall = ctx.priorEvents.some((e) => e.type === 'memory_recall');
    const events: SwarmEvent[] = [];
    if (!hasRecall && ctx.job.recalledMarkdown) {
      events.push({
        type: 'memory_recall',
        count: 0,
        summaries: [],
        at: now(),
      });
    }
    return { events, nextStage: 'eivor' };
  }

  if (stage === 'memory_store') {
    // Best-effort: failure here must not fail the user turn.
    const events: SwarmEvent[] = [];
    try {
      if (isMemoryEnabled()) {
        const priors = rebuildContext(ctx).priors;
        const thor = priors.find((p) => p.agent === 'thor');
        if (thor) {
          const planText = priors
            .filter((p) => p.agent === 'odin')
            .map((p) =>
              typeof p.response.plan === 'object'
                ? JSON.stringify(p.response.plan)
                : String(p.response.plan),
            )
            .join('\n\n');
          const codeText = thor.response.code ?? '';
          const turnBlob = [
            `# user_query\n${ctx.job.query}`,
            `# final_plan\n${planText}`,
            `# final_code\n${codeText}`,
          ]
            .filter(Boolean)
            .join('\n\n');
          await storeMemory(
            {
              userId: ctx.job.userId,
              sessionId: ctx.job.sessionId,
              kind: 'turn',
              content: turnBlob,
            },
            ctx.signal,
          );
        }
      }
    } catch {
      /* swallow */
    }
    return { events, nextStage: 'done' };
  }

  if (stage === 'done') {
    return {
      events: [{ type: 'swarm_done', at: now() }],
      nextStage: 'done',
      terminal: 'completed',
    };
  }

  // ──── Agent stages: run the persona for this stage and decide
  //      the successor. EIVOR + THOR + FREJA are simple, the cycle
  //      stages have additional cycle_start / cycle_end bookkeeping.
  const stageAgent = agentForStage(stage);
  if (!stageAgent) {
    // Unknown stage — fail closed.
    return {
      events: [
        {
          type: 'agent_error',
          agent: 'odin',
          message: `Unknown swarm stage: ${stage}`,
          at: now(),
        },
        { type: 'swarm_done', at: now() },
      ],
      nextStage: 'done',
      terminal: 'failed',
      errorMessage: `Unknown swarm stage: ${stage}`,
    };
  }

  const { basePrompt, priors } = rebuildContext(ctx);
  const events: SwarmEvent[] = [];

  // Cycle bookkeeping: emit cycle_start at the head of each cycle's
  // first agent (ODIN). The orchestrator state machine is the only
  // thing that emits cycle_start so the rebuild logic above can rely
  // on those markers to scope per-cycle flaws.
  if (stage === 'cycle1_odin') {
    events.push({
      type: 'cycle_start',
      cycle: 1,
      max_cycles: MAX_CYCLES,
      at: now(),
    });
  } else if (stage === 'cycle2_odin') {
    events.push({
      type: 'cycle_start',
      cycle: 2,
      max_cycles: MAX_CYCLES,
      at: now(),
    });
  }

  events.push({ type: 'agent_start', agent: stageAgent.name, at: now() });

  let response: AgentResponse | null = null;
  try {
    const agent = stageAgent.ctor();
    const prompt = composeWithPriors(basePrompt, priors);
    response = await agent.run(prompt, {
      userId: ctx.job.userId,
      signal: ctx.signal,
    });
    events.push({
      type: 'agent_response',
      agent: stageAgent.name,
      response,
      at: now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Per Apex Directive: a missing provider key MUST surface as a
    // structured onboarding event so the chat surface can render a
    // one-click "Provide your <Provider> key" prompt — even on the
    // background-job path.
    if (isMissingProviderKeyError(err)) {
      events.push({
        type: 'provider_key_missing',
        agent: stageAgent.name,
        provider: err.provider,
        envKey: err.provisioning.envKey,
        displayName: err.provisioning.displayName,
        dashboardUrl: err.provisioning.dashboardUrl,
        instruction: err.provisioning.instruction,
        secretApiEndpoint: err.provisioning.secretApiEndpoint,
        at: now(),
      });
    }
    events.push({
      type: 'agent_error',
      agent: stageAgent.name,
      message,
      at: now(),
    });
    // FREJA failures are non-fatal — the swarm has already produced
    // a usable backend at this point so we still try to persist
    // memory and finish cleanly.
    if (stage === 'freja') {
      return { events, nextStage: 'memory_store' };
    }
    // EIVOR / cycle agents / THOR errors short-circuit to swarm_done
    // with a `failed` terminal status, mirroring the original
    // orchestrator's behavior.
    events.push({ type: 'swarm_done', at: now() });
    return {
      events,
      nextStage: 'done',
      terminal: 'failed',
      errorMessage: message,
    };
  }

  // ──── Decide the successor stage
  switch (stage) {
    case 'eivor':
      return { events, nextStage: 'cycle1_odin' };

    case 'cycle1_odin':
      return { events, nextStage: 'cycle1_heimdall' };
    case 'cycle1_heimdall':
      return { events, nextStage: 'cycle1_loki' };
    case 'cycle1_loki': {
      // Cycle 1 evaluation: at this point `priors` contains every
      // response BEFORE the LOKI we just ran (rebuildContext is
      // called from `ctx.priorEvents`, which excludes events
      // produced by the current stage). So the current cycle's
      // HEIMDALL is the most recent HEIMDALL prior, and the cycle's
      // LOKI flaws live on `response` directly.
      const heimdallFlaws =
        priors.filter((p) => p.agent === 'heimdall').slice(-1)[0]?.response
          .flaws ?? [];
      const cycleHigh = [...heimdallFlaws, ...(response.flaws ?? [])].filter(
        (f) => f.severity === 'high',
      );

      if (cycleHigh.length === 0) {
        events.push({
          type: 'cycle_end',
          cycle: 1,
          reason: 'clean',
          high_flaws: 0,
          at: now(),
        });
        return { events, nextStage: 'thor' };
      }
      events.push({
        type: 'cycle_end',
        cycle: 1,
        reason: 'flaws_remaining',
        high_flaws: cycleHigh.length,
        at: now(),
      });
      return { events, nextStage: 'cycle2_odin' };
    }

    case 'cycle2_odin':
      return { events, nextStage: 'cycle2_heimdall' };
    case 'cycle2_heimdall':
      return { events, nextStage: 'cycle2_loki' };
    case 'cycle2_loki': {
      const heimdallFlaws =
        priors.filter((p) => p.agent === 'heimdall').slice(-1)[0]?.response
          .flaws ?? [];
      const cycleHigh = [...heimdallFlaws, ...(response.flaws ?? [])].filter(
        (f) => f.severity === 'high',
      );
      events.push({
        type: 'cycle_end',
        cycle: 2,
        reason: cycleHigh.length === 0 ? 'clean' : 'max_cycles',
        high_flaws: cycleHigh.length,
        at: now(),
      });
      return { events, nextStage: 'thor' };
    }

    case 'thor':
      return { events, nextStage: 'freja' };
    case 'freja':
      return { events, nextStage: 'memory_store' };

    default:
      return { events, nextStage: 'done', terminal: 'completed' };
  }
}
