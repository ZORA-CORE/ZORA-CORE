'use client';

import React, { useState } from 'react';
import { getAgentPanelSuggestions, ZoraApiError } from '@/lib/api';
import type { AgentPanelContext, AgentPanelSuggestion } from '@/lib/types';
import { ZCard } from '@/components/z';
import { getAgentVisual } from '@/lib/agentVisuals';

interface AgentPanelProps {
  context: AgentPanelContext;
  profileId?: string;
  title?: string;
  description?: string;
  onSuggestionSelect?: (suggestion: AgentPanelSuggestion) => void;
}

const CONTEXT_CONFIG: Record<AgentPanelContext, { 
  agent: string; 
  placeholder: string; 
  defaultPrompt: string;
}> = {
  climate: {
    agent: 'HEIMDALL',
    placeholder: 'Ask HEIMDALL for climate mission suggestions...',
    defaultPrompt: 'Suggest climate missions based on similar tenants',
  },
  goes_green: {
    agent: 'FREYA',
    placeholder: 'Ask FREYA for energy transition steps...',
    defaultPrompt: 'What are the next 3 GOES GREEN steps for my profile?',
  },
  shop: {
    agent: 'BALDUR',
    placeholder: 'Ask BALDUR for sustainable product suggestions...',
    defaultPrompt: 'Suggest hemp-based materials for my next capsule',
  },
  foundation: {
    agent: 'TYR',
    placeholder: 'Ask TYR for foundation project recommendations...',
    defaultPrompt: 'Match me with relevant climate foundation projects',
  },
  academy: {
    agent: 'ODIN',
    placeholder: 'Ask ODIN for learning path recommendations...',
    defaultPrompt: 'Build a climate learning path for me',
  },
  simulation: {
    agent: 'ODIN',
    placeholder: 'Ask ODIN for scenario recommendations...',
    defaultPrompt: 'Suggest a scenario for maximum CO2 reduction in 12 months',
  },
};

