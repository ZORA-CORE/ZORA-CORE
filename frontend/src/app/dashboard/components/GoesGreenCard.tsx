'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LeafIcon, BoltIcon } from './icons';

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
  const isActivated = stats.profiles_count > 0;
  const energyStatus = getEnergyStatus(stats.green_share_percent);

  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-500/10">
          <span className="text-green-500"><LeafIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Your Energy Journey</h3>
          <p className="text-sm text-[var(--foreground)]/60">ZORA GOES GREEN</p>
        </div>
        {isActivated && (
          <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
            Active
          </span>
        )}
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-[var(--background)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground)]/60">Green Energy Share</span>
            <span className="text-green-500"><BoltIcon /></span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-[var(--foreground)]">{stats.green_share_percent}%</p>
            <p className="text-xs text-[var(--foreground)]/50 mb-1">{energyStatus}</p>
          </div>
          <div className="mt-2 h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.green_share_percent, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--foreground)]/50 mb-1">Actions Completed</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{stats.actions_count}</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--foreground)]/50 mb-1">Energy Saved</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{formatNumber(stats.estimated_energy_savings_kwh)} kWh</p>
          </div>
        </div>

        {!isActivated && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-[var(--foreground)]/70">
              Start your green energy journey today. Create a GOES GREEN profile to track your energy transition.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <Button href="/goes-green" variant="primary" size="sm" className="w-full">
          {isActivated ? 'View Energy Dashboard' : 'Get Started'}
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

function getEnergyStatus(percent: number): string {
  if (percent >= 100) return 'Fully green';
  if (percent >= 75) return 'Almost there';
  if (percent >= 50) return 'Good progress';
  if (percent >= 25) return 'Getting started';
  return 'Begin your journey';
}

export default GoesGreenCard;
