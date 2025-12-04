'use client';

import React, { useState } from 'react';
import { getAgentPanelSuggestions, ZoraApiError } from '@/lib/api';
import type { AgentPanelContext, AgentPanelSuggestion } from '@/lib/types';
import { Card } from '@/components/ui/Card';

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
  color: string;
}> = {
  climate: {
    agent: 'HEIMDALL',
    placeholder: 'Ask HEIMDALL for climate mission suggestions...',
    defaultPrompt: 'Suggest climate missions based on similar tenants',
    color: 'emerald',
  },
  goes_green: {
    agent: 'FREYA',
    placeholder: 'Ask FREYA for energy transition steps...',
    defaultPrompt: 'What are the next 3 GOES GREEN steps for my profile?',
    color: 'green',
  },
  shop: {
    agent: 'BALDUR',
    placeholder: 'Ask BALDUR for sustainable product suggestions...',
    defaultPrompt: 'Suggest hemp-based materials for my next capsule',
    color: 'amber',
  },
  foundation: {
    agent: 'TYR',
    placeholder: 'Ask TYR for foundation project recommendations...',
    defaultPrompt: 'Match me with relevant climate foundation projects',
    color: 'blue',
  },
  academy: {
    agent: 'ODIN',
    placeholder: 'Ask ODIN for learning path recommendations...',
    defaultPrompt: 'Build a climate learning path for me',
    color: 'purple',
  },
  simulation: {
    agent: 'ODIN',
    placeholder: 'Ask ODIN for scenario recommendations...',
    defaultPrompt: 'Suggest a scenario for maximum CO2 reduction in 12 months',
    color: 'indigo',
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
    mission: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    goes_green_action: 'bg-green-500/20 text-green-400 border-green-500/30',
    material_change: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    foundation_project: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    learning_path: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
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
      className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-[var(--primary)]/50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(suggestion)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium text-[var(--foreground)]">{suggestion.title}</h4>
        <span className={`text-xs px-2 py-1 rounded border ${typeColors[suggestion.type] || 'bg-gray-500/20 text-gray-400'}`}>
          {typeLabels[suggestion.type] || suggestion.type}
        </span>
      </div>
      <p className="text-sm text-[var(--foreground)]/70 mb-3">{suggestion.summary}</p>
      {suggestion.impact_kgco2 && (
        <div className="text-xs text-emerald-400 mb-2">
          Est. impact: {suggestion.impact_kgco2.toFixed(1)} kg CO2
        </div>
      )}
      {suggestion.reasons.length > 0 && (
        <div className="text-xs text-[var(--foreground)]/50">
          {suggestion.reasons.slice(0, 2).join(' • ')}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[var(--foreground)]/40">
          Score: {(suggestion.score * 100).toFixed(0)}%
        </span>
        {suggestion.category && (
          <span className="text-xs text-[var(--foreground)]/40">
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

  return (
    <Card variant="bordered" padding="md" className="h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full bg-${config.color}-500/20 flex items-center justify-center`}>
          <span className={`text-${config.color}-400 text-lg`}>&#9733;</span>
        </div>
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">
            {title || `Ask ${config.agent}`}
          </h3>
          <p className="text-xs text-[var(--foreground)]/60">
            {description || `Nordic agent for ${context.replace('_', ' ')} intelligence`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={config.placeholder}
          className="w-full p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:border-[var(--primary)]/50 resize-none"
          rows={3}
        />
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-4 py-2 bg-${config.color}-600 hover:bg-${config.color}-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors`}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
          <button
            type="button"
            onClick={handleQuickAction}
            disabled={loading}
            className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[var(--foreground)] text-sm transition-colors"
          >
            Quick Suggest
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 mb-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {hasSearched && !loading && suggestions.length === 0 && !error && (
        <div className="p-4 text-center text-[var(--foreground)]/50 text-sm">
          No suggestions found. Try a different prompt or check back later.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div className="text-xs text-[var(--foreground)]/50 mb-2">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} from {config.agent}
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
    </Card>
  );
}

export default AgentPanel;
