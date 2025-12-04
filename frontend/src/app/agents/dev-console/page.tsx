'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_ZORA_API_BASE_URL || 'http://localhost:8787';

interface ManifestStats {
  modules: number;
  tables: number;
  endpoints: number;
  workflows: number;
  agents: number;
  version: string;
}

interface WorldModelStats {
  total_nodes: number;
  total_edges: number;
  node_types: Record<string, number>;
  edge_types: Record<string, number>;
}

interface HealthStatus {
  status: string;
  environment: string;
  version: string;
  git_commit: string;
  supabase_connected: boolean;
}

interface AgentActivity {
  id: string;
  type: 'command' | 'task' | 'ingestion' | 'bootstrap';
  agent_id: string;
  title: string;
  status: string;
  created_at: string;
}

interface KnowledgeStats {
  total_documents: number;
  by_domain: Record<string, number>;
}

interface AllowedDomain {
  id: string;
  domain: string;
  source: string;
  is_enabled: boolean;
  created_at: string;
}

async function fetchWithAuth<T>(endpoint: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const CpuChipIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

function StatBox({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="text-center p-4 bg-[var(--background)] rounded-lg">
      <div className="text-2xl font-bold text-[var(--primary)]">{value}</div>
      <div className="text-sm text-[var(--foreground)]/70">{label}</div>
      {subtext && <div className="text-xs text-[var(--foreground)]/50 mt-1">{subtext}</div>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-[var(--foreground)]/50 text-sm">
      {message}
    </div>
  );
}

export default function DevConsolePage() {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [manifestStats, setManifestStats] = useState<ManifestStats | null>(null);
  const [worldModelStats, setWorldModelStats] = useState<WorldModelStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([]);

  const fetchAllData = async () => {
    setRefreshing(true);
    
    const [manifest, worldModel, health, knowledge, domains, tasks, commands] = await Promise.all([
      fetchWithAuth<{ stats: ManifestStats }>('/api/admin/dev/manifest/v2/stats'),
      fetchWithAuth<{ stats: WorldModelStats }>('/api/admin/world-model/stats'),
      fetchWithAuth<HealthStatus>('/api/health'),
      fetchWithAuth<{ stats: KnowledgeStats }>('/api/admin/odin/knowledge/stats'),
      fetchWithAuth<{ data: AllowedDomain[] }>('/api/admin/webtool/domains'),
      fetchWithAuth<{ data: Array<{ id: string; agent_id: string; title: string; status: string; created_at: string }> }>('/api/agent-tasks?limit=10'),
      fetchWithAuth<{ data: Array<{ id: string; agent_id: string; command: string; status: string; created_at: string }> }>('/api/agent-commands?limit=10'),
    ]);

    if (manifest?.stats) setManifestStats(manifest.stats);
    if (worldModel?.stats) setWorldModelStats(worldModel.stats);
    if (health) setHealthStatus(health);
    if (knowledge?.stats) setKnowledgeStats(knowledge.stats);
    if (domains?.data) setAllowedDomains(domains.data);

    const activities: AgentActivity[] = [];
    
    if (tasks?.data) {
      tasks.data.forEach((task) => {
        activities.push({
          id: task.id,
          type: 'task',
          agent_id: task.agent_id,
          title: task.title,
          status: task.status,
          created_at: task.created_at,
        });
      });
    }
    
    if (commands?.data) {
      commands.data.forEach((cmd) => {
        activities.push({
          id: cmd.id,
          type: 'command',
          agent_id: cmd.agent_id,
          title: cmd.command,
          status: cmd.status,
          created_at: cmd.created_at,
        });
      });
    }

    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAgentActivity(activities.slice(0, 15));

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-emerald-400';
      case 'failed':
      case 'error':
        return 'text-red-400';
      case 'pending':
      case 'in_progress':
        return 'text-amber-400';
      default:
        return 'text-[var(--foreground)]/60';
    }
  };

  const getAgentColor = (agentId: string) => {
    const colors: Record<string, string> = {
      odin: 'bg-purple-500/20 text-purple-400',
      thor: 'bg-blue-500/20 text-blue-400',
      freya: 'bg-pink-500/20 text-pink-400',
      baldur: 'bg-amber-500/20 text-amber-400',
      heimdall: 'bg-emerald-500/20 text-emerald-400',
      tyr: 'bg-red-500/20 text-red-400',
      eivor: 'bg-indigo-500/20 text-indigo-400',
    };
    return colors[agentId.toLowerCase()] || 'bg-gray-500/20 text-gray-400';
  };

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card variant="bordered" padding="lg" className="text-center">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Authentication Required</h2>
            <p className="text-[var(--foreground)]/60">Please sign in to access the Dev/Agent Console.</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Dev/Agent Console</h1>
            <p className="text-[var(--foreground)]/60 mt-1">
              System stats, agent activity, and knowledge overview
            </p>
          </div>
          <button
            onClick={fetchAllData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] hover:border-[var(--primary)]/50 disabled:opacity-50 transition-colors"
          >
            <span className={refreshing ? 'animate-spin' : ''}>
              <RefreshIcon />
            </span>
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CpuChipIcon />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">System Overview</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="bordered" padding="md">
                  <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-4">Dev Manifest Stats</h3>
                  {manifestStats ? (
                    <div className="grid grid-cols-3 gap-4">
                      <StatBox label="Modules" value={manifestStats.modules} />
                      <StatBox label="Tables" value={manifestStats.tables} />
                      <StatBox label="Endpoints" value={manifestStats.endpoints} />
                      <StatBox label="Workflows" value={manifestStats.workflows} />
                      <StatBox label="Agents" value={manifestStats.agents} />
                      <StatBox label="Version" value={manifestStats.version} />
                    </div>
                  ) : (
                    <EmptyState message="No manifest stats available" />
                  )}
                </Card>

                <Card variant="bordered" padding="md">
                  <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-4">World Model Stats</h3>
                  {worldModelStats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <StatBox label="Total Nodes" value={worldModelStats.total_nodes} />
                      <StatBox label="Total Edges" value={worldModelStats.total_edges} />
                      <div className="col-span-2">
                        <div className="text-xs text-[var(--foreground)]/50 mb-2">Node Types</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(worldModelStats.node_types || {}).map(([type, count]) => (
                            <span key={type} className="px-2 py-1 bg-[var(--background)] rounded text-xs">
                              {type}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No world model stats available" />
                  )}
                </Card>

                <Card variant="bordered" padding="md" className="md:col-span-2">
                  <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-4">System Health</h3>
                  {healthStatus ? (
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--foreground)]/70">Status:</span>
                        <span className={`font-medium ${healthStatus.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {healthStatus.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--foreground)]/70">Environment:</span>
                        <span className="font-medium text-[var(--foreground)]">{healthStatus.environment}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--foreground)]/70">Version:</span>
                        <span className="font-mono text-sm text-[var(--foreground)]">{healthStatus.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--foreground)]/70">Commit:</span>
                        <span className="font-mono text-sm text-[var(--foreground)]">{healthStatus.git_commit?.slice(0, 7) || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--foreground)]/70">Supabase:</span>
                        {healthStatus.supabase_connected ? <CheckCircleIcon /> : <XCircleIcon />}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="Health status unavailable" />
                  )}
                </Card>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <ActivityIcon />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Agent & ODIN Activity</h2>
              </div>
              <Card variant="bordered" padding="md">
                {agentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {agentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getAgentColor(activity.agent_id)}`}>
                            {activity.agent_id}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--foreground)] truncate">
                              {activity.title}
                            </div>
                            <div className="text-xs text-[var(--foreground)]/50">
                              {activity.type} • {formatDate(activity.created_at)}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No recent agent activity" />
                )}
              </Card>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpenIcon />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Knowledge & WebTool Overview</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="bordered" padding="md">
                  <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-4">Knowledge Documents</h3>
                  {knowledgeStats ? (
                    <div>
                      <div className="text-3xl font-bold text-[var(--primary)] mb-4">
                        {knowledgeStats.total_documents}
                        <span className="text-sm font-normal text-[var(--foreground)]/50 ml-2">total documents</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-[var(--foreground)]/50 mb-2">By Domain</div>
                        {Object.entries(knowledgeStats.by_domain || {}).map(([domain, count]) => (
                          <div key={domain} className="flex items-center justify-between p-2 bg-[var(--background)] rounded">
                            <span className="text-sm text-[var(--foreground)]">{domain.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-medium text-[var(--primary)]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No knowledge stats available" />
                  )}
                </Card>

                <Card variant="bordered" padding="md">
                  <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-4">Allowed Web Domains</h3>
                  {allowedDomains.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {allowedDomains.map((domain) => (
                        <div
                          key={domain.id}
                          className="flex items-center justify-between p-2 bg-[var(--background)] rounded"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--foreground)] truncate">
                              {domain.domain}
                            </div>
                            <div className="text-xs text-[var(--foreground)]/50">
                              Source: {domain.source}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {domain.is_enabled ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                Enabled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No allowed domains configured" />
                  )}
                </Card>
              </div>
            </section>

            <section className="pb-8">
              <Card variant="bordered" padding="md" className="bg-[var(--primary)]/5 border-[var(--primary)]/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                    <GlobeIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-1">ZORA is alive and learning</h3>
                    <p className="text-sm text-[var(--foreground)]/70">
                      The Nordic agents are connected to the web in a controlled way, building a curated knowledge base
                      for climate and sustainability topics. Use the Command Palette (Cmd/Ctrl+K) to navigate quickly.
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
