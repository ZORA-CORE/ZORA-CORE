'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
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

const STATUS_COLORS: Record<FoundationProjectStatus, string> = {
  planned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_LABELS: Record<FoundationProjectStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

function ProjectCard({
  project,
  isSelected,
  onSelect,
}: {
  project: FoundationProject;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-500/10 border-blue-500/50'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-blue-500/30'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{project.title}</h3>
        <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>
      {project.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2 line-clamp-2">
          {project.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--foreground)]/40">{project.category}</span>
        {project.estimated_impact_kgco2 && (
          <span className="text-emerald-400">
            {project.estimated_impact_kgco2.toLocaleString()} kg CO2
          </span>
        )}
      </div>
      {project.location_country && (
        <div className="text-xs text-[var(--foreground)]/50 mt-2">
          {project.location_region ? `${project.location_region}, ` : ''}
          {project.location_country}
        </div>
      )}
      {project.sdg_tags && project.sdg_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {project.sdg_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
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
    <Card variant="default" padding="md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{project.title}</h2>
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[project.status]}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        {project.image_url && (
          <div className="w-16 h-16 rounded-lg bg-[var(--background)] overflow-hidden">
            <img
              src={project.image_url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-[var(--foreground)]/70 mb-4">{project.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-[var(--background)] rounded-lg">
          <div className="text-xs text-[var(--foreground)]/50 mb-1">Category</div>
          <div className="text-sm font-medium text-[var(--foreground)]">{project.category}</div>
        </div>
        {project.climate_focus_domain && (
          <div className="p-3 bg-[var(--background)] rounded-lg">
            <div className="text-xs text-[var(--foreground)]/50 mb-1">Climate Focus</div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              {project.climate_focus_domain}
            </div>
          </div>
        )}
        {project.estimated_impact_kgco2 && (
          <div className="p-3 bg-[var(--background)] rounded-lg">
            <div className="text-xs text-[var(--foreground)]/50 mb-1">Est. Impact</div>
            <div className="text-sm font-medium text-emerald-400">
              {project.estimated_impact_kgco2.toLocaleString()} kg CO2
            </div>
          </div>
        )}
        {project.verified_impact_kgco2 && (
          <div className="p-3 bg-[var(--background)] rounded-lg">
            <div className="text-xs text-[var(--foreground)]/50 mb-1">Verified Impact</div>
            <div className="text-sm font-medium text-emerald-400">
              {project.verified_impact_kgco2.toLocaleString()} kg CO2
            </div>
          </div>
        )}
      </div>

      {project.contribution_count !== undefined && (
        <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--foreground)]/70">
              {project.contribution_count} contribution
              {project.contribution_count !== 1 ? 's' : ''}
            </span>
            {project.total_contributions_cents !== undefined && (
              <span className="text-sm font-medium text-blue-400">
                {(project.total_contributions_cents / 100).toFixed(2)} {project.currency}
              </span>
            )}
          </div>
        </div>
      )}

      {project.external_url && (
        <a
          href={project.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 mb-4 block"
        >
          Learn more about this project
        </a>
      )}

      <Button onClick={onContribute} variant="primary" className="w-full">
        Support This Project
      </Button>
    </Card>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Project Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mangrove Restoration Project"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="reforestation">Reforestation</option>
          <option value="renewable_energy">Renewable Energy</option>
          <option value="ocean_conservation">Ocean Conservation</option>
          <option value="sustainable_agriculture">Sustainable Agriculture</option>
          <option value="carbon_capture">Carbon Capture</option>
          <option value="education">Education</option>
          <option value="community">Community</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the project..."
          rows={3}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--foreground)]/70 mb-1">Climate Focus</label>
          <input
            type="text"
            value={climateFocus}
            onChange={(e) => setClimateFocus(e.target.value)}
            placeholder="Carbon sequestration"
            className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--foreground)]/70 mb-1">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Indonesia"
            className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">
          Estimated Impact (kg CO2)
        </label>
        <input
          type="number"
          value={estimatedImpact}
          onChange={(e) => setEstimatedImpact(e.target.value)}
          placeholder="10000"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]/50 rounded text-[var(--foreground)] text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ContributeForm({
  projectId,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  onSubmit: (projectId: string, input: CreateFoundationContributionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [sourceType, setSourceType] = useState('direct');
  const [contributorLabel, setContributorLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setIsSubmitting(true);
    try {
      await onSubmit(projectId, {
        amount_cents: Math.round(Number(amount) * 100),
        source_type: sourceType,
        contributor_label: contributorLabel.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Amount (EUR) *</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50.00"
          step="0.01"
          min="1"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Source Type</label>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="direct">Direct Contribution</option>
          <option value="shop_commission">Shop Commission</option>
          <option value="subscription">Subscription</option>
          <option value="grant">Grant</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">
          Contributor Label (optional)
        </label>
        <input
          type="text"
          value={contributorLabel}
          onChange={(e) => setContributorLabel(e.target.value)}
          placeholder="Your name or organization"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50"
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-blue-500/50 resize-none"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !amount}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          {isSubmitting ? 'Contributing...' : 'Contribute'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]/50 rounded text-[var(--foreground)] text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function FoundationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<FoundationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<FoundationProject | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showContribute, setShowContribute] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true);
      setError(null);
      const response = await getFoundationProjects();
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated, loadProjects]);

  const handleCreateProject = async (input: CreateFoundationProjectInput) => {
    try {
      const newProject = await createFoundationProject(input);
      setProjects((prev) => [...prev, newProject]);
      setSelectedProject(newProject);
      setShowCreateProject(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const handleContribute = async (
    projectId: string,
    input: CreateFoundationContributionInput
  ) => {
    try {
      await createFoundationContribution(projectId, input);
      setShowContribute(false);
      loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contribution');
    }
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'foundation_project') {
      setShowCreateProject(true);
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const activeProjects = projects.filter((p) => p.status === 'active');
  const totalEstimatedImpact = projects.reduce(
    (sum, p) => sum + (p.estimated_impact_kgco2 || 0),
    0
  );
  const totalVerifiedImpact = projects.reduce(
    (sum, p) => sum + (p.verified_impact_kgco2 || 0),
    0
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
              THE ZORA FOUNDATION
            </h1>
            <p className="text-[var(--foreground)]/60">
              Support climate projects and track your impact
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-300 hover:text-red-200"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{projects.length}</div>
              <div className="text-xs text-[var(--foreground)]/50">Total Projects</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{activeProjects.length}</div>
              <div className="text-xs text-[var(--foreground)]/50">Active</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {(totalEstimatedImpact / 1000).toFixed(1)}t
              </div>
              <div className="text-xs text-[var(--foreground)]/50">Est. CO2 Impact</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {(totalVerifiedImpact / 1000).toFixed(1)}t
              </div>
              <div className="text-xs text-[var(--foreground)]/50">Verified Impact</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    Climate Projects
                  </h2>
                  <Button
                    onClick={() => setShowCreateProject(!showCreateProject)}
                    variant="outline"
                    size="sm"
                  >
                    {showCreateProject ? 'Cancel' : '+ New Project'}
                  </Button>
                </div>

                {showCreateProject && (
                  <div className="mb-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--card-border)]">
                    <CreateProjectForm
                      onSubmit={handleCreateProject}
                      onCancel={() => setShowCreateProject(false)}
                    />
                  </div>
                )}

                {isLoadingProjects ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-[var(--foreground)]/50">
                    <p>No foundation projects yet.</p>
                    <p className="text-sm mt-1">
                      Create a project or ask TYR for recommendations.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isSelected={selectedProject?.id === project.id}
                        onSelect={() => setSelectedProject(project)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {selectedProject && showContribute && (
                <Card variant="default" padding="md">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    Contribute to {selectedProject.title}
                  </h2>
                  <ContributeForm
                    projectId={selectedProject.id}
                    onSubmit={handleContribute}
                    onCancel={() => setShowContribute(false)}
                  />
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {selectedProject && !showContribute && (
                <ProjectDetailPanel
                  project={selectedProject}
                  onContribute={() => setShowContribute(true)}
                />
              )}

              <AgentPanel
                context="foundation"
                title="Ask TYR"
                description="Nordic agent for foundation project matching"
                onSuggestionSelect={handleSuggestionSelect}
              />

              <Button href="/dashboard" variant="outline" className="w-full">
                Back to Desk
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
