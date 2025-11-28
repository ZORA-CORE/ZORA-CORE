"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/auth";
import { getAgentCommands, getAgentCommand, createAgentCommand } from "@/lib/api";
import type {
  AgentCommandListItem,
  AgentCommand,
  AgentCommandStatus,
  CreateAgentCommandInput,
  AgentTaskListItem,
} from "@/lib/types";

// Available agents for targeting
const AVAILABLE_AGENTS = [
  { id: "ORACLE", name: "ORACLE", description: "Researcher & Strategy Engine" },
  { id: "SAM", name: "SAM", description: "Frontend & Experience Architect" },
  { id: "LUMINA", name: "LUMINA", description: "Orchestrator & Project Lead" },
  { id: "EIVOR", name: "EIVOR", description: "Memory & Knowledge Keeper" },
  { id: "CONNOR", name: "CONNOR", description: "Systems & Backend Engineer" },
  { id: "AEGIS", name: "AEGIS", description: "Safety & Ethics Guardian" },
];

const STATUS_COLORS: Record<AgentCommandStatus, string> = {
  received: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  parsing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tasks_created: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AGENT_COLORS: Record<string, string> = {
  CONNOR: "text-blue-400",
  LUMINA: "text-purple-400",
  EIVOR: "text-green-400",
  ORACLE: "text-yellow-400",
  AEGIS: "text-red-400",
  SAM: "text-pink-400",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function StatusBadge({ status }: { status: AgentCommandStatus }) {
  const labels: Record<AgentCommandStatus, string> = {
    received: "Received",
    parsing: "Parsing...",
    tasks_created: "Tasks Created",
    failed: "Failed",
  };
  return (
    <span className={`px-2 py-1 text-xs rounded border ${STATUS_COLORS[status]}`}>
      {labels[status]}
    </span>
  );
}

function CommandDetailPanel({
  command,
  tasks,
  onClose,
}: {
  command: AgentCommand | null;
  tasks: AgentTaskListItem[];
  onClose: () => void;
}) {
  if (!command) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Command Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={command.status} />
            <span className="text-gray-500 text-sm">
              {command.tasks_created_count} task(s) created
            </span>
          </div>

          <div>
            <span className="text-gray-500 text-sm">Raw Prompt:</span>
            <div className="mt-1 p-3 bg-zinc-800 rounded text-gray-300 whitespace-pre-wrap">
              {command.raw_prompt}
            </div>
          </div>

          {command.target_agents && command.target_agents.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Target Agents:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {command.target_agents.map((agent) => (
                  <span
                    key={agent}
                    className={`px-2 py-1 text-xs rounded bg-zinc-800 ${AGENT_COLORS[agent] || "text-gray-400"}`}
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          )}

          {command.parsed_summary && (
            <div>
              <span className="text-gray-500 text-sm">LUMINA&apos;s Summary:</span>
              <div className="mt-1 p-3 bg-purple-900/20 border border-purple-800 rounded text-sm text-purple-300">
                {command.parsed_summary}
              </div>
            </div>
          )}

          {command.error_message && (
            <div>
              <span className="text-gray-500 text-sm">Error Message:</span>
              <div className="mt-1 p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-300">
                {command.error_message}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created:</span>
              <p className="text-gray-300">{formatDate(command.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <p className="text-gray-300">{formatDate(command.updated_at)}</p>
            </div>
          </div>

          {tasks.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Created Tasks:</span>
              <div className="mt-2 space-y-2">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/admin/agents/tasks"
                    className="block p-3 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${AGENT_COLORS[task.agent_id] || "text-gray-400"}`}>
                        {task.agent_id}
                      </span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-300">{task.title}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{task.task_type}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-2 border-t border-zinc-700">
            Command ID: {command.id}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandForm({
  onCommandCreated,
}: {
  onCommandCreated: (command: AgentCommand, tasks: AgentTaskListItem[], summary: string) => void;
}) {
  const [rawPrompt, setRawPrompt] = useState("");
  const [targetAgents, setTargetAgents] = useState<string[]>([]);
  const [useAutoTargeting, setUseAutoTargeting] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgentToggle = (agentId: string) => {
    setTargetAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawPrompt.trim()) return;

    setSending(true);
    setError(null);

    try {
      const input: CreateAgentCommandInput = {
        raw_prompt: rawPrompt.trim(),
      };

      if (!useAutoTargeting && targetAgents.length > 0) {
        input.target_agents = targetAgents;
      }

      const response = await createAgentCommand(input);
      onCommandCreated(
        response.data.command,
        response.data.tasks_created,
        response.data.summary
      );
      setRawPrompt("");
      setTargetAgents([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send command");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">What do you want the agents to work on?</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-emerald-500 focus:outline-none text-lg"
            rows={4}
            placeholder="Describe what you want the agents to do in natural language...

Example: 'Analyze our climate page and suggest 3 new missions for reducing household energy consumption'"
            required
          />
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAutoTargeting}
                onChange={(e) => setUseAutoTargeting(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-300">
                Auto (let LUMINA choose the best agents)
              </span>
            </label>
          </div>

          {!useAutoTargeting && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Target specific agents:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_AGENTS.map((agent) => (
                  <label
                    key={agent.id}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      targetAgents.includes(agent.id)
                        ? "bg-emerald-900/30 border-emerald-700"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetAgents.includes(agent.id)}
                      onChange={() => handleAgentToggle(agent.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className={`font-medium ${AGENT_COLORS[agent.id]}`}>
                        {agent.name}
                      </span>
                      <div className="text-xs text-gray-500">{agent.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !rawPrompt.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {sending ? "Sending to LUMINA..." : "Send Command"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CommandResultPanel({
  command,
  tasks,
  summary,
  onDismiss,
}: {
  command: AgentCommand;
  tasks: AgentTaskListItem[];
  summary: string;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-emerald-400">Command Processed Successfully</h3>
          <p className="text-sm text-gray-400 mt-1">
            {tasks.length} task(s) created and queued for processing
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>

      {summary && (
        <div className="mb-4">
          <span className="text-sm text-gray-400">LUMINA&apos;s Plan:</span>
          <div className="mt-1 p-3 bg-zinc-800/50 rounded text-gray-300">
            {summary}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div>
          <span className="text-sm text-gray-400">Tasks Created:</span>
          <div className="mt-2 space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded"
              >
                <span className={`font-medium ${AGENT_COLORS[task.agent_id] || "text-gray-400"}`}>
                  {task.agent_id}
                </span>
                <span className="text-gray-400">-</span>
                <span className="text-gray-300">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-zinc-800/30 rounded text-sm text-gray-500">
        These tasks will be processed automatically over the next 15 minutes by the Agent Runtime.
        <Link href="/admin/agents/tasks" className="text-emerald-500 hover:underline ml-1">
          View all tasks
        </Link>
      </div>
    </div>
  );
}

export default function AgentConsolePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [commands, setCommands] = useState<AgentCommandListItem[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<AgentCommand | null>(null);
  const [selectedCommandTasks, setSelectedCommandTasks] = useState<AgentTaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Recent command result
  const [recentResult, setRecentResult] = useState<{
    command: AgentCommand;
    tasks: AgentTaskListItem[];
    summary: string;
  } | null>(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState<AgentCommandStatus | "">("");

  const loadCommands = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const params: { status?: AgentCommandStatus; limit?: number } = { limit: 50 };
      if (filterStatus) params.status = filterStatus;

      const response = await getAgentCommands(params);
      setCommands(response.data);
    } catch (error) {
      console.error("Failed to load commands:", error);
      setMessage({ type: "error", text: "Failed to load commands" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, filterStatus]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadCommands();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadCommands]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommands();
  };

  const handleCommandClick = async (commandId: string) => {
    try {
      const response = await getAgentCommand(commandId);
      setSelectedCommand(response.data);
      setSelectedCommandTasks(response.tasks || []);
    } catch (error) {
      console.error("Failed to load command details:", error);
      setMessage({ type: "error", text: "Failed to load command details" });
    }
  };

  const handleCommandCreated = (
    command: AgentCommand,
    tasks: AgentTaskListItem[],
    summary: string
  ) => {
    setRecentResult({ command, tasks, summary });
    setMessage({ type: "success", text: "Command sent successfully!" });
    loadCommands();
    setTimeout(() => setMessage(null), 3000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-zinc-800 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">
              <span className="text-emerald-500">ZORA</span> CORE
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="agent-card text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-gray-400 mb-4">
              You must be logged in to access the Agent Command Console.
            </p>
            <Link href="/login" className="btn-primary inline-block">
              Go to Login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!canWrite(user)) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-zinc-800 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">
              <span className="text-emerald-500">ZORA</span> CORE
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="agent-card text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-400 mb-4">
              You need Founder or Brand Admin role to access the Agent Command Console.
            </p>
            <Link href="/dashboard" className="btn-primary inline-block">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
            <Link href="/admin/setup" className="hover:text-emerald-500 transition-colors">
              Admin Setup
            </Link>
            <Link href="/admin/agents/tasks" className="hover:text-emerald-500 transition-colors">
              Agent Tasks
            </Link>
            <Link href="/admin/agents/insights" className="hover:text-emerald-500 transition-colors">
              Agent Insights
            </Link>
            <Link href="/admin/agents/console" className="text-emerald-500">
              Command Console
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Agent Command Console</h1>
            <p className="text-gray-400">
              Write natural language commands and let LUMINA translate them into agent tasks.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded ${
                message.type === "success"
                  ? "bg-emerald-900/20 border border-emerald-800 text-emerald-400"
                  : "bg-red-900/20 border border-red-800 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {recentResult && (
            <CommandResultPanel
              command={recentResult.command}
              tasks={recentResult.tasks}
              summary={recentResult.summary}
              onDismiss={() => setRecentResult(null)}
            />
          )}

          <div className="mb-8">
            <CommandForm onCommandCreated={handleCommandCreated} />
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="p-4 border-b border-zinc-700 flex flex-wrap items-center gap-4">
              <h2 className="font-semibold">Recent Commands</h2>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as AgentCommandStatus | "")}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="received">Received</option>
                  <option value="parsing">Parsing</option>
                  <option value="tasks_created">Tasks Created</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm text-emerald-500 hover:text-emerald-400 disabled:text-gray-500 transition-colors"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-sm text-gray-400">
                    <th className="p-3">Created</th>
                    <th className="p-3">Prompt</th>
                    <th className="p-3">Target Agents</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        No commands yet. Send your first command above!
                      </td>
                    </tr>
                  ) : (
                    commands.map((cmd) => (
                      <tr
                        key={cmd.id}
                        onClick={() => handleCommandClick(cmd.id)}
                        className="border-b border-zinc-700/50 hover:bg-zinc-700/30 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-sm text-gray-400">
                          {new Date(cmd.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="max-w-md truncate text-gray-300">
                            {cmd.raw_prompt}
                          </div>
                          {cmd.parsed_summary && (
                            <div className="text-xs text-purple-400 mt-1 truncate max-w-md">
                              {cmd.parsed_summary}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {cmd.target_agents && cmd.target_agents.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {cmd.target_agents.slice(0, 3).map((agent) => (
                                <span
                                  key={agent}
                                  className={`text-xs ${AGENT_COLORS[agent] || "text-gray-400"}`}
                                >
                                  {agent}
                                </span>
                              ))}
                              {cmd.target_agents.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{cmd.target_agents.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Auto</span>
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={cmd.status} />
                        </td>
                        <td className="p-3 text-sm text-gray-400">
                          {cmd.tasks_created_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.23 - Agent Command Console v1
      </footer>

      {selectedCommand && (
        <CommandDetailPanel
          command={selectedCommand}
          tasks={selectedCommandTasks}
          onClose={() => {
            setSelectedCommand(null);
            setSelectedCommandTasks([]);
          }}
        />
      )}
    </div>
  );
}
