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
      router.push('/login');
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
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <ZPageHeader
              title={t('devConsole.title', 'Brain & Agents Console')}
              subtitle={t('devConsole.subtitle', 'System stats, agent activity, and knowledge overview')}
            />
            <ZButton variant="secondary" onClick={fetchAllData} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </ZButton>
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
