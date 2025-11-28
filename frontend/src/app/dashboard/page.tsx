"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFrontendConfig, getClimateMissions, getClimateProfiles, getPublicProducts } from "@/lib/api";
import type { HomePageConfig, ClimateMission, DashboardSummary, ClimateProfile, ProfileScope, PublicProduct } from "@/lib/types";
import { PageShell } from "@/components/ui/PageShell";
import { HeroSection } from "@/components/ui/HeroSection";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

interface Agent {
  name: string;
  role: string;
  pronouns: string;
  status: "active" | "idle" | "busy";
  description: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
}

const DEFAULT_CONFIG: HomePageConfig = {
  hero_title: "ZORA CORE",
  hero_subtitle: "Climate-first AI Operating System.",
  primary_cta_label: "Open Climate OS",
  primary_cta_link: "/climate",
  show_climate_dashboard: true,
  show_missions_section: true,
};

const agents: Agent[] = [
  {
    name: "CONNOR",
    role: "Systems & Backend Engineer",
    pronouns: "he/him",
    status: "active",
    description: "Designs and implements backend services, APIs, and integrations",
    color: "bg-blue-500",
  },
  {
    name: "LUMINA",
    role: "Orchestrator & Project Lead",
    pronouns: "she/her",
    status: "active",
    description: "Turns high-level goals into plans, projects and tasks",
    color: "bg-purple-500",
  },
  {
    name: "EIVOR",
    role: "Memory & Knowledge Keeper",
    pronouns: "she/her",
    status: "idle",
    description: "Maintains long-term memory for ZORA CORE",
    color: "bg-amber-500",
  },
  {
    name: "ORACLE",
    role: "Researcher & Strategy Engine",
    pronouns: "they/them",
    status: "idle",
    description: "Performs deep research on climate science and AI techniques",
    color: "bg-cyan-500",
  },
  {
    name: "AEGIS",
    role: "Safety & Ethics Guardian",
    pronouns: "they/them",
    status: "active",
    description: "Enforces rules and safety policies for ZORA CORE",
    color: "bg-red-500",
  },
  {
    name: "SAM",
    role: "Frontend & Experience Architect",
    pronouns: "he/him",
    status: "busy",
    description: "Designs and implements frontend experiences",
    color: "bg-emerald-500",
  },
];

const mockTasks: Task[] = [
  {
    id: "task_001",
    title: "Implement Climate Profile API",
    assignee: "CONNOR",
    status: "in_progress",
    priority: "high",
  },
  {
    id: "task_002",
    title: "Design Mission Dashboard Layout",
    assignee: "SAM",
    status: "in_progress",
    priority: "high",
  },
  {
    id: "task_003",
    title: "Review Climate Claims for Greenwashing",
    assignee: "AEGIS",
    status: "pending",
    priority: "critical",
  },
  {
    id: "task_004",
    title: "Research Carbon Offset Standards",
    assignee: "ORACLE",
    status: "completed",
    priority: "medium",
  },
  {
    id: "task_005",
    title: "Store Mission Results in Memory",
    assignee: "EIVOR",
    status: "pending",
    priority: "medium",
  },
];

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="agent-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-full ${agent.color} flex items-center justify-center text-white font-bold`}>
          {agent.name[0]}
        </div>
        <span className={`status-badge status-${agent.status}`}>
          {agent.status}
        </span>
      </div>
      <h3 className="text-lg font-semibold">{agent.name}</h3>
      <p className="text-sm text-gray-400 mb-1">{agent.role}</p>
      <p className="text-xs text-gray-500">{agent.pronouns}</p>
      <p className="text-sm text-gray-400 mt-3">{agent.description}</p>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const priorityColors = {
    low: "text-gray-400",
    medium: "text-blue-400",
    high: "text-amber-400",
    critical: "text-red-400",
  };

  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-900">
      <td className="py-3 px-4">
        <span className="text-xs text-gray-500">{task.id}</span>
      </td>
      <td className="py-3 px-4">{task.title}</td>
      <td className="py-3 px-4">
        <span className="text-emerald-400">{task.assignee}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`status-badge status-${task.status === "in_progress" ? "active" : task.status}`}>
          {task.status.replace("_", " ")}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={priorityColors[task.priority]}>{task.priority}</span>
      </td>
    </tr>
  );
}

