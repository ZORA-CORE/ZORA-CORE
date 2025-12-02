'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { t } from '@/lib/i18n';
import { getImpactSummary, getSystemMetrics } from '@/lib/api';
import type { ImpactSummary, SystemMetrics } from '@/lib/types';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  stats: { label: string; value: string | number }[];
  href: string;
  buttonLabel: string;
  secondaryButton?: { label: string; href: string };
  accentColor?: string;
}

function ModuleCard({
  title,
  description,
  icon,
  stats,
  href,
  buttonLabel,
  secondaryButton,
  accentColor = 'var(--primary)',
}: ModuleCardProps) {
  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)] truncate">{title}</h3>
          <p className="text-sm text-[var(--foreground)]/60 line-clamp-2">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--foreground)]/50 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-auto">
        <Button href={href} variant="primary" size="sm" className="flex-1">
          {buttonLabel}
        </Button>
        {secondaryButton && (
          <Button href={secondaryButton.href} variant="outline" size="sm">
            {secondaryButton.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

const GlobeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LeafIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const CpuChipIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

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

  const agentStats = systemMetrics || {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            {t.desk.title}
          </h1>
          <p className="text-[var(--foreground)]/60">
            {user ? t.desk.welcomeBack : t.desk.subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg text-[var(--accent)]">
            {error}
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ModuleCard
              title={t.cards.climate.title}
              description={t.cards.climate.description}
              icon={<GlobeIcon />}
              accentColor="#10b981"
              stats={[
                { label: t.cards.climate.profiles, value: climateStats.profiles_count },
                { label: t.cards.climate.missions, value: climateStats.missions_count },
                { label: t.cards.climate.inProgress, value: climateStats.missions_in_progress },
                { label: t.cards.climate.co2Impact, value: `${formatNumber(climateStats.total_impact_kgco2)} kg` },
              ]}
              href="/climate"
              buttonLabel={t.cards.climate.viewClimate}
            />

            <ModuleCard
              title={t.cards.goesGreen.title}
              description={t.cards.goesGreen.description}
              icon={<LeafIcon />}
              accentColor="#22c55e"
              stats={[
                { label: t.cards.goesGreen.profiles, value: goesGreenStats.profiles_count },
                { label: 'Actions', value: goesGreenStats.actions_count },
                { label: t.cards.goesGreen.energySavings, value: `${formatNumber(goesGreenStats.estimated_energy_savings_kwh)} kWh` },
                { label: t.cards.goesGreen.greenShare, value: `${goesGreenStats.green_share_percent}%` },
              ]}
              href="/goes-green"
              buttonLabel={t.cards.goesGreen.viewGoesGreen}
            />

            <ModuleCard
              title={t.cards.zoraShop.title}
              description={t.cards.zoraShop.description}
              icon={<ShoppingBagIcon />}
              accentColor="#6366f1"
              stats={[
                { label: t.cards.zoraShop.brands, value: shopStats.brands_count },
                { label: t.cards.zoraShop.products, value: shopStats.products_count },
                { label: t.cards.zoraShop.activeProjects, value: shopStats.active_projects_count },
                { label: 'GMV', value: `$${formatNumber(shopStats.total_gmv)}` },
              ]}
              href="/zora-shop"
              buttonLabel={t.cards.zoraShop.viewShop}
              secondaryButton={{ label: 'Mashups', href: '/mashups' }}
            />

            <ModuleCard
              title={t.cards.foundation.title}
              description={t.cards.foundation.description}
              icon={<HeartIcon />}
              accentColor="#ec4899"
              stats={[
                { label: t.cards.foundation.projects, value: foundationStats.projects_count },
                { label: t.cards.foundation.contributions, value: foundationStats.contributions_count },
                { label: 'Amount', value: `$${formatNumber(foundationStats.total_contributions_amount)}` },
                { label: t.cards.foundation.impact, value: `${formatNumber(foundationStats.total_impact_kgco2)} kg` },
              ]}
              href="/foundation"
              buttonLabel={t.cards.foundation.viewFoundation}
            />

            <ModuleCard
              title={t.cards.academy.title}
              description={t.cards.academy.description}
              icon={<AcademicCapIcon />}
              accentColor="#f59e0b"
              stats={[
                { label: t.cards.academy.topics, value: academyStats.topics_count },
                { label: t.cards.academy.lessons, value: academyStats.lessons_count },
                { label: t.cards.academy.learningPaths, value: academyStats.learning_paths_count },
                { label: 'Enrollments', value: academyStats.enrollments_count },
              ]}
              href="/academy"
              buttonLabel={t.cards.academy.viewAcademy}
            />

            <ModuleCard
              title={t.cards.agents.title}
              description={t.cards.agents.description}
              icon={<CpuChipIcon />}
              accentColor="#8b5cf6"
              stats={[
                { label: t.cards.agents.commands, value: agentStats.agent_commands.total },
                { label: t.cards.agents.pendingTasks, value: agentStats.agent_tasks.pending },
                { label: t.cards.agents.completedTasks, value: agentStats.agent_tasks.completed },
                { label: t.cards.agents.pendingApproval, value: agentStats.pending_approvals },
              ]}
              href="/agents"
              buttonLabel={t.cards.agents.viewAgents}
              secondaryButton={{ label: 'Console', href: '/admin/agents/console' }}
            />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="default" padding="md">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/climate"
                className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/5 transition-colors text-center"
              >
                <GlobeIcon />
                <span className="block mt-2 text-sm text-[var(--foreground)]/70">New Mission</span>
              </Link>
              <Link
                href="/admin/agents/console"
                className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/5 transition-colors text-center"
              >
                <CpuChipIcon />
                <span className="block mt-2 text-sm text-[var(--foreground)]/70">Agent Console</span>
              </Link>
              <Link
                href="/mashups"
                className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/5 transition-colors text-center"
              >
                <ShoppingBagIcon />
                <span className="block mt-2 text-sm text-[var(--foreground)]/70">Browse Mashups</span>
              </Link>
              <Link
                href="/journal"
                className="flex flex-col items-center p-4 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)]/5 transition-colors text-center"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="block mt-2 text-sm text-[var(--foreground)]/70">View Journal</span>
              </Link>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]/60">Active Schedules</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {agentStats.schedules.active} / {agentStats.schedules.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]/60">Due Now</span>
                <span className={`text-sm font-medium ${agentStats.schedules.due_now > 0 ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                  {agentStats.schedules.due_now}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]/60">Safety Policies</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {agentStats.safety_policies.active} active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]/60">Tasks In Progress</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {agentStats.agent_tasks.in_progress}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]/60">Failed Tasks</span>
                <span className={`text-sm font-medium ${agentStats.agent_tasks.failed > 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'}`}>
                  {agentStats.agent_tasks.failed}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
