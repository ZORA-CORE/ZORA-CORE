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
  ZProgress,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';
import {
  getGoesGreenProfiles,
  getGoesGreenActions,
  createGoesGreenProfile,
  createGoesGreenAction,
  updateGoesGreenActionStatus,
} from '@/lib/api';
import type {
  GoesGreenProfile,
  GoesGreenAction,
  CreateGoesGreenProfileInput,
  CreateGoesGreenActionInput,
  GoesGreenActionStatus,
  AgentPanelSuggestion,
} from '@/lib/types';

const PROFILE_TYPE_OPTIONS = [
  { value: 'household', label: 'Household' },
  { value: 'organization', label: 'Organization' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'energy_efficiency', label: 'Energy Efficiency' },
  { value: 'renewable_energy', label: 'Renewable Energy' },
  { value: 'transport', label: 'Transport' },
  { value: 'heating_cooling', label: 'Heating/Cooling' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'behavior_change', label: 'Behavior Change' },
  { value: 'other', label: 'Other' },
];

function ProfileSelector({
  profiles,
  selectedProfile,
  onSelect,
  onCreateNew,
}: {
  profiles: GoesGreenProfile[];
  selectedProfile: GoesGreenProfile | null;
  onSelect: (profile: GoesGreenProfile) => void;
  onCreateNew: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--z-surface)] border border-[var(--z-border)] rounded-lg hover:border-[var(--z-accent)]/50 transition-colors min-w-[200px]"
      >
        {selectedProfile ? (
          <>
            <span className="flex-1 text-left truncate text-sm text-[var(--z-text-primary)]">
              {selectedProfile.name}
            </span>
            <ZBadge variant="success" size="sm">{selectedProfile.profile_type}</ZBadge>
          </>
        ) : (
          <span className="text-[var(--z-text-muted)] text-sm">Select a profile...</span>
        )}
        <svg
          className={`w-4 h-4 text-[var(--z-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-[var(--z-surface)] border border-[var(--z-border)] rounded-lg shadow-lg max-h-60 overflow-auto">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                onSelect(profile);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--z-surface-elevated)] transition-colors text-left ${
                selectedProfile?.id === profile.id ? 'bg-[var(--z-surface-elevated)]' : ''
              }`}
            >
              <span className="flex-1 truncate text-sm text-[var(--z-text-primary)]">{profile.name}</span>
              <ZBadge variant="success" size="sm">{profile.profile_type}</ZBadge>
            </button>
          ))}
          <button
            onClick={() => {
              onCreateNew();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--z-surface-elevated)] transition-colors text-left border-t border-[var(--z-border)] text-[var(--z-accent)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">Create New Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action,
  onStatusChange,
}: {
  action: GoesGreenAction;
  onStatusChange: (actionId: string, status: GoesGreenActionStatus) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: GoesGreenActionStatus) => {
    setIsUpdating(true);
    await onStatusChange(action.id, newStatus);
    setIsUpdating(false);
  };

  const nextStatus: Record<GoesGreenActionStatus, GoesGreenActionStatus | null> = {
    planned: 'in_progress',
    in_progress: 'completed',
    completed: null,
    cancelled: null,
  };

  const typeVariants: Record<string, 'warning' | 'info' | 'success' | 'odin' | 'muted'> = {
    energy_efficiency: 'warning',
    renewable_energy: 'success',
    transport: 'info',
    heating_cooling: 'odin',
    appliances: 'warning',
    behavior_change: 'info',
    other: 'muted',
  };

  return (
    <ZCard className="p-4 hover:border-[var(--z-accent)]/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <ZBadge variant={typeVariants[action.action_type] || 'muted'} size="sm">
              {action.action_type.replace('_', ' ')}
            </ZBadge>
            <ZStatusBadge status={action.status} size="sm" />
          </div>
          <h3 className="font-medium text-[var(--z-text-primary)] mb-1">{action.title}</h3>
          <p className="text-sm text-[var(--z-text-muted)] line-clamp-2">
            {action.description || 'No description'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {action.estimated_impact_kgco2 && (
            <div className="text-right">
              <span className="text-xs text-[var(--z-text-muted)]">Impact</span>
              <p className="text-sm font-medium text-emerald-400">~{action.estimated_impact_kgco2} kg CO2</p>
            </div>
          )}
          {nextStatus[action.status] && (
            <ZButton
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange(nextStatus[action.status]!)}
              disabled={isUpdating}
            >
              {isUpdating ? '...' : action.status === 'planned' ? 'Start' : 'Complete'}
            </ZButton>
          )}
        </div>
      </div>
    </ZCard>
  );
}

function CreateProfileForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateGoesGreenProfileInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [profileType, setProfileType] = useState<'household' | 'organization'>('household');
  const [country, setCountry] = useState('');
  const [annualEnergyKwh, setAnnualEnergyKwh] = useState('');
  const [targetGreenShare, setTargetGreenShare] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        profile_type: profileType,
        country: country.trim() || undefined,
        annual_energy_kwh: annualEnergyKwh ? Number(annualEnergyKwh) : undefined,
        target_green_share_percent: targetGreenShare ? Number(targetGreenShare) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZCard className="p-4">
      <h3 className="text-lg font-semibold text-[var(--z-text-primary)] mb-4">Create Energy Profile</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ZInput
          label="Profile Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Home Energy Profile"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <ZSelect
            label="Profile Type"
            value={profileType}
            onChange={(e) => setProfileType(e.target.value as 'household' | 'organization')}
            options={PROFILE_TYPE_OPTIONS}
          />
          <ZInput
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Denmark"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ZInput
            label="Annual Energy (kWh)"
            type="number"
            value={annualEnergyKwh}
            onChange={(e) => setAnnualEnergyKwh(e.target.value)}
            placeholder="5000"
          />
          <ZInput
            label="Target Green %"
            type="number"
            value={targetGreenShare}
            onChange={(e) => setTargetGreenShare(e.target.value)}
            placeholder="100"
            min="0"
            max="100"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>
          <ZButton variant="primary" type="submit" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Profile'}
          </ZButton>
        </div>
      </form>
    </ZCard>
  );
}

