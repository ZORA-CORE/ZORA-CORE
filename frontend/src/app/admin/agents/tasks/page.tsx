"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/auth";
import { getAgentTasks, getAgentTask, createAgentTask } from "@/lib/api";
import type {
  AgentTaskListItem,
  AgentTask,
  AgentTaskStatus,
  CreateAgentTaskInput,
  AgentTaskStatusCounts,
} from "@/lib/types";

// Agent task type definitions (Nordic mythology names)
const AGENT_TASK_TYPES: Record<string, { label: string; types: { value: string; label: string; description: string }[] }> = {
  ODIN: {
    label: "ODIN - Chief Strategist & Research Lead",
    types: [
      { value: "research_topic", label: "Research Topic", description: "Research a specific topic" },
      { value: "strategic_planning", label: "Strategic Planning", description: "Create strategic plans and recommendations" },
    ],
  },
  THOR: {
    label: "THOR - Backend & Infra Engineer",
    types: [
      { value: "review_system_health", label: "Review System Health", description: "Check status endpoints and summarize health" },
      { value: "analyze_codebase", label: "Analyze Codebase", description: "Analyze code quality and patterns" },
    ],
  },
  FREYA: {
    label: "FREYA - Humans, Storytelling & Growth",
    types: [
      { value: "create_story", label: "Create Story", description: "Create compelling climate stories" },
      { value: "growth_analysis", label: "Growth Analysis", description: "Analyze growth opportunities" },
    ],
  },
  BALDUR: {
    label: "BALDUR - Frontend, UX & Product",
    types: [
      { value: "review_climate_page", label: "Review Climate Page", description: "Review and suggest UX improvements for climate pages" },
      { value: "review_accessibility", label: "Review Accessibility", description: "Check accessibility compliance" },
    ],
  },
  HEIMDALL: {
    label: "HEIMDALL - Observability & Monitoring",
    types: [
      { value: "propose_new_climate_missions", label: "Propose Climate Missions", description: "Suggest new climate missions" },
      { value: "system_monitoring", label: "System Monitoring", description: "Monitor system health and metrics" },
    ],
  },
  TYR: {
    label: "TYR - Ethics, Safety & Climate Integrity",
    types: [
      { value: "plan_frontend_improvements", label: "Plan Frontend Improvements", description: "Suggest improvements for frontend pages" },
      { value: "plan_workflow", label: "Plan Workflow", description: "Create a workflow plan for a goal" },
      { value: "review_recent_agent_tasks", label: "Review Recent Tasks", description: "Flag risky activities and produce safety review" },
      { value: "check_climate_claims", label: "Check Climate Claims", description: "Verify climate claims for greenwashing" },
    ],
  },
  EIVOR: {
    label: "EIVOR - Memory & Knowledge Keeper",
    types: [
      { value: "summarize_recent_events", label: "Summarize Recent Events", description: "Summarize recent journal/memory events" },
      { value: "memory_cleanup", label: "Memory Cleanup", description: "Clean up and consolidate old memories" },
    ],
  },
};

const AGENTS = Object.keys(AGENT_TASK_TYPES);

