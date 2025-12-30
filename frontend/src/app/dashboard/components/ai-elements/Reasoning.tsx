'use client';

import { useState } from 'react';
import type { ReasoningStep, AgentId } from '@/lib/ai/types';

const AGENT_COLORS: Record<AgentId, { bg: string; text: string; border: string }> = {
  ODIN: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  THOR: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  BALDUR: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  TYR: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  EIVOR: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  FREYA: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  HEIMDALL: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

interface ReasoningProps {
  steps: ReasoningStep[];
  isStreaming?: boolean;
  showConfidence?: boolean;
  className?: string;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-[var(--z-emerald)]';
    if (confidence >= 0.6) return 'bg-[var(--z-amber)]';
    return 'bg-[var(--z-rose)]';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[var(--z-bg-surface)] rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-[var(--z-text-muted)]">{percentage}%</span>
    </div>
  );
}

function ReasoningStepCard({
  step,
  showConfidence,
  isLatest,
}: {
  step: ReasoningStep;
  showConfidence: boolean;
  isLatest: boolean;
}) {
  const colors = AGENT_COLORS[step.agent];
  const timeAgo = formatTimeAgo(step.timestamp);

  return (
    <div
      className={`
        relative p-4 rounded-xl border transition-all duration-300
        ${colors.bg} ${colors.border}
        ${isLatest ? 'ring-2 ring-[var(--primary)]/30 shadow-lg' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
            {step.agent}
          </span>
          {isLatest && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--z-emerald)] animate-pulse" />
              <span className="text-xs text-[var(--z-emerald)]">Active</span>
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--z-text-muted)]">{timeAgo}</span>
      </div>

      <p className="text-sm text-[var(--z-text-secondary)] leading-relaxed">
        {step.thought}
      </p>

      {showConfidence && (
        <div className="mt-3 pt-3 border-t border-[var(--z-border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--z-text-muted)]">Confidence</span>
            <ConfidenceBar confidence={step.confidence} />
          </div>
        </div>
      )}

      {step.parentId && (
        <div className="absolute -left-px top-1/2 w-4 h-px bg-[var(--z-border-default)]" />
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

export function Reasoning({
  steps,
  isStreaming = false,
  showConfidence = true,
  className = '',
}: ReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--z-bg-surface)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--z-text-primary)]">
              Agent Reasoning
            </h3>
            <p className="text-xs text-[var(--z-text-muted)]">
              {steps.length} thought{steps.length !== 1 ? 's' : ''} {isStreaming && '(streaming...)'}
            </p>
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
          {steps.map((step, index) => (
            <ReasoningStepCard
              key={step.id}
              step={step}
              showConfidence={showConfidence}
              isLatest={index === steps.length - 1 && isStreaming}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Reasoning;
