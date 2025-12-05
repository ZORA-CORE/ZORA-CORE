'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  getClimateProfiles,
  getClimateMissions,
  createClimateProfile,
  createClimateMission,
  updateMissionStatus,
  updateClimateProfile,
  bootstrapMissions,
  setProfileAsPrimary,
  getFrontendConfig,
  createAgentTask,
  ZoraApiError,
} from '@/lib/api';
import type {
  ClimateProfile,
  ClimateMission,
  MissionStatus,
  CreateMissionInput,
  CreateProfileInput,
  UpdateProfileInput,
  DashboardSummary,
  ClimatePageConfig,
  ProfileScope,
  AgentPanelSuggestion,
} from '@/lib/types';
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
  ZTextarea,
  ZSelect,
  ZEmptyState,
  ZLoadingState,
  ZErrorState,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';

const DEFAULT_CLIMATE_CONFIG: ClimatePageConfig = {
  hero_title: 'Climate OS',
  hero_subtitle: 'Track your climate impact and complete missions to reduce your footprint.',
  show_profile_section: true,
  show_dashboard_section: true,
  show_missions_section: true,
};

const SCOPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'household', label: 'Household' },
  { value: 'organization', label: 'Organization' },
  { value: 'brand', label: 'Brand' },
];

const PROFILE_TYPE_OPTIONS = [
  { value: 'person', label: 'Person' },
  { value: 'brand', label: 'Brand' },
  { value: 'organization', label: 'Organization' },
];

const CATEGORY_OPTIONS = [
  { value: 'energy', label: 'Energy' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'products', label: 'Products' },
  { value: 'other', label: 'Other' },
];

const ENERGY_SOURCE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'grid_mixed', label: 'Grid (Mixed)' },
  { value: 'grid_renewable', label: 'Grid (Renewable)' },
  { value: 'solar', label: 'Solar' },
  { value: 'wind', label: 'Wind' },
  { value: 'natural_gas', label: 'Natural Gas' },
  { value: 'oil', label: 'Oil' },
  { value: 'coal', label: 'Coal' },
  { value: 'other', label: 'Other' },
];

const SECTOR_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'tech', label: 'Technology' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
];

function ProfileSelector({
  profiles,
  selectedProfile,
  onSelect,
  onCreateNew,
}: {
  profiles: ClimateProfile[];
  selectedProfile: ClimateProfile | null;
  onSelect: (profile: ClimateProfile) => void;
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
            <ZBadge variant="info" size="sm">{selectedProfile.scope}</ZBadge>
            {selectedProfile.is_primary && <ZBadge variant="success" size="sm">Primary</ZBadge>}
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
              <ZBadge variant="info" size="sm">{profile.scope}</ZBadge>
              {profile.is_primary && <ZBadge variant="success" size="sm">Primary</ZBadge>}
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

function MissionRow({
  mission,
  onStatusChange,
}: {
  mission: ClimateMission;
  onStatusChange: (id: string, status: MissionStatus) => void;
}) {
  const formatImpact = (m: ClimateMission) => {
    if (m.estimated_impact_kgco2) return `~${m.estimated_impact_kgco2} kg CO2`;
    if (m.impact_estimate?.co2_kg) return `~${m.impact_estimate.co2_kg} kg CO2`;
    if (m.impact_estimate?.description) return String(m.impact_estimate.description);
    return 'TBD';
  };

  const nextStatus: Record<MissionStatus, MissionStatus | null> = {
    planned: 'in_progress',
    in_progress: 'completed',
    completed: null,
    cancelled: null,
    failed: 'planned',
  };

  const categoryVariants: Record<string, 'warning' | 'info' | 'success' | 'odin' | 'muted'> = {
    energy: 'warning',
    transport: 'info',
    food: 'success',
    products: 'odin',
    other: 'muted',
  };

  return (
    <ZCard className="p-4 hover:border-[var(--z-accent)]/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <ZBadge variant={categoryVariants[mission.category?.toLowerCase() || 'other'] || 'muted'} size="sm">
              {mission.category || 'General'}
            </ZBadge>
            <ZStatusBadge status={mission.status} size="sm" />
          </div>
          <h3 className="font-medium text-[var(--z-text-primary)] mb-1">{mission.title}</h3>
          <p className="text-sm text-[var(--z-text-muted)] line-clamp-2">
            {mission.description || 'No description'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <span className="text-xs text-[var(--z-text-muted)]">Impact</span>
            <p className="text-sm font-medium text-emerald-400">{formatImpact(mission)}</p>
          </div>
          {nextStatus[mission.status] && (
            <ZButton
              variant="primary"
              size="sm"
              onClick={() => onStatusChange(mission.id, nextStatus[mission.status]!)}
            >
              {mission.status === 'planned' ? 'Start' : 'Complete'}
            </ZButton>
          )}
        </div>
      </div>
    </ZCard>
  );
}

function CreateMissionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateMissionInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('energy');
  const [co2Impact, setCo2Impact] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      category,
      estimated_impact_kgco2: co2Impact ? parseFloat(co2Impact) : undefined,
    });
  };

  return (
    <ZCard className="p-4">
      <h3 className="text-lg font-semibold text-[var(--z-text-primary)] mb-4">Create New Mission</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ZInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Switch to renewable energy"
          required
        />
        <ZTextarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the mission..."
          rows={2}
        />
        <div className="grid grid-cols-2 gap-4">
          <ZSelect
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORY_OPTIONS}
          />
          <ZInput
            label="CO2 Impact (kg)"
            type="number"
            value={co2Impact}
            onChange={(e) => setCo2Impact(e.target.value)}
            placeholder="e.g., 500"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>
          <ZButton variant="primary" type="submit" disabled={!title}>Create Mission</ZButton>
        </div>
      </form>
    </ZCard>
  );
}

