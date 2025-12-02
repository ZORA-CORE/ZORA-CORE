'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CpuChipIcon, CheckCircleIcon, ClockIcon } from './icons';
import type { SystemMetrics } from '@/lib/types';

interface AgentsAutonomyCardProps {
  metrics: SystemMetrics;
}

export function AgentsAutonomyCard({ metrics }: AgentsAutonomyCardProps) {
  const totalTasks = metrics.agent_tasks.total;
  const completedTasks = metrics.agent_tasks.completed;
  const inProgressTasks = metrics.agent_tasks.in_progress;
  const pendingTasks = metrics.agent_tasks.pending;
  const pendingApprovals = metrics.pending_approvals;
  
  const autonomyStatus = getAutonomyStatus(pendingApprovals, inProgressTasks);

  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-500/10">
          <span className="text-violet-500"><CpuChipIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Agent Activity</h3>
          <p className="text-sm text-[var(--foreground)]/60">Nordic AI Agents</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          autonomyStatus === 'Active' 
            ? 'bg-green-500/10 text-green-500' 
            : autonomyStatus === 'Pending Approval'
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-[var(--foreground)]/10 text-[var(--foreground)]/60'
        }`}>
          {autonomyStatus}
        </span>
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-[var(--background)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--foreground)]/60">Total Tasks</span>
            <span className="text-2xl font-bold text-[var(--foreground)]">{totalTasks}</span>
          </div>
          {totalTasks > 0 && (
            <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden flex">
              {completedTasks > 0 && (
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              )}
              {inProgressTasks > 0 && (
                <div 
                  className="h-full bg-amber-500"
                  style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}
                />
              )}
              {pendingTasks > 0 && (
                <div 
                  className="h-full bg-[var(--foreground)]/20"
                  style={{ width: `${(pendingTasks / totalTasks) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--background)] rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-green-500"><CheckCircleIcon /></span>
            </div>
            <p className="text-lg font-bold text-[var(--foreground)]">{completedTasks}</p>
            <p className="text-xs text-[var(--foreground)]/50">Done</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-amber-500"><ClockIcon /></span>
            </div>
            <p className="text-lg font-bold text-[var(--foreground)]">{inProgressTasks}</p>
            <p className="text-xs text-[var(--foreground)]/50">Running</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-[var(--foreground)] mt-1">{pendingTasks}</p>
            <p className="text-xs text-[var(--foreground)]/50">Pending</p>
          </div>
        </div>

        {pendingApprovals > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-sm text-[var(--foreground)]/70">
              {pendingApprovals} action{pendingApprovals !== 1 ? 's' : ''} awaiting your approval.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--foreground)]/60">Active Schedules</span>
          <span className="font-medium text-[var(--foreground)]">{metrics.schedules.active}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--foreground)]/60">Safety Policies</span>
          <span className="font-medium text-[var(--foreground)]">{metrics.safety_policies.active}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex gap-2">
        <Button href="/admin/agents/tasks" variant="primary" size="sm" className="flex-1">
          View Tasks
        </Button>
        <Button href="/admin/agents/console" variant="outline" size="sm">
          Console
        </Button>
      </div>
    </Card>
  );
}

function getAutonomyStatus(pendingApprovals: number, inProgress: number): string {
  if (pendingApprovals > 0) return 'Pending Approval';
  if (inProgress > 0) return 'Active';
  return 'Idle';
}

export default AgentsAutonomyCard;
