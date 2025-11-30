import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types';
import { authMiddleware, type AuthAppEnv } from './middleware/auth';
import statusHandler from './handlers/status';
import profilesHandler from './handlers/profiles';
import missionsHandler from './handlers/missions';
import journalHandler from './handlers/journal';
import agentsHandler from './handlers/agents';
import memoryHandler from './handlers/memory';
import adminHandler from './handlers/admin';
import adminMetricsHandler from './handlers/admin-metrics';
import authHandler from './handlers/auth';
import frontendConfigHandler from './handlers/frontend-config';
import agentSuggestionsHandler from './handlers/agent-suggestions';
import brandsHandler from './handlers/brands';
import productsHandler from './handlers/products';
import publicMashupsHandler from './handlers/public-mashups';
import agentTasksHandler from './handlers/agent-tasks';
import agentInsightsHandler from './handlers/agent-insights';
import agentCommandsHandler from './handlers/agent-commands';
import materialsHandler from './handlers/materials';
import shopProductsHandler from './handlers/shop-products';
import zoraShopProjectsHandler from './handlers/zora-shop-projects';
import autonomySchedulesHandler from './handlers/autonomy-schedules';
import hempMaterialsHandler from './handlers/hemp-materials';
import climateMaterialsHandler from './handlers/climate-materials';
import climateExperimentsHandler from './handlers/climate-experiments';

const app = new Hono<AuthAppEnv>();

// Request ID middleware - generates or propagates X-Request-ID header
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
  c.set('requestId', requestId);
  await next();
  // Add request ID to response headers
  c.res.headers.set('X-Request-ID', requestId);
});

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-ZORA-ADMIN-SECRET', 'X-Request-ID'],
}));

// Apply auth middleware to protected routes
// Note: /api/status and /api/public/* remain public (no auth required)
// Note: /api/admin/* uses X-ZORA-ADMIN-SECRET (handled in admin handler)
// Note: /api/admin/system-metrics and /api/admin/autonomy-status use JWT auth (handled in admin-metrics handler)
app.use('/api/climate/*', authMiddleware);
app.use('/api/agents/*', authMiddleware);
app.use('/api/missions/*', authMiddleware);
app.use('/api/journal/*', authMiddleware);
app.use('/api/frontend/*', authMiddleware);
app.use('/api/autonomy/*', authMiddleware);
app.use('/api/mashups/*', authMiddleware);
app.use('/api/shop/*', authMiddleware);
app.use('/api/zora-shop/*', authMiddleware);
// Admin metrics endpoints require JWT auth (founder/brand_admin role)
app.use('/api/admin/system-metrics', authMiddleware);
app.use('/api/admin/autonomy-status', authMiddleware);

// Public routes (no auth required) - mounted before auth middleware check
app.route('/api/public/mashups', publicMashupsHandler);

