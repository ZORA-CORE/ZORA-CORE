/**
 * Valhalla AI — Infinity Engine: orchestrator.
 *
 * PR 1 scope: sequential pipeline, single cycle. This is the sovereign
 * replacement for the Dify `/v1/chat-messages` call:
 *
 *   EIVOR (context extraction)
 *     → ODIN (plan)
 *       → HEIMDALL (audit)
 *         → LOKI (counterexamples)
 *           → THOR (code)
 *
 * The full Plan → Critique → Counterexample → Build RECURSIVE loop
 * (with a repeat cycle if LOKI/HEIMDALL flag a high-severity issue)
 * lands in PR 2 together with the pgvector episodic memory.
 *
 * The orchestrator yields `SwarmEvent`s via an async generator so the
 * SSE route can pipe them to the browser without buffering.
 */

import { Eivor } from './eivor';
import { Odin } from './odin';
import { Heimdall } from './heimdall';
import { Loki } from './loki';
import { Thor } from './thor';
import type { AgentResponse, SwarmEvent, SwarmRunRequest } from './types';

/**
 * Build the single prompt string the next agent receives. We inline the
 * prior agents' structured outputs so every agent has full context.
 */
function composePrompt(
  req: SwarmRunRequest,
  priors: Array<{ agent: string; response: AgentResponse }>,
): string {
  const lines: string[] = [];
  lines.push(`## User request\n${req.query}`);
  if (req.history.length > 0) {
    lines.push('\n## Conversation so far');
    for (const m of req.history.slice(-6)) {
      lines.push(`- **${m.role}**: ${m.content}`);
    }
  }
  for (const p of priors) {
    lines.push(
      `\n## ${p.agent.toUpperCase()} said`,
      '```json',
      JSON.stringify(p.response, null, 2),
      '```',
    );
  }
  return lines.join('\n');
}

/**
 * Run the swarm end-to-end, yielding SSE events as each agent finishes.
 * Callers should consume with `for await`.
 */
export async function* runSwarm(
  req: SwarmRunRequest,
): AsyncGenerator<SwarmEvent, void, void> {
  const agents = [new Eivor(), new Odin(), new Heimdall(), new Loki(), new Thor()];
  const priors: Array<{ agent: string; response: AgentResponse }> = [];

  for (const agent of agents) {
    yield { type: 'agent_start', agent: agent.name, at: Date.now() };
    try {
      const prompt = composePrompt(req, priors);
      const response = await agent.run(prompt);
      priors.push({ agent: agent.name, response });
      yield {
        type: 'agent_response',
        agent: agent.name,
        response,
        at: Date.now(),
      };
    } catch (err) {
      yield {
        type: 'agent_error',
        agent: agent.name,
        message: err instanceof Error ? err.message : String(err),
        at: Date.now(),
      };
      // Stop the pipeline on any agent error — downstream agents have
      // no useful input. PR 2's recursive loop will retry instead.
      break;
    }
  }
  yield { type: 'swarm_done', at: Date.now() };
}
