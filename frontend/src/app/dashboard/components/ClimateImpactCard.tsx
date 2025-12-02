'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GlobeIcon, TrendUpIcon, CheckCircleIcon, ClockIcon } from './icons';

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
  const impactStatus = getImpactStatus(stats.total_impact_kgco2, stats.missions_completed);
  
  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500/10">
          <span className="text-emerald-500"><GlobeIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Your Climate Impact</h3>
          <p className="text-sm text-[var(--foreground)]/60">Track your environmental footprint</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-[var(--background)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground)]/60">Total Impact</span>
            <span className="text-emerald-500"><TrendUpIcon /></span>
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {formatNumber(stats.total_impact_kgco2)} kg CO2
          </p>
          <p className="text-xs text-[var(--foreground)]/50 mt-1">{impactStatus}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--background)] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-500"><CheckCircleIcon /></span>
              <span className="text-xs text-[var(--foreground)]/50">Completed</span>
            </div>
            <p className="text-xl font-bold text-[var(--foreground)]">{stats.missions_completed}</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-500"><ClockIcon /></span>
              <span className="text-xs text-[var(--foreground)]/50">In Progress</span>
            </div>
            <p className="text-xl font-bold text-[var(--foreground)]">{stats.missions_in_progress}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--foreground)]/60">Climate Profiles</span>
          <span className="font-medium text-[var(--foreground)]">{stats.profiles_count}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--foreground)]/60">Total Missions</span>
          <span className="font-medium text-[var(--foreground)]">{stats.missions_count}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <Button href="/climate" variant="primary" size="sm" className="w-full">
          View Climate OS
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

function getImpactStatus(impact: number, completed: number): string {
  if (completed === 0) return 'Getting started';
  if (impact >= 1000) return 'Making a difference';
  if (impact >= 100) return 'On track';
  return 'Building momentum';
}

export default ClimateImpactCard;
