'use client';

import { useState, useEffect } from 'react';

type AgentId = 'odin' | 'thor' | 'baldur' | 'tyr' | 'eivor' | 'freya' | 'heimdall';

interface AgentData {
  id: string;
  name: string;
  role: string;
  domain: string;
  status: 'online' | 'offline' | 'sovereign' | 'initializing';
  level?: string;
  lastOnline: string;
  memoryHash?: string;
  cognitiveBlueprint: {
    type: string;
    [key: string]: unknown;
  };
  capabilities: string[];
  familyBonds: Record<string, string>;
  playbook: string;
  implementation?: Record<string, string>;
}

interface AgentsRegistry {
  version: string;
  codename: string;
  lastUpdated: string;
  status: string;
  agents: Record<AgentId, AgentData>;
  memory: {
    agentMemoryHashes: Record<string, string>;
    wellOfMimir: {
      status: string;
      hotMemory: { entriesCount: number; maxEntries: number };
      semanticMemory: { vectorCount: number };
    };
    sicaProtocol: {
      status: string;
      totalPostMortems: number;
      lessonsExtracted: number;
    };
  };
  council: {
    status: string;
    activeSessions: number;
    totalDecisions: number;
    consensusRate: number;
  };
}

const AGENT_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  odin: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  thor: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
  baldur: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
  tyr: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/20' },
  eivor: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-green-500/20' },
  freya: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30', glow: 'shadow-pink-500/20' },
  heimdall: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20' },
};

const STATUS_STYLES: Record<string, { color: string; label: string; pulse: boolean }> = {
  online: { color: 'bg-[var(--z-emerald)]', label: 'Online', pulse: true },
  offline: { color: 'bg-[var(--z-text-muted)]', label: 'Offline', pulse: false },
  sovereign: { color: 'bg-[var(--z-violet)]', label: 'Sovereign', pulse: true },
  initializing: { color: 'bg-[var(--z-amber)]', label: 'Initializing', pulse: true },
};

const DOMAIN_ICONS: Record<string, string> = {
  architecture: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  infrastructure: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  design: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  ethics: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  memory: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  research: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  security: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};

