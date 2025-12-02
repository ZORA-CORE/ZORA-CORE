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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
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
      <div className="p-6 lg:p-8">
        <WelcomeCard user={user} />

        {error && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600">
            {error}
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ClimateImpactCard stats={climateStats} />
              <GoesGreenCard stats={goesGreenStats} />
              <ZoraShopCard stats={shopStats} />
              <FoundationCard stats={foundationStats} />
              <AcademyCard stats={academyStats} />
              <AgentsAutonomyCard metrics={agentMetrics} />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card variant="default" padding="md">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/climate"
                    className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-emerald-500/5 transition-colors text-center group"
                  >
                    <span className="text-emerald-500"><GlobeIcon /></span>
                    <span className="block mt-2 text-sm text-[var(--foreground)]/70 group-hover:text-[var(--foreground)]">New Mission</span>
                  </Link>
                  <Link
                    href="/admin/agents/console"
                    className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-violet-500/5 transition-colors text-center group"
                  >
                    <span className="text-violet-500"><CpuChipIcon /></span>
                    <span className="block mt-2 text-sm text-[var(--foreground)]/70 group-hover:text-[var(--foreground)]">Agent Console</span>
                  </Link>
                  <Link
                    href="/mashups"
                    className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-indigo-500/5 transition-colors text-center group"
                  >
                    <span className="text-indigo-500"><ShoppingBagIcon /></span>
                    <span className="block mt-2 text-sm text-[var(--foreground)]/70 group-hover:text-[var(--foreground)]">Browse Mashups</span>
                  </Link>
                  <Link
                    href="/journal"
                    className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-amber-500/5 transition-colors text-center group"
                  >
                    <span className="text-amber-500"><JournalIcon /></span>
                    <span className="block mt-2 text-sm text-[var(--foreground)]/70 group-hover:text-[var(--foreground)]">View Journal</span>
                  </Link>
                </div>
              </Card>

              <Card variant="default" padding="md">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground)]/60">Active Schedules</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {agentMetrics.schedules.active} / {agentMetrics.schedules.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground)]/60">Due Now</span>
                    <span className={`text-sm font-medium ${agentMetrics.schedules.due_now > 0 ? 'text-amber-500' : 'text-[var(--foreground)]'}`}>
                      {agentMetrics.schedules.due_now}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground)]/60">Safety Policies</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {agentMetrics.safety_policies.active} active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground)]/60">Tasks In Progress</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {agentMetrics.agent_tasks.in_progress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground)]/60">Failed Tasks</span>
                    <span className={`text-sm font-medium ${agentMetrics.agent_tasks.failed > 0 ? 'text-rose-500' : 'text-[var(--foreground)]'}`}>
                      {agentMetrics.agent_tasks.failed}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