function SuggestionCard({ 
  suggestion, 
  onSelect 
}: { 
  suggestion: AgentPanelSuggestion; 
  onSelect?: (suggestion: AgentPanelSuggestion) => void;
}) {
  const typeColors: Record<string, string> = {
    mission: 'bg-[var(--z-emerald)]/15 text-[var(--z-emerald)] border-[var(--z-emerald)]/30',
    goes_green_action: 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30',
    material_change: 'bg-[var(--z-amber)]/15 text-[var(--z-amber)] border-[var(--z-amber)]/30',
    foundation_project: 'bg-[var(--z-rose)]/15 text-[var(--z-rose)] border-[var(--z-rose)]/30',
    learning_path: 'bg-[var(--z-violet)]/15 text-[var(--z-violet)] border-[var(--z-violet)]/30',
  };

  const typeLabels: Record<string, string> = {
    mission: 'Climate Mission',
    goes_green_action: 'GOES GREEN Action',
    material_change: 'Material Change',
    foundation_project: 'Foundation Project',
    learning_path: 'Learning Path',
  };

  return (
    <div 
      className="p-4 bg-[var(--z-bg-card)] border border-[var(--z-border-default)] rounded-xl hover:border-[var(--primary)]/50 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onSelect?.(suggestion)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-[var(--z-text-primary)] group-hover:text-[var(--primary)] transition-colors">{suggestion.title}</h4>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${typeColors[suggestion.type] || 'bg-[var(--z-bg-surface)] text-[var(--z-text-muted)]'}`}>
          {typeLabels[suggestion.type] || suggestion.type}
        </span>
      </div>
      <p className="text-sm text-[var(--z-text-secondary)] mb-3 leading-relaxed">{suggestion.summary}</p>
      {suggestion.impact_kgco2 && (
        <div className="flex items-center gap-2 text-xs text-[var(--z-emerald)] mb-2 font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Est. impact: {suggestion.impact_kgco2.toFixed(1)} kg CO2
        </div>
      )}
      {suggestion.reasons.length > 0 && (
        <div className="text-xs text-[var(--z-text-muted)] italic">
          {suggestion.reasons.slice(0, 2).join(' • ')}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-[var(--z-border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[var(--z-bg-surface)] overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[var(--z-emerald)] to-[var(--primary)]" 
              style={{ width: `${suggestion.score * 100}%` }}
            />
          </div>
          <span className="text-xs text-[var(--z-text-muted)]">
            {(suggestion.score * 100).toFixed(0)}%
          </span>
        </div>
        {suggestion.category && (
          <span className="text-xs text-[var(--z-text-muted)] px-2 py-0.5 rounded bg-[var(--z-bg-surface)]">
            {suggestion.category}
          </span>
        )}
      </div>
    </div>
  );
}

export function AgentPanel({ 
  context, 
  profileId,
  title,
  description,
  onSuggestionSelect,
}: AgentPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AgentPanelSuggestion[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const config = CONTEXT_CONFIG[context];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !config.defaultPrompt) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await getAgentPanelSuggestions({
        context,
        prompt: prompt.trim() || config.defaultPrompt,
        profile_id: profileId,
      });
      setSuggestions(response.suggestions);
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to get suggestions. Please try again.');
      }
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async () => {
    setPrompt(config.defaultPrompt);
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await getAgentPanelSuggestions({
        context,
        prompt: config.defaultPrompt,
        profile_id: profileId,
      });
      setSuggestions(response.suggestions);
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to get suggestions. Please try again.');
      }
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const agentVisual = getAgentVisual(config.agent);

  return (
    <ZCard variant="elevated" padding="none" className="h-full overflow-hidden">
      {/* Agent Header - Larger and more prominent */}
      <div className="relative p-5 border-b border-[var(--z-border-default)]">
        {/* Background glow effect */}
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{ background: `radial-gradient(circle at top right, ${agentVisual.color}, transparent 70%)` }}
        />
        
        <div className="relative flex items-center gap-4">
          {/* Agent Icon - Larger with glow */}
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
            style={{ 
              backgroundColor: agentVisual.bgColor,
              boxShadow: agentVisual.glowColor,
              border: `1px solid ${agentVisual.borderColor}`
            }}
          >
            {agentVisual.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-[var(--z-text-primary)]">
                {title || `Ask ${config.agent}`}
              </h3>
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ 
                  backgroundColor: agentVisual.bgColor,
                  color: agentVisual.color,
                  border: `1px solid ${agentVisual.borderColor}`
                }}
              >
                {agentVisual.role}
              </span>
            </div>
            <p className="text-sm text-[var(--z-text-tertiary)]">
              {description || `Nordic agent for ${context.replace('_', ' ')} intelligence`}
            </p>
          </div>
          {/* Pulsing indicator */}
          <div className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: agentVisual.color }}
            />
            <span className="text-xs text-[var(--z-text-muted)]">Ready</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={config.placeholder}
            className="w-full p-4 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-xl text-sm text-[var(--z-text-primary)] placeholder:text-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all"
            style={{ '--tw-ring-color': agentVisual.color } as React.CSSProperties}
            rows={3}
          />
          <div className="flex gap-3 mt-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
              style={{ 
                backgroundColor: loading ? 'var(--z-text-muted)' : agentVisual.color,
                boxShadow: loading ? 'none' : `0 4px 14px ${agentVisual.color}40`
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Thinking...
                </span>
              ) : 'Ask Agent'}
            </button>
            <button
              type="button"
              onClick={handleQuickAction}
              disabled={loading}
              className="px-4 py-2.5 bg-[var(--z-bg-card)] border border-[var(--z-border-default)] hover:border-[var(--primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[var(--z-text-primary)] text-sm font-medium transition-all hover:shadow-md"
            >
              Quick Suggest
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 mb-4 bg-[var(--z-rose)]/10 border border-[var(--z-rose)]/30 rounded-xl text-[var(--z-rose)] text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {hasSearched && !loading && suggestions.length === 0 && !error && (
          <div className="p-6 text-center rounded-xl bg-[var(--z-bg-surface)] border border-[var(--z-border-subtle)]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--z-bg-card)] flex items-center justify-center text-2xl">
              {agentVisual.icon}
            </div>
            <p className="text-[var(--z-text-muted)] text-sm">
              No suggestions found. Try a different prompt or check back later.
            </p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs text-[var(--z-text-muted)] mb-3">
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ backgroundColor: agentVisual.bgColor }}
              >
                {agentVisual.icon}
              </span>
              <span className="font-medium" style={{ color: agentVisual.color }}>{config.agent}</span>
              <span>found {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
            </div>
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onSelect={onSuggestionSelect}
              />
            ))}
          </div>
        )}
      </div>
    </ZCard>
  );
}

export default AgentPanel;
