/**
 * Hybrid Search & Reasoner v1.0 API Handler
 * 
 * Admin-protected endpoints for hybrid search operations:
 * - POST /api/admin/hybrid-search/find-similar-tenants
 * - POST /api/admin/hybrid-search/recommend-strategies
 * - POST /api/admin/hybrid-search/search-knowledge
 * - GET /api/admin/hybrid-search/info
 * 
 * Backend Hardening v1: All endpoints require founder/brand_admin role.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import {
  findSimilarTenants,
  recommendStrategies,
  searchKnowledge,
  getHybridSearchInfo,
  type FindSimilarTenantsInput,
  type RecommendStrategiesInput,
  type SearchKnowledgeInput,
  type EntityType,
} from '../hybrid-search/hybridSearch';
import { jsonResponse, standardError } from '../lib/response';
import type { AuthContext } from '../lib/auth';
import { logMetricEvent } from '../middleware/logging';

const hybridSearchHandler = new Hono<AuthAppEnv>();

hybridSearchHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return standardError('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return standardError('FORBIDDEN', 'Admin access required (founder or brand_admin role)', 403);
  }
  
  await next();
});

hybridSearchHandler.get('/info', async (c) => {
  const info = getHybridSearchInfo();
  return jsonResponse(info);
});

hybridSearchHandler.post('/find-similar-tenants', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const startTime = Date.now();
  
  let body: FindSimilarTenantsInput;
  try {
    body = await c.req.json();
  } catch {
    return standardError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.tenant_id && !body.profile) {
    return standardError(
      'MISSING_PARAMS',
      'Either tenant_id or profile object is required',
      400
    );
  }

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await findSimilarTenants(supabase, body);
    
    logMetricEvent({
      category: 'hybrid_search',
      name: 'find_similar_tenants',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: true,
    });
    
    return jsonResponse(result);
  } catch (error) {
    console.error('findSimilarTenants error:', error);
    
    logMetricEvent({
      category: 'hybrid_search',
      name: 'find_similar_tenants',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: 'SEARCH_ERROR',
    });
    
    return standardError(
      'SEARCH_ERROR',
      'Failed to find similar tenants',
      500
    );
  }
});

hybridSearchHandler.post('/recommend-strategies', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const startTime = Date.now();
  
  let body: RecommendStrategiesInput;
  try {
    body = await c.req.json();
  } catch {
    return standardError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.tenant_id && !body.climate_profile_id) {
    return standardError(
      'MISSING_PARAMS',
      'Either tenant_id or climate_profile_id is required',
      400
    );
  }

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await recommendStrategies(supabase, body);
    
    logMetricEvent({
      category: 'hybrid_search',
      name: 'recommend_strategies',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: true,
    });
    
    return jsonResponse(result);
  } catch (error) {
    console.error('recommendStrategies error:', error);
    
    logMetricEvent({
      category: 'hybrid_search',
      name: 'recommend_strategies',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: 'SEARCH_ERROR',
    });
    
    return standardError(
      'SEARCH_ERROR',
      'Failed to recommend strategies',
      500
    );
  }
});

hybridSearchHandler.post('/search-knowledge', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const startTime = Date.now();
  
  let body: SearchKnowledgeInput;
  try {
    body = await c.req.json();
  } catch {
    return standardError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return standardError(
      'MISSING_PARAMS',
      'query is required and must be a non-empty string',
      400
    );
  }

  if (body.filters?.entity_types) {
    const validTypes: EntityType[] = ['module', 'table', 'endpoint', 'workflow', 'domain_object'];
    for (const t of body.filters.entity_types) {
      if (!validTypes.includes(t)) {
        return standardError(
          'INVALID_PARAMS',
          `Invalid entity_type: ${t}. Valid types: ${validTypes.join(', ')}`,
          400
        );
      }
    }
  }

  if (body.filters?.sources) {
    const validSources = ['memory', 'world_node', 'table'];
    for (const s of body.filters.sources) {
      if (!validSources.includes(s)) {
        return standardError(
          'INVALID_PARAMS',
          `Invalid source: ${s}. Valid sources: ${validSources.join(', ')}`,
          400
        );
      }
    }
  }

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await searchKnowledge(supabase, c.env, body);
    
    logMetricEvent({
      category: 'hybrid_search',
      name: 'search_knowledge',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: true,
      metadata: { query_length: body.query.length },
    });
    
    return jsonResponse(result);
  } catch (error) {
    console.error('searchKnowledge error:', error);
    
    logMetricEvent({
      category: 'hybrid_search',
      name: 'search_knowledge',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: 'SEARCH_ERROR',
    });
    
    return standardError(
      'SEARCH_ERROR',
      'Failed to search knowledge',
      500
    );
  }
});

export default hybridSearchHandler;
