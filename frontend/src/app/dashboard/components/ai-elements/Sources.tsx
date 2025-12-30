'use client';

import { useState } from 'react';
import type { SourceReference, AgentId } from '@/lib/ai/types';

const AGENT_COLORS: Record<AgentId, { bg: string; text: string; border: string }> = {
  ODIN: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  THOR: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  BALDUR: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  TYR: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  EIVOR: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  FREYA: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  HEIMDALL: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const SOURCE_TYPE_ICONS: Record<SourceReference['type'], { icon: string; label: string; color: string }> = {
  memory: {
    icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    label: 'Memory',
    color: 'text-[var(--z-violet)]',
  },
  document: {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    label: 'Document',
    color: 'text-[var(--z-sky)]',
  },
  api: {
    icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    label: 'API',
    color: 'text-[var(--z-emerald)]',
  },
  external: {
    icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
    label: 'External',
    color: 'text-[var(--z-amber)]',
  },
};

interface SourcesProps {
  sources: SourceReference[];
  className?: string;
}

function RelevanceIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (score >= 0.8) return 'bg-[var(--z-emerald)]';
    if (score >= 0.6) return 'bg-[var(--z-amber)]';
    return 'bg-[var(--z-text-muted)]';
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[0.2, 0.4, 0.6, 0.8, 1].map((threshold) => (
          <div
            key={threshold}
            className={`w-1 h-3 rounded-full ${score >= threshold ? getColor() : 'bg-[var(--z-bg-surface)]'}`}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--z-text-muted)]">{percentage}%</span>
    </div>
  );
}

function SourceCard({ source }: { source: SourceReference }) {
  const [showExcerpt, setShowExcerpt] = useState(false);
  const colors = AGENT_COLORS[source.agent];
  const typeInfo = SOURCE_TYPE_ICONS[source.type];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg bg-[var(--z-bg-surface)] flex items-center justify-center flex-shrink-0`}>
              <svg className={`w-4 h-4 ${typeInfo.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeInfo.icon} />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
                  {typeInfo.label}
                </span>
                <span className={`text-xs font-medium uppercase tracking-wider ${colors.text}`}>
                  via {source.agent}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-[var(--z-text-primary)] mt-1 line-clamp-2">
                {source.title}
              </h4>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--primary)] hover:underline mt-1 inline-flex items-center gap-1"
                >
                  <span className="truncate max-w-[200px]">{source.url}</span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
          <RelevanceIndicator score={source.relevanceScore} />
        </div>

        {source.excerpt && (
          <div className="mt-3">
            <button
              onClick={() => setShowExcerpt(!showExcerpt)}
              className="text-xs text-[var(--z-text-muted)] hover:text-[var(--z-text-secondary)] flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showExcerpt ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showExcerpt ? 'Hide excerpt' : 'Show excerpt'}
            </button>
            {showExcerpt && (
              <blockquote className="mt-2 pl-3 border-l-2 border-[var(--z-border-default)] text-sm text-[var(--z-text-secondary)] italic">
                {source.excerpt}
              </blockquote>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Sources({ sources, className = '' }: SourcesProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterType, setFilterType] = useState<SourceReference['type'] | 'all'>('all');

  if (sources.length === 0) {
    return null;
  }

  const filteredSources = filterType === 'all'
    ? sources
    : sources.filter((s) => s.type === filterType);

  const typeCounts = sources.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--z-bg-surface)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--z-sky)]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--z-sky)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--z-text-primary)]">
              Sources & Evidence
            </h3>
            <p className="text-xs text-[var(--z-text-muted)]">
              {sources.length} source{sources.length !== 1 ? 's' : ''} referenced
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
        <div className="p-4 pt-0">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--z-bg-surface)] text-[var(--z-text-secondary)] hover:bg-[var(--z-bg-surface)]/80'
              }`}
            >
              All ({sources.length})
            </button>
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setFilterType(type as SourceReference['type'])}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterType === type
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--z-bg-surface)] text-[var(--z-text-secondary)] hover:bg-[var(--z-bg-surface)]/80'
                }`}
              >
                {SOURCE_TYPE_ICONS[type as SourceReference['type']].label} ({count})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredSources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sources;
