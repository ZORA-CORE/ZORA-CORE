/**
 * ZORA Knowledge Store v1.0
 * 
 * Data access layer for knowledge_documents table.
 * Provides insert, search, and query functions for web-ingested knowledge.
 * 
 * Used by ODIN Web Ingestion and EIVOR semantic search.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  KnowledgeDocument,
  KnowledgeDocumentWithSimilarity,
  CreateKnowledgeDocumentInput,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  KnowledgeDocumentFilters,
} from '../types';
import type { Bindings } from '../types';
import { generateEmbedding, getEmbeddingModel } from './openai';
import { logMetricEvent } from '../middleware/logging';

export const KNOWLEDGE_STORE_VERSION = '1.0.0';

export interface KnowledgeStoreStats {
  total_documents: number;
  by_domain: Record<string, number>;
  by_source_type: Record<string, number>;
  by_curation_status: Record<string, number>;
  global_documents: number;
  tenant_documents: number;
}

/**
 * Insert a new knowledge document into the store
 */
export async function insertKnowledgeDocument(
  supabase: SupabaseClient,
  input: CreateKnowledgeDocumentInput
): Promise<KnowledgeDocument> {
  const documentData = {
    tenant_id: input.tenant_id ?? null,
    source_type: input.source_type || 'web_page',
    source_url: input.source_url || null,
    domain: input.domain,
    language: input.language || 'en',
    title: input.title,
    raw_excerpt: input.raw_excerpt || null,
    summary: input.summary || null,
    embedding: input.embedding || null,
    quality_score: input.quality_score ?? null,
    curation_status: input.curation_status || 'auto',
    ingested_by_agent: input.ingested_by_agent || null,
    ingested_by_user_id: input.ingested_by_user_id || null,
    metadata: input.metadata || {},
  };

  const { data, error } = await supabase
    .from('knowledge_documents')
    .insert(documentData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert knowledge document: ${error.message}`);
  }

  if (input.tags && input.tags.length > 0) {
    const tagInserts = input.tags.map(tag => ({
      document_id: data.id,
      tag,
    }));

    await supabase.from('knowledge_document_tags').insert(tagInserts);
  }

  logMetricEvent({
    category: 'knowledge_store',
    name: 'insert',
    tenant_id: input.tenant_id || undefined,
    success: true,
    metadata: {
      document_id: data.id,
      domain: input.domain,
      source_type: input.source_type,
      has_embedding: !!input.embedding,
    },
  });

  return data as KnowledgeDocument;
}

/**
 * Search knowledge documents by semantic similarity
 */
export async function searchKnowledgeDocuments(
  supabase: SupabaseClient,
  env: Bindings,
  input: KnowledgeSearchInput
): Promise<KnowledgeSearchResult> {
  const startTime = Date.now();
  const limit = Math.min(Math.max(input.limit || 20, 1), 100);
  const threshold = input.threshold ?? 0.0;
  const includeGlobal = input.include_global ?? true;

  const embeddingResult = await generateEmbedding(input.query, env);

  const { data, error } = await supabase.rpc('search_knowledge_by_embedding', {
    query_embedding: embeddingResult.embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_domain: input.domain || null,
    filter_tenant_id: input.tenant_id || null,
    include_global: includeGlobal,
  });

  if (error) {
    throw new Error(`Failed to search knowledge documents: ${error.message}`);
  }

  const documents: KnowledgeDocumentWithSimilarity[] = (data || []).map(
    (row: Record<string, unknown> & { similarity: number }) => ({
      id: row.id as string,
      tenant_id: row.tenant_id as string | null,
      source_type: row.source_type as string,
      source_url: row.source_url as string | null,
      domain: row.domain as string,
      language: row.language as string,
      title: row.title as string,
      raw_excerpt: row.raw_excerpt as string | null,
      summary: row.summary as string | null,
      quality_score: row.quality_score as number | null,
      curation_status: row.curation_status as string,
      ingested_by_agent: row.ingested_by_agent as string | null,
      ingested_by_user_id: row.ingested_by_user_id as string | null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      created_at: row.created_at as string,
      updated_at: row.created_at as string,
      similarity: row.similarity,
    })
  );

  const durationMs = Date.now() - startTime;

  logMetricEvent({
    category: 'knowledge_store',
    name: 'search',
    tenant_id: input.tenant_id,
    duration_ms: durationMs,
    success: true,
    metadata: {
      query_length: input.query.length,
      domain: input.domain,
      include_global: includeGlobal,
      results_count: documents.length,
    },
  });

  return {
    documents,
    query: input.query,
    embedding_model: getEmbeddingModel(),
    total_hits: documents.length,
  };
}

/**
 * Get a knowledge document by ID
 */
export async function getKnowledgeDocument(
  supabase: SupabaseClient,
  documentId: string,
  tenantId?: string
): Promise<KnowledgeDocument | null> {
  let query = supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', documentId);

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get knowledge document: ${error.message}`);
  }

  return data as KnowledgeDocument;
}

/**
 * List knowledge documents with filters
 */
