"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/auth";
import {
  createSuggestion,
  getSuggestions,
  getSuggestion,
  decideSuggestion,
} from "@/lib/api";
import type {
  AgentSuggestion,
  AgentSuggestionListItem,
  SuggestionStatus,
} from "@/lib/types";

type PageKey = "home" | "climate";

const PAGES: { key: PageKey; label: string }[] = [
  { key: "home", label: "Dashboard (Home)" },
  { key: "climate", label: "Climate OS" },
];

const STATUS_COLORS: Record<SuggestionStatus, string> = {
  proposed: "bg-yellow-600",
  applied: "bg-emerald-600",
  rejected: "bg-red-600",
};

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  proposed: "Pending Review",
  applied: "Applied",
  rejected: "Rejected",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function ConfigDiff({
  current,
  suggested,
}: {
  current: Record<string, unknown> | null;
  suggested: Record<string, unknown>;
}) {
  const currentConfig = current || {};
  const allKeys = new Set([
    ...Object.keys(currentConfig),
    ...Object.keys(suggested),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Current Config</h4>
        <div className="bg-zinc-900 p-3 rounded text-xs overflow-x-auto">
          <pre>{JSON.stringify(currentConfig, null, 2)}</pre>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Suggested Config</h4>
        <div className="bg-zinc-900 p-3 rounded text-xs overflow-x-auto">
          <pre>{JSON.stringify(suggested, null, 2)}</pre>
        </div>
      </div>
      <div className="col-span-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Changes</h4>
        <div className="space-y-1">
          {Array.from(allKeys).map((key) => {
            const oldVal = currentConfig[key];
            const newVal = suggested[key];
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);

            if (!changed) return null;

            return (
              <div
                key={key}
                className="flex items-center gap-2 text-sm bg-zinc-800 p-2 rounded"
              >
                <span className="font-mono text-emerald-400">{key}:</span>
                <span className="text-red-400 line-through">
                  {JSON.stringify(oldVal)}
                </span>
                <span className="text-gray-500">→</span>
                <span className="text-emerald-400">{JSON.stringify(newVal)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SuggestionDetail({
  suggestion,
  onApply,
  onReject,
  onClose,
  processing,
}: {
  suggestion: AgentSuggestion;
  onApply: () => void;
  onReject: (reason?: string) => void;
  onClose: () => void;
  processing: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="agent-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Suggestion Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-400">Agent</span>
            <p className="font-medium">{suggestion.agent_id}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Target Page</span>
            <p className="font-medium">{suggestion.target_page || "Unknown"}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Status</span>
            <p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs ${
                  STATUS_COLORS[suggestion.status]
                }`}
              >
                {STATUS_LABELS[suggestion.status]}
              </span>
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Created</span>
            <p className="font-medium">{formatDate(suggestion.created_at)}</p>
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-400">Summary</span>
          <p className="mt-1">{suggestion.diff_summary || "No summary available"}</p>
        </div>

        <ConfigDiff
          current={suggestion.current_config}
          suggested={suggestion.suggested_config}
        />

        {suggestion.status === "proposed" && (
          <div className="flex gap-4 pt-4 border-t border-zinc-700">
            {!showRejectForm ? (
              <>
                <button
                  onClick={onApply}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                >
                  {processing ? "Processing..." : "Apply Suggestion"}
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                >
                  Reject
                </button>
              </>
            ) : (
              <div className="w-full space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-red-500 focus:outline-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onReject(rejectReason)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                  >
                    {processing ? "Processing..." : "Confirm Rejection"}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    disabled={processing}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {suggestion.status !== "proposed" && suggestion.decision_reason && (
          <div className="pt-4 border-t border-zinc-700">
            <span className="text-sm text-gray-400">Decision Reason</span>
            <p className="mt-1">{suggestion.decision_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutonomyPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [suggestions, setSuggestions] = useState<AgentSuggestionListItem[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AgentSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "all">("all");
  const [pageFilter, setPageFilter] = useState<PageKey | "all">("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadSuggestions();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, statusFilter, pageFilter]);

  async function loadSuggestions() {
    try {
      setLoading(true);
      const params: { status?: string; page?: string } = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (pageFilter !== "all") params.page = pageFilter;

      const response = await getSuggestions(params);
      setSuggestions(response.data);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setMessage({ type: "error", text: "Failed to load suggestions" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSuggestion(page: PageKey) {
    try {
      setGenerating(true);
      setMessage(null);
      const suggestion = await createSuggestion({ page, agent_id: "BALDUR" });
      setMessage({
        type: "success",
        text: `BALDUR generated a new suggestion for the ${page} page`,
      });
      await loadSuggestions();
      // Load full details
      const fullSuggestion = await getSuggestion(suggestion.id);
      setSelectedSuggestion(fullSuggestion);
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
      setMessage({ type: "error", text: "Failed to generate suggestion" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleViewSuggestion(id: string) {
    try {
      const suggestion = await getSuggestion(id);
      setSelectedSuggestion(suggestion);
    } catch (error) {
      console.error("Failed to load suggestion:", error);
      setMessage({ type: "error", text: "Failed to load suggestion details" });
    }
  }

  async function handleApply() {
    if (!selectedSuggestion) return;

    try {
      setProcessing(true);
      await decideSuggestion(selectedSuggestion.id, { decision: "apply" });
      setMessage({
        type: "success",
        text: `Suggestion applied! The ${selectedSuggestion.target_page} page config has been updated.`,
      });
      setSelectedSuggestion(null);
      await loadSuggestions();
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
      setMessage({ type: "error", text: "Failed to apply suggestion" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject(reason?: string) {
    if (!selectedSuggestion) return;

    try {
      setProcessing(true);
      await decideSuggestion(selectedSuggestion.id, { decision: "reject", reason });
      setMessage({ type: "success", text: "Suggestion rejected" });
      setSelectedSuggestion(null);
      await loadSuggestions();
    } catch (error) {
      console.error("Failed to reject suggestion:", error);
      setMessage({ type: "error", text: "Failed to reject suggestion" });
    } finally {
      setProcessing(false);
    }
  }

  if (authLoading) {
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
              You must be logged in to access the Agent Autonomy admin page.
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
              You need Founder or Brand Admin role to access the Agent Autonomy admin page.
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
            <Link href="/admin/frontend/autonomy" className="text-emerald-500">
              Agent Autonomy
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Agent Autonomy Layer</h1>
            <p className="text-gray-400">
              Review and approve frontend config suggestions from ZORA agents.
              Agents propose changes, but you decide what gets applied.
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Generate suggestions */}
            <div className="lg:col-span-1 space-y-4">
              <div className="agent-card">
                <h2 className="text-lg font-semibold mb-4">Generate Suggestions</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Ask BALDUR to analyze a page and suggest improvements to the frontend config.
                </p>
                <div className="space-y-2">
                  {PAGES.map((page) => (
                    <button
                      key={page.key}
                      onClick={() => handleGenerateSuggestion(page.key)}
                      disabled={generating}
                      className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:cursor-not-allowed rounded text-left transition-colors"
                    >
                      <p className="font-medium">{page.label}</p>
                      <p className="text-xs text-gray-400">
                        {generating ? "Generating..." : "Click to generate suggestion"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="agent-card">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as SuggestionStatus | "all")}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="proposed">Pending Review</option>
                      <option value="applied">Applied</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Page</label>
                    <select
                      value={pageFilter}
                      onChange={(e) => setPageFilter(e.target.value as PageKey | "all")}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="all">All Pages</option>
                      <option value="home">Dashboard (Home)</option>
                      <option value="climate">Climate OS</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Suggestions list or detail */}
            <div className="lg:col-span-2">
              {selectedSuggestion ? (
                <SuggestionDetail
                  suggestion={selectedSuggestion}
                  onApply={handleApply}
                  onReject={handleReject}
                  onClose={() => setSelectedSuggestion(null)}
                  processing={processing}
                />
              ) : (
                <div className="agent-card">
                  <h2 className="text-lg font-semibold mb-4">Suggestions</h2>
                  {loading ? (
                    <div className="text-center py-8 text-gray-400">Loading suggestions...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No suggestions found.</p>
                      <p className="text-sm mt-2">
                        Generate a suggestion using the buttons on the left.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleViewSuggestion(suggestion.id)}
                          className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded text-left transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{suggestion.agent_id}</span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                STATUS_COLORS[suggestion.status]
                              }`}
                            >
                              {STATUS_LABELS[suggestion.status]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-1">
                            Page: {suggestion.target_page || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-300 line-clamp-2">
                            {suggestion.diff_summary || "No summary"}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(suggestion.created_at)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.7 - Agent Autonomy Layer v0
      </footer>
    </div>
  );
}
