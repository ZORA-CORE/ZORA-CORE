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

const STATUS_COLORS: Record<GoesGreenActionStatus, string> = {
  planned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_LABELS: Record<GoesGreenActionStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function ProfileCard({
  profile,
  isSelected,
  onSelect,
}: {
  profile: GoesGreenProfile;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-green-500/10 border-green-500/50'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-green-500/30'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{profile.name}</h3>
        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
          {profile.profile_type}
        </span>
      </div>
      {profile.country && (
        <p className="text-sm text-[var(--foreground)]/60 mb-1">{profile.country}</p>
      )}
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        {profile.annual_energy_kwh && (
          <div>
            <span className="text-[var(--foreground)]/40">Energy:</span>{' '}
            <span className="text-[var(--foreground)]/70">
              {profile.annual_energy_kwh.toLocaleString()} kWh/yr
            </span>
          </div>
        )}
        {profile.target_green_share_percent !== null && (
          <div>
            <span className="text-[var(--foreground)]/40">Target:</span>{' '}
            <span className="text-green-400">{profile.target_green_share_percent}% green</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
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

  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-[var(--foreground)]">{action.title}</h4>
        <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[action.status]}`}>
          {STATUS_LABELS[action.status]}
        </span>
      </div>
      {action.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2">{action.description}</p>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--foreground)]/40">{action.action_type}</span>
        {action.estimated_impact_kgco2 && (
          <span className="text-emerald-400">
            Est. {action.estimated_impact_kgco2.toFixed(1)} kg CO2
          </span>
        )}
      </div>
      {action.status !== 'completed' && action.status !== 'cancelled' && (
        <div className="mt-3 flex gap-2">
          {action.status === 'planned' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
              className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 rounded text-white transition-colors"
            >
              {isUpdating ? '...' : 'Start'}
            </button>
          )}
          {action.status === 'in_progress' && (
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
              className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 rounded text-white transition-colors"
            >
              {isUpdating ? '...' : 'Complete'}
            </button>
          )}
        </div>
      )}
    </div>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Profile Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Home Energy Profile"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Profile Type</label>
        <select
          value={profileType}
          onChange={(e) => setProfileType(e.target.value as 'household' | 'organization')}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
        >
          <option value="household">Household</option>
          <option value="organization">Organization</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Country</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Denmark"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--foreground)]/70 mb-1">Annual Energy (kWh)</label>
          <input
            type="number"
            value={annualEnergyKwh}
            onChange={(e) => setAnnualEnergyKwh(e.target.value)}
            placeholder="5000"
            className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--foreground)]/70 mb-1">Target Green %</label>
          <input
            type="number"
            value={targetGreenShare}
            onChange={(e) => setTargetGreenShare(e.target.value)}
            placeholder="100"
            min="0"
            max="100"
            className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Profile'}
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Action Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Install solar panels"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Action Type</label>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
        >
          <option value="energy_efficiency">Energy Efficiency</option>
          <option value="renewable_energy">Renewable Energy</option>
          <option value="transport">Transport</option>
          <option value="heating_cooling">Heating/Cooling</option>
          <option value="appliances">Appliances</option>
          <option value="behavior_change">Behavior Change</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the action..."
          rows={2}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">
          Estimated Impact (kg CO2)
        </label>
        <input
          type="number"
          value={estimatedImpact}
          onChange={(e) => setEstimatedImpact(e.target.value)}
          placeholder="500"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-green-500/50"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Action'}
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

export default function GoesGreenPage() {
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
  const plannedActions = actions.filter((a) => a.status === 'planned');
  const totalImpact = completedActions.reduce(
    (sum, a) => sum + (a.estimated_impact_kgco2 || 0),
    0
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">ZORA GOES GREEN</h1>
            <p className="text-[var(--foreground)]/60">
              Track your sustainable energy journey and green initiatives
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    Energy Profiles
                  </h2>
                  <Button
                    onClick={() => setShowCreateProfile(!showCreateProfile)}
                    variant="outline"
                    size="sm"
                  >
                    {showCreateProfile ? 'Cancel' : '+ New Profile'}
                  </Button>
                </div>

                {showCreateProfile && (
                  <div className="mb-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--card-border)]">
                    <CreateProfileForm
                      onSubmit={handleCreateProfile}
                      onCancel={() => setShowCreateProfile(false)}
                    />
                  </div>
                )}

                {isLoadingProfiles ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-8 text-[var(--foreground)]/50">
                    <p>No energy profiles yet.</p>
                    <p className="text-sm mt-1">Create your first profile to start tracking.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profiles.map((profile) => (
                      <ProfileCard
                        key={profile.id}
                        profile={profile}
                        isSelected={selectedProfile?.id === profile.id}
                        onSelect={() => setSelectedProfile(profile)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {selectedProfile && (
                <Card variant="default" padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        Green Actions
                      </h2>
                      <p className="text-sm text-[var(--foreground)]/60">
                        for {selectedProfile.name}
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowCreateAction(!showCreateAction)}
                      variant="outline"
                      size="sm"
                    >
                      {showCreateAction ? 'Cancel' : '+ New Action'}
                    </Button>
                  </div>

                  {showCreateAction && (
                    <div className="mb-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--card-border)]">
                      <CreateActionForm
                        profileId={selectedProfile.id}
                        onSubmit={handleCreateAction}
                        onCancel={() => setShowCreateAction(false)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-[var(--background)] rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--foreground)]">
                        {actions.length}
                      </div>
                      <div className="text-xs text-[var(--foreground)]/50">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{plannedActions.length}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Planned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-400">{activeActions.length}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        {completedActions.length}
                      </div>
                      <div className="text-xs text-[var(--foreground)]/50">Done</div>
                    </div>
                  </div>

                  {totalImpact > 0 && (
                    <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-800/50 rounded-lg text-center">
                      <span className="text-emerald-400 font-semibold">
                        {totalImpact.toFixed(1)} kg CO2
                      </span>{' '}
                      <span className="text-[var(--foreground)]/60">saved from completed actions</span>
                    </div>
                  )}

                  {isLoadingActions ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : actions.length === 0 ? (
                    <div className="text-center py-8 text-[var(--foreground)]/50">
                      <p>No actions yet for this profile.</p>
                      <p className="text-sm mt-1">
                        Create an action or ask FREYA for suggestions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {actions.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <AgentPanel
                context="goes_green"
                profileId={selectedProfile?.id}
                title="Ask FREYA"
                description="Nordic agent for energy transition intelligence"
                onSuggestionSelect={handleSuggestionSelect}
              />

              <Card variant="bordered" padding="md">
                <h3 className="font-semibold text-[var(--foreground)] mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Total Profiles</span>
                    <span className="font-medium text-[var(--foreground)]">{profiles.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Total Actions</span>
                    <span className="font-medium text-[var(--foreground)]">{actions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Completion Rate</span>
                    <span className="font-medium text-emerald-400">
                      {actions.length > 0
                        ? ((completedActions.length / actions.length) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">CO2 Saved</span>
                    <span className="font-medium text-emerald-400">{totalImpact.toFixed(1)} kg</span>
                  </div>
                </div>
              </Card>

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
