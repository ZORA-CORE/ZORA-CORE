'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HeartIcon } from './icons';

interface FoundationStats {
  projects_count: number;
  contributions_count: number;
  total_contributions_amount: number;
  total_impact_kgco2: number;
}

interface FoundationCardProps {
  stats: FoundationStats;
}

export function FoundationCard({ stats }: FoundationCardProps) {
  const hasContributions = stats.contributions_count > 0;

  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-rose-500/10">
          <span className="text-rose-500"><HeartIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Foundation Impact</h3>
          <p className="text-sm text-[var(--foreground)]/60">THE ZORA FOUNDATION</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {hasContributions ? (
          <>
            <div className="bg-[var(--background)] rounded-lg p-4">
              <p className="text-sm text-[var(--foreground)]/60 mb-1">Total Contributions</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                ${formatNumber(stats.total_contributions_amount)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Projects Supported</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{stats.projects_count}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3">
                <p className="text-xs text-[var(--foreground)]/50 mb-1">Impact</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatNumber(stats.total_impact_kgco2)} kg</p>
              </div>
            </div>

            <p className="text-sm text-[var(--foreground)]/70 bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
              You support {stats.projects_count} project{stats.projects_count !== 1 ? 's' : ''} via THE ZORA FOUNDATION.
            </p>
          </>
        ) : (
          <>
            <div className="bg-[var(--background)] rounded-lg p-4">
              <p className="text-sm text-[var(--foreground)]/60 mb-1">Foundation Projects</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.projects_count}</p>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
              <p className="text-sm text-[var(--foreground)]/70">
                Support climate projects through THE ZORA FOUNDATION. Every contribution makes a difference.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <Button href="/foundation" variant="primary" size="sm" className="w-full">
          {hasContributions ? 'View Your Impact' : 'Explore Projects'}
        </Button>
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

export default FoundationCard;
