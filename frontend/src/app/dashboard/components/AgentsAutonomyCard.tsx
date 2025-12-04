'use client';

import { ZCard, ZButton, ZTag } from '@/components/z';
import { CpuChipIcon, CheckCircleIcon, ClockIcon } from './icons';
import type { SystemMetrics } from '@/lib/types';
import { useI18n } from '@/lib/I18nProvider';

interface AgentsAutonomyCardProps {
  metrics: SystemMetrics;
}

export function AgentsAutonomyCard({ metrics }: AgentsAutonomyCardProps) {
  const { t } = useI18n();
  const totalTasks = metrics.agent_tasks.total;
  const completedTasks = metrics.agent_tasks.completed;
  const inProgressTasks = metrics.agent_tasks.in_progress;
  const pendingTasks = metrics.agent_tasks.pending;
  const pendingApprovals = metrics.pending_approvals;
  
  const autonomyStatus = getAutonomyStatus(pendingApprovals, inProgressTasks);

  return (
    <ZCard variant="default" padding="md" accent="violet" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-violet-soft)]">
          <span className="text-[var(--z-violet)]"><CpuChipIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('agents.title', 'Agents & Autonomy')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('agents.subtitle', 'Nordic AI Agents')}</p>
        </div>
        <ZTag 
          variant={autonomyStatus === 'Active' ? 'emerald' : autonomyStatus === 'Pending Approval' ? 'amber' : 'default'} 
          size="sm"
        >
          {autonomyStatus}
        </ZTag>
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-lg)] p-4 border border-[var(--z-border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--z-text-tertiary)]">{t('agents.pendingTasks', 'Total Tasks')}</span>
            <span className="text-2xl font-bold text-[var(--z-text-primary)]">{totalTasks}</span>
          </div>
          {totalTasks > 0 && (
            <div className="h-2 bg-[var(--z-border-subtle)] rounded-full overflow-hidden flex">
              {completedTasks > 0 && (
                <div 
                  className="h-full bg-[var(--z-emerald)]"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              )}
              {inProgressTasks > 0 && (
                <div 
                  className="h-full bg-[var(--z-amber)]"
                  style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}
                />
              )}
              {pendingTasks > 0 && (
                <div 
                  className="h-full bg-[var(--z-text-muted)]"
                  style={{ width: `${(pendingTasks / totalTasks) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 text-center border border-[var(--z-border-subtle)]">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-[var(--z-emerald)]"><CheckCircleIcon /></span>
            </div>
            <p className="text-lg font-bold text-[var(--z-text-primary)]">{completedTasks}</p>
            <p className="text-xs text-[var(--z-text-muted)]">{t('agents.completedTasks', 'Done')}</p>
          </div>
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 text-center border border-[var(--z-border-subtle)]">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-[var(--z-amber)]"><ClockIcon /></span>
            </div>
            <p className="text-lg font-bold text-[var(--z-text-primary)]">{inProgressTasks}</p>
            <p className="text-xs text-[var(--z-text-muted)]">Running</p>
          </div>
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 text-center border border-[var(--z-border-subtle)]">
            <p className="text-lg font-bold text-[var(--z-text-primary)] mt-1">{pendingTasks}</p>
            <p className="text-xs text-[var(--z-text-muted)]">Pending</p>
          </div>
        </div>

        {pendingApprovals > 0 && (
          <div className="bg-[var(--z-amber-soft)] border border-[var(--z-amber-border)] rounded-[var(--z-radius-md)] p-3">
            <p className="text-sm text-[var(--z-text-secondary)]">
              {pendingApprovals} action{pendingApprovals !== 1 ? 's' : ''} {t('agents.pendingApproval', 'awaiting your approval')}.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--z-text-tertiary)]">{t('agents.activeSchedules', 'Active Schedules')}</span>
            <span className="font-medium text-[var(--z-text-primary)]">{metrics.schedules.active}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--z-text-tertiary)]">Safety Policies</span>
            <span className="font-medium text-[var(--z-text-primary)]">{metrics.safety_policies.active}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)] flex gap-2">
        <ZButton href="/admin/agents/tasks" variant="primary" size="sm" className="flex-1">
          View Tasks
        </ZButton>
        <ZButton href="/admin/agents/console" variant="outline" size="sm">
          Console
        </ZButton>
      </div>
    </ZCard>
  );
}

function getAutonomyStatus(pendingApprovals: number, inProgress: number): string {
  if (pendingApprovals > 0) return 'Pending Approval';
  if (inProgress > 0) return 'Active';
  return 'Idle';
}

export default AgentsAutonomyCard;
