/**
 * WebTool Admin API v2.0
 * 
 * Admin endpoints for managing WebTool allowed domains registry.
 * These endpoints require X-ZORA-ADMIN-SECRET or JWT auth (founder/brand_admin).
 * 
 * Endpoints:
 * - GET /api/admin/webtool/allowed-domains - List allowed domains with pagination/filters
 * - POST /api/admin/webtool/allowed-domains - Create a new allowed domain
 * - GET /api/admin/webtool/allowed-domains/:id - Get a specific domain
 * - PATCH /api/admin/webtool/allowed-domains/:id - Update a domain (toggle is_enabled, edit label)
 * - DELETE /api/admin/webtool/allowed-domains/:id - Delete a domain
 * - GET /api/admin/webtool/registry-stats - Get registry statistics
 * - POST /api/admin/webtool/seed-registry - Manually trigger registry seeding
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import { jsonResponse, standardError } from '../lib/response';
import {
  getAllAllowedDomains,
  getAllowedDomainById,
  upsertAllowedDomain,
  updateAllowedDomain,
  deleteAllowedDomain,
  getRegistryStats,
  ensureRegistrySeeded,
  invalidateCache,
} from '../webtool';
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

app.get('/allowed-domains', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const source = c.req.query('source');
    const isEnabled = c.req.query('is_enabled');

    const filters: { source?: string; is_enabled?: boolean } = {};
    if (source) {
      filters.source = source;
    }
    if (isEnabled !== undefined && isEnabled !== '') {
      filters.is_enabled = isEnabled === 'true';
    }

    const { domains, total } = await getAllAllowedDomains(supabase, {
      ...filters,
      limit,
      offset,
    });

    return jsonResponse({
      domains,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + domains.length < total,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'list_domains_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.post('/allowed-domains', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const body = await c.req.json();
    const { domain, label, description, source, is_enabled } = body;

    if (!domain || typeof domain !== 'string') {
      return standardError('VALIDATION_ERROR', 'domain is required', 400);
    }

    const domainLower = domain.toLowerCase().trim();
    if (!domainLower.includes('.')) {
      return standardError('VALIDATION_ERROR', 'Invalid domain format', 400);
    }

    const result = await upsertAllowedDomain(supabase, {
      domain: domainLower,
      label: label || null,
      description: description || null,
      source: source || 'manual_admin',
      is_enabled: is_enabled !== false,
    });

    logMetricEvent({
      category: 'admin_webtool',
      name: 'create_domain',
      success: true,
      metadata: { domain: domainLower, source: source || 'manual_admin' },
    });

    invalidateCache();

    return jsonResponse({
      message: 'Domain added successfully',
      domain: result,
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'create_domain_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.get('/allowed-domains/:id', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const domainId = c.req.param('id');
    const domain = await getAllowedDomainById(supabase, domainId);

    if (!domain) {
      return standardError('NOT_FOUND', 'Domain not found', 404);
    }

    return jsonResponse({ domain });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'get_domain_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.patch('/allowed-domains/:id', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const domainId = c.req.param('id');
    const body = await c.req.json();
    const { label, description, is_enabled } = body;

    const existing = await getAllowedDomainById(supabase, domainId);
    if (!existing) {
      return standardError('NOT_FOUND', 'Domain not found', 404);
    }

    const updates: { label?: string; description?: string; is_enabled?: boolean } = {};
    if (label !== undefined) {
      updates.label = label || undefined;
    }
    if (description !== undefined) {
      updates.description = description || undefined;
    }
    if (is_enabled !== undefined) {
      updates.is_enabled = is_enabled;
    }

    const result = await updateAllowedDomain(supabase, domainId, updates);

    logMetricEvent({
      category: 'admin_webtool',
      name: 'update_domain',
      success: true,
      metadata: { domain_id: domainId, updates },
    });

    invalidateCache();

    return jsonResponse({
      message: 'Domain updated successfully',
      domain: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'update_domain_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.delete('/allowed-domains/:id', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const domainId = c.req.param('id');

    const existing = await getAllowedDomainById(supabase, domainId);
    if (!existing) {
      return standardError('NOT_FOUND', 'Domain not found', 404);
    }

    await deleteAllowedDomain(supabase, domainId);

    logMetricEvent({
      category: 'admin_webtool',
      name: 'delete_domain',
      success: true,
      metadata: { domain_id: domainId, domain: existing.domain },
    });

    invalidateCache();

    return jsonResponse({
      message: 'Domain deleted successfully',
      domain_id: domainId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'delete_domain_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.get('/registry-stats', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const stats = await getRegistryStats(supabase);

    return jsonResponse({
      registry: stats,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'registry_stats_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

app.post('/seed-registry', async (c) => {
  if (!verifyAdminAccess(c)) {
    return standardError('UNAUTHORIZED', 'Admin access required', 401);
  }

  const env = c.env;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  try {
    const seeded = await ensureRegistrySeeded(supabase, env);

    logMetricEvent({
      category: 'admin_webtool',
      name: 'seed_registry',
      success: true,
      metadata: { seeded: seeded.seeded, count: seeded.count },
    });

    invalidateCache();

    return jsonResponse({
      message: seeded.seeded ? 'Registry seeded successfully' : 'Registry already seeded',
      seeded: seeded.seeded,
      count: seeded.count,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMetricEvent({
      category: 'admin_webtool',
      name: 'seed_registry_error',
      success: false,
      error_code: 'INTERNAL_ERROR',
      metadata: { error: errorMessage },
    });
    return standardError('INTERNAL_ERROR', errorMessage, 500);
  }
});

export default app;
