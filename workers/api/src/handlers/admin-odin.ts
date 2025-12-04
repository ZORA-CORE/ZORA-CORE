/**
 * ODIN Web Ingestion Admin API v1.0
 * 
 * Admin endpoints for managing ODIN's web ingestion capabilities.
 * These endpoints require X-ZORA-ADMIN-SECRET or JWT auth (founder/brand_admin).
 * 
 * Endpoints:
 * - POST /api/admin/odin/ingest-url - Ingest a single URL
 * - POST /api/admin/odin/run-job - Run a named bootstrap job
 * - GET /api/admin/odin/jobs - List available bootstrap jobs
 * - GET /api/admin/odin/stats - Get knowledge store statistics
 * - GET /api/admin/odin/documents - List knowledge documents
 * - GET /api/admin/odin/documents/:id - Get a specific document
 * - POST /api/admin/odin/search - Search knowledge documents
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import { jsonResponse, standardError } from '../lib/response';
import {
  ingestKnowledgeFromUrl,
  runBootstrapJob,
  getBootstrapJobNames,
  ODIN_BOOTSTRAP_JOBS,
} from '../odin';
import {
  searchKnowledgeDocuments,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  getKnowledgeStoreStats,
} from '../lib/knowledgeStore';
import { getWebToolInfo, isWebToolConfigured } from '../webtool';
import { logMetricEvent } from '../middleware/logging';

const app = new Hono<AuthAppEnv>();

function verifyAdminAccess(c: { req: { header: (name: string) => string | undefined }; env: { ZORA_BOOTSTRAP_SECRET?: string }; get: (key: string) => unknown }): boolean {
  const adminSecret = c.req.header('X-ZORA-ADMIN-SECRET');
  if (adminSecret && adminSecret === c.env.ZORA_BOOTSTRAP_SECRET) {
    return true;
  }

  const auth = c.get('auth') as { role?: string } | undefined;
  if (auth?.role === 'founder' || auth?.role === 'brand_admin') {
    return true;
  }

  return false;
}

app.post('/ingest-url', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const body = await c.req.json();
    const { url, domain, language, tenant_id, tags } = body;

    if (!url || typeof url !== 'string') {
      return standardError('VALIDATION_ERROR', 'url is required', 400);
    }

    if (!domain || typeof domain !== 'string') {
      return standardError('VALIDATION_ERROR', 'domain is required', 400);
    }

    const auth = c.get('auth') as { userId?: string } | undefined;

    const result = await ingestKnowledgeFromUrl(supabase, env, {
      url,
      domain,
      language: language || 'en',
      tenant_id: tenant_id ?? null,
      initiated_by_agent: 'ODIN',
      initiated_by_user_id: auth?.userId,
      tags: tags || [],
    });

    if (result.success) {
      return jsonResponse({
        message: 'URL ingested successfully',
        document_id: result.document_id,
        title: result.title,
        summary: result.summary,
      });
    } else {
      return standardError(result.error_code || 'INGESTION_FAILED', result.error_message || 'Ingestion failed', 400);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_odin',
      name: 'ingest_url_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.post('/run-job', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const body = await c.req.json();
    const { job_name } = body;

    if (!job_name || typeof job_name !== 'string') {
      return standardError('VALIDATION_ERROR', 'job_name is required', 400);
    }

    const availableJobs = getBootstrapJobNames();
    if (!availableJobs.includes(job_name)) {
      return standardError(
        'VALIDATION_ERROR',
        `Unknown job: ${job_name}. Available: ${availableJobs.join(', ')}`,
        400
      );
    }

    const result = await runBootstrapJob(supabase, env, job_name);

    return jsonResponse({
      message: 'Bootstrap job completed',
      job_name: result.job_name,
      topic: result.topic,
      domain: result.domain,
      documents_ingested: result.documents_ingested,
      documents_failed: result.documents_failed,
      document_ids: result.document_ids,
      errors: result.errors,
      duration_ms: result.duration_ms,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_odin',
      name: 'run_job_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.get('/jobs', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const jobs = getBootstrapJobNames().map(name => ({
    name,
    topic: ODIN_BOOTSTRAP_JOBS[name].topic,
    domain: ODIN_BOOTSTRAP_JOBS[name].domain,
    url_count: ODIN_BOOTSTRAP_JOBS[name].urls?.length || 0,
  }));

  return jsonResponse({
    jobs,
    total: jobs.length,
  });
});

app.get('/stats', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const auth = c.get('auth') as { tenantId?: string } | undefined;
    const stats = await getKnowledgeStoreStats(supabase, auth?.tenantId);
    const webToolInfo = getWebToolInfo(env);
    const webToolConfigured = isWebToolConfigured(env);

    return jsonResponse({
      knowledge_store: stats,
      webtool: {
        configured: webToolConfigured,
        ...webToolInfo,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_odin',
      name: 'stats_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.get('/documents', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const auth = c.get('auth') as { tenantId?: string } | undefined;
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const domain = c.req.query('domain');
    const sourceType = c.req.query('source_type');
    const curationStatus = c.req.query('curation_status');
    const includeGlobal = c.req.query('include_global') !== 'false';

    const { documents, total } = await listKnowledgeDocuments(
      supabase,
      auth?.tenantId || null,
      {
        domain: domain || undefined,
        source_type: sourceType as 'web_page' | 'api' | 'report' | 'standard' | 'article' | undefined,
        curation_status: curationStatus as 'auto' | 'reviewed' | 'discarded' | undefined,
      },
      limit,
      offset,
      includeGlobal
    );

    return jsonResponse({
      documents,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + documents.length < total,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_odin',
      name: 'list_documents_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.get('/documents/:id', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const documentId = c.req.param('id');
    const auth = c.get('auth') as { tenantId?: string } | undefined;

    const document = await getKnowledgeDocument(supabase, documentId, auth?.tenantId);

    if (!document) {
      return standardError('NOT_FOUND', 'Document not found', 404);
    }

    return jsonResponse({ document });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_odin',
      name: 'get_document_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.post('/search', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const body = await c.req.json();
    const { query, domain, limit, threshold, include_global } = body;

    if (!query || typeof query !== 'string') {
      return standardError('VALIDATION_ERROR', 'query is required', 400);
    }

    const auth = c.get('auth') as { tenantId?: string } | undefined;

    const result = await searchKnowledgeDocuments(supabase, env, {
      query,
      domain: domain || undefined,
      tenant_id: auth?.tenantId,
      include_global: include_global !== false,
      limit: Math.min(limit || 20, 50),
      threshold: threshold || 0.0,
    });

    return jsonResponse(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_odin',
      name: 'search_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

export default app;
