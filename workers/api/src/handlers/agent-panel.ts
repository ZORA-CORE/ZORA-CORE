import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../supabase';
import { recommendStrategies } from '../hybrid-search/hybridSearch';

const agentPanelHandler = new Hono<AuthAppEnv>();

type AgentPanelContext = 'climate' | 'goes_green' | 'shop' | 'foundation' | 'academy';

interface AgentPanelSuggestInput {
  context: AgentPanelContext;
  prompt: string;
  profile_id?: string;
  tags?: string[];
}

interface AgentPanelSuggestion {
  id: string;
  type: string;
  title: string;
  summary: string;
  category: string | null;
  score: number;
  impact_kgco2: number | null;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

interface AgentPanelSuggestResponse {
  suggestions: AgentPanelSuggestion[];
  context: AgentPanelContext;
  similar_tenants_used: number;
  algorithm: string;
}

const CONTEXT_TAG_MAP: Record<AgentPanelContext, string[]> = {
  climate: ['climate', 'emissions', 'carbon'],
  goes_green: ['energy', 'renewable', 'green'],
  shop: ['products', 'materials', 'hemp', 'sustainable'],
  foundation: ['foundation', 'impact', 'projects'],
  academy: ['learning', 'education', 'academy'],
};

const CONTEXT_AGENT_MAP: Record<AgentPanelContext, string> = {
  climate: 'HEIMDALL',
  goes_green: 'FREYA',
  shop: 'BALDUR',
  foundation: 'TYR',
  academy: 'ODIN',
};

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status);
}

agentPanelHandler.post('/suggest', async (c) => {
  const auth = c.get('auth');
  if (!auth?.tenantId) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  let body: AgentPanelSuggestInput;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.context) {
    return errorResponse('MISSING_CONTEXT', 'context is required', 400);
  }

  const validContexts: AgentPanelContext[] = ['climate', 'goes_green', 'shop', 'foundation', 'academy'];
  if (!validContexts.includes(body.context)) {
    return errorResponse('INVALID_CONTEXT', `context must be one of: ${validContexts.join(', ')}`, 400);
  }

  try {
    const supabase = getSupabaseClient(c.env);
    
    const tags = body.tags || CONTEXT_TAG_MAP[body.context];
    
    const result = await recommendStrategies(supabase, {
      tenant_id: auth.tenantId,
      climate_profile_id: body.profile_id,
      tags,
      max_similar_tenants: 5,
      max_strategies: 10,
    });

    const suggestions: AgentPanelSuggestion[] = result.strategies.map((strategy) => ({
      id: strategy.id,
      type: strategy.type,
      title: strategy.label,
      summary: `${strategy.category || 'General'} strategy with ${strategy.frequency} similar implementations`,
      category: strategy.category,
      score: strategy.score,
      impact_kgco2: strategy.avg_impact_kgco2,
      reasons: strategy.reasons,
      metadata: {
        frequency: strategy.frequency,
        agent: CONTEXT_AGENT_MAP[body.context],
      },
    }));

    const response: AgentPanelSuggestResponse = {
      suggestions,
      context: body.context,
      similar_tenants_used: result.similar_tenants_used,
      algorithm: result.algorithm,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('Agent panel suggest error:', error);
    return errorResponse('SUGGEST_ERROR', 'Failed to get suggestions', 500);
  }
});

export default agentPanelHandler;
