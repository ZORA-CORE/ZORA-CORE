"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
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
} from "@/lib/api";
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
} from "@/lib/types";
import { PageShell } from "@/components/ui/PageShell";
import { HeroSection } from "@/components/ui/HeroSection";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/lib/AuthContext";
import { AgentPanel } from "@/components/cockpit/AgentPanel";
import type { AgentPanelSuggestion } from "@/lib/types";

const DEFAULT_CLIMATE_CONFIG: ClimatePageConfig = {
  hero_title: "Climate OS",
  hero_subtitle: "Track your climate impact and complete missions to reduce your footprint. Every action counts in the fight against climate change.",
  show_profile_section: true,
  show_dashboard_section: true,
  show_missions_section: true,
};

const SCOPE_COLORS: Record<ProfileScope, string> = {
  individual: "bg-blue-500",
  household: "bg-purple-500",
  organization: "bg-amber-500",
  brand: "bg-emerald-500",
};

const SCOPE_LABELS: Record<ProfileScope, string> = {
  individual: "Individual",
  household: "Household",
  organization: "Organization",
  brand: "Brand",
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>
  );
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="agent-card bg-red-900/20 border-red-800">
      <p className="text-red-400 mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function ScopeBadge({ scope }: { scope: ProfileScope }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs text-white \${SCOPE_COLORS[scope]}`}>
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function PrimaryBadge() {
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-emerald-600 text-white">
      Primary
    </span>
  );
}

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
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded hover:border-emerald-500 transition-colors min-w-[200px]"
      >
        {selectedProfile ? (
          <>
            <span className="flex-1 text-left truncate">{selectedProfile.name}</span>
            <ScopeBadge scope={selectedProfile.scope} />
            {selectedProfile.is_primary && <PrimaryBadge />}
          </>
        ) : (
          <span className="text-gray-400">Select a profile...</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded shadow-lg max-h-60 overflow-auto">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                onSelect(profile);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 transition-colors text-left ${
                selectedProfile?.id === profile.id ? "bg-zinc-700" : ""
              }`}
            >
              <span className="flex-1 truncate">{profile.name}</span>
              <ScopeBadge scope={profile.scope} />
              {profile.is_primary && <PrimaryBadge />}
            </button>
          ))}
          <button
            onClick={() => {
              onCreateNew();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-700 transition-colors text-left border-t border-zinc-700 text-emerald-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MissionCard({
  mission,
  onStatusChange,
}: {
  mission: ClimateMission;
  onStatusChange: (id: string, status: MissionStatus) => void;
}) {
  const statusColors: Record<MissionStatus, string> = {
    planned: "status-pending",
    in_progress: "status-active",
    completed: "status-completed",
    cancelled: "bg-gray-600",
    failed: "bg-red-600",
  };

  const categoryColors: Record<string, string> = {
    energy: "bg-amber-500",
    transport: "bg-blue-500",
    food: "bg-emerald-500",
    products: "bg-purple-500",
    other: "bg-gray-500",
  };

  const formatImpact = (mission: ClimateMission) => {
    if (mission.estimated_impact_kgco2) return `~${mission.estimated_impact_kgco2} kg CO2`;
    if (mission.impact_estimate?.co2_kg) return `~${mission.impact_estimate.co2_kg} kg CO2`;
    if (mission.impact_estimate?.description) return String(mission.impact_estimate.description);
    return "Impact TBD";
  };

  const nextStatus: Record<MissionStatus, MissionStatus | null> = {
    planned: "in_progress",
    in_progress: "completed",
    completed: null,
    cancelled: null,
    failed: "planned",
  };

  return (
    <div className="agent-card">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`px-2 py-1 rounded text-xs text-white ${
            categoryColors[mission.category?.toLowerCase() || ""] || "bg-gray-500"
          }`}
        >
          {mission.category || "General"}
        </span>
        <span className={`status-badge ${statusColors[mission.status]}`}>
          {mission.status.replace("_", " ")}
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{mission.title}</h3>
      <p className="text-gray-400 text-sm mb-4">
        {mission.description || "No description"}
      </p>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500">Estimated Impact</span>
          <p className="text-emerald-400 font-medium">
            {formatImpact(mission)}
          </p>
        </div>
        {nextStatus[mission.status] && (
          <button
            onClick={() => onStatusChange(mission.id, nextStatus[mission.status]!)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm transition-colors"
          >
            {mission.status === "planned" ? "Start" : "Complete"}
          </button>
        )}
      </div>
    </div>
  );
}

function CreateMissionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateMissionInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("energy");
  const [co2Impact, setCo2Impact] = useState("");

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
    <form onSubmit={handleSubmit} className="agent-card">
      <h3 className="text-lg font-semibold mb-4">Create New Mission</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            placeholder="e.g., Switch to renewable energy"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            placeholder="Describe the mission..."
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            >
              <option value="energy">Energy</option>
              <option value="transport">Transport</option>
              <option value="food">Food</option>
              <option value="products">Products</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">CO2 Impact (kg)</label>
            <input
              type="number"
              value={co2Impact}
              onChange={(e) => setCo2Impact(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="e.g., 500"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            Create Mission
          </button>
        </div>
      </div>
    </form>
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
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<"person" | "brand" | "organization">("person");
  const [scope, setScope] = useState<ProfileScope>("individual");
  const [country, setCountry] = useState("");
  const [cityOrRegion, setCityOrRegion] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [primaryEnergySource, setPrimaryEnergySource] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [sector, setSector] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      profile_type: profileType,
      scope,
      country: country || undefined,
      city_or_region: cityOrRegion || undefined,
      household_size: householdSize ? parseInt(householdSize) : undefined,
      primary_energy_source: primaryEnergySource || undefined,
      organization_name: organizationName || undefined,
      sector: sector || undefined,
      website_url: websiteUrl || undefined,
    });
  };

  const showOrgFields = scope === "organization" || scope === "brand";

  return (
    <div className={isModal ? "" : "agent-card"}>
      <h2 className="text-xl font-semibold mb-4">
        {isModal ? "Create New Profile" : "Create Your Climate Profile"}
      </h2>
      {!isModal && (
        <p className="text-gray-400 mb-4">
          Get started by creating your climate profile to track your environmental impact.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="Enter your name or organization"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ProfileScope)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            >
              <option value="individual">Individual</option>
              <option value="household">Household</option>
              <option value="organization">Organization</option>
              <option value="brand">Brand</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Profile Type</label>
            <select
              value={profileType}
              onChange={(e) => setProfileType(e.target.value as "person" | "brand" | "organization")}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            >
              <option value="person">Person</option>
              <option value="brand">Brand</option>
              <option value="organization">Organization</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="e.g., Denmark"
            />
          </div>
        </div>
        {showOrgFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Organization Name</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                placeholder="Formal organization name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select...</option>
                <option value="fashion">Fashion</option>
                <option value="tech">Technology</option>
                <option value="food">Food & Beverage</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
        {showOrgFields && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="https://example.com"
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">City / Region</label>
            <input
              type="text"
              value={cityOrRegion}
              onChange={(e) => setCityOrRegion(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="e.g., Copenhagen"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {scope === "household" ? "Household Size" : "Team Size"}
            </label>
            <input
              type="number"
              min="1"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="Number of people"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Primary Energy Source</label>
          <select
            value={primaryEnergySource}
            onChange={(e) => setPrimaryEnergySource(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select...</option>
            <option value="grid_mixed">Grid (Mixed)</option>
            <option value="grid_renewable">Grid (Renewable)</option>
            <option value="solar">Solar</option>
            <option value="wind">Wind</option>
            <option value="natural_gas">Natural Gas</option>
            <option value="oil">Oil</option>
            <option value="coal">Coal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!name}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            Create Profile
          </button>
        </div>
      </form>
    </div>
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
  const showOrgFields = profile.scope === "organization" || profile.scope === "brand";

  return (
    <div className="agent-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Climate Profile</h2>
          <ScopeBadge scope={profile.scope} />
          {profile.is_primary && <PrimaryBadge />}
        </div>
        <div className="flex gap-2">
          {!profile.is_primary && (
            <button
              onClick={onSetPrimary}
              disabled={settingPrimary}
              className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:bg-gray-600 rounded text-white text-sm transition-colors"
            >
              {settingPrimary ? "Setting..." : "Set as Primary"}
            </button>
          )}
          <button
            onClick={onEdit}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-white text-sm transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-gray-400 text-sm">Name</p>
          <p className="font-medium">{profile.name}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Type</p>
          <p className="font-medium capitalize">{profile.profile_type}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Country</p>
          <p className="font-medium">{profile.country || "Not set"}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">City / Region</p>
          <p className="font-medium">{profile.city_or_region || "Not set"}</p>
        </div>
      </div>
      {showOrgFields && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-gray-400 text-sm">Organization Name</p>
            <p className="font-medium">{profile.organization_name || "Not set"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Sector</p>
            <p className="font-medium capitalize">{profile.sector || "Not set"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 text-sm">Website</p>
            {profile.website_url ? (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-500 hover:text-emerald-400"
              >
                {profile.website_url}
              </a>
            ) : (
              <p className="font-medium">Not set</p>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-gray-400 text-sm">
            {profile.scope === "household" ? "Household Size" : "Team Size"}
          </p>
          <p className="font-medium">
            {profile.household_size ? `${profile.household_size} people` : "Not set"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Primary Energy</p>
          <p className="font-medium">
            {profile.primary_energy_source?.replace(/_/g, " ") || "Not set"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Transport Mode</p>
          <p className="font-medium">{profile.transport_mode || "Not set"}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Diet Type</p>
          <p className="font-medium">{profile.diet_type || "Not set"}</p>
        </div>
      </div>
    </div>
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
  const [scope, setScope] = useState<ProfileScope>(profile.scope);
  const [country, setCountry] = useState(profile.country || "");
  const [cityOrRegion, setCityOrRegion] = useState(profile.city_or_region || "");
  const [householdSize, setHouseholdSize] = useState(profile.household_size?.toString() || "");
  const [primaryEnergySource, setPrimaryEnergySource] = useState(profile.primary_energy_source || "");
  const [organizationName, setOrganizationName] = useState(profile.organization_name || "");
  const [sector, setSector] = useState(profile.sector || "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      scope,
      country: country || undefined,
      city_or_region: cityOrRegion || undefined,
      household_size: householdSize ? parseInt(householdSize) : undefined,
      primary_energy_source: primaryEnergySource || undefined,
      organization_name: organizationName || undefined,
      sector: sector || undefined,
      website_url: websiteUrl || undefined,
    });
  };

  const showOrgFields = scope === "organization" || scope === "brand";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ProfileScope)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              >
                <option value="individual">Individual</option>
                <option value="household">Household</option>
                <option value="organization">Organization</option>
                <option value="brand">Brand</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">City / Region</label>
              <input
                type="text"
                value={cityOrRegion}
                onChange={(e) => setCityOrRegion(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          {showOrgFields && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Sector</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="fashion">Fashion</option>
                    <option value="tech">Technology</option>
                    <option value="food">Food & Beverage</option>
                    <option value="retail">Retail</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {scope === "household" ? "Household Size" : "Team Size"}
              </label>
              <input
                type="number"
                min="1"
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Primary Energy Source</label>
              <select
                value={primaryEnergySource}
                onChange={(e) => setPrimaryEnergySource(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select...</option>
                <option value="grid_mixed">Grid (Mixed)</option>
                <option value="grid_renewable">Grid (Renewable)</option>
                <option value="solar">Solar</option>
                <option value="wind">Wind</option>
                <option value="natural_gas">Natural Gas</option>
                <option value="oil">Oil</option>
                <option value="coal">Coal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
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
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <CreateProfileForm onSubmit={onSubmit} onCancel={onCancel} isModal />
      </div>
    </div>
  );
}

export default function ClimatePage() {
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

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await getFrontendConfig("climate");
        setConfig(response.config as ClimatePageConfig);
        setIsDefaultConfig(response.is_default);
      } catch (err) {
        console.error("Failed to load frontend config:", err);
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
      const message = err instanceof ZoraApiError ? err.message : "Failed to load profiles";
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
      console.error("Failed to load missions:", err);
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

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
      const message = err instanceof ZoraApiError ? err.message : "Failed to create profile";
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
      console.error("Failed to update profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetPrimary = async () => {
    if (!selectedProfile) return;
    try {
      setSettingPrimary(true);
      const updated = await setProfileAsPrimary(selectedProfile.id);
      setProfiles((prev) =>
        prev.map((p) => ({
          ...p,
          is_primary: p.id === updated.id,
        }))
      );
      setSelectedProfile(updated);
    } catch (err) {
      console.error("Failed to set primary profile:", err);
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
      console.error("Failed to create mission:", err);
    }
  };

  const handleStatusChange = async (missionId: string, status: MissionStatus) => {
    try {
      const updated = await updateMissionStatus(missionId, { status });
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? updated : m))
      );
    } catch (err) {
      console.error("Failed to update mission:", err);
    }
  };

  const dashboardSummary: DashboardSummary = {
    total_missions: missions.length,
    completed_count: missions.filter((m) => m.status === "completed").length,
    in_progress_count: missions.filter((m) => m.status === "in_progress").length,
    total_impact_kgco2: missions.reduce((sum, m) => {
      const co2 = m.estimated_impact_kgco2 ?? (m.impact_estimate?.co2_kg as number | undefined);
      return sum + (typeof co2 === "number" ? co2 : 0);
    }, 0),
  };

    const [bootstrapping, setBootstrapping] = useState(false);
    const [askingOracle, setAskingOracle] = useState(false);
    const [oracleMessage, setOracleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleAskOracle = async () => {
      if (!selectedProfile) return;
      try {
        setAskingOracle(true);
        setOracleMessage(null);
        await createAgentTask({
          agent_id: "HEIMDALL",
          task_type: "propose_new_climate_missions",
          title: `Suggest climate missions for ${selectedProfile.name}`,
          description: `HEIMDALL should analyze the profile "${selectedProfile.name}" (scope: ${selectedProfile.scope}) and suggest new climate missions tailored to their situation.`,
          payload: {
            profile_id: selectedProfile.id,
            profile_name: selectedProfile.name,
            profile_scope: selectedProfile.scope,
            country: selectedProfile.country,
            sector: selectedProfile.sector,
          },
          priority: 1,
        });
        setOracleMessage({
          type: "success",
          text: "HEIMDALL task created! Check /admin/agents/insights soon for new mission suggestions.",
        });
      } catch (err) {
        console.error("Failed to ask HEIMDALL:", err);
        setOracleMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to create HEIMDALL task",
        });
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
      console.error("Failed to bootstrap missions:", err);
    } finally {
      setBootstrapping(false);
    }
  };

  const profilesByScope = profiles.reduce(
    (acc, p) => {
      acc[p.scope] = (acc[p.scope] || 0) + 1;
      return acc;
    },
    {} as Record<ProfileScope, number>
  );

  return (
    <PageShell isAuthenticated={true}>
      <HeroSection
        headline={config.hero_title}
        subheadline={config.hero_subtitle}
        size="sm"
      />

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                {selectedProfile && (
                  <p className="text-sm text-[var(--primary)]">
                    Viewing: {selectedProfile.name} (scope: {SCOPE_LABELS[selectedProfile.scope]})
                    {selectedProfile.is_primary && " - Primary Profile"}
                  </p>
                )}
                {isDefaultConfig && (
                  <p className="text-xs text-[var(--foreground)]/40 mt-1">
                    Using default configuration.{" "}
                    <Link href="/admin/frontend" className="text-[var(--primary)] hover:underline">
                      Customize
                    </Link>
                  </p>
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
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadProfiles} />
          ) : profiles.length === 0 ? (
            <CreateProfileForm onSubmit={handleCreateProfile} />
          ) : selectedProfile ? (
            <>
              {config.show_dashboard_section && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="agent-card text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Missions</p>
                    <p className="text-4xl font-bold text-emerald-500">
                      {dashboardSummary.total_missions}
                    </p>
                    <p className="text-xs text-gray-500">climate actions</p>
                  </div>
                  <div className="agent-card text-center">
                    <p className="text-gray-400 text-sm mb-1">Completed</p>
                    <p className="text-4xl font-bold text-emerald-500">
                      {dashboardSummary.completed_count}
                    </p>
                    <p className="text-xs text-gray-500">missions done</p>
                  </div>
                  <div className="agent-card text-center">
                    <p className="text-gray-400 text-sm mb-1">In Progress</p>
                    <p className="text-4xl font-bold text-amber-500">
                      {dashboardSummary.in_progress_count}
                    </p>
                    <p className="text-xs text-gray-500">active now</p>
                  </div>
                  <div className="agent-card text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Impact</p>
                    <p className="text-4xl font-bold text-emerald-500">
                      {dashboardSummary.total_impact_kgco2 > 0 ? `${dashboardSummary.total_impact_kgco2} kg` : "--"}
                    </p>
                    <p className="text-xs text-gray-500">CO2 reduction</p>
                  </div>
                </div>
              )}

                            {config.show_missions_section && (
                              <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h2 className="text-xl font-semibold">
                                    Missions for {selectedProfile.name}
                                  </h2>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleAskOracle}
                                      disabled={askingOracle}
                                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors flex items-center gap-2"
                                      title="Ask HEIMDALL to suggest new climate missions"
                                    >
                                      {askingOracle ? (
                                        <>
                                          <span className="animate-spin">&#9696;</span>
                                          Asking...
                                        </>
                                      ) : (
                                        <>
                                          <span>&#9733;</span>
                                          Ask HEIMDALL
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setShowCreateMission(true)}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white transition-colors"
                                    >
                                      + New Mission
                                    </button>
                                  </div>
                                </div>

                                {oracleMessage && (
                                  <div
                                    className={`mb-4 p-3 rounded border ${
                                      oracleMessage.type === "success"
                                        ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                                        : "bg-red-900/20 border-red-800 text-red-400"
                                    }`}
                                  >
                                    {oracleMessage.text}
                                    {oracleMessage.type === "success" && (
                                      <Link
                                        href="/admin/agents/insights"
                                        className="ml-2 underline hover:no-underline"
                                      >
                                        View Insights
                                      </Link>
                                    )}
                                    <button
                                      onClick={() => setOracleMessage(null)}
                                      className="float-right text-sm opacity-70 hover:opacity-100"
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                )}

                  {showCreateMission && (
                    <div className="mb-4">
                      <CreateMissionForm
                        onSubmit={handleCreateMission}
                        onCancel={() => setShowCreateMission(false)}
                      />
                    </div>
                  )}

                  {missionsLoading ? (
                    <LoadingSpinner />
                  ) : missions.length === 0 ? (
                    <div className="agent-card text-center">
                      <p className="text-gray-400 mb-4">
                        No missions yet for this profile. Get started with some recommended climate actions!
                      </p>
                      <button
                        onClick={handleBootstrapMissions}
                        disabled={bootstrapping}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                      >
                        {bootstrapping ? "Creating..." : "Create Starter Missions"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {missions.map((mission) => (
                        <MissionCard
                          key={mission.id}
                          mission={mission}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {config.show_profile_section && (
                <ProfileDetailPane
                  profile={selectedProfile}
                  onSetPrimary={handleSetPrimary}
                  onEdit={() => setShowEditProfile(true)}
                  settingPrimary={settingPrimary}
                />
              )}

              <div className="mt-8">
                <AgentPanel
                  context="climate"
                  profileId={selectedProfile.id}
                  title="Ask HEIMDALL"
                  description="Nordic agent for climate mission intelligence"
                  onSuggestionSelect={(suggestion: AgentPanelSuggestion) => {
                    if (suggestion.type === 'mission') {
                      setShowCreateMission(true);
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="agent-card text-center">
              <p className="text-gray-400 mb-4">Select a profile to view its climate data.</p>
            </div>
          )}
        </div>
      </section>

      {showCreateProfile && (
        <CreateProfileModal
          onSubmit={handleCreateProfile}
          onCancel={() => setShowCreateProfile(false)}
        />
      )}

      {showEditProfile && selectedProfile && (
        <EditProfileModal
          profile={selectedProfile}
          onSave={handleUpdateProfile}
          onCancel={() => setShowEditProfile(false)}
          saving={savingProfile}
        />
      )}
    </PageShell>
  );
}