function CreateProfileForm({
  onSubmit,
  onCancel,
  isModal = false,
}: {
  onSubmit: (input: CreateProfileInput) => void;
  onCancel?: () => void;
  isModal?: boolean;
}) {
  const [name, setName] = useState('');
  const [profileType, setProfileType] = useState<'person' | 'brand' | 'organization'>('person');
  const [scope, setScope] = useState<ProfileScope>('individual');
  const [country, setCountry] = useState('');
  const [householdSize, setHouseholdSize] = useState('');
  const [primaryEnergySource, setPrimaryEnergySource] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [sector, setSector] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      profile_type: profileType,
      scope,
      country: country || undefined,
      household_size: householdSize ? parseInt(householdSize) : undefined,
      primary_energy_source: primaryEnergySource || undefined,
      organization_name: organizationName || undefined,
      sector: sector || undefined,
      website_url: websiteUrl || undefined,
    });
  };

  const showOrgFields = scope === 'organization' || scope === 'brand';

  return (
    <ZCard className={isModal ? 'p-0 border-0' : 'p-6'}>
      <h2 className="text-xl font-semibold text-[var(--z-text-primary)] mb-2">
        {isModal ? 'Create New Profile' : 'Create Your Climate Profile'}
      </h2>
      {!isModal && (
        <p className="text-[var(--z-text-muted)] text-sm mb-4">
          Get started by creating your climate profile to track your environmental impact.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ZInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name or organization"
            required
          />
          <ZSelect
            label="Scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as ProfileScope)}
            options={SCOPE_OPTIONS}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ZSelect
            label="Profile Type"
            value={profileType}
            onChange={(e) => setProfileType(e.target.value as 'person' | 'brand' | 'organization')}
            options={PROFILE_TYPE_OPTIONS}
          />
          <ZInput
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., Denmark"
          />
        </div>
        {showOrgFields && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZInput
                label="Organization Name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Formal organization name"
              />
              <ZSelect
                label="Sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                options={SECTOR_OPTIONS}
              />
            </div>
            <ZInput
              label="Website URL"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </>
        )}
        {!showOrgFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ZInput
              label="Household Size"
              type="number"
              min="1"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              placeholder="Number of people"
            />
            <ZSelect
              label="Primary Energy Source"
              value={primaryEnergySource}
              onChange={(e) => setPrimaryEnergySource(e.target.value)}
              options={ENERGY_SOURCE_OPTIONS}
            />
          </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          {onCancel && <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>}
          <ZButton variant="primary" type="submit" disabled={!name}>Create Profile</ZButton>
        </div>
      </form>
    </ZCard>
  );
}

function ProfileDetailPane({
  profile,
  onSetPrimary,
  onEdit,
  settingPrimary,
}: {
  profile: ClimateProfile;
  onSetPrimary: () => void;
  onEdit: () => void;
  settingPrimary: boolean;
}) {
  return (
    <ZCard className="p-4">
      <ZSectionHeader title="Profile Details" className="mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-xs text-[var(--z-text-muted)]">Scope</span>
          <p className="text-sm font-medium text-[var(--z-text-primary)]">{profile.scope}</p>
        </div>
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
        {profile.sector && (
          <div>
            <span className="text-xs text-[var(--z-text-muted)]">Sector</span>
            <p className="text-sm font-medium text-[var(--z-text-primary)]">{profile.sector}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <ZButton variant="secondary" size="sm" onClick={onEdit}>Edit Profile</ZButton>
        {!profile.is_primary && (
          <ZButton variant="ghost" size="sm" onClick={onSetPrimary} disabled={settingPrimary}>
            {settingPrimary ? 'Setting...' : 'Set as Primary'}
          </ZButton>
        )}
      </div>
    </ZCard>
  );
}

function EditProfileModal({
  profile,
  onSave,
  onCancel,
  saving,
}: {
  profile: ClimateProfile;
  onSave: (input: UpdateProfileInput) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [country, setCountry] = useState(profile.country || '');
  const [cityOrRegion, setCityOrRegion] = useState(profile.city_or_region || '');
  const [householdSize, setHouseholdSize] = useState(profile.household_size?.toString() || '');
  const [primaryEnergySource, setPrimaryEnergySource] = useState(profile.primary_energy_source || '');
  const [organizationName, setOrganizationName] = useState(profile.organization_name || '');
  const [sector, setSector] = useState(profile.sector || '');
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      country: country || undefined,
      city_or_region: cityOrRegion || undefined,
      household_size: householdSize ? parseInt(householdSize) : undefined,
      primary_energy_source: primaryEnergySource || undefined,
      organization_name: organizationName || undefined,
      sector: sector || undefined,
      website_url: websiteUrl || undefined,
    });
  };

  const showOrgFields = profile.scope === 'organization' || profile.scope === 'brand';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <ZCard className="max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <h2 className="text-xl font-semibold text-[var(--z-text-primary)] mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ZInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <ZInput label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., Denmark" />
          </div>
          <ZInput label="City or Region" value={cityOrRegion} onChange={(e) => setCityOrRegion(e.target.value)} placeholder="e.g., Copenhagen" />
          {showOrgFields ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ZInput label="Organization Name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
                <ZSelect label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} options={SECTOR_OPTIONS} />
              </div>
              <ZInput label="Website URL" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZInput label="Household Size" type="number" min="1" value={householdSize} onChange={(e) => setHouseholdSize(e.target.value)} />
              <ZSelect label="Primary Energy Source" value={primaryEnergySource} onChange={(e) => setPrimaryEnergySource(e.target.value)} options={ENERGY_SOURCE_OPTIONS} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>
            <ZButton variant="primary" type="submit" disabled={!name || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </ZButton>
          </div>
        </form>
      </ZCard>
    </div>
  );
}

function CreateProfileModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateProfileInput) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <ZCard className="max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <CreateProfileForm onSubmit={onSubmit} onCancel={onCancel} isModal />
      </ZCard>
    </div>
  );
}

