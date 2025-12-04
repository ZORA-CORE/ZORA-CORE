'use client';

import Link from 'next/link';
import { ZCard, ZButton } from '@/components/z';
import { HeartIcon } from './icons';
import { useI18n } from '@/lib/I18nProvider';

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
  const { t } = useI18n();
  const hasContributions = stats.contributions_count > 0;
  const activeProjects = stats.active_projects || 0;
  const completedProjects = stats.completed_projects || 0;

  return (
    <ZCard variant="default" padding="md" accent="rose" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-rose-soft)]">
          <span className="text-[var(--z-rose)]"><HeartIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('foundation.title', 'THE ZORA FOUNDATION')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('foundation.subtitle', 'Climate projects and contributions')}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {hasContributions ? (
          <>
            <div className="bg-[var(--z-rose-soft)] border border-[var(--z-rose-border)] rounded-[var(--z-radius-lg)] p-4">
              <p className="text-sm text-[var(--z-text-tertiary)] mb-1">{t('foundation.contributions', 'Your Contributions')}</p>
              <p className="text-2xl font-bold text-[var(--z-rose)]">
                €{formatNumber(stats.total_contributions_amount / 100)}
              </p>
              <p className="text-xs text-[var(--z-text-muted)] mt-1">
                {stats.contributions_count} donation{stats.contributions_count !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('foundation.projects', 'Projects Supported')}</p>
                <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.projects_count}</p>
              </div>
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">CO2 {t('foundation.impact', 'Impact')}</p>
                <p className="text-xl font-bold text-[var(--z-emerald)]">{formatImpact(stats.total_impact_kgco2)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href="/foundation?section=contributions"
                className="flex-1 text-center text-xs py-2 px-3 rounded-[var(--z-radius-md)] bg-[var(--z-bg-base)] text-[var(--z-text-secondary)] hover:text-[var(--z-rose)] border border-[var(--z-border-subtle)] transition-colors"
              >
                My Contributions
              </Link>
              <Link
                href="/foundation?section=impact"
                className="flex-1 text-center text-xs py-2 px-3 rounded-[var(--z-radius-md)] bg-[var(--z-bg-base)] text-[var(--z-text-secondary)] hover:text-[var(--z-emerald)] border border-[var(--z-border-subtle)] transition-colors"
              >
                View Impact
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">Active Projects</p>
                <p className="text-xl font-bold text-[var(--z-emerald)]">{activeProjects}</p>
              </div>
              <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
                <p className="text-xs text-[var(--z-text-muted)] mb-1">Total Projects</p>
                <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.projects_count}</p>
              </div>
            </div>

            <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
              <p className="text-xs text-[var(--z-text-muted)] mb-1">Est. Climate Impact</p>
              <p className="text-xl font-bold text-[var(--z-sky)]">{formatImpact(stats.total_impact_kgco2)}</p>
            </div>

            <div className="bg-[var(--z-rose-soft)] border border-[var(--z-rose-border)] rounded-[var(--z-radius-md)] p-3">
              <p className="text-sm text-[var(--z-text-secondary)]">
                Support real climate projects through THE ZORA FOUNDATION. Every contribution creates measurable impact.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)] space-y-2">
        <ZButton href="/foundation" variant="danger" size="sm" fullWidth>
          {hasContributions ? 'View Your Impact' : 'Explore Projects'}
        </ZButton>
        <div className="flex gap-2 text-xs">
          <Link
            href="/climate"
            className="flex-1 text-center py-1.5 text-[var(--z-text-muted)] hover:text-[var(--z-emerald)] transition-colors"
          >
            Climate OS
          </Link>
          <Link
            href="/zora-shop"
            className="flex-1 text-center py-1.5 text-[var(--z-text-muted)] hover:text-[var(--z-amber)] transition-colors"
          >
            ZORA SHOP
          </Link>
        </div>
      </div>
    </ZCard>
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