export async function listKnowledgeDocuments(
  supabase: SupabaseClient,
  tenantId: string | null,
  filters: KnowledgeDocumentFilters = {},
  limit: number = 50,
  offset: number = 0,
  includeGlobal: boolean = true
): Promise<{ documents: KnowledgeDocument[]; total: number }> {
  let query = supabase
    .from('knowledge_documents')
    .select('*', { count: 'exact' });

  if (tenantId) {
    if (includeGlobal) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.eq('tenant_id', tenantId);
    }
  } else if (!includeGlobal) {
    query = query.is('tenant_id', null);
  }

  if (filters.domain) {
    query = query.eq('domain', filters.domain);
  }
  if (filters.source_type) {
    query = query.eq('source_type', filters.source_type);
  }
  if (filters.curation_status) {
    query = query.eq('curation_status', filters.curation_status);
  }
  if (filters.ingested_by_agent) {
    query = query.eq('ingested_by_agent', filters.ingested_by_agent);
  }
  if (filters.language) {
    query = query.eq('language', filters.language);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list knowledge documents: ${error.message}`);
  }

  return {
    documents: (data || []) as KnowledgeDocument[],
    total: count || 0,
  };
}

/**
 * Update a knowledge document
 */
export async function updateKnowledgeDocument(
  supabase: SupabaseClient,
  documentId: string,
  updates: Partial<CreateKnowledgeDocumentInput>
): Promise<KnowledgeDocument> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.summary !== undefined) updateData.summary = updates.summary;
  if (updates.raw_excerpt !== undefined) updateData.raw_excerpt = updates.raw_excerpt;
  if (updates.quality_score !== undefined) updateData.quality_score = updates.quality_score;
  if (updates.curation_status !== undefined) updateData.curation_status = updates.curation_status;
  if (updates.embedding !== undefined) updateData.embedding = updates.embedding;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { data, error } = await supabase
    .from('knowledge_documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update knowledge document: ${error.message}`);
  }

  if (updates.tags !== undefined) {
    await supabase
      .from('knowledge_document_tags')
      .delete()
      .eq('document_id', documentId);

    if (updates.tags.length > 0) {
      const tagInserts = updates.tags.map(tag => ({
        document_id: documentId,
        tag,
      }));
      await supabase.from('knowledge_document_tags').insert(tagInserts);
    }
  }

  logMetricEvent({
    category: 'knowledge_store',
    name: 'update',
    success: true,
    metadata: {
      document_id: documentId,
      fields_updated: Object.keys(updateData).filter(k => k !== 'updated_at'),
    },
  });

  return data as KnowledgeDocument;
}

/**
 * Delete a knowledge document
 */
export async function deleteKnowledgeDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete knowledge document: ${error.message}`);
  }

  logMetricEvent({
    category: 'knowledge_store',
    name: 'delete',
    success: true,
    metadata: { document_id: documentId },
  });
}

/**
 * Get tags for a knowledge document
 */
export async function getKnowledgeDocumentTags(
  supabase: SupabaseClient,
  documentId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('knowledge_document_tags')
    .select('tag')
    .eq('document_id', documentId);

  if (error) {
    throw new Error(`Failed to get knowledge document tags: ${error.message}`);
  }

  return (data || []).map(row => row.tag);
}

/**
 * Get knowledge store statistics
 */
export async function getKnowledgeStoreStats(
  supabase: SupabaseClient,
  tenantId?: string
): Promise<KnowledgeStoreStats> {
  let baseQuery = supabase.from('knowledge_documents').select('domain, source_type, curation_status, tenant_id');

  if (tenantId) {
    baseQuery = baseQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }

  const { data, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to get knowledge store stats: ${error.message}`);
  }

  const stats: KnowledgeStoreStats = {
    total_documents: data?.length || 0,
    by_domain: {},
    by_source_type: {},
    by_curation_status: {},
    global_documents: 0,
    tenant_documents: 0,
  };

  for (const doc of data || []) {
    const domain = doc.domain as string;
    const sourceType = doc.source_type as string;
    const curationStatus = doc.curation_status as string;
    const docTenantId = doc.tenant_id as string | null;

    stats.by_domain[domain] = (stats.by_domain[domain] || 0) + 1;
    stats.by_source_type[sourceType] = (stats.by_source_type[sourceType] || 0) + 1;
    stats.by_curation_status[curationStatus] = (stats.by_curation_status[curationStatus] || 0) + 1;

    if (docTenantId === null) {
      stats.global_documents++;
    } else {
      stats.tenant_documents++;
    }
  }

  return stats;
}

/**
 * Check if a URL has already been ingested
 */
export async function isUrlAlreadyIngested(
  supabase: SupabaseClient,
  url: string,
  tenantId?: string | null
): Promise<boolean> {
  let query = supabase
    .from('knowledge_documents')
    .select('id')
    .eq('source_url', url);

  if (tenantId !== undefined) {
    if (tenantId === null) {
      query = query.is('tenant_id', null);
    } else {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(`Failed to check URL ingestion status: ${error.message}`);
  }

  return (data?.length || 0) > 0;
}

/**
 * Get count of knowledge documents by domain
 * Used for auto-bootstrap threshold checking
 */
export async function getKnowledgeDocumentCountByDomain(
  supabase: SupabaseClient,
  domain: string,
  globalOnly: boolean = true
): Promise<number> {
  let query = supabase
    .from('knowledge_documents')
    .select('*', { count: 'exact', head: true })
    .eq('domain', domain);

  if (globalOnly) {
    query = query.is('tenant_id', null);
  }

  const { count, error } = await query;

  if (error) {
    console.error(`Failed to count documents for domain ${domain}:`, error);
    return 0;
  }

  return count || 0;
}

/**
 * Get counts for all ODIN bootstrap domains
 * Used for auto-bootstrap decision making
 */
export async function getBootstrapDomainCounts(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const domains = [
    'climate_policy',
    'hemp_materials',
    'energy_efficiency',
    'sustainable_fashion',
    'impact_investing',
  ];

  const counts: Record<string, number> = {};

  for (const domain of domains) {
    counts[domain] = await getKnowledgeDocumentCountByDomain(supabase, domain, true);
  }

  return counts;
}
