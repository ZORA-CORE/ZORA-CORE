import { Hono } from 'hono';
import type { AppEnv, Agent, AgentId } from '../types';
import { jsonResponse } from '../lib/response';

const app = new Hono<AppEnv>();

export const AGENTS: Agent[] = [
  {
    id: 'odin',
    name: 'ODIN',
    role: 'Chief Strategist & Research Lead',
    description:
      'System-level strategy, climate/AI research, ZORA Model development, ODIN Labs, AGI/ASI research, NANO, SPACE, VIKINGS, and Quantum Climate Lab orchestration.',
    pronouns: 'he/him',
    color: 'bg-blue-600',
  },
  {
    id: 'thor',
    name: 'THOR',
    role: 'Backend & Infrastructure Engineer',
    description:
      'Heavy-lifting backend development, Cloudflare Workers, infrastructure health, performance optimization, migrations, and system reliability.',
    pronouns: 'he/him',
    color: 'bg-sky-500',
  },
  {
    id: 'freya',
    name: 'FREYA',
    role: 'Humans, Storytelling & Growth',
    description:
      'Brand voice, social media, marketing campaigns, onboarding flows, narrative design, and deep user understanding.',
    pronouns: 'she/her',
    color: 'bg-pink-500',
  },
  {
    id: 'baldur',
    name: 'BALDUR',
    role: 'Frontend, UX & Product Experience',
    description:
      'Next.js/UI components, layouts, visual design, OS feel, usability, and ensuring excellent user experience across all ZORA CORE touchpoints.',
    pronouns: 'he/him',
    color: 'bg-amber-500',
  },
  {
    id: 'heimdall',
    name: 'HEIMDALL',
    role: 'Observability & Monitoring',
    description:
      'Logs, metrics, anomaly detection, system health monitoring. The watchtower for ZORA CORE, ensuring visibility into all operations.',
    pronouns: 'he/him',
    color: 'bg-cyan-500',
  },
  {
    id: 'tyr',
    name: 'TYR',
    role: 'Ethics, Safety & Climate Integrity',
    description:
      'Safety rules enforcement, anti-greenwashing validation, alignment oversight, policy management, and approval workflows. Guardian of climate integrity.',
    pronouns: 'he/him',
    color: 'bg-red-500',
  },
  {
    id: 'eivor',
    name: 'EIVOR',
    role: 'Memory & Knowledge Keeper',
    description:
      'Vector memory layer, long-term context, hybrid search, world model memory. Maintains the collective memory of all agents and enables context-aware responses.',
    pronouns: 'she/her',
    color: 'bg-emerald-500',
  },
];

export function getAgentById(agentId: string): Agent | undefined {
  return AGENTS.find((agent) => agent.id === agentId.toLowerCase());
}

export function isValidAgentId(agentId: string): agentId is AgentId {
  return AGENTS.some((agent) => agent.id === agentId.toLowerCase());
}

app.get('/', (c) => {
  return jsonResponse({ data: AGENTS });
});

app.get('/:agentId', (c) => {
  const agentId = c.req.param('agentId');
  const agent = getAgentById(agentId);

  if (!agent) {
    return jsonResponse(
      {
        error: 'NOT_FOUND',
        message: `Agent '${agentId}' not found. Valid agents: ${AGENTS.map((a) => a.id).join(', ')}`,
        status: 404,
      },
      404
    );
  }

  return jsonResponse(agent);
});

export default app;
