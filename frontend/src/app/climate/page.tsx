"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  getClimateProfiles,
  getClimateMissions,
  createClimateProfile,
  createClimateMission,
  updateMissionStatus,
  bootstrapMissions,
  ZoraApiError,
} from "@/lib/api";
import type {
  ClimateProfile,
  ClimateMission,
  MissionStatus,
  CreateMissionInput,
  CreateProfileInput,
  DashboardSummary,
} from "@/lib/types";

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
}: {
  onSubmit: (input: CreateProfileInput) => void;
}) {
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<"person" | "brand" | "organization">("person");
  const [country, setCountry] = useState("");
  const [cityOrRegion, setCityOrRegion] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [primaryEnergySource, setPrimaryEnergySource] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      profile_type: profileType,
      country: country || undefined,
      city_or_region: cityOrRegion || undefined,
      household_size: householdSize ? parseInt(householdSize) : undefined,
      primary_energy_source: primaryEnergySource || undefined,
    });
  };

  return (
    <div className="agent-card">
      <h2 className="text-xl font-semibold mb-4">Create Your Climate Profile</h2>
      <p className="text-gray-400 mb-4">
        Get started by creating your climate profile to track your environmental impact.
      </p>
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
            <label className="block text-sm text-gray-400 mb-1">Profile Type</label>
            <select
              value={profileType}
              onChange={(e) => setProfileType(e.target.value as "person" | "brand" | "organization")}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            >
              <option value="person">Individual / Household</option>
              <option value="brand">Brand</option>
              <option value="organization">Organization</option>
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
              placeholder="e.g., Denmark"
            />
          </div>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Household Size</label>
            <input
              type="number"
              min="1"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              placeholder="Number of people"
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
        <div className="flex justify-end">
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

export default function ClimatePage() {
  const [profile, setProfile] = useState<ClimateProfile | null>(null);
  const [missions, setMissions] = useState<ClimateMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMission, setShowCreateMission] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getClimateProfiles({ limit: 1 });
      if (response.data.length > 0) {
        setProfile(response.data[0]);
      } else {
        setProfile(null);
      }
    } catch (err) {
      const message = err instanceof ZoraApiError ? err.message : "Failed to load profile";
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
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      loadMissions(profile.id);
    }
  }, [profile, loadMissions]);

  const handleCreateProfile = async (input: CreateProfileInput) => {
    try {
      setLoading(true);
      const newProfile = await createClimateProfile(input);
      setProfile(newProfile);
    } catch (err) {
      const message = err instanceof ZoraApiError ? err.message : "Failed to create profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMission = async (input: CreateMissionInput) => {
    if (!profile) return;
    try {
      const newMission = await createClimateMission(profile.id, input);
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

  const handleBootstrapMissions = async () => {
    if (!profile) return;
    try {
      setBootstrapping(true);
      const result = await bootstrapMissions();
      if (result.created && result.missions) {
        setMissions(result.missions);
      }
    } catch (err) {
      console.error("Failed to bootstrap missions:", err);
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-emerald-500">ZORA</span> CORE
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="hover:text-emerald-500 transition-colors">
              Dashboard
            </Link>
            <Link href="/agents" className="hover:text-emerald-500 transition-colors">
              Agents
            </Link>
            <Link href="/climate" className="text-emerald-500">
              Climate OS
            </Link>
            <Link href="/journal" className="hover:text-emerald-500 transition-colors">
              Journal
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Climate OS</h1>
            <p className="text-gray-400">
              Track your climate impact and complete missions to reduce your footprint.
              Every action counts in the fight against climate change.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadProfile} />
          ) : !profile ? (
            <CreateProfileForm onSubmit={handleCreateProfile} />
          ) : (
            <>
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

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Your Climate Missions</h2>
                  <button
                    onClick={() => setShowCreateMission(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white transition-colors"
                  >
                    + New Mission
                  </button>
                </div>

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
                    <p className="text-gray-400 mb-4">No missions yet. Get started with some recommended climate actions!</p>
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

              <div className="agent-card">
                <h2 className="text-xl font-semibold mb-4">Climate Profile</h2>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Household Size</p>
                    <p className="font-medium">{profile.household_size ? `${profile.household_size} people` : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Primary Energy</p>
                    <p className="font-medium">{profile.primary_energy_source?.replace(/_/g, " ") || "Not set"}</p>
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
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.5 - Climate OS v0.2
      </footer>
    </div>
  );
}
