'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import {
  ZCard,
  ZButton,
  ZMetricTile,
  ZPageHeader,
  ZSectionHeader,
  ZBadge,
  ZStatusBadge,
  ZInput,
  ZSelect,
  ZTextarea,
  ZEmptyState,
  ZLoadingState,
  ZErrorState,
  ZTabs,
  ZProgress,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';
import {
  getFoundationProjects,
  createFoundationProject,
  createFoundationContribution,
} from '@/lib/api';
import type {
  FoundationProject,
  CreateFoundationProjectInput,
  CreateFoundationContributionInput,
  FoundationProjectStatus,
  AgentPanelSuggestion,
} from '@/lib/types';

type TabType = 'overview' | 'projects' | 'contributions' | 'impact';

const CATEGORY_OPTIONS = [
  { value: 'reforestation', label: 'Reforestation' },
  { value: 'renewable_energy', label: 'Renewable Energy' },
  { value: 'ocean_conservation', label: 'Ocean Conservation' },
  { value: 'sustainable_agriculture', label: 'Sustainable Agriculture' },
  { value: 'carbon_capture', label: 'Carbon Capture' },
  { value: 'education', label: 'Education' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
];

function ProjectCard({
  project,
  isSelected,
  onSelect,
  onNavigate,
}: {
  project: FoundationProject;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}) {
  const categoryVariants: Record<string, 'success' | 'info' | 'warning' | 'odin' | 'muted'> = {
    reforestation: 'success',
    renewable_energy: 'info',
    ocean_conservation: 'info',
    sustainable_agriculture: 'success',
    carbon_capture: 'odin',
    education: 'warning',
    community: 'warning',
    other: 'muted',
  };

  return (
    <ZCard
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-all ${
        isSelected ? 'border-[var(--z-rose)]' : 'hover:border-[var(--z-rose)]/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--z-text-primary)]">{project.title}</h3>
        <ZStatusBadge status={project.status} size="sm" />
      </div>
      {project.description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2 line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <ZBadge variant={categoryVariants[project.category] || 'muted'} size="sm">
          {project.category.replace('_', ' ')}
        </ZBadge>
        {project.estimated_impact_kgco2 && (
          <span className="text-emerald-400">{project.estimated_impact_kgco2.toLocaleString()} kg CO2</span>
        )}
      </div>
      {project.location_country && (
        <div className="text-xs text-[var(--z-text-muted)] mt-2">
          {project.location_region ? `${project.location_region}, ` : ''}{project.location_country}
        </div>
      )}
      {project.sdg_tags && project.sdg_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.sdg_tags.slice(0, 3).map((tag) => (
            <ZBadge key={tag} variant="info" size="sm">{tag}</ZBadge>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-[var(--z-border)]">
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          className="text-xs text-[var(--z-rose)] hover:text-[var(--z-rose)]/80 transition-colors"
        >
          View Details &rarr;
        </button>
      </div>
    </ZCard>
  );
}

function ProjectDetailPanel({
  project,
  onContribute,
}: {
  project: FoundationProject;
  onContribute: () => void;
}) {
  return (
    <ZCard className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--z-text-primary)]">{project.title}</h2>
          <ZStatusBadge status={project.status} size="sm" />
        </div>
        {project.image_url && (
          <div className="w-16 h-16 rounded-lg bg-[var(--z-surface)] overflow-hidden">
            <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-[var(--z-text-secondary)] mb-4">{project.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-[var(--z-surface)] rounded-lg">
          <div className="text-xs text-[var(--z-text-muted)] mb-1">Category</div>
          <div className="text-sm font-medium text-[var(--z-text-primary)]">{project.category.replace('_', ' ')}</div>
        </div>
        {project.climate_focus_domain && (
          <div className="p-3 bg-[var(--z-surface)] rounded-lg">
            <div className="text-xs text-[var(--z-text-muted)] mb-1">Climate Focus</div>
            <div className="text-sm font-medium text-[var(--z-text-primary)]">{project.climate_focus_domain}</div>
          </div>
        )}
        {project.estimated_impact_kgco2 && (
          <div className="p-3 bg-[var(--z-surface)] rounded-lg">
            <div className="text-xs text-[var(--z-text-muted)] mb-1">Est. Impact</div>
            <div className="text-sm font-medium text-emerald-400">{project.estimated_impact_kgco2.toLocaleString()} kg CO2</div>
          </div>
        )}
        {project.verified_impact_kgco2 && (
          <div className="p-3 bg-[var(--z-surface)] rounded-lg">
            <div className="text-xs text-[var(--z-text-muted)] mb-1">Verified Impact</div>
            <div className="text-sm font-medium text-emerald-400">{project.verified_impact_kgco2.toLocaleString()} kg CO2</div>
          </div>
        )}
      </div>

      {project.contribution_count !== undefined && (
        <div className="p-3 bg-[var(--z-sky-soft)] border border-[var(--z-sky-border)] rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--z-text-secondary)]">
              {project.contribution_count} contribution{project.contribution_count !== 1 ? 's' : ''}
            </span>
            {project.total_contributions_cents !== undefined && (
              <span className="text-sm font-medium text-[var(--z-sky)]">
                {(project.total_contributions_cents / 100).toFixed(2)} {project.currency}
              </span>
            )}
          </div>
        </div>
      )}

      {project.external_url && (
        <a href={project.external_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--z-sky)] hover:text-[var(--z-sky)]/80 mb-4 block">
          Learn more about this project
        </a>
      )}

      <ZButton onClick={onContribute} variant="primary" className="w-full">Support This Project</ZButton>
    </ZCard>
  );
}

function CreateProjectForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateFoundationProjectInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('reforestation');
  const [description, setDescription] = useState('');
  const [climateFocus, setClimateFocus] = useState('');
  const [country, setCountry] = useState('');
  const [estimatedImpact, setEstimatedImpact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        climate_focus_domain: climateFocus.trim() || undefined,
        location_country: country.trim() || undefined,
        estimated_impact_kgco2: estimatedImpact ? Number(estimatedImpact) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZCard className="p-4">
      <h3 className="text-lg font-semibold text-[var(--z-text-primary)] mb-4">Create Impact Project</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ZInput label="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mangrove Restoration Project" required />
        <ZSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} />
        <ZTextarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the project..." rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <ZInput label="Climate Focus" value={climateFocus} onChange={(e) => setClimateFocus(e.target.value)} placeholder="Carbon sequestration" />
          <ZInput label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Indonesia" />
        </div>
        <ZInput label="Estimated Impact (kg CO2)" type="number" value={estimatedImpact} onChange={(e) => setEstimatedImpact(e.target.value)} placeholder="10000" />
        <div className="flex gap-2 justify-end pt-2">
          <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>
          <ZButton variant="primary" type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </ZButton>
        </div>
      </form>
    </ZCard>
  );
}

function ContributeModal({
  project,
  onSubmit,
  onClose,
}: {
  project: FoundationProject;
  onSubmit: (projectId: string, input: CreateFoundationContributionInput) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [sourceType, setSourceType] = useState('direct');
  const [contributorLabel, setContributorLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(project.id, {
        amount_cents: Math.round(Number(amount) * 100),
        source_type: sourceType,
        contributor_label: contributorLabel.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetAmounts = [10, 25, 50, 100, 250];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <ZCard className="max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--z-text-primary)]">Support This Project</h2>
            <p className="text-sm text-[var(--z-text-muted)]">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-[var(--z-text-muted)] hover:text-[var(--z-text-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">Thank You!</h3>
            <p className="text-sm text-[var(--z-text-muted)]">Your contribution has been recorded.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--z-text-secondary)] mb-2">Quick Amount</label>
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      amount === String(preset)
                        ? 'bg-[var(--z-rose)] text-white'
                        : 'bg-[var(--z-surface)] text-[var(--z-text-secondary)] hover:bg-[var(--z-surface-elevated)]'
                    }`}
                  >
                    {preset} DKK
                  </button>
                ))}
              </div>
            </div>
            <ZInput label="Amount (DKK)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" required />
            <ZInput label="Your Name (optional)" value={contributorLabel} onChange={(e) => setContributorLabel(e.target.value)} placeholder="Anonymous" />
            <ZTextarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any message..." rows={2} />
            {error && <p className="text-sm text-[var(--z-rose)]">{error}</p>}
            <div className="flex gap-2 pt-2">
              <ZButton variant="ghost" onClick={onClose} className="flex-1">Cancel</ZButton>
              <ZButton variant="primary" type="submit" disabled={isSubmitting || !amount} className="flex-1">
                {isSubmitting ? 'Processing...' : 'Contribute'}
              </ZButton>
            </div>
          </form>
        )}
      </ZCard>
    </div>
  );
}

export default function FoundationPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [projects, setProjects] = useState<FoundationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<FoundationProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const projectsRes = await getFoundationProjects();
      setProjects(projectsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load foundation data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleCreateProject = async (input: CreateFoundationProjectInput) => {
    try {
      const newProject = await createFoundationProject(input);
      setProjects((prev) => [...prev, newProject]);
      setShowCreateProject(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const handleContribute = async (projectId: string, input: CreateFoundationContributionInput) => {
    await createFoundationContribution(projectId, input);
    await loadData();
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'foundation_project') {
      setShowCreateProject(true);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredProjects = projects.filter((p) => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const totalEstimatedImpact = projects.reduce((sum, p) => sum + (p.estimated_impact_kgco2 || 0), 0);
  const totalVerifiedImpact = projects.reduce((sum, p) => sum + (p.verified_impact_kgco2 || 0), 0);
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: `Projects (${projects.length})` },
    { id: 'contributions', label: 'Contributions' },
    { id: 'impact', label: 'Impact' },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-8">
        <div className="max-w-7xl mx-auto">
          {/* ===== HERO SECTION ===== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)] border border-[var(--z-border-default)] mb-8">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--z-rose)] blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--z-violet)] blur-3xl" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--z-rose)] via-[var(--z-violet)] to-[var(--z-emerald)]" />
            
            <div className="relative p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--z-rose)]/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--z-rose)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <ZBadge variant="tyr" size="md">Impact OS</ZBadge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--z-text-primary)] tracking-tight mb-2">
                    {t('foundation.title', 'THE ZORA FOUNDATION')}
                  </h1>
                  <p className="text-lg text-[var(--z-text-tertiary)] max-w-2xl">
                    {t('foundation.subtitle', 'Support climate projects and track your real-world impact on the planet.')}
                  </p>
                </div>
                
                {/* Impact Summary */}
                <div className="flex flex-col items-start lg:items-end gap-3">
                  <div className="px-5 py-4 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)]">
                    <p className="text-[10px] text-[var(--z-text-muted)] uppercase tracking-[0.15em] mb-2">Total Impact</p>
                    <div className="text-2xl font-bold text-[var(--z-emerald)]">
                      {totalVerifiedImpact > 0 ? `${(totalVerifiedImpact / 1000).toFixed(1)}t` : '--'} CO2
                    </div>
                    <p className="text-xs text-[var(--z-text-muted)]">verified reduction</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--z-emerald)] animate-pulse" />
                  <span className="text-sm text-[var(--z-text-secondary)]">{activeProjects} active projects</span>
                </div>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">{projects.length} total initiatives</span>
              </div>
            </div>
          </div>

          <ZTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mb-6" />

          {isLoading ? (
            <ZLoadingState message="Loading foundation data..." />
          ) : error ? (
            <ZErrorState message={error} onRetry={loadData} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {activeTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ZMetricTile label="Total Projects" value={projects.length} sublabel="initiatives" onClick={() => handleTabChange('projects')} />
                      <ZMetricTile label="Active" value={activeProjects} sublabel="in progress" variant="emerald" onClick={() => handleTabChange('projects')} />
                      <ZMetricTile label="Completed" value={completedProjects} sublabel="finished" variant="violet" onClick={() => handleTabChange('projects')} />
                      <ZMetricTile label="Est. Impact" value={totalEstimatedImpact > 0 ? `${(totalEstimatedImpact / 1000).toFixed(1)}t` : '--'} sublabel="CO2 reduction" variant="emerald" onClick={() => handleTabChange('impact')} />
                    </div>

                    <ZCard className="p-4">
                      <ZSectionHeader title="Featured Projects" className="mb-4" />
                      {projects.length === 0 ? (
                        <ZEmptyState title="No projects yet" description="Create your first impact project." action={{ label: 'Create Project', onClick: () => setShowCreateProject(true) }} size="sm" />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.filter((p) => p.status === 'active').slice(0, 4).map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              isSelected={selectedProject?.id === project.id}
                              onSelect={() => setSelectedProject(project)}
                              onNavigate={() => router.push(`/foundation/projects/${project.id}`)}
                            />
                          ))}
                        </div>
                      )}
                    </ZCard>

                    {totalVerifiedImpact > 0 && (
                      <ZCard className="p-4">
                        <ZSectionHeader title="Verified Impact" className="mb-4" />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[var(--z-text-muted)]">Total Verified CO2 Reduction</span>
                          <span className="text-lg font-bold text-emerald-400">{(totalVerifiedImpact / 1000).toFixed(2)} tonnes</span>
                        </div>
                        <ZProgress value={totalVerifiedImpact} max={totalEstimatedImpact} variant="success" />
                        <p className="text-xs text-[var(--z-text-muted)] mt-2">
                          {((totalVerifiedImpact / totalEstimatedImpact) * 100).toFixed(1)}% of estimated impact verified
                        </p>
                      </ZCard>
                    )}
                  </>
                )}

                {activeTab === 'projects' && (
                  <ZCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <ZSectionHeader title="All Projects" />
                      <ZButton variant="primary" size="sm" onClick={() => setShowCreateProject(true)}>+ New Project</ZButton>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <ZSelect
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        options={[{ value: 'all', label: 'All Categories' }, ...CATEGORY_OPTIONS]}
                        className="w-40"
                      />
                      <ZSelect
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Status' },
                          { value: 'planned', label: 'Planned' },
                          { value: 'active', label: 'Active' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'paused', label: 'Paused' },
                        ]}
                        className="w-40"
                      />
                    </div>

                    {showCreateProject && (
                      <div className="mb-4">
                        <CreateProjectForm onSubmit={handleCreateProject} onCancel={() => setShowCreateProject(false)} />
                      </div>
                    )}

                    {filteredProjects.length === 0 ? (
                      <ZEmptyState title="No projects found" description="Try adjusting your filters or create a new project." action={{ label: 'Create Project', onClick: () => setShowCreateProject(true) }} />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            isSelected={selectedProject?.id === project.id}
                            onSelect={() => setSelectedProject(project)}
                            onNavigate={() => router.push(`/foundation/projects/${project.id}`)}
                          />
                        ))}
                      </div>
                    )}
                  </ZCard>
                )}

                {activeTab === 'contributions' && (
                  <ZCard className="p-4">
                    <ZSectionHeader title="Your Contributions" className="mb-4" />
                    <ZEmptyState title="No contributions yet" description="Support a project to see your contributions here." action={{ label: 'Browse Projects', onClick: () => handleTabChange('projects') }} />
                  </ZCard>
                )}

                {activeTab === 'impact' && (
                  <ZCard className="p-4">
                    <ZSectionHeader title="Impact Dashboard" className="mb-4" />
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-[var(--z-surface)] rounded-lg">
                        <div className="text-xs text-[var(--z-text-muted)] mb-1">Estimated Impact</div>
                        <div className="text-2xl font-bold text-[var(--z-text-primary)]">{(totalEstimatedImpact / 1000).toFixed(2)}</div>
                        <div className="text-xs text-[var(--z-text-muted)]">tonnes CO2</div>
                      </div>
                      <div className="p-4 bg-[var(--z-emerald-soft)] rounded-lg">
                        <div className="text-xs text-[var(--z-text-muted)] mb-1">Verified Impact</div>
                        <div className="text-2xl font-bold text-emerald-400">{(totalVerifiedImpact / 1000).toFixed(2)}</div>
                        <div className="text-xs text-[var(--z-text-muted)]">tonnes CO2</div>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--z-text-muted)]">
                      Impact tracking shows the estimated and verified CO2 reduction from all foundation projects.
                      Verified impact is confirmed through third-party audits and certifications.
                    </p>
                  </ZCard>
                )}
              </div>

              <div className="space-y-6">
                <AgentPanel
                  context="foundation"
                  profileId={selectedProject?.id}
                  title="Ask BALDUR"
                  description="Nordic agent for impact and sustainability"
                  onSuggestionSelect={handleSuggestionSelect}
                />

                {selectedProject && (
                  <ProjectDetailPanel project={selectedProject} onContribute={() => setShowContributeModal(true)} />
                )}

                <ZCard className="p-4">
                  <ZSectionHeader title="Quick Actions" className="mb-3" />
                  <div className="space-y-2">
                    <ZButton variant="secondary" className="w-full justify-start" href="/climate">Climate OS</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/goes-green">GOES GREEN</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/zora-shop">SHOP OS</ZButton>
                  </div>
                </ZCard>
              </div>
            </div>
          )}
        </div>
      </div>

      {showContributeModal && selectedProject && (
        <ContributeModal project={selectedProject} onSubmit={handleContribute} onClose={() => setShowContributeModal(false)} />
      )}
    </AppShell>
  );
}
