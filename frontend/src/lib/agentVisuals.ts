/**
 * Nordic Agent Visuals Utility
 * 
 * Provides consistent visual identity for ZORA's Nordic mythology agents:
 * - ODIN: Research & Labs - deep blue/indigo
 * - THOR: Infra & Systems - steel/gray
 * - FREYA: UX/Comms/Engagement - soft rose/gold
 * - BALDUR: SHOP & brands - emerald/green
 * - HEIMDALL: Observability & Climate Guard - teal
 * - TYR: Impact & Ethics/Foundation - amber
 * - EIVOR: Memory & Knowledge - violet
 */

export type AgentId = 'odin' | 'thor' | 'freya' | 'baldur' | 'heimdall' | 'tyr' | 'eivor';

export interface AgentVisual {
  id: AgentId;
  name: string;
  role: string;
  domain: string;
  color: string;
  colorLight: string;
  colorDark: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: string;
  cssVar: string;
}

const AGENT_VISUALS: Record<AgentId, AgentVisual> = {
  odin: {
    id: 'odin',
    name: 'ODIN',
    role: 'Research & Labs',
    domain: 'Research, Strategy, Experiments',
    color: '#8b5cf6',
    colorLight: '#a78bfa',
    colorDark: '#7c3aed',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    glowColor: '0 0 20px rgba(139, 92, 246, 0.3)',
    icon: '🔮',
    cssVar: '--z-agent-odin',
  },
  thor: {
    id: 'thor',
    name: 'THOR',
    role: 'Infra & Systems',
    domain: 'Backend, APIs, Infrastructure',
    color: '#10b981',
    colorLight: '#34d399',
    colorDark: '#059669',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    glowColor: '0 0 20px rgba(16, 185, 129, 0.3)',
    icon: '⚡',
    cssVar: '--z-agent-thor',
  },
  freya: {
    id: 'freya',
    name: 'FREYA',
    role: 'UX & Engagement',
    domain: 'Frontend, Communications, User Experience',
    color: '#ec4899',
    colorLight: '#f472b6',
    colorDark: '#db2777',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    glowColor: '0 0 20px rgba(236, 72, 153, 0.3)',
    icon: '✨',
    cssVar: '--z-agent-freya',
  },
  baldur: {
    id: 'baldur',
    name: 'BALDUR',
    role: 'SHOP & Brands',
    domain: 'Products, Materials, Brand Mashups',
    color: '#f59e0b',
    colorLight: '#fbbf24',
    colorDark: '#d97706',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    glowColor: '0 0 20px rgba(245, 158, 11, 0.3)',
    icon: '☀️',
    cssVar: '--z-agent-baldur',
  },
  heimdall: {
    id: 'heimdall',
    name: 'HEIMDALL',
    role: 'Observability & Climate Guard',
    domain: 'Monitoring, Climate Data, Safety',
    color: '#0ea5e9',
    colorLight: '#38bdf8',
    colorDark: '#0284c7',
    bgColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
    glowColor: '0 0 20px rgba(14, 165, 233, 0.3)',
    icon: '👁️',
    cssVar: '--z-agent-heimdall',
  },
  tyr: {
    id: 'tyr',
    name: 'TYR',
    role: 'Impact & Ethics',
    domain: 'Foundation, Ethics, Compliance',
    color: '#f43f5e',
    colorLight: '#fb7185',
    colorDark: '#e11d48',
    bgColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    glowColor: '0 0 20px rgba(244, 63, 94, 0.3)',
    icon: '⚖️',
    cssVar: '--z-agent-tyr',
  },
  eivor: {
    id: 'eivor',
    name: 'EIVOR',
    role: 'Memory & Knowledge',
    domain: 'Knowledge Graph, Memory, Search',
    color: '#6366f1',
    colorLight: '#818cf8',
    colorDark: '#4f46e5',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    glowColor: '0 0 20px rgba(99, 102, 241, 0.3)',
    icon: '📚',
    cssVar: '--z-agent-eivor',
  },
};

/**
 * Get visual identity for a specific agent
 */
export function getAgentVisual(agentId: string): AgentVisual {
  const normalizedId = agentId.toLowerCase() as AgentId;
  return AGENT_VISUALS[normalizedId] || AGENT_VISUALS.odin;
}

/**
 * Get all agent visuals
 */
export function getAllAgentVisuals(): AgentVisual[] {
  return Object.values(AGENT_VISUALS);
}

/**
 * Get agent badge CSS classes
 */
export function getAgentBadgeClasses(agentId: string): string {
  const visual = getAgentVisual(agentId);
  return `bg-[${visual.bgColor}] text-[${visual.color}] border border-[${visual.borderColor}]`;
}

/**
 * Get agent color for inline styles
 */
export function getAgentColor(agentId: string): string {
  return getAgentVisual(agentId).color;
}

/**
 * Get agent background color for inline styles
 */
export function getAgentBgColor(agentId: string): string {
  return getAgentVisual(agentId).bgColor;
}

/**
 * Get agent icon
 */
export function getAgentIcon(agentId: string): string {
  return getAgentVisual(agentId).icon;
}

/**
 * Get agents by domain context
 */
export function getAgentsForContext(context: string): AgentVisual[] {
  const contextMap: Record<string, AgentId[]> = {
    climate: ['heimdall', 'odin'],
    climate_overview: ['heimdall', 'odin'],
    goes_green: ['freya', 'odin'],
    goes_green_overview: ['freya', 'odin'],
    shop: ['baldur', 'freya'],
    zora_shop: ['baldur', 'freya'],
    foundation: ['tyr', 'odin'],
    academy: ['odin', 'freya'],
    simulation: ['odin', 'heimdall'],
    dev_console: ['thor', 'eivor'],
    agents: ['thor', 'odin', 'eivor'],
    billing: ['baldur', 'tyr'],
    dashboard: ['odin', 'heimdall', 'thor'],
  };

  const agentIds = contextMap[context] || ['odin'];
  return agentIds.map(id => AGENT_VISUALS[id]);
}

/**
 * Get primary agent for a context
 */
export function getPrimaryAgentForContext(context: string): AgentVisual {
  const agents = getAgentsForContext(context);
  return agents[0] || AGENT_VISUALS.odin;
}

export default AGENT_VISUALS;
