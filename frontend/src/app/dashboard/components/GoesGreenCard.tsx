'use client';

import { ZCard, ZButton, ZTag } from '@/components/z';
import { LeafIcon, BoltIcon } from './icons';
import { useI18n } from '@/lib/I18nProvider';

interface GoesGreenStats {
  profiles_count: number;
  actions_count: number;
  estimated_energy_savings_kwh: number;
  green_share_percent: number;
}

interface GoesGreenCardProps {
  stats: GoesGreenStats;
}

export function GoesGreenCard({ stats }: GoesGreenCardProps) {
  const { t } = useI18n();
  const isActivated = stats.profiles_count > 0;
  const energyStatus = getEnergyStatus(stats.green_share_percent);

  return (
    <ZCard variant="default" padding="md" accent="emerald" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-emerald-soft)]">
          <span className="text-[var(--z-emerald)]"><LeafIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('goesGreen.title', 'GOES GREEN')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('goesGreen.subtitle', 'Sustainable energy and green initiatives')}</p>
        </div>
        {isActivated && (
          <ZTag variant="emerald" size="sm">Active</ZTag>
        )}
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-lg)] p-4 border border-[var(--z-border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--z-text-tertiary)]">{t('goesGreen.greenShare', 'Green Energy Share')}</span>
            <span className="text-[var(--z-emerald)]"><BoltIcon /></span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-[var(--z-text-primary)]">{stats.green_share_percent}%</p>
            <p className="text-xs text-[var(--z-text-muted)] mb-1">{energyStatus}</p>
          </div>
          <div className="mt-2 h-2 bg-[var(--z-border-subtle)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--z-emerald)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.green_share_percent, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
            <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('goesGreen.actions', 'Actions')}</p>
            <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.actions_count}</p>
          </div>
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
            <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('goesGreen.energySavings', 'Energy Saved')}</p>
            <p className="text-xl font-bold text-[var(--z-text-primary)]">{formatNumber(stats.estimated_energy_savings_kwh)} kWh</p>
          </div>
        </div>

        {!isActivated && (
          <div className="bg-[var(--z-emerald-soft)] border border-[var(--z-emerald-border)] rounded-[var(--z-radius-md)] p-3">
            <p className="text-sm text-[var(--z-text-secondary)]">
              Start your green energy journey today. Create a GOES GREEN profile to track your energy transition.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)]">
        <ZButton href="/goes-green" variant="primary" size="sm" fullWidth>
          {isActivated ? 'View Energy Dashboard' : 'Get Started'}
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

function getEnergyStatus(percent: number): string {
  if (percent >= 100) return 'Fully green';
  if (percent >= 75) return 'Almost there';
  if (percent >= 50) return 'Good progress';
  if (percent >= 25) return 'Getting started';
  return 'Begin your journey';
}

export default GoesGreenCard;
