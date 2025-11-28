"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { canWrite } from "@/lib/auth";
import { getFrontendConfig, updateFrontendConfig } from "@/lib/api";
import type { HomePageConfig, ClimatePageConfig } from "@/lib/types";

const DEFAULT_HOME_CONFIG: HomePageConfig = {
  hero_title: "ZORA CORE",
  hero_subtitle: "Climate-first AI Operating System.",
  primary_cta_label: "Open Climate OS",
  primary_cta_link: "/climate",
  show_climate_dashboard: true,
  show_missions_section: true,
};

const DEFAULT_CLIMATE_CONFIG: ClimatePageConfig = {
  hero_title: "Climate OS",
  hero_subtitle: "Track your climate impact and complete missions to reduce your footprint. Every action counts in the fight against climate change.",
  show_profile_section: true,
  show_dashboard_section: true,
  show_missions_section: true,
};

type PageKey = "home" | "climate";

interface PageConfig {
  key: PageKey;
  label: string;
  description: string;
}

const PAGES: PageConfig[] = [
  {
    key: "home",
    label: "Dashboard (Home)",
    description: "Configure the main dashboard page hero and section visibility",
  },
  {
    key: "climate",
    label: "Climate OS",
    description: "Configure the Climate OS page hero and section visibility",
  },
];

function HomeConfigForm({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: HomePageConfig;
  onChange: (config: HomePageConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Hero Title</label>
        <input
          type="text"
          value={config.hero_title}
          onChange={(e) => onChange({ ...config, hero_title: e.target.value })}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Hero Subtitle</label>
        <textarea
          value={config.hero_subtitle}
          onChange={(e) => onChange({ ...config, hero_subtitle: e.target.value })}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Primary CTA Label</label>
          <input
            type="text"
            value={config.primary_cta_label}
            onChange={(e) => onChange({ ...config, primary_cta_label: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Primary CTA Link</label>
          <input
            type="text"
            value={config.primary_cta_link}
            onChange={(e) => onChange({ ...config, primary_cta_link: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_climate_dashboard}
            onChange={(e) => onChange({ ...config, show_climate_dashboard: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm">Show Climate Dashboard Summary</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_missions_section}
            onChange={(e) => onChange({ ...config, show_missions_section: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm">Show Recent Missions Section</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

function ClimateConfigForm({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: ClimatePageConfig;
  onChange: (config: ClimatePageConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Hero Title</label>
        <input
          type="text"
          value={config.hero_title}
          onChange={(e) => onChange({ ...config, hero_title: e.target.value })}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Hero Subtitle</label>
        <textarea
          value={config.hero_subtitle}
          onChange={(e) => onChange({ ...config, hero_subtitle: e.target.value })}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded focus:border-emerald-500 focus:outline-none"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_profile_section}
            onChange={(e) => onChange({ ...config, show_profile_section: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm">Show Climate Profile Section</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_dashboard_section}
            onChange={(e) => onChange({ ...config, show_dashboard_section: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm">Show Dashboard Summary Section</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_missions_section}
            onChange={(e) => onChange({ ...config, show_missions_section: e.target.checked })}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm">Show Missions Section</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

export default function FrontendConfigPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedPage, setSelectedPage] = useState<PageKey>("home");
  const [homeConfig, setHomeConfig] = useState<HomePageConfig>(DEFAULT_HOME_CONFIG);
  const [climateConfig, setClimateConfig] = useState<ClimatePageConfig>(DEFAULT_CLIMATE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    async function loadConfigs() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const [homeResponse, climateResponse] = await Promise.all([
          getFrontendConfig("home"),
          getFrontendConfig("climate"),
        ]);

        setHomeConfig({ ...DEFAULT_HOME_CONFIG, ...(homeResponse.config as HomePageConfig) });
        setClimateConfig({ ...DEFAULT_CLIMATE_CONFIG, ...(climateResponse.config as ClimatePageConfig) });
      } catch (error) {
        console.error("Failed to load configs:", error);
        setMessage({ type: "error", text: "Failed to load configurations" });
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadConfigs();
    }
  }, [isAuthenticated, authLoading]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const config = selectedPage === "home" ? homeConfig : climateConfig;
      await updateFrontendConfig(selectedPage, { config });
      setMessage({ type: "success", text: `${selectedPage === "home" ? "Dashboard" : "Climate OS"} configuration saved successfully!` });
    } catch (error) {
      console.error("Failed to save config:", error);
      setMessage({ type: "error", text: "Failed to save configuration" });
    } finally {
      setSaving(false);
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
              You must be logged in to access the Frontend Config admin page.
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
              You need Founder or Brand Admin role to access the Frontend Config admin page.
            </p>
            <Link href="/dashboard" className="btn-primary inline-block">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentConfig = selectedPage === "home" ? homeConfig : climateConfig;

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
            <Link href="/admin/frontend" className="text-emerald-500">
              Frontend Config
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Frontend Configuration</h1>
            <p className="text-gray-400">
              Configure the frontend UI for your tenant. Changes are applied immediately.
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-lg font-semibold mb-4">Pages</h2>
              <div className="space-y-2">
                {PAGES.map((page) => (
                  <button
                    key={page.key}
                    onClick={() => setSelectedPage(page.key)}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      selectedPage === page.key
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                    }`}
                  >
                    <p className="font-medium">{page.label}</p>
                    <p className="text-xs opacity-75">{page.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="agent-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    {PAGES.find((p) => p.key === selectedPage)?.label} Configuration
                  </h2>
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="text-sm text-gray-400 hover:text-emerald-500 transition-colors"
                  >
                    {showJson ? "Hide JSON" : "Show JSON"}
                  </button>
                </div>

                {showJson && (
                  <div className="mb-4 p-4 bg-zinc-900 rounded overflow-x-auto">
                    <pre className="text-xs text-gray-400">
                      {JSON.stringify(currentConfig, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedPage === "home" ? (
                  <HomeConfigForm
                    config={homeConfig}
                    onChange={setHomeConfig}
                    onSave={handleSave}
                    saving={saving}
                  />
                ) : (
                  <ClimateConfigForm
                    config={climateConfig}
                    onChange={setClimateConfig}
                    onSave={handleSave}
                    saving={saving}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-4 text-center text-gray-500 text-sm">
        ZORA CORE v0.6 - Frontend Config Layer v0
      </footer>
    </div>
  );
}
