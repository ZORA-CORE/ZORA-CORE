'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';
import {
  ZCard,
  ZButton,
  ZMetricTile,
  ZPageHeader,
  ZSectionHeader,
  ZBadge,
  ZEmptyState,
  ZLoadingState,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';
import { getAgentVisual } from '@/lib/agentVisuals';

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
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default function DevConsolePage() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [manifestStats, setManifestStats] = useState<ManifestStats | null>(null);
  const [worldModelStats, setWorldModelStats] = useState<WorldModelStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const fetchAllData = useCallback(async () => {
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
        activities.push({ id: task.id, type: 'task', agent_id: task.agent_id, title: task.title, status: task.status, created_at: task.created_at });
      });
    }
    if (commands?.data) {
      commands.data.forEach((cmd) => {
        activities.push({ id: cmd.id, type: 'command', agent_id: cmd.agent_id, title: cmd.command, status: cmd.status, created_at: cmd.created_at });
      });
    }
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAgentActivity(activities.slice(0, 15));

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isAuthenticated) {
        await fetchAllData();
      } else {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'muted' => {
    switch (status.toLowerCase()) {
      case 'completed': case 'success': return 'success';
      case 'failed': case 'error': return 'error';
      case 'pending': case 'in_progress': return 'warning';
      default: return 'muted';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-8">
        <div className="max-w-7xl mx-auto">
          {/* ===== HERO SECTION ===== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)] border border-[var(--z-border-default)] mb-8">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--z-odin)] blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--z-violet)] blur-3xl" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--z-odin)] via-[var(--z-violet)] to-[var(--z-sky)]" />
            
            <div className="relative p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--z-odin)]/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--z-odin)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <ZBadge variant="odin" size="md">Dev Console</ZBadge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--z-text-primary)] tracking-tight mb-2">
                    {t('devConsole.title', 'Brain & Agents Console')}
                  </h1>
                  <p className="text-lg text-[var(--z-text-tertiary)] max-w-2xl">
                    {t('devConsole.subtitle', 'System stats, agent activity, and knowledge overview for Nordic agents.')}
                  </p>
                </div>
                
                {/* System Status */}
                <div className="flex flex-col items-start lg:items-end gap-3">
                  <div className="px-5 py-4 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)]">
                    <p className="text-[10px] text-[var(--z-text-muted)] uppercase tracking-[0.15em] mb-2">System Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${healthStatus?.status === 'ok' ? 'bg-[var(--z-emerald)] animate-pulse' : 'bg-[var(--z-rose)]'}`} />
                      <span className="text-lg font-bold text-[var(--z-text-primary)]">
                        {healthStatus?.status === 'ok' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--z-text-muted)]">{healthStatus?.environment || 'Unknown'}</p>
                  </div>
                  <ZButton variant="secondary" size="sm" onClick={fetchAllData} disabled={refreshing}>
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                  </ZButton>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--z-odin)] animate-pulse" />
                  <span className="text-sm text-[var(--z-text-secondary)]">{manifestStats?.agents || 0} Nordic agents</span>
                </div>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">{manifestStats?.endpoints || 0} API endpoints</span>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">v{manifestStats?.version || 'N/A'}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <ZLoadingState message="Loading system data..." />
          ) : (
            <div className="space-y-8">
              <section>
                <ZSectionHeader title="System Overview" className="mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                  <ZMetricTile label="Modules" value={manifestStats?.modules || 0} sublabel="in manifest" />
                  <ZMetricTile label="Tables" value={manifestStats?.tables || 0} sublabel="database" variant="violet" />
                  <ZMetricTile label="Endpoints" value={manifestStats?.endpoints || 0} sublabel="API routes" variant="sky" />
                  <ZMetricTile label="Workflows" value={manifestStats?.workflows || 0} sublabel="DAG flows" variant="amber" />
                  <ZMetricTile label="Agents" value={manifestStats?.agents || 0} sublabel="Nordic agents" variant="emerald" />
                  <ZMetricTile label="Version" value={manifestStats?.version || 'N/A'} sublabel="manifest" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ZCard className="p-4">
                    <ZSectionHeader title="World Model Stats" className="mb-3" />
                    {worldModelStats ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-[var(--z-surface)] rounded-lg text-center">
                            <div className="text-2xl font-bold text-[var(--z-violet)]">{worldModelStats.total_nodes}</div>
                            <div className="text-xs text-[var(--z-text-muted)]">Total Nodes</div>
                          </div>
                          <div className="p-3 bg-[var(--z-surface)] rounded-lg text-center">
                            <div className="text-2xl font-bold text-[var(--z-sky)]">{worldModelStats.total_edges}</div>
                            <div className="text-xs text-[var(--z-text-muted)]">Total Edges</div>
                          </div>
                        </div>
                        {Object.keys(worldModelStats.node_types || {}).length > 0 && (
                          <div>
                            <div className="text-xs text-[var(--z-text-muted)] mb-2">Node Types</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(worldModelStats.node_types).map(([type, count]) => (
                                <ZBadge key={type} variant="muted" size="sm">{type}: {count}</ZBadge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ZEmptyState title="No world model stats" description="World model not initialized" size="sm" />
                    )}
                  </ZCard>

                  <ZCard className="p-4">
                    <ZSectionHeader title="System Health" className="mb-3" />
                    {healthStatus ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--z-text-muted)]">Status</span>
                          <ZBadge variant={healthStatus.status === 'ok' ? 'success' : 'error'} size="sm">
                            {healthStatus.status.toUpperCase()}
                          </ZBadge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--z-text-muted)]">Environment</span>
                          <span className="text-sm font-medium text-[var(--z-text-primary)]">{healthStatus.environment}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--z-text-muted)]">Version</span>
                          <span className="text-sm font-mono text-[var(--z-text-primary)]">{healthStatus.version}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--z-text-muted)]">Commit</span>
                          <span className="text-sm font-mono text-[var(--z-text-primary)]">{healthStatus.git_commit?.slice(0, 7) || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--z-text-muted)]">Supabase</span>
                          <ZBadge variant={healthStatus.supabase_connected ? 'success' : 'error'} size="sm">
                            {healthStatus.supabase_connected ? 'Connected' : 'Disconnected'}
                          </ZBadge>
                        </div>
                      </div>
                    ) : (
                      <ZEmptyState title="Health unavailable" description="Could not fetch health status" size="sm" />
                    )}
                  </ZCard>
                </div>
              </section>

              <section>
                <ZSectionHeader title="Agent Activity" className="mb-4" />
                <ZCard className="p-4">
                  {agentActivity.length === 0 ? (
                    <ZEmptyState title="No recent activity" description="Agent tasks and commands will appear here" />
                  ) : (
                    <div className="space-y-3">
                      {agentActivity.map((activity) => {
                        const agentVisual = getAgentVisual(activity.agent_id);
                        return (
                          <div key={activity.id} className="flex items-center justify-between p-3 bg-[var(--z-surface)] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold`} style={{ backgroundColor: `${agentVisual.color}20`, color: agentVisual.color }}>
                                {agentVisual.icon}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-[var(--z-text-primary)]">{activity.title}</div>
                                <div className="text-xs text-[var(--z-text-muted)]">
                                  {activity.agent_id.toUpperCase()} • {activity.type} • {formatDate(activity.created_at)}
                                </div>
                              </div>
                            </div>
                            <ZBadge variant={getStatusVariant(activity.status)} size="sm">{activity.status}</ZBadge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ZCard>
              </section>

              <section>
                <ZSectionHeader title="Knowledge & Domains" className="mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ZCard className="p-4">
                    <ZSectionHeader title="Knowledge Stats" className="mb-3" />
                    {knowledgeStats ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-[var(--z-surface)] rounded-lg text-center">
                          <div className="text-2xl font-bold text-[var(--z-violet)]">{knowledgeStats.total_documents}</div>
                          <div className="text-xs text-[var(--z-text-muted)]">Total Documents</div>
                        </div>
                        {Object.keys(knowledgeStats.by_domain || {}).length > 0 && (
                          <div>
                            <div className="text-xs text-[var(--z-text-muted)] mb-2">By Domain</div>
                            <div className="space-y-2">
                              {Object.entries(knowledgeStats.by_domain).map(([domain, count]) => (
                                <div key={domain} className="flex items-center justify-between">
                                  <span className="text-sm text-[var(--z-text-secondary)]">{domain}</span>
                                  <ZBadge variant="info" size="sm">{count}</ZBadge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ZEmptyState title="No knowledge stats" description="ODIN knowledge base empty" size="sm" />
                    )}
                  </ZCard>

                  <ZCard className="p-4">
                    <ZSectionHeader title="Allowed Domains" className="mb-3" />
                    {allowedDomains.length === 0 ? (
                      <ZEmptyState title="No domains" description="No web domains configured" size="sm" />
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allowedDomains.slice(0, 10).map((domain) => (
                          <div key={domain.id} className="flex items-center justify-between p-2 bg-[var(--z-surface)] rounded">
                            <span className="text-sm text-[var(--z-text-primary)] font-mono">{domain.domain}</span>
                            <ZBadge variant={domain.is_enabled ? 'success' : 'muted'} size="sm">
                              {domain.is_enabled ? 'Enabled' : 'Disabled'}
                            </ZBadge>
                          </div>
                        ))}
                        {allowedDomains.length > 10 && (
                          <div className="text-xs text-[var(--z-text-muted)] text-center pt-2">
                            +{allowedDomains.length - 10} more domains
                          </div>
                        )}
                      </div>
                    )}
                  </ZCard>
                </div>
              </section>

              <section>
                <ZSectionHeader title="Quick Actions" className="mb-4" />
                <div className="flex flex-wrap gap-3">
                  <ZButton variant="secondary" href="/admin/agents/tasks">Agent Tasks</ZButton>
                  <ZButton variant="secondary" href="/admin/agents/console">Agent Console</ZButton>
                  <ZButton variant="secondary" href="/admin/odin">ODIN Knowledge</ZButton>
                  <ZButton variant="secondary" href="/dashboard">Back to Desk</ZButton>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