function CreateActionForm({
  profileId,
  onSubmit,
  onCancel,
}: {
  profileId: string;
  onSubmit: (profileId: string, input: CreateGoesGreenActionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [actionType, setActionType] = useState('energy_efficiency');
  const [description, setDescription] = useState('');
  const [estimatedImpact, setEstimatedImpact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(profileId, {
        title: title.trim(),
        action_type: actionType,
        description: description.trim() || undefined,
        estimated_impact_kgco2: estimatedImpact ? Number(estimatedImpact) : undefined,
        status: 'planned',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZCard className="p-4">
      <h3 className="text-lg font-semibold text-[var(--z-text-primary)] mb-4">Create Green Action</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ZInput
          label="Action Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Install solar panels"
          required
        />
        <ZSelect
          label="Action Type"
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          options={ACTION_TYPE_OPTIONS}
        />
        <ZTextarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the action..."
          rows={2}
        />
        <ZInput
          label="Estimated Impact (kg CO2)"
          type="number"
          value={estimatedImpact}
          onChange={(e) => setEstimatedImpact(e.target.value)}
          placeholder="500"
        />
        <div className="flex gap-2 justify-end pt-2">
          <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>
          <ZButton variant="primary" type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Action'}
          </ZButton>
        </div>
      </form>
    </ZCard>
  );
}

function ProfileDetailPane({ profile }: { profile: GoesGreenProfile }) {
  const greenSharePercent = profile.grid_renewable_share_percent ?? 0;
  const targetPercent = profile.target_green_share_percent ?? 100;

  return (
    <ZCard className="p-4">
      <ZSectionHeader title="Energy Profile" className="mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Type</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{profile.profile_type}</p>
        </div>
        {profile.country && (
          <div>
            <span className="text-xs text-[var(--z-text-muted)]">Country</span>
            <p className="text-sm font-medium text-[var(--z-text-primary)]">{profile.country}</p>
          </div>
        )}
        {profile.annual_energy_kwh && (
          <div>
            <span className="text-xs text-[var(--z-text-muted)]">Annual Energy</span>
            <p className="text-sm font-medium text-[var(--z-text-primary)]">{profile.annual_energy_kwh.toLocaleString()} kWh</p>
          </div>
        )}
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Target</span>
          <p className="text-sm font-medium text-emerald-400">{targetPercent}% green</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--z-text-muted)]">Green Energy Progress</span>
          <span className="text-sm font-medium text-emerald-400">{greenSharePercent}%</span>
        </div>
        <ZProgress value={greenSharePercent} max={targetPercent} variant="success" />
      </div>
    </ZCard>
  );
}

export default function GoesGreenPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<GoesGreenProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<GoesGreenProfile | null>(null);
  const [actions, setActions] = useState<GoesGreenAction[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showCreateAction, setShowCreateAction] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadProfiles = useCallback(async () => {
    try {
      setIsLoadingProfiles(true);
      setError(null);
      const response = await getGoesGreenProfiles();
      setProfiles(response.data);
      if (response.data.length > 0 && !selectedProfile) {
        setSelectedProfile(response.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [selectedProfile]);

  const loadActions = useCallback(async (profileId: string) => {
    try {
      setIsLoadingActions(true);
      const response = await getGoesGreenActions(profileId);
      setActions(response.data);
    } catch (err) {
      console.error('Failed to load actions:', err);
      setActions([]);
    } finally {
      setIsLoadingActions(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfiles();
    }
  }, [isAuthenticated, loadProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      loadActions(selectedProfile.id);
    }
  }, [selectedProfile, loadActions]);

  const handleCreateProfile = async (input: CreateGoesGreenProfileInput) => {
    try {
      const newProfile = await createGoesGreenProfile(input);
      setProfiles((prev) => [...prev, newProfile]);
      setSelectedProfile(newProfile);
      setShowCreateProfile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  };

  const handleCreateAction = async (profileId: string, input: CreateGoesGreenActionInput) => {
    try {
      const newAction = await createGoesGreenAction(profileId, input);
      setActions((prev) => [...prev, newAction]);
      setShowCreateAction(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create action');
    }
  };

  const handleStatusChange = async (actionId: string, status: GoesGreenActionStatus) => {
    if (!selectedProfile) return;
    try {
      const updatedAction = await updateGoesGreenActionStatus(selectedProfile.id, actionId, status);
      setActions((prev) => prev.map((a) => (a.id === actionId ? updatedAction : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update action');
    }
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'goes_green_action' && selectedProfile) {
      setShowCreateAction(true);
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const completedActions = actions.filter((a) => a.status === 'completed');
  const activeActions = actions.filter((a) => a.status === 'in_progress');
  const totalImpact = actions.reduce((sum, a) => {
    if (a.status === 'completed' && a.estimated_impact_kgco2) {
      return sum + a.estimated_impact_kgco2;
    }
    return sum;
  }, 0);

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ZPageHeader
            title={t('goesGreen.title', 'GOES GREEN')}
            subtitle={t('goesGreen.subtitle', 'Track your energy transition and green actions')}
            className="mb-6"
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              {selectedProfile && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--z-text-muted)]">Active Profile:</span>
                  <span className="text-sm font-medium text-[var(--z-text-primary)]">{selectedProfile.name}</span>
                  <ZBadge variant="success" size="sm">{selectedProfile.profile_type}</ZBadge>
                </div>
              )}
            </div>
            {profiles.length > 0 && (
              <ProfileSelector
                profiles={profiles}
                selectedProfile={selectedProfile}
                onSelect={setSelectedProfile}
                onCreateNew={() => setShowCreateProfile(true)}
              />
            )}
          </div>

          {isLoadingProfiles ? (
            <ZLoadingState message="Loading energy profiles..." />
          ) : error ? (
            <ZErrorState message={error} onRetry={loadProfiles} />
          ) : profiles.length === 0 ? (
            <div className="space-y-6">
              <ZEmptyState
                title="No energy profiles yet"
                description="Create your first energy profile to start tracking your green transition."
                action={{ label: 'Create Profile', onClick: () => setShowCreateProfile(true) }}
              />
              {showCreateProfile && (
                <CreateProfileForm onSubmit={handleCreateProfile} onCancel={() => setShowCreateProfile(false)} />
              )}
            </div>
          ) : selectedProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ZMetricTile label="Total Actions" value={actions.length} sublabel="green initiatives" />
                  <ZMetricTile label="Completed" value={completedActions.length} sublabel="actions done" variant="emerald" />
                  <ZMetricTile label="In Progress" value={activeActions.length} sublabel="active now" variant="amber" />
                  <ZMetricTile label="CO2 Saved" value={totalImpact > 0 ? `${totalImpact}` : '--'} sublabel="kg CO2 reduction" variant="emerald" />
                </div>

                <ProfileDetailPane profile={selectedProfile} />

                <ZCard className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <ZSectionHeader title="Green Actions" />
                    <ZButton variant="primary" size="sm" onClick={() => setShowCreateAction(true)}>+ New Action</ZButton>
                  </div>

                  {showCreateAction && (
                    <div className="mb-4">
                      <CreateActionForm
                        profileId={selectedProfile.id}
                        onSubmit={handleCreateAction}
                        onCancel={() => setShowCreateAction(false)}
                      />
                    </div>
                  )}

                  {isLoadingActions ? (
                    <ZLoadingState message="Loading actions..." size="sm" />
                  ) : actions.length === 0 ? (
                    <ZEmptyState
                      title="No actions yet"
                      description="Create your first green action to start your energy transition!"
                      action={{ label: 'Create Action', onClick: () => setShowCreateAction(true) }}
                      size="sm"
                    />
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {actions.map((action) => (
                        <ActionRow key={action.id} action={action} onStatusChange={handleStatusChange} />
                      ))}
                    </div>
                  )}
                </ZCard>
              </div>

              <div className="space-y-6">
                <AgentPanel
                  context="goes_green"
                  profileId={selectedProfile.id}
                  title="Ask THOR"
                  description="Nordic agent for energy and infrastructure"
                  onSuggestionSelect={handleSuggestionSelect}
                />

                <ZCard className="p-4">
                  <ZSectionHeader title="Quick Actions" className="mb-3" />
                  <div className="space-y-2">
                    <ZButton variant="secondary" className="w-full justify-start" href="/climate">Climate OS</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/simulation">Run Simulation</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/foundation">Support Projects</ZButton>
                  </div>
                </ZCard>
              </div>
            </div>
          ) : (
            <ZEmptyState title="Select a profile" description="Choose an energy profile to view its data and actions." />
          )}
        </div>
      </div>

      {showCreateProfile && profiles.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full">
            <CreateProfileForm onSubmit={handleCreateProfile} onCancel={() => setShowCreateProfile(false)} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
