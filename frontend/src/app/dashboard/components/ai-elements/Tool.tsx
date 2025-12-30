'use client';

import { useState } from 'react';
import type { ToolInvocation, AgentId } from '@/lib/ai/types';

const AGENT_COLORS: Record<AgentId, { bg: string; text: string; border: string }> = {
  ODIN: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  THOR: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  BALDUR: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  TYR: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  EIVOR: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  FREYA: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  HEIMDALL: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const STATUS_STYLES: Record<ToolInvocation['status'], { icon: string; color: string; label: string }> = {
  pending: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-[var(--z-text-muted)]', label: 'Pending' },
  running: { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', color: 'text-[var(--z-amber)]', label: 'Running' },
  completed: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-[var(--z-emerald)]', label: 'Completed' },
  failed: { icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-[var(--z-rose)]', label: 'Failed' },
};

interface ToolProps {
  invocations: ToolInvocation[];
  className?: string;
}

function StatusIcon({ status }: { status: ToolInvocation['status'] }) {
  const { icon, color } = STATUS_STYLES[status];
  return (
    <svg
      className={`w-5 h-5 ${color} ${status === 'running' ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
    </svg>
  );
}

function ToolInvocationCard({ invocation }: { invocation: ToolInvocation }) {
  const [showDetails, setShowDetails] = useState(false);
  const colors = AGENT_COLORS[invocation.agent];
  const statusStyle = STATUS_STYLES[invocation.status];

  const duration = invocation.endTime
    ? Math.round((new Date(invocation.endTime).getTime() - new Date(invocation.startTime).getTime()) / 1000)
    : null;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={invocation.status} />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--z-text-primary)]">
                {invocation.toolName}
              </span>
              <span className={`text-xs font-medium uppercase tracking-wider ${colors.text}`}>
                {invocation.agent}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs ${statusStyle.color}`}>{statusStyle.label}</span>
              {duration !== null && (
                <span className="text-xs text-[var(--z-text-muted)]">
                  {duration < 1 ? '<1s' : `${duration}s`}
                </span>
              )}
            </div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--z-text-muted)] transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDetails && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <span className="text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
              Input
            </span>
            <pre className="mt-1 p-3 rounded-lg bg-[var(--z-bg-surface)] text-xs text-[var(--z-text-secondary)] overflow-x-auto">
              {JSON.stringify(invocation.input, null, 2)}
            </pre>
          </div>

          {invocation.output !== undefined && (
            <div>
              <span className="text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
                Output
              </span>
              <pre className="mt-1 p-3 rounded-lg bg-[var(--z-bg-surface)] text-xs text-[var(--z-text-secondary)] overflow-x-auto">
                {typeof invocation.output === 'string'
                  ? invocation.output
                  : JSON.stringify(invocation.output, null, 2)}
              </pre>
            </div>
          )}

          {invocation.error && (
            <div>
              <span className="text-xs font-medium text-[var(--z-rose)] uppercase tracking-wider">
                Error
              </span>
              <pre className="mt-1 p-3 rounded-lg bg-[var(--z-rose)]/10 border border-[var(--z-rose)]/30 text-xs text-[var(--z-rose)] overflow-x-auto">
                {invocation.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Tool({ invocations, className = '' }: ToolProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (invocations.length === 0) {
    return null;
  }

  const runningCount = invocations.filter((i) => i.status === 'running').length;
  const completedCount = invocations.filter((i) => i.status === 'completed').length;
  const failedCount = invocations.filter((i) => i.status === 'failed').length;

  return (
    <div className={`rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--z-bg-surface)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--z-violet)]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--z-violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--z-text-primary)]">
              Tool Invocations
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {runningCount > 0 && (
                <span className="text-[var(--z-amber)]">{runningCount} running</span>
              )}
              {completedCount > 0 && (
                <span className="text-[var(--z-emerald)]">{completedCount} completed</span>
              )}
              {failedCount > 0 && (
                <span className="text-[var(--z-rose)]">{failedCount} failed</span>
              )}
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-[var(--z-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {invocations.map((invocation) => (
            <ToolInvocationCard key={invocation.id} invocation={invocation} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Tool;
