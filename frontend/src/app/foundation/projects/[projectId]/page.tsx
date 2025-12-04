'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import {
  getFoundationProject,
  getFoundationContributions,
  createFoundationContribution,
} from '@/lib/api';
import type {
  FoundationProject,
  FoundationContribution,
  CreateFoundationContributionInput,
  FoundationProjectStatus,
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

const CATEGORY_LABELS: Record<string, string> = {
  reforestation: 'Reforestation',
  renewable_energy: 'Renewable Energy',
  ocean_conservation: 'Ocean Conservation',
  sustainable_agriculture: 'Sustainable Agriculture',
  carbon_capture: 'Carbon Capture',
  education: 'Education',
  community: 'Community',
  other: 'Other',
};

function ContributeModal({
  project,
  onSubmit,
  onClose,
}: {
  project: FoundationProject;
  onSubmit: (input: CreateFoundationContributionInput) => Promise<void>;
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
      await onSubmit({
        amount_cents: Math.round(Number(amount) * 100),
        source_type: sourceType,
        contributor_label: contributorLabel.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetAmounts = [10, 25, 50, 100, 250];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Support This Project
            </h2>
            <p className="text-sm text-[var(--foreground)]/60">{project.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--foreground)]/40 hover:text-[var(--foreground)] transition-colors"
          >
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
            <p className="text-lg font-medium text-[var(--foreground)]">Thank you!</p>
            <p className="text-sm text-[var(--foreground)]/60">Your contribution has been recorded.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--foreground)]/70 mb-2">
                Select Amount (EUR)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className={`px-4 py-2 rounded border text-sm transition-colors ${
                      amount === preset.toString()
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'bg-[var(--background)] border-[var(--card-border)] text-[var(--foreground)] hover:border-rose-500/30'
                    }`}
                  >
                    €{preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Or enter custom amount"
                step="0.01"
                min="1"
                className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--foreground)]/70 mb-1">
                Contribution Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50"
              >
                <option value="direct">Direct Contribution</option>
                <option value="subscription">Subscription</option>
                <option value="grant">Grant</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--foreground)]/70 mb-1">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={contributorLabel}
                onChange={(e) => setContributorLabel(e.target.value)}
                placeholder="Your name or organization"
                className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--foreground)]/70 mb-1">
                Message (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a message..."
                rows={2}
                className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !amount}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
              >
                {isSubmitting ? 'Processing...' : `Contribute €${amount || '0'}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]/50 rounded text-[var(--foreground)] text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ContributionRow({ contribution }: { contribution: FoundationContribution }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {contribution.contributor_label || 'Anonymous'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
            {contribution.source_type}
          </span>
        </div>
        {contribution.notes && (
          <p className="text-xs text-[var(--foreground)]/50 mt-1">{contribution.notes}</p>
        )}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-emerald-400">
          €{(contribution.amount_cents / 100).toFixed(2)}
        </div>
        <div className="text-xs text-[var(--foreground)]/40">
          {new Date(contribution.contributed_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<FoundationProject | null>(null);
  const [contributions, setContributions] = useState<FoundationContribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [projectRes, contributionsRes] = await Promise.all([
        getFoundationProject(projectId),
        getFoundationContributions(projectId).catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);

      setProject(projectRes.data);
      setContributions(contributionsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isAuthenticated && projectId) {
      loadData();
    }
  }, [isAuthenticated, projectId, loadData]);

  const handleContribute = async (input: CreateFoundationContributionInput) => {
    if (!project) return;
    await createFoundationContribution(project.id, input);
    loadData();
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <Card variant="default" padding="lg">
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  {error || 'Project Not Found'}
                </h2>
                <p className="text-sm text-[var(--foreground)]/60 mb-4">
                  The project you are looking for could not be loaded.
                </p>
                <Button href="/foundation" variant="outline">
                  Back to Foundation
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalContributions = contributions.reduce((sum, c) => sum + c.amount_cents, 0);

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/foundation"
              className="text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Foundation
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                      {project.title}
                    </h1>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[project.status]}`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                      <span className="text-sm text-[var(--foreground)]/60">
                        {CATEGORY_LABELS[project.category] || project.category}
                      </span>
                    </div>
                  </div>
                  {project.image_url && (
                    <div className="w-24 h-24 rounded-lg bg-[var(--background)] overflow-hidden">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {project.description && (
                  <p className="text-[var(--foreground)]/70 mb-6">{project.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {project.location_country && (
                    <div className="p-3 bg-[var(--background)] rounded-lg">
                      <div className="text-xs text-[var(--foreground)]/50 mb-1">Location</div>
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {project.location_region ? `${project.location_region}, ` : ''}
                        {project.location_country}
                      </div>
                    </div>
                  )}
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
                      <div className="text-sm font-medium text-blue-400">
                        {(project.estimated_impact_kgco2 / 1000).toFixed(1)}t CO2
                      </div>
                    </div>
                  )}
                  {project.verified_impact_kgco2 && (
                    <div className="p-3 bg-[var(--background)] rounded-lg">
                      <div className="text-xs text-[var(--foreground)]/50 mb-1">Verified Impact</div>
                      <div className="text-sm font-medium text-emerald-400">
                        {(project.verified_impact_kgco2 / 1000).toFixed(1)}t CO2
                      </div>
                    </div>
                  )}
                </div>

                {project.sdg_tags && project.sdg_tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                      SDG Alignment
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.sdg_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {project.impact_methodology && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                      Impact Methodology
                    </h3>
                    <p className="text-sm text-[var(--foreground)]/70">{project.impact_methodology}</p>
                  </div>
                )}

                {project.external_url && (
                  <a
                    href={project.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Learn more about this project
                  </a>
                )}
              </Card>

              <Card variant="default" padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    Contributions ({contributions.length})
                  </h2>
                  <span className="text-sm font-medium text-emerald-400">
                    Total: €{(totalContributions / 100).toFixed(2)}
                  </span>
                </div>

                {contributions.length === 0 ? (
                  <div className="text-center py-8 text-[var(--foreground)]/50">
                    <p>No contributions yet.</p>
                    <p className="text-sm mt-1">Be the first to support this project!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {contributions.map((contribution) => (
                      <ContributionRow key={contribution.id} contribution={contribution} />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card variant="bordered" padding="md" className="bg-rose-500/5 border-rose-500/20">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                  Support This Project
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--background)] rounded-lg">
                    <div className="text-xs text-[var(--foreground)]/50 mb-1">Total Raised</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      €{(totalContributions / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-[var(--foreground)]/50 mt-1">
                      from {contributions.length} contribution{contributions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowContributeModal(true)}
                    variant="primary"
                    className="w-full"
                  >
                    Contribute Now
                  </Button>
                </div>
              </Card>

              <AgentPanel
                context="foundation"
                title="Ask TYR"
                description="Learn more about this project's impact"
              />

              <Card variant="bordered" padding="md">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                  Related Links
                </h3>
                <div className="space-y-2">
                  <Link
                    href="/foundation"
                    className="flex items-center justify-between p-2 rounded bg-[var(--background)] hover:bg-rose-500/5 transition-colors"
                  >
                    <span className="text-sm text-[var(--foreground)]/70">All Projects</span>
                    <svg className="w-4 h-4 text-[var(--foreground)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/climate"
                    className="flex items-center justify-between p-2 rounded bg-[var(--background)] hover:bg-emerald-500/5 transition-colors"
                  >
                    <span className="text-sm text-[var(--foreground)]/70">Climate OS</span>
                    <svg className="w-4 h-4 text-[var(--foreground)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/zora-shop"
                    className="flex items-center justify-between p-2 rounded bg-[var(--background)] hover:bg-amber-500/5 transition-colors"
                  >
                    <span className="text-sm text-[var(--foreground)]/70">ZORA SHOP</span>
                    <svg className="w-4 h-4 text-[var(--foreground)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {showContributeModal && (
        <ContributeModal
          project={project}
          onSubmit={handleContribute}
          onClose={() => setShowContributeModal(false)}
        />
      )}
    </AppShell>
  );
}