function ClimateDashboardCard({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="agent-card">
      <h3 className="text-lg font-semibold mb-4">Climate OS Summary</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 text-sm">Total Missions</p>
          <p className="text-2xl font-bold text-emerald-500">{summary.total_missions}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-emerald-500">{summary.completed_count}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">In Progress</p>
          <p className="text-2xl font-bold text-amber-500">{summary.in_progress_count}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">CO2 Impact</p>
          <p className="text-2xl font-bold text-emerald-500">{summary.total_impact_kgco2} kg</p>
        </div>
      </div>
      <Link href="/climate" className="mt-4 block text-center text-emerald-500 hover:text-emerald-400 text-sm">
        View Climate OS
      </Link>
    </div>
  );
}

function MissionsTeaser({ missions }: { missions: ClimateMission[] }) {
  const recentMissions = missions.slice(0, 3);
  
  return (
    <div className="agent-card">
      <h3 className="text-lg font-semibold mb-4">Recent Missions</h3>
      {recentMissions.length === 0 ? (
        <p className="text-gray-400 text-sm">No missions yet. Create your first mission in Climate OS.</p>
      ) : (
        <div className="space-y-3">
          {recentMissions.map((mission) => (
            <div key={mission.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{mission.title}</p>
                <p className="text-xs text-gray-500">{mission.category || "other"}</p>
              </div>
              <span className={`status-badge status-${mission.status === "in_progress" ? "active" : mission.status}`}>
                {mission.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
      <Link href="/climate" className="mt-4 block text-center text-emerald-500 hover:text-emerald-400 text-sm">
        View All Missions
      </Link>
    </div>
  );
}

function ProfilesOverview({ profiles, primaryProfile }: { profiles: ClimateProfile[]; primaryProfile: ClimateProfile | null }) {
  const profilesByScope = profiles.reduce(
    (acc, p) => {
      acc[p.scope] = (acc[p.scope] || 0) + 1;
      return acc;
    },
    {} as Record<ProfileScope, number>
  );

  return (
    <div className="agent-card">
      <h3 className="text-lg font-semibold mb-4">Climate Profiles</h3>
      {profiles.length === 0 ? (
        <p className="text-gray-400 text-sm">No profiles yet. Create your first profile in Climate OS.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(Object.keys(SCOPE_LABELS) as ProfileScope[]).map((scope) => (
              <div key={scope} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${SCOPE_COLORS[scope]}`}></span>
                <span className="text-sm text-gray-400">{SCOPE_LABELS[scope]}:</span>
                <span className="text-sm font-medium">{profilesByScope[scope] || 0}</span>
              </div>
            ))}
          </div>
          {primaryProfile && (
            <div className="border-t border-zinc-700 pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-1">Primary Profile</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${SCOPE_COLORS[primaryProfile.scope]}`}></span>
                <span className="font-medium">{primaryProfile.name}</span>
                <span className="text-xs text-gray-500">({SCOPE_LABELS[primaryProfile.scope]})</span>
              </div>
            </div>
          )}
        </>
      )}
      <Link href="/climate" className="mt-4 block text-center text-emerald-500 hover:text-emerald-400 text-sm">
        Manage Profiles
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"agents" | "tasks">("agents");
  const [config, setConfig] = useState<HomePageConfig>(DEFAULT_CONFIG);
  const [isDefault, setIsDefault] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [missions, setMissions] = useState<ClimateMission[]>([]);
  const [profiles, setProfiles] = useState<ClimateProfile[]>([]);
  const [primaryProfile, setPrimaryProfile] = useState<ClimateProfile | null>(null);
  const [climateSummary, setClimateSummary] = useState<DashboardSummary>({
    total_missions: 0,
    completed_count: 0,
    in_progress_count: 0,
    total_impact_kgco2: 0,
  });

  useEffect(() => {
    async function loadConfig() {
      if (!isAuthenticated) {
        setConfigLoading(false);
        return;
      }

      try {
        const response = await getFrontendConfig("home");
        setConfig(response.config as HomePageConfig);
        setIsDefault(response.is_default);
      } catch (error) {
        console.error("Failed to load frontend config:", error);
      } finally {
        setConfigLoading(false);
      }
    }

    if (!authLoading) {
      loadConfig();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    async function loadClimateData() {
      if (!isAuthenticated || !config.show_climate_dashboard) {
        return;
      }

      try {
        const profilesResponse = await getClimateProfiles({ limit: 100 });
        const allProfiles = profilesResponse.data;
        setProfiles(allProfiles);
        
        // Find primary profile or use first profile
        const primary = allProfiles.find((p) => p.is_primary) || allProfiles[0] || null;
        setPrimaryProfile(primary);
        
        if (primary) {
          const missionsResponse = await getClimateMissions(primary.id, { limit: 10 });
          const missionsList = missionsResponse.data;
          setMissions(missionsList);

          const summary: DashboardSummary = {
            total_missions: missionsList.length,
            completed_count: missionsList.filter((m) => m.status === "completed").length,
            in_progress_count: missionsList.filter((m) => m.status === "in_progress").length,
            total_impact_kgco2: missionsList.reduce((sum, m) => {
              const co2 = m.estimated_impact_kgco2 ?? (m.impact_estimate?.co2_kg as number | undefined);
              return sum + (typeof co2 === "number" ? co2 : 0);
            }, 0),
          };
          setClimateSummary(summary);
        }
      } catch (error) {
        console.error("Failed to load climate data:", error);
      }
    }

    if (!authLoading && !configLoading) {
      loadClimateData();
    }
  }, [isAuthenticated, authLoading, configLoading, config.show_climate_dashboard]);

  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === "active").length,
    totalTasks: mockTasks.length,
    completedTasks: mockTasks.filter((t) => t.status === "completed").length,
  };

  if (authLoading || configLoading) {
    return (
      <PageShell isAuthenticated={isAuthenticated}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell isAuthenticated={isAuthenticated}>
      <HeroSection
        headline={config.hero_title}
        subheadline={config.hero_subtitle}
        primaryCta={{ label: config.primary_cta_label, href: config.primary_cta_link }}
        size="sm"
      />

      {isDefault && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
          <p className="text-xs text-[var(--foreground)]/40">
            Using default configuration.{" "}
            <Link href="/admin/frontend" className="text-[var(--primary)] hover:underline">
              Customize
            </Link>
          </p>
        </div>
      )}

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Agents" value={stats.totalAgents} variant="primary" />
            <StatCard label="Active Agents" value={stats.activeAgents} variant="primary" />
            <StatCard label="Total Tasks" value={stats.totalTasks} variant="accent" />
            <StatCard label="Completed Tasks" value={stats.completedTasks} variant="primary" />
          </div>

          {(config.show_climate_dashboard || config.show_missions_section) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <ProfilesOverview profiles={profiles} primaryProfile={primaryProfile} />
              {config.show_climate_dashboard && (
                <ClimateDashboardCard summary={climateSummary} />
              )}
              {config.show_missions_section && (
                <MissionsTeaser missions={missions} />
              )}
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab("agents")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "agents"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "tasks"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
              }`}
            >
              Tasks
            </button>
          </div>

          {activeTab === "agents" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.name} agent={agent} />
              ))}
            </div>
          )}

          {activeTab === "tasks" && (
            <Card variant="default" padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-left text-[var(--foreground)]/60">
                      <th className="py-3 px-4 font-medium">ID</th>
                      <th className="py-3 px-4 font-medium">Title</th>
                      <th className="py-3 px-4 font-medium">Assignee</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </section>
    </PageShell>
  );
}
