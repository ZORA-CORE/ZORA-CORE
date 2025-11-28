"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  getClimateProfiles,
  getClimateMissions,
  createClimateProfile,
  createClimateMission,
  updateMissionStatus,
  ZoraApiError,
} from "@/lib/api";
import type {
  ClimateProfile,
  ClimateMission,
  MissionStatus,
  CreateMissionInput,
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
    waste: "bg-purple-500",
    food: "bg-emerald-500",
    transport: "bg-blue-500",
  };

  const formatImpact = (impact: Record<string, unknown>) => {
    if (impact.co2_kg) return `~${impact.co2_kg} kg CO2`;
    if (impact.description) return String(impact.description);
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
            {formatImpact(mission.impact_estimate)}
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
      impact_estimate: co2Impact ? { co2_kg: parseFloat(co2Impact) } : {},
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
              <option value="waste">Waste</option>
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
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name);
  };

  return (
    <div className="agent-card">
      <h2 className="text-xl font-semibold mb-4">Create Your Climate Profile</h2>
      <p className="text-gray-400 mb-4">
        Get started by creating your climate profile to track your environmental impact.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
          placeholder="Enter your name or organization"
        />
        <button
          type="submit"
          disabled={!name}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
        >
          Create Profile
        </button>
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

  const handleCreateProfile = async (name: string) => {
    try {
      setLoading(true);
      const newProfile = await createClimateProfile({
        name,
        profile_type: "person",
      });
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

  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const totalImpact = missions.reduce((sum, m) => {
    const co2 = m.impact_estimate?.co2_kg;
    return sum + (typeof co2 === "number" ? co2 : 0);
  }, 0);

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="agent-card text-center">
                  <p className="text-gray-400 text-sm mb-1">Climate Score</p>
                  <p className="text-4xl font-bold text-emerald-500">
                    {profile.climate_score ?? "--"}
                  </p>
                  <p className="text-xs text-gray-500">out of 100</p>
                </div>
                <div className="agent-card text-center">
                  <p className="text-gray-400 text-sm mb-1">Missions Completed</p>
                  <p className="text-4xl font-bold text-emerald-500">
                    {completedMissions}/{missions.length}
                  </p>
                  <p className="text-xs text-gray-500">this quarter</p>
                </div>
                <div className="agent-card text-center">
                  <p className="text-gray-400 text-sm mb-1">Total Impact</p>
                  <p className="text-4xl font-bold text-emerald-500">
                    {totalImpact > 0 ? `${totalImpact} kg` : "--"}
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
                  <div className="agent-card text-center text-gray-400">
                    <p>No missions yet. Create your first climate mission!</p>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Name</p>
                    <p className="font-medium">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Type</p>
                    <p className="font-medium capitalize">{profile.profile_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Energy Source</p>
                    <p className="font-medium">{profile.energy_source || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Transport</p>
                    <p className="font-medium">{profile.transport_mode || "Not set"}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.4 - Climate-first AI Operating System
      </footer>
    </div>
  );
}
