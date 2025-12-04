'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HeartIcon } from './icons';

interface FoundationStats {
  projects_count: number;
  contributions_count: number;
  total_contributions_amount: number;
  total_impact_kgco2: number;
  active_projects?: number;
  completed_projects?: number;
}

interface FoundationCardProps {
  stats: FoundationStats;
}

export function FoundationCard({ stats }: FoundationCardProps) {
  const hasContributions = stats.contributions_count > 0;
  const activeProjects = stats.active_projects || 0;
  const completedProjects = stats.completed_projects || 0;

  return (
    <Card variant="default" padding="md" className="flex flex-col h-full border-rose-500/20">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-rose-500/10">
          <span className="text-rose-500"><HeartIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Impact OS</h3>
          <p className="text-sm text-[var(--foreground)]/60">THE ZORA FOUNDATION</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {hasContributions ? (
          <>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4">
              <p className="text-sm text-[var(--foreground)]/60 mb-1">Your Contributions</p>
              <p className="text-2xl font-bold text-rose-400">
                €{formatNumber(stats.total_contributions_amount / 100)}
              </p>
              <p className="text-xs text-[var(--foreground)]/50 mt-1">
                {stats.contributions_count} donation{stats.contributions_count !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Projects Supported</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.projects_count}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">CO2 Impact</p>
                <p className="text-xl font-bold text-emerald-400">{formatImpact(stats.total_impact_kgco2)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href="/foundation?section=contributions"
                className="flex-1 text-center text-xs py-2 px-3 rounded bg-[var(--background)] text-[var(--foreground)]/70 hover:text-rose-400 transition-colors"
              >
                My Contributions
              </Link>
              <Link
                href="/foundation?section=impact"
                className="flex-1 text-center text-xs py-2 px-3 rounded bg-[var(--background)] text-[var(--foreground)]/70 hover:text-emerald-400 transition-colors"
              >
                View Impact
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Active Projects</p>
                <p className="text-xl font-bold text-emerald-400">{activeProjects}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Total Projects</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.projects_count}</p>
              </div>
            </div>

            <div className="bg-[var(--background)] rounded-lg p-3">
              <p className="text-xs text-[var(--foreground)]/50 mb-1">Est. Climate Impact</p>
              <p className="text-xl font-bold text-blue-400">{formatImpact(stats.total_impact_kgco2)}</p>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
              <p className="text-sm text-[var(--foreground)]/70">
                Support real climate projects through THE ZORA FOUNDATION. Every contribution creates measurable impact.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-2">
        <Button href="/foundation" variant="primary" size="sm" className="w-full bg-rose-600 hover:bg-rose-700">
          {hasContributions ? 'View Your Impact' : 'Explore Projects'}
        </Button>
        <div className="flex gap-2 text-xs">
          <Link
            href="/climate"
            className="flex-1 text-center py-1.5 text-[var(--foreground)]/50 hover:text-emerald-400 transition-colors"
          >
            Climate OS
          </Link>
          <Link
            href="/zora-shop"
            className="flex-1 text-center py-1.5 text-[var(--foreground)]/50 hover:text-amber-400 transition-colors"
          >
            ZORA SHOP
          </Link>
        </div>
      </div>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}

function formatImpact(kgCO2: number): string {
  if (kgCO2 >= 1000) {
    return (kgCO2 / 1000).toFixed(1) + 't';
  }
  return kgCO2.toFixed(0) + 'kg';
}

export default FoundationCard;