const STATUS_COLORS: Record<AgentTaskStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AGENT_COLORS: Record<string, string> = {
  ODIN: "text-blue-400",
  THOR: "text-orange-400",
  FREYA: "text-pink-400",
  BALDUR: "text-cyan-400",
  HEIMDALL: "text-yellow-400",
  TYR: "text-red-400",
  EIVOR: "text-green-400",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function StatusBadge({ status }: { status: AgentTaskStatus }) {
  return (
    <span className={`px-2 py-1 text-xs rounded border ${STATUS_COLORS[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function TaskDetailPanel({
  task,
  onClose,
}: {
  task: AgentTask | null;
  onClose: () => void;
}) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`font-semibold ${AGENT_COLORS[task.agent_id] || "text-gray-400"}`}>
              {task.agent_id}
            </span>
            <StatusBadge status={task.status} />
            <span className="text-gray-500 text-sm">Priority: {task.priority}</span>
          </div>

          <div>
            <h3 className="text-lg font-medium">{task.title}</h3>
            {task.description && (
              <p className="text-gray-400 mt-1">{task.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Task Type:</span>
              <p className="text-gray-300">{task.task_type}</p>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <p className="text-gray-300">{formatDate(task.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Started:</span>
              <p className="text-gray-300">{formatDate(task.started_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Completed:</span>
              <p className="text-gray-300">{formatDate(task.completed_at)}</p>
            </div>
          </div>

          {task.payload && Object.keys(task.payload).length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Payload:</span>
              <pre className="mt-1 p-3 bg-zinc-800 rounded text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(task.payload, null, 2)}
              </pre>
            </div>
          )}

          {task.result_summary && (
            <div>
              <span className="text-gray-500 text-sm">Result Summary:</span>
              <div className="mt-1 p-3 bg-emerald-900/20 border border-emerald-800 rounded text-sm text-emerald-300">
                {task.result_summary}
              </div>
            </div>
          )}

          {task.error_message && (
            <div>
              <span className="text-gray-500 text-sm">Error Message:</span>
              <div className="mt-1 p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-300">
                {task.error_message}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-2 border-t border-zinc-700">
            Task ID: {task.id}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTaskForm({
  onTaskCreated,
  onCancel,
}: {
  onTaskCreated: () => void;
  onCancel: () => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedTaskType, setSelectedTaskType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [priority, setPriority] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTaskTypes = selectedAgent ? AGENT_TASK_TYPES[selectedAgent]?.types || [] : [];

  const handleAgentChange = (agent: string) => {
    setSelectedAgent(agent);
    setSelectedTaskType("");
    // Auto-set title based on first task type
    const types = AGENT_TASK_TYPES[agent]?.types || [];
    if (types.length > 0) {
      setSelectedTaskType(types[0].value);
      setTitle(types[0].label);
      setDescription(types[0].description);
    }
  };

  const handleTaskTypeChange = (taskType: string) => {
    setSelectedTaskType(taskType);
    const typeInfo = availableTaskTypes.find((t) => t.value === taskType);
    if (typeInfo) {
      setTitle(typeInfo.label);
      setDescription(typeInfo.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !selectedTaskType || !title) return;

    setCreating(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {};
      if (extraInstructions) {
        payload.extra_instructions = extraInstructions;
      }

      const input: CreateAgentTaskInput = {
        agent_id: selectedAgent,
        task_type: selectedTaskType,
        title,
        description: description || undefined,
        payload: Object.keys(payload).length > 0 ? payload : undefined,
        priority,
      };

      await createAgentTask(input);
      onTaskCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Create New Task</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              required
            >
              <option value="">Select an agent...</option>
              {AGENTS.map((agent) => (
                <option key={agent} value={agent}>
                  {agent} - {AGENT_TASK_TYPES[agent].label.split(" - ")[1]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Task Type</label>
            <select
              value={selectedTaskType}
              onChange={(e) => handleTaskTypeChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              required
              disabled={!selectedAgent}
            >
              <option value="">Select a task type...</option>
              {availableTaskTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            placeholder="Task title"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            rows={2}
            placeholder="Brief description of what the task should accomplish"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Extra Instructions (optional)</label>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            rows={2}
            placeholder="Additional instructions for the agent (e.g., 'Focus on clarity for first-time visitors')"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Priority (0 = normal, higher = more urgent)</label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
            min={0}
            max={100}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating || !selectedAgent || !selectedTaskType || !title}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            {creating ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskStatusCounts({
  counts,
  onRefresh,
  refreshing,
}: {
  counts: AgentTaskStatusCounts;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Task Queue Status</h3>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-sm text-emerald-500 hover:text-emerald-400 disabled:text-gray-500 transition-colors"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-yellow-400">{counts.pending}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-blue-400">{counts.in_progress}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-emerald-400">{counts.completed}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-red-400">{counts.failed}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-gray-300">{counts.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
      <div className="mt-3 p-2 bg-zinc-900/50 rounded text-xs text-gray-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-emerald-400 font-medium">Agent Automation: enabled via GitHub Actions</span>
        </div>
        <div>
          Tasks are processed automatically every 15 minutes. See{" "}
          <Link href="https://github.com/ZORA-CORE/ZORA-CORE/blob/main/docs/AGENT_AUTOMATION_V1.md" className="text-emerald-500 hover:underline">
            AGENT_AUTOMATION_V1.md
          </Link>{" "}
          for configuration details.
        </div>
      </div>
    </div>
  );
}

export default function AgentTasksPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<AgentTaskListItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<AgentTaskStatus | "">("");

  // Status counts
  const [statusCounts, setStatusCounts] = useState<AgentTaskStatusCounts>({
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });

  const loadTasks = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const params: { agent_id?: string; status?: AgentTaskStatus; limit?: number } = { limit: 100 };
      if (filterAgent) params.agent_id = filterAgent;
      if (filterStatus) params.status = filterStatus;

      const response = await getAgentTasks(params);
      setTasks(response.data);

      // Calculate status counts from all tasks (without filters)
      const allTasksResponse = await getAgentTasks({ limit: 1000 });
      const counts: AgentTaskStatusCounts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
        total: allTasksResponse.data.length,
      };
      allTasksResponse.data.forEach((task) => {
        counts[task.status]++;
      });
      setStatusCounts(counts);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setMessage({ type: "error", text: "Failed to load tasks" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, filterAgent, filterStatus]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadTasks();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleTaskClick = async (taskId: string) => {
    try {
      const response = await getAgentTask(taskId);
      setSelectedTask(response.data);
    } catch (error) {
      console.error("Failed to load task details:", error);
      setMessage({ type: "error", text: "Failed to load task details" });
    }
  };

  const handleTaskCreated = () => {
    setShowCreateForm(false);
    setMessage({ type: "success", text: "Task created successfully!" });
    loadTasks();
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
              You must be logged in to access the Agent Control Center.
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
              You need Founder or Brand Admin role to access the Agent Control Center.
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
            <Link href="/admin/frontend" className="hover:text-emerald-500 transition-colors">
              Frontend Config
            </Link>
            <Link href="/admin/agents/tasks" className="text-emerald-500">
              Agent Tasks
            </Link>
            <Link href="/admin/agents/console" className="hover:text-emerald-500 transition-colors">
              Command Console
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">ZORA Agent Control Center</h1>
            <p className="text-gray-400">
              View, create, and manage tasks for all 6 ZORA agents.
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <TaskStatusCounts
                counts={statusCounts}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white transition-colors"
              >
                {showCreateForm ? "Hide Form" : "Create New Task"}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="mb-6">
              <CreateTaskForm
                onTaskCreated={handleTaskCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="p-4 border-b border-zinc-700 flex flex-wrap items-center gap-4">
              <h2 className="font-semibold">Agent Tasks</h2>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Agent:</label>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Agents</option>
                  {AGENTS.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as AgentTaskStatus | "")}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-sm text-gray-400">
                    <th className="p-3">Created</th>
                    <th className="p-3">Agent</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No tasks found. Create your first task above!
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="border-b border-zinc-700/50 hover:bg-zinc-700/30 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-sm text-gray-400">
                          {new Date(task.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className={`font-medium ${AGENT_COLORS[task.agent_id] || "text-gray-400"}`}>
                            {task.agent_id}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-gray-500">{task.task_type}</div>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="p-3 text-sm text-gray-400">{task.priority}</td>
                        <td className="p-3 text-sm text-gray-400">
                          {task.completed_at
                            ? new Date(task.completed_at).toLocaleDateString()
                            : "-"}
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
        ZORA CORE v0.20 - Agent Control Center v1
      </footer>

      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
