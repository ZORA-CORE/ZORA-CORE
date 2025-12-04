'use client';

import { ZCard, ZButton, ZMetricTile } from '@/components/z';
import { GlobeIcon, TrendUpIcon, CheckCircleIcon, ClockIcon } from './icons';
import { useI18n } from '@/lib/I18nProvider';

interface ClimateStats {
  profiles_count: number;
  missions_count: number;
  missions_completed: number;
  missions_in_progress: number;
  total_impact_kgco2: number;
}

interface ClimateImpactCardProps {
  stats: ClimateStats;
}

export function ClimateImpactCard({ stats }: ClimateImpactCardProps) {
  const { t } = useI18n();
  const impactStatus = getImpactStatus(stats.total_impact_kgco2, stats.missions_completed);
  
  return (
    <ZCard variant="default" padding="md" accent="emerald" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-emerald-soft)]">
          <span className="text-[var(--z-emerald)]"><GlobeIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('climate.title', 'Climate OS')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('climate.subtitle', 'Track your climate impact and missions')}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <ZMetricTile
          label={t('climate.co2Impact', 'Total Impact')}
          value={`${formatNumber(stats.total_impact_kgco2)} kg`}
          sublabel={impactStatus}
          variant="emerald"
          icon={<TrendUpIcon />}
          size="md"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[var(--z-emerald)]"><CheckCircleIcon /></span>
              <span className="text-xs text-[var(--z-text-muted)]">{t('climate.completed', 'Completed')}</span>
            </div>
            <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.missions_completed}</p>
          </div>
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[var(--z-amber)]"><ClockIcon /></span>
              <span className="text-xs text-[var(--z-text-muted)]">{t('climate.inProgress', 'In Progress')}</span>
            </div>
            <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.missions_in_progress}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--z-text-tertiary)]">{t('climate.profiles', 'Climate Profiles')}</span>
            <span className="font-medium text-[var(--z-text-primary)]">{stats.profiles_count}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--z-text-tertiary)]">{t('climate.missions', 'Total Missions')}</span>
            <span className="font-medium text-[var(--z-text-primary)]">{stats.missions_count}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)]">
        <ZButton href="/climate" variant="primary" size="sm" fullWidth>
          {t('climate.viewAll', 'View Climate OS')}
        </ZButton>
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

function getImpactStatus(impact: number, completed: number): string {
  if (completed === 0) return 'Getting started';
  if (impact >= 1000) return 'Making a difference';
  if (impact >= 100) return 'On track';
  return 'Building momentum';
}

export default ClimateImpactCard;
