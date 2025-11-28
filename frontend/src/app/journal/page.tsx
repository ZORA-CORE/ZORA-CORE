"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { getJournalEntries, ZoraApiError } from "@/lib/api";
import type { JournalEntry, JournalCategory } from "@/lib/types";

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

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const categoryColors: Record<JournalCategory, string> = {
    release: "bg-emerald-500",
    decision: "bg-blue-500",
    model_update: "bg-purple-500",
    experiment: "bg-amber-500",
    milestone: "bg-green-500",
    incident: "bg-red-500",
    config_change: "bg-cyan-500",
    agent_action: "bg-indigo-500",
    user_feedback: "bg-pink-500",
    system_event: "bg-gray-500",
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="agent-card">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`px-2 py-1 rounded text-xs text-white ${
            categoryColors[entry.category] || "bg-gray-500"
          }`}
        >
          {entry.category.replace("_", " ")}
        </span>
        <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{entry.title}</h3>
      {entry.body && (
        <p className="text-gray-400 text-sm mb-3">{entry.body}</p>
      )}
      {entry.author && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>By:</span>
          <span className="text-emerald-400">{entry.author}</span>
        </div>
      )}
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 10;

  const loadEntries = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const response = await getJournalEntries({ limit, offset: currentOffset });

      if (reset) {
        setEntries(response.data);
      } else {
        setEntries((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.pagination.has_more);
      setOffset(currentOffset + response.data.length);
    } catch (err) {
      const message = err instanceof ZoraApiError ? err.message : "Failed to load journal entries";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset]);

  useEffect(() => {
    loadEntries(true);
  }, []);

  const handleLoadMore = () => {
    loadEntries(false);
  };

  const handleRetry = () => {
    loadEntries(true);
  };

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
            <Link href="/climate" className="hover:text-emerald-500 transition-colors">
              Climate OS
            </Link>
            <Link href="/journal" className="text-emerald-500">
              Journal
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">ZORA Journal</h1>
            <p className="text-gray-400">
              System events, decisions, and milestones from ZORA CORE.
              Track the evolution of the AI operating system.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={handleRetry} />
          ) : entries.length === 0 ? (
            <div className="agent-card text-center text-gray-400">
              <p>No journal entries yet. The system will log important events here.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {entries.map((entry) => (
                  <JournalEntryCard key={entry.id} entry={entry} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed rounded text-white transition-colors"
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
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
