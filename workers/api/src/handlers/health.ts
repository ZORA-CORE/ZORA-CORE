/**
 * Health & Diagnostics Endpoints for ZORA CORE
 * 
 * Backend Hardening v1 - Health checks for monitoring and ops.
 * 
 * Endpoints:
 * - GET /api/admin/health/basic - Quick health check (unauthenticated)
 * - GET /api/admin/health/deep - Detailed health check (requires founder/brand_admin)
 * 
 * The basic endpoint is designed for uptime monitors and load balancers.
 * The deep endpoint runs actual checks against dependencies.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, standardError } from '../lib/response';
import type { AuthContext } from '../lib/auth';
import { WORLD_MODEL_VERSION } from '../world-model/worldModel';

const healthHandler = new Hono<AuthAppEnv>();

// App version - should match package.json or be set via env
const APP_VERSION = '0.7.0';
// Note: BUILD_COMMIT is computed per-request from env bindings since process.env doesn't exist in Workers runtime

interface BasicHealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  version: string;
  commit: string;
  environment: string;
  timestamp: string;
}

interface DeepHealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'unhealthy';
  latency_ms: number;
  message?: string;
}

interface DeepHealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  version: string;
  commit: string;
  environment: string;
  timestamp: string;
  checks: DeepHealthCheck[];
  world_model_version: string;
}

/**
 * GET /api/admin/health/basic
 * 
 * Quick health check for uptime monitors.
 * Returns immediately without checking dependencies.
 * 
 * Response:
 * - status: "ok" | "degraded" | "unhealthy"
 * - version: App version
 * - commit: Build commit SHA
 * - environment: "production" | "development"
 * - timestamp: ISO timestamp
 */
healthHandler.get('/basic', async (c) => {
  const environment = c.env.ENVIRONMENT || (c.env.SUPABASE_URL?.includes('localhost') ? 'development' : 'production');
  // Get commit SHA from environment bindings (process.env doesn't exist in Workers runtime)
  const buildCommit = (c.env as Record<string, string | undefined>).CF_PAGES_COMMIT_SHA 
    || (c.env as Record<string, string | undefined>).COMMIT_SHA 
    || 'unknown';
  
  const response: BasicHealthResponse = {
    status: 'ok',
    version: APP_VERSION,
    commit: buildCommit,
    environment,
    timestamp: new Date().toISOString(),
  };
  
  return jsonResponse(response);
});

/**
 * GET /api/admin/health/deep
 * 
 * Detailed health check that tests dependencies.
 * Requires authentication (founder or brand_admin role).
 * 
 * Checks:
 * - Database connectivity (Supabase)
 * - Tenants table query
 * - World model availability
 * 
 * Response includes latency for each check.
 */
healthHandler.get('/deep', async (c) => {
  // Require authentication for deep health check
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return standardError('UNAUTHORIZED', 'Authentication required for deep health check', 401);
  }
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return standardError('FORBIDDEN', 'Admin access required (founder or brand_admin role)', 403);
  }
  
  const environment = c.env.ENVIRONMENT || (c.env.SUPABASE_URL?.includes('localhost') ? 'development' : 'production');
  const checks: DeepHealthCheck[] = [];
  let overallStatus: 'ok' | 'degraded' | 'unhealthy' = 'ok';
  
  // Check 1: Database connectivity
  const dbCheckStart = Date.now();
  try {
    const supabase = getSupabaseClient(c.env);
    const { error } = await supabase.from('tenants').select('id').limit(1);
    
    const latency = Date.now() - dbCheckStart;
    
    if (error) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        latency_ms: latency,
        message: `Database query failed: ${error.message}`,
      });
      overallStatus = 'unhealthy';
    } else {
      checks.push({
        name: 'database',
        status: latency > 500 ? 'degraded' : 'ok',
        latency_ms: latency,
        message: latency > 500 ? 'Database response slow' : undefined,
      });
      if (latency > 500 && overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    }
  } catch (err) {
    const latency = Date.now() - dbCheckStart;
    checks.push({
      name: 'database',
      status: 'unhealthy',
      latency_ms: latency,
      message: `Database connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    overallStatus = 'unhealthy';
  }
  
  // Check 2: Tenant query (verifies schema is correct)
  const tenantCheckStart = Date.now();
  try {
    const supabase = getSupabaseClient(c.env);
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', auth.tenantId)
      .single();
    
    const latency = Date.now() - tenantCheckStart;
    
    if (error || !data) {
      checks.push({
        name: 'tenant_access',
        status: 'degraded',
        latency_ms: latency,
        message: 'Could not verify tenant access',
      });
      if (overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    } else {
      checks.push({
        name: 'tenant_access',
        status: 'ok',
        latency_ms: latency,
      });
    }
  } catch (err) {
    const latency = Date.now() - tenantCheckStart;
    checks.push({
      name: 'tenant_access',
      status: 'degraded',
      latency_ms: latency,
      message: `Tenant check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    if (overallStatus === 'ok') {
      overallStatus = 'degraded';
    }
  }
  
  // Check 3: World model availability
  const worldModelCheckStart = Date.now();
  try {
    // Just verify the world model version is available
    const latency = Date.now() - worldModelCheckStart;
    checks.push({
      name: 'world_model',
      status: WORLD_MODEL_VERSION ? 'ok' : 'degraded',
      latency_ms: latency,
      message: WORLD_MODEL_VERSION ? undefined : 'World model version not available',
    });
  } catch (err) {
    const latency = Date.now() - worldModelCheckStart;
    checks.push({
      name: 'world_model',
      status: 'degraded',
      latency_ms: latency,
      message: `World model check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    if (overallStatus === 'ok') {
      overallStatus = 'degraded';
    }
  }
  
  // Check 4: Auth sessions table (verifies Auth System v2 schema)
  const authCheckStart = Date.now();
  try {
    const supabase = getSupabaseClient(c.env);
    const { error } = await supabase
      .from('auth_sessions')
      .select('id')
      .limit(1);
    
    const latency = Date.now() - authCheckStart;
    
    if (error) {
      checks.push({
        name: 'auth_sessions',
        status: 'degraded',
        latency_ms: latency,
        message: 'Auth sessions table not accessible (run schema migration)',
      });
      if (overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    } else {
      checks.push({
        name: 'auth_sessions',
        status: 'ok',
        latency_ms: latency,
      });
    }
  } catch (err) {
    const latency = Date.now() - authCheckStart;
    checks.push({
      name: 'auth_sessions',
      status: 'degraded',
      latency_ms: latency,
      message: `Auth sessions check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    if (overallStatus === 'ok') {
      overallStatus = 'degraded';
    }
  }
  
  // Get commit SHA from environment bindings (process.env doesn't exist in Workers runtime)
  const buildCommit = (c.env as Record<string, string | undefined>).CF_PAGES_COMMIT_SHA 
    || (c.env as Record<string, string | undefined>).COMMIT_SHA 
    || 'unknown';
  
  const response: DeepHealthResponse = {
    status: overallStatus,
    version: APP_VERSION,
    commit: buildCommit,
    environment,
    timestamp: new Date().toISOString(),
    checks,
    world_model_version: WORLD_MODEL_VERSION,
  };
  
  return jsonResponse(response);
});

export default healthHandler;
