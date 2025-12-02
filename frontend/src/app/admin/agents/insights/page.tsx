"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/auth";
import { getAgentInsights, getAgentInsight, decideAgentInsight } from "@/lib/api";
import type {
  AgentInsightListItem,
  AgentInsight,
  AgentInsightStatus,
  AgentInsightCategory,
  AgentInsightStatusCounts,
} from "@/lib/types";

const AGENTS = ["ODIN", "THOR", "FREYA", "BALDUR", "HEIMDALL", "TYR", "EIVOR"];

const CATEGORIES: { value: AgentInsightCategory; label: string }[] = [
  { value: "climate_mission_suggestion", label: "Climate Mission" },
  { value: "frontend_improvement", label: "Frontend Improvement" },
  { value: "plan", label: "Plan" },
  { value: "summary", label: "Summary" },
  { value: "system_health", label: "System Health" },
  { value: "safety_warning", label: "Safety Warning" },
];

const STATUS_COLORS: Record<AgentInsightStatus, string> = {
  proposed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  implemented: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const CATEGORY_COLORS: Record<AgentInsightCategory, string> = {
  climate_mission_suggestion: "bg-green-500/20 text-green-400 border-green-500/30",
  frontend_improvement: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  plan: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  summary: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  system_health: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  safety_warning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
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

function formatCategoryLabel(category: AgentInsightCategory): string {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category.replace(/_/g, " ");
}

function StatusBadge({ status }: { status: AgentInsightStatus }) {
  return (
    <span className={`px-2 py-1 text-xs rounded border ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: AgentInsightCategory }) {
  return (
    <span className={`px-2 py-1 text-xs rounded border ${CATEGORY_COLORS[category]}`}>
      {formatCategoryLabel(category)}
    </span>
  );
}

function InsightDetailPanel({
  insight,
  onClose,
  onDecision,
  deciding,
}: {
  insight: AgentInsight | null;
  onClose: () => void;
  onDecision: (decision: "accept" | "reject", reason?: string) => void;
  deciding: boolean;
}) {
  const [reason, setReason] = useState("");

  if (!insight) return null;

  const canDecide = insight.status === "proposed";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Insight Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-semibold ${AGENT_COLORS[insight.agent_id] || "text-gray-400"}`}>
              {insight.agent_id}
            </span>
            <StatusBadge status={insight.status} />
            <CategoryBadge category={insight.category} />
            {insight.impact_estimate_kgco2 && (
              <span className="text-emerald-400 text-sm">
                ~{insight.impact_estimate_kgco2} kg CO2
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium">{insight.title}</h3>
          </div>

          {insight.body && (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="p-4 bg-zinc-800 rounded border border-zinc-700 whitespace-pre-wrap">
                {insight.body}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created:</span>
              <p className="text-gray-300">{formatDate(insight.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <p className="text-gray-300">{formatDate(insight.updated_at)}</p>
            </div>
            {insight.source_task_id && (
              <div>
                <span className="text-gray-500">Source Task:</span>
                <p className="text-gray-300 text-xs">{insight.source_task_id}</p>
              </div>
            )}
            {insight.related_entity_type && (
              <div>
                <span className="text-gray-500">Related Entity:</span>
                <p className="text-gray-300">
                  {insight.related_entity_type}: {insight.related_entity_ref}
                </p>
              </div>
            )}
          </div>

          {insight.metadata && Object.keys(insight.metadata).length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Metadata:</span>
              <pre className="mt-1 p-3 bg-zinc-800 rounded text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(insight.metadata, null, 2)}
              </pre>
            </div>
          )}

          {canDecide && (
            <div className="border-t border-zinc-700 pt-4 space-y-3">
              <h4 className="font-medium">Make a Decision</h4>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                  rows={2}
                  placeholder="Why are you accepting or rejecting this insight?"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onDecision("accept", reason)}
                  disabled={deciding}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                >
                  {deciding ? "Processing..." : "Accept"}
                </button>
                <button
                  onClick={() => onDecision("reject", reason)}
                  disabled={deciding}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                >
                  {deciding ? "Processing..." : "Reject"}
                </button>
              </div>
              {insight.category === "climate_mission_suggestion" && (
                <p className="text-sm text-emerald-400">
                  Accepting this insight will automatically create a new climate mission.
                </p>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 pt-2 border-t border-zinc-700">
            Insight ID: {insight.id}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightStatusCounts({
  counts,
  onRefresh,
  refreshing,
}: {
  counts: AgentInsightStatusCounts;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Insight Status</h3>
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
          <div className="text-2xl font-bold text-yellow-400">{counts.proposed}</div>
          <div className="text-xs text-gray-500">Proposed</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-emerald-400">{counts.accepted}</div>
          <div className="text-xs text-gray-500">Accepted</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-red-400">{counts.rejected}</div>
          <div className="text-xs text-gray-500">Rejected</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-blue-400">{counts.implemented}</div>
          <div className="text-xs text-gray-500">Implemented</div>
        </div>
        <div className="text-center p-2 bg-zinc-900 rounded">
          <div className="text-2xl font-bold text-gray-300">{counts.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
    </div>
  );
}

export default function AgentInsightsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [insights, setInsights] = useState<AgentInsightListItem[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<AgentInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<AgentInsightStatus | "">("");
  const [filterCategory, setFilterCategory] = useState<AgentInsightCategory | "">("");

  // Status counts
  const [statusCounts, setStatusCounts] = useState<AgentInsightStatusCounts>({
    proposed: 0,
    accepted: 0,
    rejected: 0,
    implemented: 0,
    total: 0,
  });

  const loadInsights = useCallback(async () => {
    try {
      const response = await getAgentInsights({
        agent_id: filterAgent || undefined,
        status: filterStatus || undefined,
        category: filterCategory || undefined,
        limit: 100,
      });

      setInsights(response.data);

      // Calculate status counts from all insights (without filters for accurate counts)
      const allResponse = await getAgentInsights({ limit: 500 });
      const counts: AgentInsightStatusCounts = {
        proposed: 0,
        accepted: 0,
        rejected: 0,
        implemented: 0,
        total: allResponse.data.length,
      };
      allResponse.data.forEach((insight) => {
        counts[insight.status]++;
      });
      setStatusCounts(counts);
    } catch (err) {
      console.error("Failed to load insights:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load insights",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterAgent, filterStatus, filterCategory]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadInsights();
    }
  }, [authLoading, isAuthenticated, loadInsights]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInsights();
  };

  const handleInsightClick = async (insightId: string) => {
    try {
      const response = await getAgentInsight(insightId);
      setSelectedInsight(response.data);
    } catch (err) {
      console.error("Failed to load insight details:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load insight details",
      });
    }
  };

  const handleDecision = async (decision: "accept" | "reject", reason?: string) => {
    if (!selectedInsight) return;

    setDeciding(true);
    try {
      const response = await decideAgentInsight(selectedInsight.id, {
        decision,
        reason: reason || undefined,
      });

      setMessage({
        type: "success",
        text: `Insight ${decision}ed successfully${
          response.created_mission_id ? ". Climate mission created!" : ""
        }`,
      });

      setSelectedInsight(null);
      loadInsights();
    } catch (err) {
      console.error("Failed to process decision:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to process decision",
      });
    } finally {
      setDeciding(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-4">Please log in to access the Agent Insights.</p>
          <Link href="/login" className="text-emerald-500 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const hasWriteAccess = user && canWrite(user);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Agent Insights</h1>
            <p className="text-gray-400 mt-1">
              Review and approve AI-generated suggestions from ZORA agents
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/agents/tasks"
              className="text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View Tasks
            </Link>
            <Link
              href="/admin/setup"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Admin Setup
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded border ${
              message.type === "success"
                ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                : "bg-red-900/20 border-red-800 text-red-400"
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right text-sm opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <InsightStatusCounts
          counts={statusCounts}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        <div className="mt-6 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Agent</label>
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Agents</option>
                {AGENTS.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AgentInsightStatus | "")}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="proposed">Proposed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="implemented">Implemented</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as AgentInsightCategory | "")}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 rounded transition-colors"
            >
              {refreshing ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading insights...</div>
          ) : insights.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700 rounded-lg">
              <p className="text-gray-400 mb-2">No insights found</p>
              <p className="text-sm text-gray-500">
                Insights are created when agents process tasks. Try creating some agent tasks first.
              </p>
              <Link
                href="/admin/agents/tasks"
                className="inline-block mt-4 text-emerald-500 hover:underline"
              >
                Go to Agent Tasks
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  onClick={() => handleInsightClick(insight.id)}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`font-semibold ${AGENT_COLORS[insight.agent_id] || "text-gray-400"}`}>
                          {insight.agent_id}
                        </span>
                        <StatusBadge status={insight.status} />
                        <CategoryBadge category={insight.category} />
                      </div>
                      <h3 className="font-medium truncate">{insight.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{formatDate(insight.created_at)}</span>
                        {insight.impact_estimate_kgco2 && (
                          <span className="text-emerald-400">
                            ~{insight.impact_estimate_kgco2} kg CO2
                          </span>
                        )}
                      </div>
                    </div>
                    {insight.status === "proposed" && hasWriteAccess && (
                      <div className="text-yellow-400 text-sm">Needs Review</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <InsightDetailPanel
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
          onDecision={handleDecision}
          deciding={deciding}
        />
      </div>
    </div>
  );
}
