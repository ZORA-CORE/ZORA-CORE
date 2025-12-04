import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { recommendStrategies } from '../hybrid-search/hybridSearch';
import { searchKnowledgeDocuments } from '../lib/knowledgeStore';
import { httpGet, isWebToolConfigured, WebToolError } from '../webtool';
import { logMetricEvent } from '../middleware/logging';
import type { EvidenceItem, EvidenceSource, KnowledgeDocumentWithSimilarity } from '../types';

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

interface AgentPanelAskInput {
  question: string;
  context?: AgentPanelContext;
  domain?: string;
  include_knowledge?: boolean;
  include_live_web?: boolean;
}

interface AgentPanelAskResponse {
  answer: string;
  evidences: EvidenceItem[];
  used_sources: EvidenceSource[];
  knowledge_hits: number;
  internal_hits: number;
  live_web_used: boolean;
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

const CONTEXT_DOMAIN_MAP: Record<AgentPanelContext, string> = {
  climate: 'climate_policy',
  goes_green: 'energy_efficiency',
  shop: 'sustainable_fashion',
  foundation: 'impact_investing',
  academy: 'climate_science',
};

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

agentPanelHandler.post('/ask', async (c) => {
  const auth = c.get('auth');
  if (!auth?.tenantId) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  let body: AgentPanelAskInput;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.question || body.question.trim().length === 0) {
    return errorResponse('MISSING_QUESTION', 'question is required', 400);
  }

  const includeKnowledge = body.include_knowledge !== false;
  const includeLiveWeb = body.include_live_web === true;

  try {
    const supabase = getSupabaseClient(c.env);
    const evidences: EvidenceItem[] = [];
    const usedSources: Set<EvidenceSource> = new Set();
    let knowledgeHits = 0;
    let internalHits = 0;
    let liveWebUsed = false;

    const domain = body.domain || (body.context ? CONTEXT_DOMAIN_MAP[body.context] : undefined);
    const tags = body.context ? CONTEXT_TAG_MAP[body.context] : undefined;

    const internalResult = await recommendStrategies(supabase, {
      tenant_id: auth.tenantId,
      tags: tags || ['climate', 'sustainability'],
      max_similar_tenants: 3,
      max_strategies: 5,
    });

    if (internalResult.strategies.length > 0) {
      usedSources.add('zora_internal');
      internalHits = internalResult.strategies.length;
      
      for (const strategy of internalResult.strategies.slice(0, 3)) {
        evidences.push({
          source: 'zora_internal',
          title: strategy.label,
          snippet: `${strategy.category || 'General'} strategy with ${strategy.frequency} similar implementations. Score: ${strategy.score.toFixed(2)}`,
          url: undefined,
          score: strategy.score,
        });
      }
    }

    if (includeKnowledge) {
      try {
        const knowledgeResult = await searchKnowledgeDocuments(supabase, c.env, {
          query: body.question,
          tenant_id: auth.tenantId,
          domain,
          limit: 5,
          threshold: 0.5,
          include_global: true,
        });

        if (knowledgeResult.documents.length > 0) {
          usedSources.add('knowledge_documents');
          knowledgeHits = knowledgeResult.documents.length;

          for (const doc of knowledgeResult.documents.slice(0, 3)) {
            evidences.push({
              source: 'knowledge_documents',
              title: doc.title,
              snippet: doc.summary || doc.raw_excerpt || 'No excerpt available',
              url: doc.source_url || undefined,
              score: doc.similarity || 0.5,
            });
          }
        }
      } catch (knowledgeError) {
        console.warn('Knowledge search failed, continuing without:', knowledgeError);
      }
    }

    const hasGoodCoverage = knowledgeHits >= 2 || internalHits >= 3;

    if (includeLiveWeb && !hasGoodCoverage && isWebToolConfigured(c.env)) {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(body.question)}&limit=3&format=json`;
        const webResult = await httpGet(searchUrl, c.env, { timeoutMs: 5000 });
        
        if (webResult.status === 200 && webResult.text) {
          usedSources.add('live_web');
          liveWebUsed = true;

          evidences.push({
            source: 'live_web',
            title: 'Web Search Result',
            snippet: `Live web search performed for: "${body.question}"`,
            url: searchUrl,
            score: 0.3,
          });

          logMetricEvent({
            category: 'webtool',
            name: 'agent_panel_usage',
            tenant_id: auth.tenantId,
            user_id: auth.userId,
            success: true,
            metadata: {
              url: searchUrl,
              status: webResult.status,
              context: 'agent_panel_ask',
            },
          });
        }
      } catch (webError) {
        if (webError instanceof WebToolError) {
          console.warn('WebTool error during live web fallback:', webError.message);
        } else {
          console.warn('Live web fallback failed:', webError);
        }
      }
    }

    let answer = '';
    if (evidences.length === 0) {
      answer = `I don't have enough information to answer your question about "${body.question}". Try enabling knowledge search or live web access for better results.`;
    } else {
      const sourceDescriptions: string[] = [];
      if (usedSources.has('zora_internal')) {
        sourceDescriptions.push(`${internalHits} internal ZORA strategies`);
      }
      if (usedSources.has('knowledge_documents')) {
        sourceDescriptions.push(`${knowledgeHits} knowledge documents`);
      }
      if (usedSources.has('live_web')) {
        sourceDescriptions.push('live web search');
      }

      answer = `Based on ${sourceDescriptions.join(', ')}, here are the most relevant insights for your question about "${body.question}":\n\n`;
      
      for (const evidence of evidences.slice(0, 5)) {
        answer += `- **${evidence.title}**: ${evidence.snippet}\n`;
      }
    }

    logMetricEvent({
      category: 'agent_panel',
      name: 'ask',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      success: true,
      metadata: {
        question_length: body.question.length,
        context: body.context,
        domain,
        knowledge_hits: knowledgeHits,
        internal_hits: internalHits,
        live_web_used: liveWebUsed,
        sources_used: Array.from(usedSources),
      },
    });

    const response: AgentPanelAskResponse = {
      answer,
      evidences,
      used_sources: Array.from(usedSources),
      knowledge_hits: knowledgeHits,
      internal_hits: internalHits,
      live_web_used: liveWebUsed,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('Agent panel ask error:', error);
    return errorResponse('ASK_ERROR', 'Failed to process question', 500);
  }
});

export default agentPanelHandler;
