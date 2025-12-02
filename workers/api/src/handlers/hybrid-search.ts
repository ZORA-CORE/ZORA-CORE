/**
 * Hybrid Search & Reasoner v1.0 API Handler
 * 
 * Admin-protected endpoints for hybrid search operations:
 * - POST /api/admin/hybrid-search/find-similar-tenants
 * - POST /api/admin/hybrid-search/recommend-strategies
 * - POST /api/admin/hybrid-search/search-knowledge
 * - GET /api/admin/hybrid-search/info
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
import { jsonResponse, errorResponse } from '../lib/response';

const hybridSearchHandler = new Hono<AuthAppEnv>();

hybridSearchHandler.get('/info', async (c) => {
  const info = getHybridSearchInfo();
  return jsonResponse(info);
});

hybridSearchHandler.post('/find-similar-tenants', async (c) => {
  let body: FindSimilarTenantsInput;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.tenant_id && !body.profile) {
    return errorResponse(
      'MISSING_PARAMS',
      'Either tenant_id or profile object is required',
      400
    );
  }

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await findSimilarTenants(supabase, body);
    return jsonResponse(result);
  } catch (error) {
    console.error('findSimilarTenants error:', error);
    return errorResponse(
      'SEARCH_ERROR',
      'Failed to find similar tenants',
      500
    );
  }
});

hybridSearchHandler.post('/recommend-strategies', async (c) => {
  let body: RecommendStrategiesInput;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.tenant_id && !body.climate_profile_id) {
    return errorResponse(
      'MISSING_PARAMS',
      'Either tenant_id or climate_profile_id is required',
      400
    );
  }

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await recommendStrategies(supabase, body);
    return jsonResponse(result);
  } catch (error) {
    console.error('recommendStrategies error:', error);
    return errorResponse(
      'SEARCH_ERROR',
      'Failed to recommend strategies',
      500
    );
  }
});

hybridSearchHandler.post('/search-knowledge', async (c) => {
  let body: SearchKnowledgeInput;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return errorResponse(
      'MISSING_PARAMS',
      'query is required and must be a non-empty string',
      400
    );
  }

  if (body.filters?.entity_types) {
    const validTypes: EntityType[] = ['module', 'table', 'endpoint', 'workflow', 'domain_object'];
    for (const t of body.filters.entity_types) {
      if (!validTypes.includes(t)) {
        return errorResponse(
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
        return errorResponse(
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
    return jsonResponse(result);
  } catch (error) {
    console.error('searchKnowledge error:', error);
    return errorResponse(
      'SEARCH_ERROR',
      'Failed to search knowledge',
      500
    );
  }
});

export default hybridSearchHandler;
