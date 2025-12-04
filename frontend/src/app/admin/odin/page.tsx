"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/auth";

interface AllowedDomain {
  id: string;
  domain: string;
  label: string | null;
  description: string | null;
  source: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface RegistryStats {
  total: number;
  enabled: number;
  disabled: number;
  by_source: Record<string, number>;
}

const SOURCE_COLORS: Record<string, string> = {
  hardcoded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  bootstrap_job: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  manual_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  env_seed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function SourceBadge({ source }: { source: string }) {
  const colorClass = SOURCE_COLORS[source] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return (
    <span className={`px-2 py-1 text-xs rounded border ${colorClass}`}>
      {source}
    </span>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`px-2 py-1 text-xs rounded border ${
        enabled
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          : "bg-red-500/20 text-red-400 border-red-500/30"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export default function OdinAdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterEnabled, setFilterEnabled] = useState<string>("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

  const loadDomains = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (filterSource) params.append("source", filterSource);
      if (filterEnabled) params.append("is_enabled", filterEnabled);

      const response = await fetch(`${apiBase}/api/admin/webtool/allowed-domains?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load domains");
      }

      const data = await response.json();
      setDomains(data.domains || []);
    } catch (error) {
      console.error("Failed to load domains:", error);
      setMessage({ type: "error", text: "Failed to load allowed domains" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, filterSource, filterEnabled, apiBase]);

  const loadStats = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${apiBase}/api/admin/webtool/registry-stats`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load stats");
      }

      const data = await response.json();
      setStats(data.registry || null);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, [isAuthenticated, apiBase]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDomains();
      loadStats();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadDomains, loadStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDomains();
    loadStats();
  };

  const handleToggleEnabled = async (domain: AllowedDomain) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/webtool/allowed-domains/${domain.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_enabled: !domain.is_enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update domain");
      }

      setMessage({
        type: "success",
        text: `Domain ${domain.domain} ${!domain.is_enabled ? "enabled" : "disabled"}`,
      });
      loadDomains();
      loadStats();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to toggle domain:", error);
      setMessage({ type: "error", text: "Failed to update domain" });
    }
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
              You must be logged in to access the ODIN Admin Console.
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
              You need founder or brand_admin role to access this page.
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
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold">
              <span className="text-emerald-500">ZORA</span> CORE
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">ODIN Admin</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/admin/agents/tasks" className="text-gray-400 hover:text-white transition-colors">
              Agent Tasks
            </Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-emerald-900/20 border border-emerald-700 text-emerald-400"
                  : "bg-red-900/20 border border-red-700 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">ODIN Web Ingestion</h1>
              <p className="text-gray-400 mt-1">
                Manage allowed domains for WebTool HTTP client
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-gray-400 text-sm">Total Domains</div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">{stats.enabled}</div>
                <div className="text-gray-400 text-sm">Enabled</div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">{stats.disabled}</div>
                <div className="text-gray-400 text-sm">Disabled</div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-sm space-y-1">
                  {Object.entries(stats.by_source || {}).map(([source, count]) => (
                    <div key={source} className="flex justify-between">
                      <span className="text-gray-400">{source}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
                <div className="text-gray-400 text-sm mt-1">By Source</div>
              </div>
            </div>
          )}

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Allowed Domains Registry</h2>
              <div className="flex items-center gap-4">
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                >
                  <option value="">All Sources</option>
                  <option value="hardcoded">Hardcoded</option>
                  <option value="bootstrap_job">Bootstrap Job</option>
                  <option value="manual_admin">Manual Admin</option>
                  <option value="env_seed">Env Seed</option>
                </select>
                <select
                  value={filterEnabled}
                  onChange={(e) => setFilterEnabled(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-gray-400 text-sm">
                    <th className="p-4">Domain</th>
                    <th className="p-4">Label</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No domains found. The registry will be seeded automatically on first use.
                      </td>
                    </tr>
                  ) : (
                    domains.map((domain) => (
                      <tr
                        key={domain.id}
                        className="border-b border-zinc-700/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-medium">{domain.domain}</div>
                          {domain.description && (
                            <div className="text-xs text-gray-500 mt-1">{domain.description}</div>
                          )}
                        </td>
                        <td className="p-4 text-gray-400">{domain.label || "-"}</td>
                        <td className="p-4">
                          <SourceBadge source={domain.source} />
                        </td>
                        <td className="p-4">
                          <EnabledBadge enabled={domain.is_enabled} />
                        </td>
                        <td className="p-4 text-gray-500 text-sm">
                          {formatDate(domain.created_at)}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleEnabled(domain)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              domain.is_enabled
                                ? "bg-red-900/30 hover:bg-red-900/50 text-red-400"
                                : "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400"
                            }`}
                          >
                            {domain.is_enabled ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>
              WebTool v2.0 uses this registry to control which domains ODIN can fetch content from.
              Domains are auto-added from curated bootstrap jobs and can be manually managed here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
