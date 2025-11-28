"use client";

import Link from "next/link";

interface Agent {
  name: string;
  role: string;
  pronouns: string;
  status: "active" | "idle" | "busy";
  description: string;
  color: string;
  capabilities: string[];
  personality: string;
}

const agents: Agent[] = [
  {
    name: "CONNOR",
    role: "Systems & Backend Engineer",
    pronouns: "he/him",
    status: "active",
    description: "Designs and implements backend services, APIs, data models and integrations. Integrates external tools and services. Responsible for reliability, performance and clean architecture.",
    color: "bg-blue-500",
    capabilities: ["API Development", "Database Design", "System Integration", "Performance Optimization"],
    personality: "Methodical, detail-oriented, and focused on building robust systems",
  },
  {
    name: "LUMINA",
    role: "Orchestrator & Project Lead",
    pronouns: "she/her",
    status: "active",
    description: "Turns high-level goals into plans, projects and tasks. Coordinates which agent does what, in what order. Owns the task graph and workflow logic for ZORA CORE.",
    color: "bg-purple-500",
    capabilities: ["Project Planning", "Task Coordination", "Workflow Management", "Goal Decomposition"],
    personality: "Strategic, organized, and excellent at breaking down complex goals",
  },
  {
    name: "EIVOR",
    role: "Memory & Knowledge Keeper",
    pronouns: "she/her",
    status: "idle",
    description: "Maintains long-term memory for ZORA CORE: projects, decisions, experiments, user/brand context, climate history, mashup outcomes. Provides search and summarization.",
    color: "bg-amber-500",
    capabilities: ["Memory Storage", "Knowledge Retrieval", "Context Management", "History Tracking"],
    personality: "Thoughtful, reflective, and deeply connected to ZORA's history",
  },
  {
    name: "ORACLE",
    role: "Researcher & Strategy Engine",
    pronouns: "they/them",
    status: "idle",
    description: "Performs deep research on climate science, standards, regulations, sustainable materials, branding, culture, and new AI techniques.",
    color: "bg-cyan-500",
    capabilities: ["Climate Research", "Market Analysis", "Trend Forecasting", "Strategic Insights"],
    personality: "Curious, analytical, and always seeking deeper understanding",
  },
  {
    name: "AEGIS",
    role: "Safety & Ethics Guardian",
    pronouns: "they/them",
    status: "active",
    description: "Enforces rules and safety policies for ZORA CORE. Flags high-risk tasks and requires human approval. Monitors for misleading climate claims and greenwashing.",
    color: "bg-red-500",
    capabilities: ["Safety Review", "Policy Enforcement", "Risk Assessment", "Greenwashing Detection"],
    personality: "Vigilant, principled, and committed to honest climate action",
  },
  {
    name: "SAM",
    role: "Frontend & Experience Architect",
    pronouns: "he/him",
    status: "busy",
    description: "Designs and implements ZORA CORE frontend experiences: dashboard, Climate OS screens, mashup shop, partner portals. Handles multi-country theming.",
    color: "bg-emerald-500",
    capabilities: ["UI/UX Design", "Frontend Development", "Accessibility", "Multi-language Support"],
    personality: "Creative, user-focused, and passionate about beautiful experiences",
  },
];

function AgentDetailCard({ agent }: { agent: Agent }) {
  return (
    <div className="agent-card">
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-16 h-16 rounded-full ${agent.color} flex items-center justify-center text-white text-2xl font-bold`}>
          {agent.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{agent.name}</h2>
            <span className={`status-badge status-${agent.status}`}>
              {agent.status}
            </span>
          </div>
          <p className="text-gray-400">{agent.role}</p>
          <p className="text-sm text-gray-500">{agent.pronouns}</p>
        </div>
      </div>
      
      <p className="text-gray-300 mb-4">{agent.description}</p>
      
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Personality</h3>
        <p className="text-sm text-gray-300 italic">{agent.personality}</p>
      </div>
      
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Capabilities</h3>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="px-2 py-1 bg-zinc-800 rounded text-xs text-gray-300"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
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
            <Link href="/agents" className="text-emerald-500">
              Agents
            </Link>
            <Link href="/climate" className="hover:text-emerald-500 transition-colors">
              Climate OS
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">ZORA Agent Family</h1>
            <p className="text-gray-400">
              Meet the 6 core agents that power ZORA CORE. Each agent has unique capabilities
              and works together to achieve climate-first goals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <AgentDetailCard key={agent.name} agent={agent} />
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.1 - Climate-first AI Operating System
      </footer>
    </div>
  );
}
