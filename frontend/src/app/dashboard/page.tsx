'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getImpactSummary, getSystemMetrics } from '@/lib/api';
import type { ImpactSummary, SystemMetrics } from '@/lib/types';
import { useI18n } from '@/lib/I18nProvider';
import {
  WelcomeCard,
  ClimateImpactCard,
  GoesGreenCard,
  ZoraShopCard,
  FoundationCard,
  AcademyCard,
  AgentsAutonomyCard,
} from './components';

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

  const { t } = useI18n();

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-8">
        <WelcomeCard user={user} />

        {error && (
          <div className="p-4 bg-[var(--z-amber-soft)] border border-[var(--z-amber-border)] rounded-[var(--z-radius-lg)] text-[var(--z-amber)]">
            {error}
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--z-emerald)] rounded-full" />
                <h2 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('desk.sections.climateEnergy', 'Climate & Energy')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ClimateImpactCard stats={climateStats} />
                <GoesGreenCard stats={goesGreenStats} />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--z-violet)] rounded-full" />
                <h2 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('desk.sections.brandsImpact', 'Brands & Impact')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ZoraShopCard stats={shopStats} />
                <FoundationCard stats={foundationStats} />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--z-amber)] rounded-full" />
                <h2 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('desk.sections.learnExplore', 'Learn & Explore')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AcademyCard stats={academyStats} />
                <SimulationCard />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[var(--z-sky)] rounded-full" />
                <h2 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('desk.sections.brainSystem', 'Brain & System')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AgentsAutonomyCard metrics={agentMetrics} />
                <SystemStatusCard metrics={agentMetrics} />
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SimulationCard() {
  const { t } = useI18n();
  return (
    <div className="bg-[var(--z-bg-surface)] border border-[var(--z-border-default)] rounded-[var(--z-radius-xl)] p-6 flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-sky-soft)]">
          <svg className="w-6 h-6 text-[var(--z-sky)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('simulation.title', 'Simulation Studio')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('simulation.subtitle', 'Model climate scenarios')}</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-[var(--z-sky-soft)] border border-[var(--z-sky-border)] rounded-[var(--z-radius-md)] p-4 text-center">
          <p className="text-sm text-[var(--z-text-secondary)]">
            Run what-if scenarios to explore climate impact pathways and optimize your sustainability strategy.
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)]">
        <a 
          href="/simulation" 
          className="block w-full text-center py-2 px-4 bg-[var(--z-sky)] text-white rounded-[var(--z-radius-md)] text-sm font-medium hover:bg-[var(--z-sky)]/90 transition-colors"
        >
          Open Studio
        </a>
      </div>
    </div>
  );
}

function SystemStatusCard({ metrics }: { metrics: SystemMetrics }) {
  const { t } = useI18n();
  return (
    <div className="bg-[var(--z-bg-surface)] border border-[var(--z-border-default)] rounded-[var(--z-radius-xl)] p-6 flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-bg-elevated)]">
          <svg className="w-6 h-6 text-[var(--z-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('system.title', 'System Status')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('system.subtitle', 'ZORA OS health overview')}</p>
        </div>
      </div>
      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between py-2 border-b border-[var(--z-border-subtle)]">
          <span className="text-sm text-[var(--z-text-tertiary)]">Active Schedules</span>
          <span className="text-sm font-medium text-[var(--z-text-primary)]">
            {metrics.schedules.active} / {metrics.schedules.total}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-[var(--z-border-subtle)]">
          <span className="text-sm text-[var(--z-text-tertiary)]">Due Now</span>
          <span className={`text-sm font-medium ${metrics.schedules.due_now > 0 ? 'text-[var(--z-amber)]' : 'text-[var(--z-text-primary)]'}`}>
            {metrics.schedules.due_now}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-[var(--z-border-subtle)]">
          <span className="text-sm text-[var(--z-text-tertiary)]">Safety Policies</span>
          <span className="text-sm font-medium text-[var(--z-emerald)]">
            {metrics.safety_policies.active} active
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-[var(--z-border-subtle)]">
          <span className="text-sm text-[var(--z-text-tertiary)]">Tasks In Progress</span>
          <span className="text-sm font-medium text-[var(--z-text-primary)]">
            {metrics.agent_tasks.in_progress}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-[var(--z-text-tertiary)]">Failed Tasks</span>
          <span className={`text-sm font-medium ${metrics.agent_tasks.failed > 0 ? 'text-[var(--z-rose)]' : 'text-[var(--z-text-primary)]'}`}>
            {metrics.agent_tasks.failed}
          </span>
        </div>
      </div>
    </div>
  );
}