export default function ClimatePage() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<ClimateProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ClimateProfile | null>(null);
  const [missions, setMissions] = useState<ClimateMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMission, setShowCreateMission] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [config, setConfig] = useState<ClimatePageConfig>(DEFAULT_CLIMATE_CONFIG);
  const [isDefaultConfig, setIsDefaultConfig] = useState(true);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [askingOracle, setAskingOracle] = useState(false);
  const [oracleMessage, setOracleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await getFrontendConfig('climate');
        setConfig(response.config as ClimatePageConfig);
        setIsDefaultConfig(response.is_default);
      } catch (err) {
        console.error('Failed to load frontend config:', err);
      }
    }
    loadConfig();
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getClimateProfiles({ limit: 100 });
      setProfiles(response.data);
      if (response.data.length > 0) {
        const primary = response.data.find((p) => p.is_primary);
        setSelectedProfile(primary || response.data[0]);
      } else {
        setSelectedProfile(null);
      }
    } catch (err) {
      const message = err instanceof ZoraApiError ? err.message : 'Failed to load profiles';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMissions = useCallback(async (profileId: string) => {
    try {
      setMissionsLoading(true);
      const response = await getClimateMissions(profileId);
      setMissions(response.data);
    } catch (err) {
      console.error('Failed to load missions:', err);
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      loadMissions(selectedProfile.id);
    } else {
      setMissions([]);
    }
  }, [selectedProfile, loadMissions]);

  const handleCreateProfile = async (input: CreateProfileInput) => {
    try {
      setLoading(true);
      const newProfile = await createClimateProfile(input);
      setProfiles((prev) => [newProfile, ...prev]);
      setSelectedProfile(newProfile);
      setShowCreateProfile(false);
    } catch (err) {
      const message = err instanceof ZoraApiError ? err.message : 'Failed to create profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (input: UpdateProfileInput) => {
    if (!selectedProfile) return;
    try {
      setSavingProfile(true);
      const updated = await updateClimateProfile(selectedProfile.id, input);
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedProfile(updated);
      setShowEditProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetPrimary = async () => {
    if (!selectedProfile) return;
    try {
      setSettingPrimary(true);
      const updated = await setProfileAsPrimary(selectedProfile.id);
      setProfiles((prev) => prev.map((p) => ({ ...p, is_primary: p.id === updated.id })));
      setSelectedProfile(updated);
    } catch (err) {
      console.error('Failed to set primary profile:', err);
    } finally {
      setSettingPrimary(false);
    }
  };

  const handleCreateMission = async (input: CreateMissionInput) => {
    if (!selectedProfile) return;
    try {
      const newMission = await createClimateMission(selectedProfile.id, input);
      setMissions((prev) => [newMission, ...prev]);
      setShowCreateMission(false);
    } catch (err) {
      console.error('Failed to create mission:', err);
    }
  };

  const handleStatusChange = async (missionId: string, status: MissionStatus) => {
    try {
      const updated = await updateMissionStatus(missionId, { status });
      setMissions((prev) => prev.map((m) => (m.id === missionId ? updated : m)));
    } catch (err) {
      console.error('Failed to update mission:', err);
    }
  };

  const handleAskOracle = async () => {
    if (!selectedProfile) return;
    try {
      setAskingOracle(true);
      setOracleMessage(null);
      await createAgentTask({
        agent_id: 'HEIMDALL',
        task_type: 'propose_new_climate_missions',
        title: `Suggest climate missions for ${selectedProfile.name}`,
        description: `HEIMDALL should analyze the profile "${selectedProfile.name}" (scope: ${selectedProfile.scope}) and suggest new climate missions.`,
        payload: {
          profile_id: selectedProfile.id,
          profile_name: selectedProfile.name,
          profile_scope: selectedProfile.scope,
          country: selectedProfile.country,
          sector: selectedProfile.sector,
        },
        priority: 1,
      });
      setOracleMessage({ type: 'success', text: 'HEIMDALL task created! Check /admin/agents/insights soon.' });
    } catch (err) {
      setOracleMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create task' });
    } finally {
      setAskingOracle(false);
    }
  };

  const handleBootstrapMissions = async () => {
    if (!selectedProfile) return;
    try {
      setBootstrapping(true);
      const result = await bootstrapMissions(selectedProfile.id);
      if (result.created && result.missions) {
        setMissions(result.missions);
      }
    } catch (err) {
      console.error('Failed to bootstrap missions:', err);
    } finally {
      setBootstrapping(false);
    }
  };

  const dashboardSummary: DashboardSummary = {
    total_missions: missions.length,
    completed_count: missions.filter((m) => m.status === 'completed').length,
    in_progress_count: missions.filter((m) => m.status === 'in_progress').length,
    total_impact_kgco2: missions.reduce((sum, m) => {
      const co2 = m.estimated_impact_kgco2 ?? (m.impact_estimate?.co2_kg as number | undefined);
      return sum + (typeof co2 === 'number' ? co2 : 0);
    }, 0),
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ZPageHeader
            title={t('climate.title', 'Climate OS')}
            subtitle={t('climate.subtitle', 'Track your climate impact and complete missions')}
            className="mb-6"
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              {selectedProfile && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--z-text-muted)]">Active Profile:</span>
                  <span className="text-sm font-medium text-[var(--z-text-primary)]">{selectedProfile.name}</span>
                  <ZBadge variant="info" size="sm">{selectedProfile.scope}</ZBadge>
                  {selectedProfile.is_primary && <ZBadge variant="success" size="sm">Primary</ZBadge>}
                </div>
              )}
              {isDefaultConfig && (
                <p className="text-xs text-[var(--z-text-muted)] mt-1">
                  Using default configuration.{' '}
                  <Link href="/admin/frontend" className="text-[var(--z-accent)] hover:underline">Customize</Link>
                </p>
              )}
            </div>
            {profiles.length > 0 && (
              <ProfileSelector profiles={profiles} selectedProfile={selectedProfile} onSelect={setSelectedProfile} onCreateNew={() => setShowCreateProfile(true)} />
            )}
          </div>

          {loading ? (
            <ZLoadingState message="Loading climate profiles..." />
          ) : error ? (
            <ZErrorState message={error} onRetry={loadProfiles} />
          ) : profiles.length === 0 ? (
            <CreateProfileForm onSubmit={handleCreateProfile} />
          ) : selectedProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {config.show_dashboard_section && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ZMetricTile label="Total Missions" value={dashboardSummary.total_missions} sublabel="climate actions" />
                    <ZMetricTile label="Completed" value={dashboardSummary.completed_count} sublabel="missions done" variant="emerald" />
                    <ZMetricTile label="In Progress" value={dashboardSummary.in_progress_count} sublabel="active now" variant="amber" />
                    <ZMetricTile label="Total Impact" value={dashboardSummary.total_impact_kgco2 > 0 ? `${dashboardSummary.total_impact_kgco2}` : '--'} sublabel="kg CO2 reduction" variant="emerald" />
                  </div>
                )}

                {config.show_missions_section && (
                  <ZCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <ZSectionHeader title={`Missions for ${selectedProfile.name}`} />
                      <div className="flex items-center gap-2">
                        <ZButton variant="secondary" size="sm" onClick={handleAskOracle} disabled={askingOracle}>
                          {askingOracle ? 'Asking...' : 'Ask HEIMDALL'}
                        </ZButton>
                        <ZButton variant="primary" size="sm" onClick={() => setShowCreateMission(true)}>+ New Mission</ZButton>
                      </div>
                    </div>

                    {oracleMessage && (
                      <div className={`mb-4 p-3 rounded-lg border ${oracleMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{oracleMessage.text}</span>
                          <button onClick={() => setOracleMessage(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
                        </div>
                        {oracleMessage.type === 'success' && (
                          <Link href="/admin/agents/insights" className="text-xs underline hover:no-underline mt-1 inline-block">View Insights</Link>
                        )}
                      </div>
                    )}

                    {showCreateMission && (
                      <div className="mb-4">
                        <CreateMissionForm onSubmit={handleCreateMission} onCancel={() => setShowCreateMission(false)} />
                      </div>
                    )}

                    {missionsLoading ? (
                      <ZLoadingState message="Loading missions..." size="sm" />
                    ) : missions.length === 0 ? (
                      <ZEmptyState
                        title="No missions yet"
                        description="Get started with some recommended climate actions!"
                        action={{ label: bootstrapping ? 'Creating...' : 'Create Starter Missions', onClick: handleBootstrapMissions }}
                      />
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {missions.map((mission) => (
                          <MissionRow key={mission.id} mission={mission} onStatusChange={handleStatusChange} />
                        ))}
                      </div>
                    )}
                  </ZCard>
                )}

                {config.show_profile_section && (
                  <ProfileDetailPane profile={selectedProfile} onSetPrimary={handleSetPrimary} onEdit={() => setShowEditProfile(true)} settingPrimary={settingPrimary} />
                )}
              </div>

              <div className="space-y-6">
                <AgentPanel
                  context="climate"
                  profileId={selectedProfile.id}
                  title="Ask HEIMDALL"
                  description="Nordic agent for climate mission intelligence"
                  onSuggestionSelect={(suggestion: AgentPanelSuggestion) => {
                    if (suggestion.type === 'mission') setShowCreateMission(true);
                  }}
                />

                <ZCard className="p-4">
                  <ZSectionHeader title="Quick Actions" className="mb-3" />
                  <div className="space-y-2">
                    <ZButton variant="secondary" className="w-full justify-start" href="/simulation">Run Climate Simulation</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/goes-green">GOES GREEN Energy</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/foundation">Support Foundation Projects</ZButton>
                  </div>
                </ZCard>
              </div>
            </div>
          ) : (
            <ZEmptyState title="Select a profile" description="Choose a climate profile to view its data and missions." />
          )}
        </div>
      </div>

      {showCreateProfile && <CreateProfileModal onSubmit={handleCreateProfile} onCancel={() => setShowCreateProfile(false)} />}
      {showEditProfile && selectedProfile && <EditProfileModal profile={selectedProfile} onSave={handleUpdateProfile} onCancel={() => setShowEditProfile(false)} saving={savingProfile} />}
    </AppShell>
  );
}
