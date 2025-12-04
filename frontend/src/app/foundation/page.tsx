'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  getFoundationContributions,
  getGoesGreenProfiles,
  getBrands,
} from '@/lib/api';
import type {
  FoundationProject,
  CreateFoundationProjectInput,
  CreateFoundationContributionInput,
  FoundationProjectStatus,
  FoundationContribution,
  AgentPanelSuggestion,
} from '@/lib/types';

type SectionType = 'overview' | 'projects' | 'contributions' | 'impact';

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

function KPICard({
  value,
  label,
  color = 'text-[var(--foreground)]',
  onClick,
  subtext,
}: {
  value: number | string;
  label: string;
  color?: string;
  onClick?: () => void;
  subtext?: string;
}) {
  return (
    <Card
      variant="bordered"
      padding="md"
      className={`text-center ${onClick ? 'cursor-pointer hover:border-rose-500/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--foreground)]/50">{label}</div>
      {subtext && <div className="text-xs text-[var(--foreground)]/40 mt-1">{subtext}</div>}
    </Card>
  );
}

function SectionNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: SectionType;
  onSectionChange: (section: SectionType) => void;
}) {
  const sections: { id: SectionType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'Projects' },
    { id: 'contributions', label: 'Contributions' },
    { id: 'impact', label: 'Impact' },
  ];

  return (
    <div className="flex gap-2 mb-6 border-b border-[var(--card-border)] pb-4">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === section.id
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] border border-transparent'
          }`}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}

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
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-rose-500/10 border-rose-500/50'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-rose-500/30'
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
        <span className="text-[var(--foreground)]/40">
          {CATEGORY_LABELS[project.category] || project.category}
        </span>
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
      <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
        >
          View Details →
        </button>
      </div>
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

function CrossModuleConnectionsPanel({
  climateMissionsLinked,
  goesGreenLinked,
  shopBrandsLinked,
}: {
  climateMissionsLinked: number;
  goesGreenLinked: number;
  shopBrandsLinked: number;
}) {
  return (
    <Card variant="bordered" padding="md">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
        Connected to ZORA Ecosystem
      </h3>
      <div className="space-y-2">
        <Link
          href="/climate"
          className="flex items-center justify-between p-2 rounded bg-[var(--background)] hover:bg-emerald-500/5 transition-colors"
        >
          <span className="text-sm text-[var(--foreground)]/70">Climate Missions</span>
          <span className="text-sm font-medium text-emerald-400">{climateMissionsLinked}</span>
        </Link>
        <Link
          href="/goes-green"
          className="flex items-center justify-between p-2 rounded bg-[var(--background)] hover:bg-green-500/5 transition-colors"
        >
          <span className="text-sm text-[var(--foreground)]/70">GOES GREEN Journeys</span>
          <span className="text-sm font-medium text-green-400">{goesGreenLinked}</span>
        </Link>
        <Link
          href="/zora-shop"
          className="flex items-center justify-between p-2 rounded bg-[var(--background)] hover:bg-amber-500/5 transition-colors"
        >
          <span className="text-sm text-[var(--foreground)]/70">SHOP Brands</span>
          <span className="text-sm font-medium text-amber-400">{shopBrandsLinked}</span>
        </Link>
      </div>
    </Card>
  );
}

function ProjectFilters({
  statusFilter,
  categoryFilter,
  regionFilter,
  onStatusChange,
  onCategoryChange,
  onRegionChange,
  projects,
}: {
  statusFilter: string;
  categoryFilter: string;
  regionFilter: string;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onRegionChange: (region: string) => void;
  projects: FoundationProject[];
}) {
  const regions = [...new Set(projects.map((p) => p.location_country).filter(Boolean))];
  const categories = [...new Set(projects.map((p) => p.category))];

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50"
      >
        <option value="">All Statuses</option>
        <option value="planned">Planned</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="paused">Paused</option>
      </select>
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_LABELS[cat] || cat}
          </option>
        ))}
      </select>
      <select
        value={regionFilter}
        onChange={(e) => onRegionChange(e.target.value)}
        className="px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-rose-500/50"
      >
        <option value="">All Regions</option>
        {regions.map((region) => (
          <option key={region} value={region || ''}>
            {region}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FoundationPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<FoundationProject[]>([]);
  const [contributions, setContributions] = useState<FoundationContribution[]>([]);
  const [selectedProject, setSelectedProject] = useState<FoundationProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [contributeProject, setContributeProject] = useState<FoundationProject | null>(null);

  const [climateMissionsLinked, setClimateMissionsLinked] = useState(0);
  const [goesGreenLinked, setGoesGreenLinked] = useState(0);
  const [shopBrandsLinked, setShopBrandsLinked] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

            const [projectsRes, goesGreenRes, brandsRes] = await Promise.all([
              getFoundationProjects(),
              getGoesGreenProfiles().catch(() => ({ data: [] })),
              getBrands().catch(() => ({ data: [] })),
            ]);

            setProjects(projectsRes.data);

            const allContributions: FoundationContribution[] = [];
            for (const project of projectsRes.data.slice(0, 10)) {
              try {
                const contribRes = await getFoundationContributions(project.id);
                allContributions.push(...contribRes.data);
              } catch {
              }
            }
            setContributions(allContributions);

            setClimateMissionsLinked(projectsRes.data.filter(p => p.climate_focus_domain).length);
            setGoesGreenLinked(goesGreenRes.data?.length || 0);
            setShopBrandsLinked(brandsRes.data?.length || 0);

      if (projectsRes.data.length > 0 && !selectedProject) {
        setSelectedProject(projectsRes.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleCreateProject = async (input: CreateFoundationProjectInput) => {
    try {
      const newProject = await createFoundationProject(input);
      setProjects((prev) => [newProject, ...prev]);
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
    await createFoundationContribution(projectId, input);
    loadData();
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'foundation_project') {
      setShowCreateProject(true);
      setActiveSection('projects');
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredProjects = projects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (regionFilter && p.location_country !== regionFilter) return false;
    return true;
  });

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount_cents, 0);
  const totalEstimatedImpact = projects.reduce(
    (sum, p) => sum + (p.estimated_impact_kgco2 || 0),
    0
  );
  const totalVerifiedImpact = projects.reduce(
    (sum, p) => sum + (p.verified_impact_kgco2 || 0),
    0
  );
  const uniqueTenants = new Set(contributions.map((c) => c.tenant_id)).size;

  const contributionsByProject = contributions.reduce((acc, c) => {
    if (!acc[c.project_id]) {
      acc[c.project_id] = { total: 0, count: 0 };
    }
    acc[c.project_id].total += c.amount_cents;
    acc[c.project_id].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const impactByCategory = projects.reduce((acc, p) => {
    if (!acc[p.category]) {
      acc[p.category] = { estimated: 0, verified: 0, count: 0 };
    }
    acc[p.category].estimated += p.estimated_impact_kgco2 || 0;
    acc[p.category].verified += p.verified_impact_kgco2 || 0;
    acc[p.category].count += 1;
    return acc;
  }, {} as Record<string, { estimated: number; verified: number; count: number }>);

  const isFounder = user?.role === 'founder';

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
              THE ZORA FOUNDATION
            </h1>
            <p className="text-[var(--foreground)]/60">
              Impact OS – Support climate projects and track your contribution to a sustainable future
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

          <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                {activeSection === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KPICard
                        value={activeProjects}
                        label="Active Projects"
                        color="text-emerald-400"
                        onClick={() => setActiveSection('projects')}
                      />
                      <KPICard
                        value={`€${(totalContributions / 100).toFixed(0)}`}
                        label="Total Contributions"
                        color="text-rose-400"
                        onClick={() => setActiveSection('contributions')}
                      />
                      <KPICard
                        value={`${(totalEstimatedImpact / 1000).toFixed(1)}t`}
                        label="Est. CO2 Impact"
                        color="text-blue-400"
                        onClick={() => setActiveSection('impact')}
                      />
                      <KPICard
                        value={uniqueTenants}
                        label="Contributing Tenants"
                        onClick={() => setActiveSection('contributions')}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KPICard
                        value={projects.length}
                        label="Total Projects"
                        onClick={() => setActiveSection('projects')}
                      />
                      <KPICard
                        value={completedProjects}
                        label="Completed"
                        color="text-purple-400"
                        onClick={() => setActiveSection('projects')}
                      />
                      <KPICard
                        value={`${(totalVerifiedImpact / 1000).toFixed(1)}t`}
                        label="Verified Impact"
                        color="text-emerald-400"
                        onClick={() => setActiveSection('impact')}
                      />
                      <KPICard
                        value={contributions.length}
                        label="Total Donations"
                        onClick={() => setActiveSection('contributions')}
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <Card variant="default" padding="md">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Recent Projects</h3>
                            <button
                              onClick={() => setActiveSection('projects')}
                              className="text-sm text-rose-400 hover:text-rose-300 transition-colors"
                            >
                              View All →
                            </button>
                          </div>
                          {projects.length === 0 ? (
                            <p className="text-sm text-[var(--foreground)]/50 text-center py-4">
                              No projects yet. Create your first foundation project!
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {projects.slice(0, 3).map((project) => (
                                <Link
                                  key={project.id}
                                  href={`/foundation/projects/${project.id}`}
                                  className="block p-3 bg-[var(--background)] rounded-lg hover:bg-rose-500/5 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="text-sm font-medium text-[var(--foreground)]">
                                        {project.title}
                                      </h4>
                                      <p className="text-xs text-[var(--foreground)]/50">
                                        {CATEGORY_LABELS[project.category] || project.category}
                                      </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[project.status]}`}>
                                      {STATUS_LABELS[project.status]}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </Card>
                      </div>

                      <CrossModuleConnectionsPanel
                        climateMissionsLinked={climateMissionsLinked}
                        goesGreenLinked={goesGreenLinked}
                        shopBrandsLinked={shopBrandsLinked}
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'projects' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">Foundation Projects</h2>
                      <Button
                        onClick={() => setShowCreateProject(!showCreateProject)}
                        variant="outline"
                        size="sm"
                      >
                        {showCreateProject ? 'Cancel' : '+ New Project'}
                      </Button>
                    </div>

                    {showCreateProject && (
                      <Card variant="default" padding="md">
                        <CreateProjectForm
                          onSubmit={handleCreateProject}
                          onCancel={() => setShowCreateProject(false)}
                        />
                      </Card>
                    )}

                    <ProjectFilters
                      statusFilter={statusFilter}
                      categoryFilter={categoryFilter}
                      regionFilter={regionFilter}
                      onStatusChange={setStatusFilter}
                      onCategoryChange={setCategoryFilter}
                      onRegionChange={setRegionFilter}
                      projects={projects}
                    />

                    {filteredProjects.length === 0 ? (
                      <Card variant="default" padding="md">
                        <div className="text-center py-8 text-[var(--foreground)]/50">
                          <p>No projects match your filters.</p>
                          <p className="text-sm mt-1">Try adjusting your filters or create a new project.</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                    {selectedProject && (
                      <Card variant="bordered" padding="md" className="mt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">
                              {selectedProject.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[selectedProject.status]}`}>
                              {STATUS_LABELS[selectedProject.status]}
                            </span>
                          </div>
                          <Button
                            onClick={() => setContributeProject(selectedProject)}
                            variant="primary"
                            size="sm"
                          >
                            Support Project
                          </Button>
                        </div>
                        {selectedProject.description && (
                          <p className="text-sm text-[var(--foreground)]/70 mb-4">{selectedProject.description}</p>
                        )}
                        <div className="flex gap-4">
                          <Link
                            href={`/foundation/projects/${selectedProject.id}`}
                            className="text-sm text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            View Full Details →
                          </Link>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {activeSection === 'contributions' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <KPICard
                        value={`€${(totalContributions / 100).toFixed(0)}`}
                        label="Total Contributed"
                        color="text-rose-400"
                      />
                      <KPICard
                        value={contributions.length}
                        label="Total Donations"
                      />
                      <KPICard
                        value={Object.keys(contributionsByProject).length}
                        label="Projects Supported"
                        color="text-emerald-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card variant="default" padding="md">
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                          Recent Contributions
                        </h3>
                        {contributions.length === 0 ? (
                          <p className="text-sm text-[var(--foreground)]/50 text-center py-4">
                            No contributions yet. Support a project to get started!
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {contributions.slice(0, 20).map((contribution) => (
                              <ContributionRow key={contribution.id} contribution={contribution} />
                            ))}
                          </div>
                        )}
                      </Card>

                      <Card variant="default" padding="md">
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                          Top Supported Projects
                        </h3>
                        {Object.keys(contributionsByProject).length === 0 ? (
                          <p className="text-sm text-[var(--foreground)]/50 text-center py-4">
                            No project contributions yet.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(contributionsByProject)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .slice(0, 10)
                              .map(([projectId, data]) => {
                                const project = projects.find((p) => p.id === projectId);
                                return (
                                  <Link
                                    key={projectId}
                                    href={`/foundation/projects/${projectId}`}
                                    className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg hover:bg-rose-500/5 transition-colors"
                                  >
                                    <div>
                                      <h4 className="text-sm font-medium text-[var(--foreground)]">
                                        {project?.title || 'Unknown Project'}
                                      </h4>
                                      <p className="text-xs text-[var(--foreground)]/50">
                                        {data.count} contribution{data.count !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    <span className="text-sm font-medium text-emerald-400">
                                      €{(data.total / 100).toFixed(0)}
                                    </span>
                                  </Link>
                                );
                              })}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                )}

                {activeSection === 'impact' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KPICard
                        value={`${(totalEstimatedImpact / 1000).toFixed(1)}t`}
                        label="Est. CO2 Reduced"
                        color="text-blue-400"
                      />
                      <KPICard
                        value={`${(totalVerifiedImpact / 1000).toFixed(1)}t`}
                        label="Verified CO2 Reduced"
                        color="text-emerald-400"
                      />
                      <KPICard
                        value={completedProjects}
                        label="Projects Completed"
                        color="text-purple-400"
                      />
                      <KPICard
                        value={activeProjects}
                        label="Active Projects"
                        color="text-emerald-400"
                      />
                    </div>

                    <Card variant="default" padding="md">
                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                        Impact by Category
                      </h3>
                      {Object.keys(impactByCategory).length === 0 ? (
                        <p className="text-sm text-[var(--foreground)]/50 text-center py-4">
                          No impact data available yet.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(impactByCategory).map(([category, data]) => (
                            <div key={category} className="p-4 bg-[var(--background)] rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-[var(--foreground)]">
                                  {CATEGORY_LABELS[category] || category}
                                </h4>
                                <span className="text-xs text-[var(--foreground)]/50">
                                  {data.count} project{data.count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-[var(--foreground)]/50">Estimated Impact</p>
                                  <p className="text-lg font-bold text-blue-400">
                                    {(data.estimated / 1000).toFixed(1)}t CO2
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-[var(--foreground)]/50">Verified Impact</p>
                                  <p className="text-lg font-bold text-emerald-400">
                                    {(data.verified / 1000).toFixed(1)}t CO2
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 h-2 bg-[var(--card-bg)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{
                                    width: `${data.estimated > 0 ? (data.verified / data.estimated) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    <Card variant="bordered" padding="md" className="bg-rose-500/5 border-rose-500/20">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                            Your Impact Matters
                          </h3>
                          <p className="text-sm text-[var(--foreground)]/70">
                            Every contribution to THE ZORA FOUNDATION supports real climate projects around the world.
                            Together, we are making a measurable difference in the fight against climate change.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <AgentPanel
                  context="foundation"
                  title="Ask TYR"
                  description="Impact Guide for foundation projects"
                  onSuggestionSelect={handleSuggestionSelect}
                />

                <Button href="/dashboard" variant="outline" className="w-full">
                  Back to Desk
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {contributeProject && (
        <ContributeModal
          project={contributeProject}
          onSubmit={handleContribute}
          onClose={() => setContributeProject(null)}
        />
      )}
    </AppShell>
  );
}
