"use client";

import Link from "next/link";
import { useState } from "react";

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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"agents" | "tasks">("agents");

  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === "active").length,
    totalTasks: mockTasks.length,
    completedTasks: mockTasks.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-emerald-500">ZORA</span> CORE
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="text-emerald-500">
              Dashboard
            </Link>
            <Link href="/agents" className="hover:text-emerald-500 transition-colors">
              Agents
            </Link>
            <Link href="/climate" className="hover:text-emerald-500 transition-colors">
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
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="agent-card">
              <p className="text-gray-400 text-sm">Total Agents</p>
              <p className="text-3xl font-bold text-emerald-500">{stats.totalAgents}</p>
            </div>
            <div className="agent-card">
              <p className="text-gray-400 text-sm">Active Agents</p>
              <p className="text-3xl font-bold text-emerald-500">{stats.activeAgents}</p>
            </div>
            <div className="agent-card">
              <p className="text-gray-400 text-sm">Total Tasks</p>
              <p className="text-3xl font-bold text-amber-500">{stats.totalTasks}</p>
            </div>
            <div className="agent-card">
              <p className="text-gray-400 text-sm">Completed Tasks</p>
              <p className="text-3xl font-bold text-emerald-500">{stats.completedTasks}</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab("agents")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "agents"
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "tasks"
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
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
            <div className="agent-card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-gray-400">
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
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.4 - Climate-first AI Operating System
      </footer>
    </div>
  );
}
