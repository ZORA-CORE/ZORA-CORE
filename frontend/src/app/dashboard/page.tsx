'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getImpactSummary, getSystemMetrics } from '@/lib/api';
import type { ImpactSummary, SystemMetrics } from '@/lib/types';
import {
  WelcomeCard,
  ClimateImpactCard,
  GoesGreenCard,
  ZoraShopCard,
  FoundationCard,
  AcademyCard,
  AgentsAutonomyCard,
} from './components';

const GlobeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const CpuChipIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const JournalIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function DeskPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect unauthenticated users to login
  // CRITICAL: Only redirect when auth state is fully loaded to prevent redirect loops
  useEffect(() => {
    // Don't redirect while auth state is loading
    if (authLoading) {
      return;
    }
    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated) return;

      setDataLoading(true);
      setError(null);

      try {
        const [impactRes, metricsRes] = await Promise.all([
          getImpactSummary().catch(() => null),
          getSystemMetrics().catch(() => null),
        ]);

        if (impactRes?.data) {
          setImpactSummary(impactRes.data);
        }
        if (metricsRes?.data) {
          setSystemMetrics(metricsRes.data);
        }
      } catch (err) {
        console.error('Failed to load desk data:', err);
        setError('Failed to load some data. Showing available information.');
      } finally {
        setDataLoading(false);
      }
    }

    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const climateStats = impactSummary?.climate_os || {
    profiles_count: 0,
    missions_count: 0,
    missions_completed: 0,
    missions_in_progress: 0,
    total_impact_kgco2: 0,
  };

  const goesGreenStats = impactSummary?.goes_green || {
    profiles_count: 0,
    actions_count: 0,
    estimated_energy_savings_kwh: 0,
    green_share_percent: 0,
  };

  const shopStats = impactSummary?.zora_shop || {
    brands_count: 0,
    products_count: 0,
    active_projects_count: 0,
    total_gmv: 0,
  };

  const foundationStats = impactSummary?.foundation || {
    projects_count: 0,
    contributions_count: 0,
    total_contributions_amount: 0,
    total_impact_kgco2: 0,
  };

  const academyStats = impactSummary?.academy || {
    topics_count: 0,
    lessons_count: 0,
    learning_paths_count: 0,
    enrollments_count: 0,
  };

  const agentMetrics: SystemMetrics = systemMetrics || {
    agent_commands: { total: 0, pending: 0, completed: 0, failed: 0 },
    agent_tasks: { total: 0, pending: 0, in_progress: 0, completed: 0, failed: 0 },
    schedules: { total: 0, active: 0, due_now: 0 },
    safety_policies: { total: 0, active: 0 },
    pending_approvals: 0,
    computed_at: '',
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-10">
        {/* ===== HERO WELCOME SECTION ===== */}
        <WelcomeCard user={user} />

        {error && (
          <div className="p-4 bg-[var(--z-amber-soft)] border border-[var(--z-amber-border)] rounded-xl text-[var(--z-amber)]">
            {error}
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* ===== KPI TILES SECTION ===== */}
            <section className="relative">
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/30" />
                <div>
                  <h2 className="text-2xl font-bold text-[var(--z-text-primary)] tracking-tight">System Overview</h2>
                  <p className="text-sm text-[var(--z-text-tertiary)]">Real-time metrics across all modules</p>
                </div>
              </div>
              
              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <ClimateImpactCard stats={climateStats} />
                <GoesGreenCard stats={goesGreenStats} />
                <ZoraShopCard stats={shopStats} />
                <FoundationCard stats={foundationStats} />
                <AcademyCard stats={academyStats} />
                <AgentsAutonomyCard metrics={agentMetrics} />
              </div>
            </section>

            {/* ===== QUICK ACTIONS & STATUS SECTION ===== */}
            <section className="relative">
              {/* Section Background */}
              <div className="absolute inset-0 bg-[var(--z-bg-surface)] rounded-3xl -z-10" />
              
              <div className="p-8">
                {/* Section Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[var(--z-violet)] to-[var(--z-violet)]/30" />
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--z-text-primary)] tracking-tight">Command Center</h2>
                    <p className="text-sm text-[var(--z-text-tertiary)]">Quick actions and system status</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Quick Actions */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-[var(--z-text-muted)] uppercase tracking-wider">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        href="/climate"
                        className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] hover:border-[var(--z-emerald-border)] hover:bg-[var(--z-emerald-soft)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="w-14 h-14 rounded-xl bg-[var(--z-emerald-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <span className="text-[var(--z-emerald)]"><GlobeIcon /></span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--z-text-secondary)] group-hover:text-[var(--z-text-primary)]">Start Climate Plan</span>
                      </Link>
                      <Link
                        href="/simulation"
                        className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] hover:border-[var(--z-sky-border)] hover:bg-[var(--z-sky-soft)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="w-14 h-14 rounded-xl bg-[var(--z-sky-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-[var(--z-sky)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-[var(--z-text-secondary)] group-hover:text-[var(--z-text-primary)]">Simulation Studio</span>
                      </Link>
                      <Link
                        href="/goes-green"
                        className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/10 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-[var(--z-text-secondary)] group-hover:text-[var(--z-text-primary)]">GOES GREEN</span>
                      </Link>
                      <Link
                        href="/foundation"
                        className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] hover:border-[var(--z-rose-border)] hover:bg-[var(--z-rose-soft)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="w-14 h-14 rounded-xl bg-[var(--z-rose-soft)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-[var(--z-rose)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-[var(--z-text-secondary)] group-hover:text-[var(--z-text-primary)]">Foundation Impact</span>
                      </Link>
                    </div>
                  </div>

                  {/* System Status */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-[var(--z-text-muted)] uppercase tracking-wider">System Status</h3>
                    <div className="bg-[var(--z-bg-card)] border border-[var(--z-border-default)] rounded-2xl p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-[var(--z-emerald)] animate-pulse" />
                          <span className="text-sm text-[var(--z-text-secondary)]">Active Schedules</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--z-text-primary)]">
                          {agentMetrics.schedules.active} / {agentMetrics.schedules.total}
                        </span>
                      </div>
                      <div className="h-px bg-[var(--z-border-subtle)]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${agentMetrics.schedules.due_now > 0 ? 'bg-[var(--z-amber)] animate-pulse' : 'bg-[var(--z-text-muted)]'}`} />
                          <span className="text-sm text-[var(--z-text-secondary)]">Due Now</span>
                        </div>
                        <span className={`text-sm font-bold ${agentMetrics.schedules.due_now > 0 ? 'text-[var(--z-amber)]' : 'text-[var(--z-text-primary)]'}`}>
                          {agentMetrics.schedules.due_now}
                        </span>
                      </div>
                      <div className="h-px bg-[var(--z-border-subtle)]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-[var(--z-violet)]" />
                          <span className="text-sm text-[var(--z-text-secondary)]">Safety Policies</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--z-text-primary)]">
                          {agentMetrics.safety_policies.active} active
                        </span>
                      </div>
                      <div className="h-px bg-[var(--z-border-subtle)]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-[var(--z-sky)]" />
                          <span className="text-sm text-[var(--z-text-secondary)]">Tasks In Progress</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--z-text-primary)]">
                          {agentMetrics.agent_tasks.in_progress}
                        </span>
                      </div>
                      <div className="h-px bg-[var(--z-border-subtle)]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${agentMetrics.agent_tasks.failed > 0 ? 'bg-[var(--z-rose)]' : 'bg-[var(--z-text-muted)]'}`} />
                          <span className="text-sm text-[var(--z-text-secondary)]">Failed Tasks</span>
                        </div>
                        <span className={`text-sm font-bold ${agentMetrics.agent_tasks.failed > 0 ? 'text-[var(--z-rose)]' : 'text-[var(--z-text-primary)]'}`}>
                          {agentMetrics.agent_tasks.failed}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