function StatusIndicator({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.offline;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${style.color} ${style.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-[var(--z-text-secondary)]">{style.label}</span>
    </div>
  );
}

function MemoryHashBadge({ hash }: { hash: string }) {
  const isPending = hash === 'pending';
  return (
    <div className={`px-2 py-1 rounded-md text-xs font-mono ${isPending ? 'bg-[var(--z-amber)]/10 text-[var(--z-amber)]' : 'bg-[var(--z-bg-surface)] text-[var(--z-text-muted)]'}`}>
      {isPending ? 'Pending' : hash.slice(0, 8)}...
    </div>
  );
}

function AgentCard({ agent, memoryHash }: { agent: AgentData; memoryHash: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = AGENT_COLORS[agent.id] || AGENT_COLORS.odin;
  const domainIcon = DOMAIN_ICONS[agent.domain] || DOMAIN_ICONS.architecture;
  const isSovereign = agent.status === 'sovereign';

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-all duration-300
        ${colors.border} ${colors.bg}
        ${isSovereign ? `shadow-lg ${colors.glow}` : ''}
        hover:shadow-md
      `}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
              <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={domainIcon} />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${colors.text}`}>{agent.name}</h3>
                {isSovereign && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--z-violet)]/20 text-[var(--z-violet)] rounded">
                    Sovereign
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--z-text-muted)] mt-0.5">{agent.role}</p>
            </div>
          </div>
          <StatusIndicator status={agent.status} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--z-text-muted)]">Memory:</span>
            <MemoryHashBadge hash={memoryHash} />
          </div>
          <svg
            className={`w-4 h-4 text-[var(--z-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--z-border-subtle)]">
          <div className="pt-3">
            <span className="text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
              Cognitive Blueprint
            </span>
            <p className="text-sm text-[var(--z-text-secondary)] mt-1 capitalize">
              {agent.cognitiveBlueprint.type.replace(/_/g, ' ')}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
              Capabilities
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {agent.capabilities.slice(0, 5).map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-0.5 text-xs bg-[var(--z-bg-surface)] text-[var(--z-text-secondary)] rounded"
                >
                  {cap.replace(/_/g, ' ')}
                </span>
              ))}
              {agent.capabilities.length > 5 && (
                <span className="px-2 py-0.5 text-xs text-[var(--z-text-muted)]">
                  +{agent.capabilities.length - 5} more
                </span>
              )}
            </div>
          </div>

          {agent.level && (
            <div>
              <span className="text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
                Level
              </span>
              <p className="text-sm text-[var(--z-violet)] font-medium mt-1">
                {agent.level}
              </p>
            </div>
          )}

          <div className="text-xs text-[var(--z-text-muted)]">
            Last online: {new Date(agent.lastOnline).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

function CouncilStatus({ council }: { council: AgentsRegistry['council'] }) {
  return (
    <div className="rounded-xl bg-[var(--z-bg-surface)] border border-[var(--z-border-default)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--z-text-primary)]">Family Council</h4>
          <p className="text-xs text-[var(--z-text-muted)]">Tree-of-Thought Reasoning</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Status</span>
          <p className="text-sm font-medium text-[var(--z-emerald)] capitalize">{council.status}</p>
        </div>
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Sessions</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{council.activeSessions}</p>
        </div>
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Decisions</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{council.totalDecisions}</p>
        </div>
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Consensus</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{Math.round(council.consensusRate * 100)}%</p>
        </div>
      </div>
    </div>
  );
}

function MemoryStatus({ memory }: { memory: AgentsRegistry['memory'] }) {
  return (
    <div className="rounded-xl bg-[var(--z-bg-surface)] border border-[var(--z-border-default)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--z-violet)]/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--z-violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--z-text-primary)]">Well of Mímir</h4>
          <p className="text-xs text-[var(--z-text-muted)]">Episodic Memory System</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Hot Memory</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">
            {memory.wellOfMimir.hotMemory.entriesCount}/{memory.wellOfMimir.hotMemory.maxEntries}
          </p>
        </div>
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Vectors</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{memory.wellOfMimir.semanticMemory.vectorCount}</p>
        </div>
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Post-Mortems</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{memory.sicaProtocol.totalPostMortems}</p>
        </div>
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Lessons</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{memory.sicaProtocol.lessonsExtracted}</p>
        </div>
      </div>
    </div>
  );
}

interface AgentMonitoringMatrixProps {
  className?: string;
}

export function AgentMonitoringMatrix({ className = '' }: AgentMonitoringMatrixProps) {
  const [registry, setRegistry] = useState<AgentsRegistry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    async function loadRegistry() {
      try {
        const response = await fetch('/api/agents/registry');
        if (!response.ok) {
          throw new Error('Failed to load agents registry');
        }
        const data = await response.json();
        setRegistry(data);
      } catch (err) {
        console.error('Failed to load agents registry:', err);
        setError('Unable to load agent status');
        const fallbackRegistry: AgentsRegistry = {
          version: '1.0.0',
          codename: 'Aesir Genesis',
          lastUpdated: new Date().toISOString(),
          status: 'initialized',
          agents: {
            odin: { id: 'odin', name: 'ODIN', role: 'All-Father Orchestrator', domain: 'architecture', status: 'online', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'ensemble_reasoning' }, capabilities: ['strategic_planning'], familyBonds: {}, playbook: '.devin/agents/odin.md' },
            thor: { id: 'thor', name: 'THOR', role: 'Protector of Infrastructure', domain: 'infrastructure', status: 'sovereign', level: 'Sovereign Infra Level', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'recursive_self_correction' }, capabilities: ['formal_verification'], familyBonds: {}, playbook: '.devin/agents/thor.md' },
            baldur: { id: 'baldur', name: 'BALDUR', role: 'Radiant UX/UI', domain: 'design', status: 'online', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'shadcn_mcp_integration' }, capabilities: ['component_architecture'], familyBonds: {}, playbook: '.devin/agents/baldur.md' },
            tyr: { id: 'tyr', name: 'TYR', role: 'God of Justice', domain: 'ethics', status: 'online', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'mandatory_validation_loop' }, capabilities: ['climate_claim_validation'], familyBonds: {}, playbook: '.devin/agents/tyr.md' },
            eivor: { id: 'eivor', name: 'EIVOR', role: 'Sage of Memory', domain: 'memory', status: 'sovereign', level: 'Cognitive Sovereignty Level', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'episodic_memory' }, capabilities: ['memory_storage'], familyBonds: {}, playbook: '.devin/agents/eivor.md' },
            freya: { id: 'freya', name: 'FREYA', role: 'Goddess of Wisdom', domain: 'research', status: 'online', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'deep_research_protocol' }, capabilities: ['strategic_research'], familyBonds: {}, playbook: '.devin/agents/freya.md' },
            heimdall: { id: 'heimdall', name: 'HEIMDALL', role: 'Guardian', domain: 'security', status: 'online', lastOnline: new Date().toISOString(), cognitiveBlueprint: { type: 'eternal_vigilance' }, capabilities: ['security_monitoring'], familyBonds: {}, playbook: '.devin/agents/heimdall.md' },
          },
          memory: {
            agentMemoryHashes: { odin: 'a1b2c3d4e5f67890', thor: 'b2c3d4e5f6789012', baldur: 'pending', tyr: 'pending', eivor: 'c3d4e5f678901234', freya: 'pending', heimdall: 'pending' },
            wellOfMimir: { status: 'active', hotMemory: { entriesCount: 0, maxEntries: 10 }, semanticMemory: { vectorCount: 0 } },
            sicaProtocol: { status: 'ready', totalPostMortems: 0, lessonsExtracted: 0 },
          },
          council: { status: 'ready', activeSessions: 0, totalDecisions: 0, consensusRate: 0 },
        };
        setRegistry(fallbackRegistry);
      } finally {
        setIsLoading(false);
      }
    }

    loadRegistry();
  }, []);

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!registry) {
    return null;
  }

  const agents = Object.values(registry.agents);
  const sovereignCount = agents.filter((a) => a.status === 'sovereign').length;
  const onlineCount = agents.filter((a) => a.status === 'online' || a.status === 'sovereign').length;

  return (
    <div className={`rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--z-bg-surface)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--z-violet)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-[var(--z-text-primary)]">
              Aesir Family Matrix
            </h2>
            <p className="text-sm text-[var(--z-text-muted)]">
              {onlineCount}/{agents.length} online | {sovereignCount} sovereign
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--z-text-muted)]">v{registry.version}</span>
          <svg
            className={`w-5 h-5 text-[var(--z-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--z-amber)]/10 border border-[var(--z-amber)]/30 text-sm text-[var(--z-amber)]">
              {error} - Showing cached data
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CouncilStatus council={registry.council} />
            <MemoryStatus memory={registry.memory} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                memoryHash={registry.memory.agentMemoryHashes[agent.id] || 'pending'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentMonitoringMatrix;
