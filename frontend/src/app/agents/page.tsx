"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  getAgents,
  getAgentMemory,
  semanticSearchAgentMemory,
  ZoraApiError,
} from "@/lib/api";
import type {
  Agent,
  MemoryEvent,
  MemoryEventWithSimilarity,
  PaginatedResponse,
} from "@/lib/types";

type ViewMode = "recent" | "search";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>
  );
}

function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
      <p className="text-red-400 mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function MemoryTypeTag({ type }: { type: string }) {
  const colors: Record<string, string> = {
    decision: "bg-blue-500/20 text-blue-400",
    reflection: "bg-purple-500/20 text-purple-400",
    artifact: "bg-amber-500/20 text-amber-400",
    conversation: "bg-green-500/20 text-green-400",
    plan: "bg-cyan-500/20 text-cyan-400",
    result: "bg-emerald-500/20 text-emerald-400",
    research: "bg-indigo-500/20 text-indigo-400",
    design: "bg-pink-500/20 text-pink-400",
    safety_review: "bg-red-500/20 text-red-400",
    climate_data: "bg-teal-500/20 text-teal-400",
    brand_data: "bg-orange-500/20 text-orange-400",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs ${colors[type] || "bg-zinc-700 text-gray-400"}`}
    >
      {type.replace("_", " ")}
    </span>
  );
}

function MemoryEventCard({
  memory,
  showSimilarity = false,
}: {
  memory: MemoryEvent | MemoryEventWithSimilarity;
  showSimilarity?: boolean;
}) {
  const similarity =
    showSimilarity && "similarity" in memory ? memory.similarity : null;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <MemoryTypeTag type={memory.memory_type} />
          {memory.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
        {similarity !== null && (
          <span className="text-xs text-emerald-400 whitespace-nowrap">
            {(similarity * 100).toFixed(1)}% match
          </span>
        )}
      </div>
      <p className="text-gray-300 text-sm mb-2 line-clamp-3">{memory.content}</p>
      <p className="text-xs text-gray-500">
        {new Date(memory.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isSelected
          ? "bg-zinc-800 border-emerald-500"
          : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full ${agent.color} flex items-center justify-center text-white font-bold`}
        >
          {agent.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{agent.name}</h3>
          <p className="text-sm text-gray-400 truncate">{agent.role}</p>
        </div>
      </div>
    </button>
  );
}

function AgentDetailPanel({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("recent");
  const [memories, setMemories] = useState<MemoryEvent[]>([]);
  const [searchResults, setSearchResults] = useState<MemoryEventWithSimilarity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<MemoryEvent>["pagination"] | null>(null);

  const loadRecentMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAgentMemory(agent.id, { limit: 50 });
      setMemories(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const message =
        err instanceof ZoraApiError
          ? err.message
          : "Failed to load memories";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [agent.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await semanticSearchAgentMemory(
        agent.id,
        searchQuery,
        20
      );
      setSearchResults(response.data);
      setViewMode("search");
    } catch (err) {
      const message =
        err instanceof ZoraApiError
          ? err.message
          : "Failed to perform search";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecentMemories();
  }, [loadRecentMemories]);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full ${agent.color} flex items-center justify-center text-white text-xl font-bold`}
            >
              {agent.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <p className="text-gray-400">{agent.role}</p>
              <p className="text-sm text-gray-500">{agent.pronouns}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-gray-300 text-sm">{agent.description}</p>
      </div>

      <div className="p-4 border-b border-zinc-700">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search this agent's memory..."
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="border-b border-zinc-700">
        <div className="flex">
          <button
            onClick={() => setViewMode("recent")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "recent"
                ? "text-emerald-500 border-b-2 border-emerald-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Recent Memory ({pagination?.total || 0})
          </button>
          <button
            onClick={() => setViewMode("search")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "search"
                ? "text-emerald-500 border-b-2 border-emerald-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Search Results ({searchResults.length})
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[500px] overflow-y-auto">
        {error && <ErrorMessage message={error} onRetry={loadRecentMemories} />}

        {isLoading && <LoadingSpinner />}

        {!isLoading && !error && viewMode === "recent" && (
          <div className="space-y-3">
            {memories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No memories found for this agent yet.
              </p>
            ) : (
              memories.map((memory) => (
                <MemoryEventCard key={memory.id} memory={memory} />
              ))
            )}
          </div>
        )}

        {!isLoading && !error && viewMode === "search" && (
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchQuery
                  ? "No matching memories found. Try a different query."
                  : "Enter a query to search this agent's memory."}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-3">
                  Showing {searchResults.length} results for &quot;{searchQuery}&quot;
                </p>
                {searchResults.map((memory) => (
                  <MemoryEventCard
                    key={memory.id}
                    memory={memory}
                    showSimilarity
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAgents();
      setAgents(response.data);
    } catch (err) {
      const message =
        err instanceof ZoraApiError
          ? err.message
          : "Failed to load agents";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-emerald-500">ZORA</span> CORE
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/dashboard"
              className="hover:text-emerald-500 transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/agents" className="text-emerald-500">
              Agents
            </Link>
            <Link
              href="/climate"
              className="hover:text-emerald-500 transition-colors"
            >
              Climate OS
            </Link>
            <Link
              href="/journal"
              className="hover:text-emerald-500 transition-colors"
            >
              Journal
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">ZORA Agent Family</h1>
            <p className="text-gray-400">
              Meet the 6 core agents that power ZORA CORE. Click on an agent to
              view their memory and perform semantic searches.
            </p>
          </div>

          {error && <ErrorMessage message={error} onRetry={loadAgents} />}

          {isLoading && <LoadingSpinner />}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                <h2 className="text-lg font-semibold text-gray-300 mb-3">
                  Select an Agent
                </h2>
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onClick={() => setSelectedAgent(agent)}
                  />
                ))}
              </div>

              <div className="lg:col-span-2">
                {selectedAgent ? (
                  <AgentDetailPanel
                    agent={selectedAgent}
                    onClose={() => setSelectedAgent(null)}
                  />
                ) : (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                      Select an Agent
                    </h3>
                    <p className="text-gray-500">
                      Click on an agent from the list to view their recent
                      memories and perform semantic searches.
                    </p>
                  </div>
                )}
              </div>
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
