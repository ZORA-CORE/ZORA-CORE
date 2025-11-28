"use client";

import Link from "next/link";

interface Mission {
  id: string;
  title: string;
  description: string;
  impact: string;
  status: "planned" | "in_progress" | "completed";
  category: string;
}

const missions: Mission[] = [
  {
    id: "mission_001",
    title: "Switch to Renewable Energy",
    description: "Transition your home or office to 100% renewable energy sources",
    impact: "~2.5 tonnes CO2/year",
    status: "in_progress",
    category: "Energy",
  },
  {
    id: "mission_002",
    title: "Reduce Single-Use Plastics",
    description: "Eliminate single-use plastics from your daily routine",
    impact: "~50 kg plastic/year",
    status: "completed",
    category: "Waste",
  },
  {
    id: "mission_003",
    title: "Plant-Based Diet Days",
    description: "Commit to 3 plant-based days per week",
    impact: "~0.5 tonnes CO2/year",
    status: "planned",
    category: "Food",
  },
  {
    id: "mission_004",
    title: "Sustainable Transportation",
    description: "Use public transit, cycling, or walking for daily commute",
    impact: "~1.2 tonnes CO2/year",
    status: "in_progress",
    category: "Transport",
  },
];

function MissionCard({ mission }: { mission: Mission }) {
  const statusColors = {
    planned: "status-pending",
    in_progress: "status-active",
    completed: "status-completed",
  };

  const categoryColors: Record<string, string> = {
    Energy: "bg-amber-500",
    Waste: "bg-purple-500",
    Food: "bg-emerald-500",
    Transport: "bg-blue-500",
  };

  return (
    <div className="agent-card">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-1 rounded text-xs text-white ${categoryColors[mission.category] || "bg-gray-500"}`}>
          {mission.category}
        </span>
        <span className={`status-badge ${statusColors[mission.status]}`}>
          {mission.status.replace("_", " ")}
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{mission.title}</h3>
      <p className="text-gray-400 text-sm mb-4">{mission.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Estimated Impact</span>
        <span className="text-emerald-400 font-medium">{mission.impact}</span>
      </div>
    </div>
  );
}

export default function ClimatePage() {
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const totalImpact = "~4.2 tonnes CO2/year";

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="agent-card text-center">
              <p className="text-gray-400 text-sm mb-1">Climate Score</p>
              <p className="text-4xl font-bold text-emerald-500">72</p>
              <p className="text-xs text-gray-500">out of 100</p>
            </div>
            <div className="agent-card text-center">
              <p className="text-gray-400 text-sm mb-1">Missions Completed</p>
              <p className="text-4xl font-bold text-emerald-500">{completedMissions}/{missions.length}</p>
              <p className="text-xs text-gray-500">this quarter</p>
            </div>
            <div className="agent-card text-center">
              <p className="text-gray-400 text-sm mb-1">Total Impact</p>
              <p className="text-4xl font-bold text-emerald-500">{totalImpact}</p>
              <p className="text-xs text-gray-500">potential savings</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Climate Missions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          </div>

          <div className="agent-card">
            <h2 className="text-xl font-semibold mb-4">Climate Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Energy Source</p>
                <p className="font-medium">Mixed Grid</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Transport</p>
                <p className="font-medium">Hybrid</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Diet</p>
                <p className="font-medium">Flexitarian</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Location</p>
                <p className="font-medium">Urban</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.1 - Climate-first AI Operating System
      </footer>
    </div>
  );
}