app.get('/', (c) => {
  return c.json({
    name: 'ZORA CORE API',
    version: '0.7.0',
    docs: '/api/status',
    public_endpoints: [
      'GET /api/status',
      'GET /api/public/mashups/products',
      'GET /api/public/mashups/products/:id',
      'GET /api/public/mashups/brands',
      'GET /api/public/mashups/stats',
      'POST /api/auth/register',
      'POST /api/auth/login',
    ],
    authenticated_endpoints: [
      'GET /api/auth/me',
      'GET /api/agents',
      'GET /api/agents/:agentId',
      'GET /api/agents/:agentId/memory',
      'POST /api/agents/:agentId/memory/semantic-search',
      'GET /api/agents/tasks',
      'GET /api/agents/tasks/:id',
      'POST /api/agents/tasks',
      'GET /api/agents/insights',
      'GET /api/agents/insights/:id',
      'POST /api/agents/insights/:id/decision',
      'GET /api/agents/commands',
      'GET /api/agents/commands/:id',
      'POST /api/agents/commands',
      'GET /api/climate/profiles',
      'GET /api/climate/profiles/:id',
      'POST /api/climate/profiles',
      'PUT /api/climate/profiles/:id',
      'GET /api/climate/profiles/:id/missions',
      'POST /api/climate/profiles/:id/missions',
      'PATCH /api/missions/:id',
      'GET /api/journal',
      'GET /api/frontend/config/:page',
      'PUT /api/frontend/config/:page',
      'POST /api/autonomy/frontend/suggest',
      'GET /api/autonomy/frontend/suggestions',
      'GET /api/autonomy/frontend/suggestions/:id',
      'POST /api/autonomy/frontend/suggestions/:id/decision',
      'GET /api/autonomy/schedules',
      'GET /api/autonomy/schedules/:id',
      'POST /api/autonomy/schedules',
      'PATCH /api/autonomy/schedules/:id',
      'DELETE /api/autonomy/schedules/:id',
      'GET /api/agents/tasks/pending-approval',
      'POST /api/agents/tasks/:id/decision',
      'GET /api/mashups/brands',
      'GET /api/mashups/brands/:id',
      'POST /api/mashups/brands',
      'PUT /api/mashups/brands/:id',
      'DELETE /api/mashups/brands/:id',
      'GET /api/mashups/products',
      'GET /api/mashups/products/:id',
      'POST /api/mashups/products',
      'PUT /api/mashups/products/:id',
      'DELETE /api/mashups/products/:id',
      'GET /api/shop/brands',
      'GET /api/shop/brands/:id',
      'POST /api/shop/brands',
      'PUT /api/shop/brands/:id',
      'DELETE /api/shop/brands/:id',
      'GET /api/shop/materials',
      'GET /api/shop/materials/:id',
      'POST /api/shop/materials',
      'PUT /api/shop/materials/:id',
      'DELETE /api/shop/materials/:id',
      'GET /api/shop/materials/hemp',
      'GET /api/climate/materials/profiles',
      'PUT /api/climate/materials/profiles/:materialId',
      'GET /api/climate/materials/impact',
      'GET /api/climate/experiments',
      'GET /api/climate/experiments/:id',
      'POST /api/climate/experiments',
      'PATCH /api/climate/experiments/:id',
      'GET /api/climate/experiments/:id/runs',
      'POST /api/climate/experiments/:id/runs',
      'GET /api/climate/experiments/runs/:runId',
      'GET /api/climate/experiments/:id/summary',
      'GET /api/shop/products',
      'GET /api/shop/products/:id',
      'POST /api/shop/products',
      'PUT /api/shop/products/:id',
      'DELETE /api/shop/products/:id',
      'GET /api/zora-shop/projects',
      'GET /api/zora-shop/projects/:id',
      'POST /api/zora-shop/projects',
      'PUT /api/zora-shop/projects/:id',
      'PATCH /api/zora-shop/projects/:id/status',
      'DELETE /api/zora-shop/projects/:id',
    ],
    admin_endpoints: [
      'GET /api/admin/status (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/schema-status (requires X-ZORA-ADMIN-SECRET)',
      'POST /api/admin/bootstrap-tenant (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/tenants (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/users (requires X-ZORA-ADMIN-SECRET)',
      'POST /api/admin/users (requires X-ZORA-ADMIN-SECRET)',
      'POST /api/admin/users/:id/token (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/system-metrics (requires JWT, founder/brand_admin)',
      'GET /api/admin/autonomy-status (requires JWT, founder/brand_admin)',
    ],
  });
});

app.route('/api/status', statusHandler);
app.route('/api/admin', adminHandler);
app.route('/api/admin', adminMetricsHandler);  // Observability & Metrics v1 (Iteration 00B6)
app.route('/api/auth', authHandler);
app.route('/api/agents', agentsHandler);
app.route('/api/agents', memoryHandler);
app.route('/api/agents', agentTasksHandler);
app.route('/api/agents', agentInsightsHandler);
app.route('/api/agents', agentCommandsHandler);
app.route('/api/climate/profiles', profilesHandler);
app.route('/api/climate', missionsHandler);
app.route('/api/missions', missionsHandler);
app.route('/api/journal', journalHandler);
app.route('/api/frontend/config', frontendConfigHandler);
app.route('/api/autonomy/frontend', agentSuggestionsHandler);
app.route('/api/mashups/brands', brandsHandler);
app.route('/api/mashups/products', productsHandler);

// ZORA SHOP Backend v1.0 routes
app.route('/api/shop/brands', brandsHandler);
app.route('/api/shop/materials', materialsHandler);
app.route('/api/shop/materials/hemp', hempMaterialsHandler);  // Hemp & Climate Materials v1 (Iteration 00C1)
app.route('/api/shop/products', shopProductsHandler);
app.route('/api/zora-shop/projects', zoraShopProjectsHandler);

// Hemp & Climate Materials v1 routes (Iteration 00C1)
app.route('/api/climate/materials', climateMaterialsHandler);

// Quantum Climate Lab v1 routes (Iteration 00C2)
app.route('/api/climate/experiments', climateExperimentsHandler);

// Safety + Scheduling v1 routes (Iteration 00B5)
app.route('/api/autonomy/schedules', autonomySchedulesHandler);

app.notFound((c) => {
  const requestId = c.get('requestId') || 'unknown';
  return c.json({
    error: {
      code: 'not_found',
      message: 'The requested endpoint does not exist',
    },
  }, 404);
});

app.onError((err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const auth = c.get('auth') as { tenantId?: string } | undefined;
  const tenantId = auth?.tenantId || 'unknown';
  
  // Log error with context for debugging
  console.error('Unhandled error:', {
    request_id: requestId,
    tenant_id: tenantId,
    url: c.req.url,
    method: c.req.method,
    error: err.message,
    stack: err.stack,
  });
  
  return c.json({
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred',
      details: {
        request_id: requestId,
      },
    },
  }, 500);
});

export default app;
