/**
 * ZORA Hybrid Search & Reasoner v1.0
 * 
 * Combines EIVOR's semantic search, the World Model graph, and SQL filters
 * to answer complex climate/business questions for Nordic agents.
 * 
 * Core operations:
 * - findSimilarTenants: Find tenants similar to a reference tenant/profile
 * - recommendStrategies: Recommend missions/actions based on similar tenants
 * - searchKnowledge: Semantic + graph-aware search across ZORA CORE
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildWorldModelFromManifest,
  filterNodes,
  traverseSubgraph,
  type WorldNode,
  type WorldEdge,
  type EntityType as WorldModelEntityType,
} from '../world-model/worldModel';

export type EntityType = WorldModelEntityType;
import { generateEmbedding, getEmbeddingModel, OpenAIError } from '../lib/openai';
import type { Bindings } from '../types';

export const HYBRID_SEARCH_VERSION = '1.0.0';

export interface FindSimilarTenantsInput {
  tenant_id?: string;
  profile?: {
    sector?: string;
    country?: string;
    scope?: string;
    tags?: string[];
    description?: string;
  };
  filters?: {
    country?: string;
    sector?: string;
    scope?: string;
    min_climate_score?: number;
    max_results?: number;
  };
}

export interface HybridSimilarTenant {
  tenant_id: string;
  name: string;
  sector: string | null;
  country: string | null;
  scope: string | null;
  climate_score: number | null;
  score: number;
  reasons: string[];
}

export interface FindSimilarTenantsResult {
  version: string;
  reference: {
    tenant_id: string | null;
    sector: string | null;
    country: string | null;
    scope: string | null;
  };
  similar_tenants: HybridSimilarTenant[];
  total_candidates: number;
  algorithm: string;
}

export interface RecommendStrategiesInput {
  tenant_id?: string;
  climate_profile_id?: string;
  tags?: string[];
  max_similar_tenants?: number;
  max_strategies?: number;
}

export type StrategyType = 'mission' | 'goes_green_action' | 'material_change' | 'foundation_project';

export interface HybridStrategy {
  type: StrategyType;
  id: string;
  label: string;
  category: string | null;
  score: number;
  frequency: number;
  avg_impact_kgco2: number | null;
  reasons: string[];
}

export interface RecommendStrategiesResult {
  version: string;
  target: {
    tenant_id: string | null;
    climate_profile_id: string | null;
  };
  similar_tenants_used: number;
  strategies: HybridStrategy[];
  algorithm: string;
}

export interface SearchKnowledgeInput {
  query: string;
  filters?: {
    module?: string;
    entity_types?: EntityType[];
    tags?: string[];
    sources?: ('memory' | 'world_node' | 'table')[];
  };
  max_results?: number;
  include_graph_expansion?: boolean;
}

export type KnowledgeSource = 'memory' | 'world_node' | 'table';

export interface HybridKnowledgeHit {
  source: KnowledgeSource;
  id: string;
  title: string;
  snippet: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SearchKnowledgeResult {
  version: string;
  query: string;
  hits: HybridKnowledgeHit[];
  total_hits: number;
  sources_searched: KnowledgeSource[];
  embedding_model: string | null;
}

interface TenantProfile {
  tenant_id: string;
  tenant_name: string;
  sector: string | null;
  country: string | null;
  scope: string | null;
  climate_score: number | null;
  profile_type: string | null;
  has_goes_green: boolean;
  has_products: boolean;
  has_foundation_projects: boolean;
  mission_count: number;
}

function computeSimilarityScore(
  reference: TenantProfile,
  candidate: TenantProfile
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (reference.sector && candidate.sector && reference.sector === candidate.sector) {
    score += 0.3;
    reasons.push(`Same sector: ${reference.sector}`);
  }

  if (reference.country && candidate.country && reference.country === candidate.country) {
    score += 0.2;
    reasons.push(`Same country: ${reference.country}`);
  }

  if (reference.scope && candidate.scope && reference.scope === candidate.scope) {
    score += 0.15;
    reasons.push(`Same scope: ${reference.scope}`);
  }

  if (reference.climate_score !== null && candidate.climate_score !== null) {
    const scoreDiff = Math.abs(reference.climate_score - candidate.climate_score);
    if (scoreDiff <= 10) {
      score += 0.15;
      reasons.push(`Similar climate score band (within 10 points)`);
    } else if (scoreDiff <= 25) {
      score += 0.08;
      reasons.push(`Moderately similar climate score (within 25 points)`);
    }
  }

  if (reference.has_goes_green && candidate.has_goes_green) {
    score += 0.1;
    reasons.push(`Both have GOES GREEN profiles`);
  }

  if (reference.has_products && candidate.has_products) {
    score += 0.05;
    reasons.push(`Both have products in ZORA SHOP`);
  }

  if (reference.has_foundation_projects && candidate.has_foundation_projects) {
    score += 0.05;
    reasons.push(`Both have foundation projects`);
  }

  return { score: Math.min(score, 1.0), reasons };
}

export async function findSimilarTenants(
  supabase: SupabaseClient,
  input: FindSimilarTenantsInput
): Promise<FindSimilarTenantsResult> {
  const maxResults = input.filters?.max_results || 20;
  
  let referenceProfile: TenantProfile | null = null;

  if (input.tenant_id) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', input.tenant_id)
      .single();

    if (tenantData) {
      const { data: profileData } = await supabase
        .from('climate_profiles')
        .select('sector, country, scope, climate_score, profile_type')
        .eq('tenant_id', input.tenant_id)
        .eq('is_primary', true)
        .single();

      const { count: goesGreenCount } = await supabase
        .from('goes_green_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenant_id);

      const { count: productsCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenant_id);

      const { count: foundationCount } = await supabase
        .from('foundation_projects')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenant_id);

      const { count: missionCount } = await supabase
        .from('climate_missions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenant_id);

      referenceProfile = {
        tenant_id: tenantData.id,
        tenant_name: tenantData.name,
        sector: profileData?.sector || input.profile?.sector || null,
        country: profileData?.country || input.profile?.country || null,
        scope: profileData?.scope || input.profile?.scope || null,
        climate_score: profileData?.climate_score || null,
        profile_type: profileData?.profile_type || null,
        has_goes_green: (goesGreenCount || 0) > 0,
        has_products: (productsCount || 0) > 0,
        has_foundation_projects: (foundationCount || 0) > 0,
        mission_count: missionCount || 0,
      };
    }
  }

  if (!referenceProfile && input.profile) {
    referenceProfile = {
      tenant_id: '',
      tenant_name: 'Reference Profile',
      sector: input.profile.sector || null,
      country: input.profile.country || null,
      scope: input.profile.scope || null,
      climate_score: null,
      profile_type: null,
      has_goes_green: false,
      has_products: false,
      has_foundation_projects: false,
      mission_count: 0,
    };
  }

  if (!referenceProfile) {
    return {
      version: HYBRID_SEARCH_VERSION,
      reference: { tenant_id: null, sector: null, country: null, scope: null },
      similar_tenants: [],
      total_candidates: 0,
      algorithm: 'feature_similarity_v1',
    };
  }

  let query = supabase
    .from('climate_profiles')
    .select(`
      tenant_id,
      sector,
      country,
      scope,
      climate_score,
      profile_type,
      tenants!inner(id, name)
    `)
    .eq('is_primary', true);

  if (input.tenant_id) {
    query = query.neq('tenant_id', input.tenant_id);
  }

  if (input.filters?.country) {
    query = query.eq('country', input.filters.country);
  }
  if (input.filters?.sector) {
    query = query.eq('sector', input.filters.sector);
  }
  if (input.filters?.scope) {
    query = query.eq('scope', input.filters.scope);
  }
  if (input.filters?.min_climate_score !== undefined) {
    query = query.gte('climate_score', input.filters.min_climate_score);
  }

  query = query.limit(100);

  const { data: candidates, error } = await query;

  if (error || !candidates) {
    return {
      version: HYBRID_SEARCH_VERSION,
      reference: {
        tenant_id: referenceProfile.tenant_id || null,
        sector: referenceProfile.sector,
        country: referenceProfile.country,
        scope: referenceProfile.scope,
      },
      similar_tenants: [],
      total_candidates: 0,
      algorithm: 'feature_similarity_v1',
    };
  }

  const scoredCandidates: HybridSimilarTenant[] = [];

  for (const candidate of candidates) {
    const tenantInfo = candidate.tenants as unknown as { id: string; name: string };
    
    const candidateProfile: TenantProfile = {
      tenant_id: candidate.tenant_id,
      tenant_name: tenantInfo?.name || 'Unknown',
      sector: candidate.sector,
      country: candidate.country,
      scope: candidate.scope,
      climate_score: candidate.climate_score,
      profile_type: candidate.profile_type,
      has_goes_green: false,
      has_products: false,
      has_foundation_projects: false,
      mission_count: 0,
    };

    const { score, reasons } = computeSimilarityScore(referenceProfile, candidateProfile);

    if (score > 0) {
      scoredCandidates.push({
        tenant_id: candidate.tenant_id,
        name: tenantInfo?.name || 'Unknown',
        sector: candidate.sector,
        country: candidate.country,
        scope: candidate.scope,
        climate_score: candidate.climate_score,
        score,
        reasons,
      });
    }
  }

  scoredCandidates.sort((a, b) => b.score - a.score);
  const topCandidates = scoredCandidates.slice(0, maxResults);

  return {
    version: HYBRID_SEARCH_VERSION,
    reference: {
      tenant_id: referenceProfile.tenant_id || null,
      sector: referenceProfile.sector,
      country: referenceProfile.country,
      scope: referenceProfile.scope,
    },
    similar_tenants: topCandidates,
    total_candidates: candidates.length,
    algorithm: 'feature_similarity_v1',
  };
}

export async function recommendStrategies(
  supabase: SupabaseClient,
  input: RecommendStrategiesInput
): Promise<RecommendStrategiesResult> {
  const maxSimilarTenants = input.max_similar_tenants || 20;
  const maxStrategies = input.max_strategies || 10;

  let targetTenantId: string | null = null;
  let targetClimateProfileId: string | null = input.climate_profile_id || null;

  if (input.tenant_id) {
    targetTenantId = input.tenant_id;
  } else if (input.climate_profile_id) {
    const { data: profileData } = await supabase
      .from('climate_profiles')
      .select('tenant_id')
      .eq('id', input.climate_profile_id)
      .single();
    
    if (profileData) {
      targetTenantId = profileData.tenant_id;
    }
  }

  if (!targetTenantId) {
    return {
      version: HYBRID_SEARCH_VERSION,
      target: { tenant_id: null, climate_profile_id: targetClimateProfileId },
      similar_tenants_used: 0,
      strategies: [],
      algorithm: 'frequency_aggregation_v1',
    };
  }

  const similarResult = await findSimilarTenants(supabase, {
    tenant_id: targetTenantId,
    filters: { max_results: maxSimilarTenants },
  });

  const similarTenantIds = similarResult.similar_tenants.map(t => t.tenant_id);

  if (similarTenantIds.length === 0) {
    return {
      version: HYBRID_SEARCH_VERSION,
      target: { tenant_id: targetTenantId, climate_profile_id: targetClimateProfileId },
      similar_tenants_used: 0,
      strategies: [],
      algorithm: 'frequency_aggregation_v1',
    };
  }

  const strategies: HybridStrategy[] = [];

  const { data: missions } = await supabase
    .from('climate_missions')
    .select('id, title, category, status, estimated_impact_kgco2, tenant_id')
    .in('tenant_id', similarTenantIds)
    .in('status', ['completed', 'in_progress']);

  if (missions && missions.length > 0) {
    const missionsByCategory = new Map<string, { count: number; totalImpact: number; ids: string[]; titles: string[] }>();
    
    for (const mission of missions) {
      const category = mission.category || 'general';
      const existing = missionsByCategory.get(category) || { count: 0, totalImpact: 0, ids: [], titles: [] };
      existing.count++;
      existing.totalImpact += mission.estimated_impact_kgco2 || 0;
      if (!existing.ids.includes(mission.id)) {
        existing.ids.push(mission.id);
        existing.titles.push(mission.title);
      }
      missionsByCategory.set(category, existing);
    }

    for (const [category, data] of missionsByCategory) {
      if (input.tags && input.tags.length > 0) {
        const categoryLower = category.toLowerCase();
        if (!input.tags.some(tag => categoryLower.includes(tag.toLowerCase()))) {
          continue;
        }
      }

      const frequency = data.count / similarTenantIds.length;
      const avgImpact = data.count > 0 ? data.totalImpact / data.count : null;

      strategies.push({
        type: 'mission',
        id: data.ids[0],
        label: `${category} missions (e.g., ${data.titles[0]})`,
        category,
        score: Math.min(frequency + (avgImpact ? avgImpact / 10000 : 0), 1.0),
        frequency: data.count,
        avg_impact_kgco2: avgImpact,
        reasons: [
          `Used by ${data.count} missions across ${similarTenantIds.length} similar tenants`,
          avgImpact ? `Average impact: ${avgImpact.toFixed(1)} kg CO2` : 'Impact data not available',
        ],
      });
    }
  }

  const { data: goesGreenActions } = await supabase
    .from('goes_green_actions')
    .select('id, action_type, title, status, estimated_impact_kgco2, tenant_id')
    .in('tenant_id', similarTenantIds)
    .in('status', ['completed', 'in_progress']);

  if (goesGreenActions && goesGreenActions.length > 0) {
    const actionsByType = new Map<string, { count: number; totalImpact: number; ids: string[]; titles: string[] }>();
    
    for (const action of goesGreenActions) {
      const actionType = action.action_type || 'general';
      const existing = actionsByType.get(actionType) || { count: 0, totalImpact: 0, ids: [], titles: [] };
      existing.count++;
      existing.totalImpact += action.estimated_impact_kgco2 || 0;
      if (!existing.ids.includes(action.id)) {
        existing.ids.push(action.id);
        existing.titles.push(action.title);
      }
      actionsByType.set(actionType, existing);
    }

    for (const [actionType, data] of actionsByType) {
      if (input.tags && input.tags.length > 0) {
        const typeLower = actionType.toLowerCase();
        if (!input.tags.some(tag => typeLower.includes(tag.toLowerCase()) || tag.toLowerCase() === 'energy')) {
          continue;
        }
      }

      const frequency = data.count / similarTenantIds.length;
      const avgImpact = data.count > 0 ? data.totalImpact / data.count : null;

      strategies.push({
        type: 'goes_green_action',
        id: data.ids[0],
        label: `${actionType} (e.g., ${data.titles[0]})`,
        category: actionType,
        score: Math.min(frequency + (avgImpact ? avgImpact / 10000 : 0), 1.0),
        frequency: data.count,
        avg_impact_kgco2: avgImpact,
        reasons: [
          `Used by ${data.count} GOES GREEN actions across similar tenants`,
          avgImpact ? `Average impact: ${avgImpact.toFixed(1)} kg CO2` : 'Impact data not available',
        ],
      });
    }
  }

  const { data: foundationProjects } = await supabase
    .from('foundation_projects')
    .select('id, title, category, status, estimated_impact_kgco2, tenant_id')
    .in('tenant_id', similarTenantIds)
    .in('status', ['active', 'completed']);

  if (foundationProjects && foundationProjects.length > 0) {
    const projectsByCategory = new Map<string, { count: number; totalImpact: number; ids: string[]; titles: string[] }>();
    
    for (const project of foundationProjects) {
      const category = project.category || 'general';
      const existing = projectsByCategory.get(category) || { count: 0, totalImpact: 0, ids: [], titles: [] };
      existing.count++;
      existing.totalImpact += project.estimated_impact_kgco2 || 0;
      if (!existing.ids.includes(project.id)) {
        existing.ids.push(project.id);
        existing.titles.push(project.title);
      }
      projectsByCategory.set(category, existing);
    }

    for (const [category, data] of projectsByCategory) {
      if (input.tags && input.tags.length > 0) {
        const categoryLower = category.toLowerCase();
        if (!input.tags.some(tag => categoryLower.includes(tag.toLowerCase()) || tag.toLowerCase() === 'foundation')) {
          continue;
        }
      }

      const frequency = data.count / similarTenantIds.length;
      const avgImpact = data.count > 0 ? data.totalImpact / data.count : null;

      strategies.push({
        type: 'foundation_project',
        id: data.ids[0],
        label: `${category} foundation projects (e.g., ${data.titles[0]})`,
        category,
        score: Math.min(frequency * 0.8 + (avgImpact ? avgImpact / 50000 : 0), 1.0),
        frequency: data.count,
        avg_impact_kgco2: avgImpact,
        reasons: [
          `${data.count} similar tenants support ${category} foundation projects`,
          avgImpact ? `Average project impact: ${avgImpact.toFixed(1)} kg CO2` : 'Impact data not available',
        ],
      });
    }
  }

  strategies.sort((a, b) => b.score - a.score);
  const topStrategies = strategies.slice(0, maxStrategies);

  return {
    version: HYBRID_SEARCH_VERSION,
    target: { tenant_id: targetTenantId, climate_profile_id: targetClimateProfileId },
    similar_tenants_used: similarTenantIds.length,
    strategies: topStrategies,
    algorithm: 'frequency_aggregation_v1',
  };
}

export async function searchKnowledge(
  supabase: SupabaseClient,
  env: Bindings,
  input: SearchKnowledgeInput
): Promise<SearchKnowledgeResult> {
  const maxResults = input.max_results || 30;
  const sourcesToSearch = input.filters?.sources || ['memory', 'world_node', 'table'];
  const hits: HybridKnowledgeHit[] = [];
  let embeddingModel: string | null = null;

  if (sourcesToSearch.includes('memory')) {
    try {
      const embeddingResult = await generateEmbedding(input.query, env);
      embeddingModel = getEmbeddingModel();

      const { data: memoryHits, error } = await supabase.rpc('search_memories_by_embedding', {
        query_embedding: embeddingResult.embedding,
        match_threshold: 0.0,
        match_count: Math.min(maxResults, 20),
        filter_agent: null,
        filter_tenant_id: null,
      });

      if (!error && memoryHits) {
        for (const hit of memoryHits) {
          const content = hit.content || '';
          const tags = hit.tags || [];
          
          hits.push({
            source: 'memory',
            id: hit.id,
            title: tags.length > 0 ? tags.join(', ') : 'Memory Event',
            snippet: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
            score: hit.similarity || 0,
            metadata: {
              agent: hit.agent,
              memory_type: hit.memory_type,
              tags,
              tenant_id: hit.tenant_id,
              created_at: hit.created_at,
            },
          });
        }
      }
    } catch (error) {
      if (!(error instanceof OpenAIError)) {
        console.error('Semantic search error:', error);
      }
    }
  }

  if (sourcesToSearch.includes('world_node')) {
    const { nodes, edges } = buildWorldModelFromManifest();
    const queryLower = input.query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    let filteredNodes = nodes;
    
    if (input.filters?.module) {
      filteredNodes = filterNodes(filteredNodes, { module: input.filters.module });
    }
    if (input.filters?.entity_types && input.filters.entity_types.length > 0) {
      filteredNodes = filteredNodes.filter(n => input.filters!.entity_types!.includes(n.entity_type));
    }
    if (input.filters?.tags && input.filters.tags.length > 0) {
      filteredNodes = filteredNodes.filter(n => 
        input.filters!.tags!.some(tag => n.tags.includes(tag))
      );
    }

    const nodeHits: Array<{ node: WorldNode; score: number }> = [];

    for (const node of filteredNodes) {
      const labelLower = node.label.toLowerCase();
      const descLower = (node.description || '').toLowerCase();
      const keyLower = node.key.toLowerCase();

      let score = 0;

      if (labelLower.includes(queryLower) || keyLower.includes(queryLower)) {
        score = 0.9;
      } else if (descLower.includes(queryLower)) {
        score = 0.7;
      } else {
        const matchedTerms = queryTerms.filter(term => 
          labelLower.includes(term) || descLower.includes(term) || keyLower.includes(term)
        );
        if (matchedTerms.length > 0) {
          score = 0.5 * (matchedTerms.length / queryTerms.length);
        }
      }

      if (score > 0) {
        nodeHits.push({ node, score });
      }
    }

    nodeHits.sort((a, b) => b.score - a.score);
    const topNodeHits = nodeHits.slice(0, Math.min(maxResults, 15));

    for (const { node, score } of topNodeHits) {
      hits.push({
        source: 'world_node',
        id: `${node.entity_type}:${node.key}`,
        title: node.label,
        snippet: node.description || `${node.entity_type} in module ${node.module}`,
        score,
        metadata: {
          entity_type: node.entity_type,
          key: node.key,
          module: node.module,
          tags: node.tags,
        },
      });
    }

    if (input.include_graph_expansion && topNodeHits.length > 0) {
      const topNode = topNodeHits[0].node;
      const subgraph = traverseSubgraph(
        nodes,
        edges,
        topNode.entity_type,
        topNode.key,
        undefined,
        1
      );

      for (const relatedNode of subgraph.nodes) {
        if (relatedNode.key === topNode.key && relatedNode.entity_type === topNode.entity_type) {
          continue;
        }

        const existingHit = hits.find(h => h.id === `${relatedNode.entity_type}:${relatedNode.key}`);
        if (!existingHit) {
          hits.push({
            source: 'world_node',
            id: `${relatedNode.entity_type}:${relatedNode.key}`,
            title: relatedNode.label,
            snippet: relatedNode.description || `Related ${relatedNode.entity_type}`,
            score: 0.3,
            metadata: {
              entity_type: relatedNode.entity_type,
              key: relatedNode.key,
              module: relatedNode.module,
              tags: relatedNode.tags,
              related_to: topNode.key,
            },
          });
        }
      }
    }
  }

  if (sourcesToSearch.includes('table')) {
    const searchPattern = `%${input.query}%`;

    const { data: missions } = await supabase
      .from('climate_missions')
      .select('id, title, description, category')
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .limit(10);

    if (missions) {
      for (const mission of missions) {
        hits.push({
          source: 'table',
          id: mission.id,
          title: mission.title,
          snippet: (mission.description || '').slice(0, 200),
          score: 0.6,
          metadata: {
            table: 'climate_missions',
            category: mission.category,
          },
        });
      }
    }

    const { data: projects } = await supabase
      .from('foundation_projects')
      .select('id, title, description, category')
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .limit(10);

    if (projects) {
      for (const project of projects) {
        hits.push({
          source: 'table',
          id: project.id,
          title: project.title,
          snippet: (project.description || '').slice(0, 200),
          score: 0.6,
          metadata: {
            table: 'foundation_projects',
            category: project.category,
          },
        });
      }
    }

    const { data: lessons } = await supabase
      .from('academy_lessons')
      .select('id, title, content_summary')
      .or(`title.ilike.${searchPattern},content_summary.ilike.${searchPattern}`)
      .limit(10);

    if (lessons) {
      for (const lesson of lessons) {
        hits.push({
          source: 'table',
          id: lesson.id,
          title: lesson.title,
          snippet: (lesson.content_summary || '').slice(0, 200),
          score: 0.55,
          metadata: {
            table: 'academy_lessons',
          },
        });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);
  const finalHits = hits.slice(0, maxResults);

  return {
    version: HYBRID_SEARCH_VERSION,
    query: input.query,
    hits: finalHits,
    total_hits: hits.length,
    sources_searched: sourcesToSearch,
    embedding_model: embeddingModel,
  };
}

export function getHybridSearchInfo(): {
  version: string;
  operations: string[];
  algorithms: Record<string, string>;
} {
  return {
    version: HYBRID_SEARCH_VERSION,
    operations: ['findSimilarTenants', 'recommendStrategies', 'searchKnowledge'],
    algorithms: {
      findSimilarTenants: 'feature_similarity_v1 - Compares sector, country, scope, climate score, and domain presence',
      recommendStrategies: 'frequency_aggregation_v1 - Aggregates strategies from similar tenants by frequency and impact',
      searchKnowledge: 'hybrid_search_v1 - Combines EIVOR semantic search, World Model graph, and SQL text search',
    },
  };
}
