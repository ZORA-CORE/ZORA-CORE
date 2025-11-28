import { Hono } from 'hono';
import type { AppEnv, Agent, AgentId } from '../types';
import { jsonResponse } from '../lib/response';

const app = new Hono<AppEnv>();

export const AGENTS: Agent[] = [
  {
    id: 'connor',
    name: 'CONNOR',
    role: 'Systems & Backend Engineer',
    description:
      'Designs and implements backend services, APIs, data models and integrations. Integrates external tools and services. Responsible for reliability, performance and clean architecture.',
    pronouns: 'he/him',
    color: 'bg-blue-500',
  },
  {
    id: 'lumina',
    name: 'LUMINA',
    role: 'Orchestrator & Project Lead',
    description:
      'Coordinates multi-agent workflows, manages task distribution, and ensures coherent system behavior. Acts as the central intelligence for ZORA CORE operations.',
    pronouns: 'she/her',
    color: 'bg-purple-500',
  },
  {
    id: 'eivor',
    name: 'EIVOR',
    role: 'Memory & Knowledge Keeper',
    description:
      'Manages persistent memory, knowledge retrieval, and semantic search. Maintains the collective memory of all agents and enables context-aware responses.',
    pronouns: 'they/them',
    color: 'bg-green-500',
  },
  {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Researcher & Strategy Engine',
    description:
      'Conducts research, analyzes data, and provides strategic insights. Specializes in climate data analysis and trend identification.',
    pronouns: 'she/her',
    color: 'bg-yellow-500',
  },
  {
    id: 'aegis',
    name: 'AEGIS',
    role: 'Safety & Ethics Guardian',
    description:
      'Ensures ethical AI behavior, monitors for safety issues, and validates outputs. Acts as the conscience of ZORA CORE.',
    pronouns: 'he/him',
    color: 'bg-red-500',
  },
  {
    id: 'sam',
    name: 'SAM',
    role: 'Frontend & Experience Architect',
    description:
      'Designs and implements user interfaces, manages frontend architecture, and ensures excellent user experience across all ZORA CORE touchpoints.',
    pronouns: 'they/them',
    color: 'bg-pink-500',
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
