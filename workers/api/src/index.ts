import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types';
import { authMiddleware, type AuthAppEnv } from './middleware/auth';
import { createRateLimiter } from './middleware/rateLimit';
import { createLoggingMiddleware } from './middleware/logging';
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
import foundationHandler from './handlers/foundation';
import organizationsHandler from './handlers/organizations';
import playbooksHandler from './handlers/playbooks';
import goesGreenHandler from './handlers/goes-green';
import academyHandler from './handlers/academy';
import billingHandler from './handlers/billing';
import shopOrdersHandler from './handlers/shop-orders';
import adminImpactHandler from './handlers/admin-impact';
import workflowsHandler from './handlers/workflows';
import workflowRunsHandler from './handlers/workflow-runs';
import outcomesHandler from './handlers/outcomes';
import worldModelHandler from './handlers/world-model';
import hybridSearchHandler from './handlers/hybrid-search';
import agentPanelHandler from './handlers/agent-panel';
import healthHandler from './handlers/health';
import adminOdinHandler from './handlers/admin-odin';
import adminWebtoolHandler from './handlers/admin-webtool';
import simulationHandler from './handlers/simulation';

const app = new Hono<AuthAppEnv>();

// Request ID middleware - generates or propagates X-Request-ID header
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
  c.set('requestId', requestId);
  await next();
  // Add request ID to response headers
  c.res.headers.set('X-Request-ID', requestId);
});

// Request logging middleware (Backend Hardening v1)
// Logs structured request/response data for observability
app.use('*', createLoggingMiddleware({
  enabled: true,
  slowThresholdMs: 1000,
  skipPaths: ['/api/admin/health/basic'], // Don't log health checks
}));

// Auth System v2: CORS configuration with credentials support for cookie-based auth
// When credentials are used, origin cannot be '*' - must be specific origins
app.use('*', cors({
  origin: (origin) => {
    // Allow requests from these origins (add production domains as needed)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8787',
      'https://zora-core.vercel.app',
      'https://zoracore.com',
      'https://www.zoracore.com',
    ];
    // Also allow any *.vercel.app preview deployments
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
      return origin;
    }
    // For non-browser requests (no origin header), allow the request
    return origin || '*';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-ZORA-ADMIN-SECRET', 'X-Request-ID'],
  credentials: true,
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
app.use('/api/foundation/*', authMiddleware);
app.use('/api/org/*', authMiddleware);
app.use('/api/playbooks/*', authMiddleware);
app.use('/api/playbook-runs/*', authMiddleware);
app.use('/api/goes-green/*', authMiddleware);
app.use('/api/academy/*', authMiddleware);
app.use('/api/billing/*', authMiddleware);
// Admin metrics endpoints require JWT auth (founder/brand_admin role)
app.use('/api/admin/system-metrics', authMiddleware);
app.use('/api/admin/autonomy-status', authMiddleware);
// Admin impact endpoints require JWT auth (founder/brand_admin role) - Global Impact v1 (Iteration 00D4)
app.use('/api/admin/impact/*', authMiddleware);
// World Model endpoints require JWT auth (founder/brand_admin role) - Backend Hardening v1
app.use('/api/admin/world-model/*', authMiddleware);
// Hybrid Search endpoints require JWT auth (founder/brand_admin role) - Backend Hardening v1
app.use('/api/admin/hybrid-search/*', authMiddleware);
// ODIN Web Ingestion endpoints require JWT auth (founder/brand_admin role) - Agent Web Access v1
app.use('/api/admin/odin/*', authMiddleware);
// WebTool Admin endpoints require JWT auth (founder/brand_admin role) - WebTool v2
app.use('/api/admin/webtool/*', authMiddleware);
// Simulation Engine endpoints require JWT auth (founder/brand_admin role) - Simulation Studio v1
app.use('/api/admin/simulation/*', authMiddleware);
// Workflow endpoints require JWT auth - Workflow / DAG Engine v1 (Iteration 00D5)
app.use('/api/workflows/*', authMiddleware);
app.use('/api/workflow-runs/*', authMiddleware);
// Outcome feedback endpoints require JWT auth - Outcome Feedback & Continual Learning v1 (Iteration 00D6)
app.use('/api/outcomes/*', authMiddleware);
// Agent Panel endpoints require JWT auth - Cockpit v1 (Iteration 00F2)
app.use('/api/agent-panel/*', authMiddleware);

// ============================================================================
// RATE LIMITING (Security & Auth Hardening v1.0)
// ============================================================================
// Apply rate limiting to critical endpoints to prevent abuse

// Auth endpoints - stricter limits to prevent brute force attacks
app.use('/api/auth/login', createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'auth_login',
}));

app.use('/api/auth/register', createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'auth_register',
}));

app.use('/api/auth/password/forgot', createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'auth_password_forgot',
}));

// Agent commands - moderate limits for normal usage
app.use('/api/agents/commands', createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'agent_commands',
  useUserId: true,
}));

// Shop orders - moderate limits
app.use('/api/shop/orders', createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'shop_orders',
  useUserId: true,
}));

// Billing webhooks - higher limits for payment provider callbacks
app.use('/api/billing/webhooks/*', createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'billing_webhooks',
}));

// Hybrid search - moderate limits for complex queries (Backend Hardening v1)
app.use('/api/admin/hybrid-search/*', createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'hybrid_search',
  useUserId: true,
}));

// World model - moderate limits for graph queries (Backend Hardening v1)
app.use('/api/admin/world-model/*', createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'world_model',
  useUserId: true,
}));

// Agent panel - moderate limits for dashboard data (Backend Hardening v1)
app.use('/api/agent-panel/*', createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'agent_panel',
  useUserId: true,
}));

// ODIN Web Ingestion - moderate limits for ingestion operations (Agent Web Access v1)
app.use('/api/admin/odin/*', createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'odin_ingestion',
  useUserId: true,
}));

// WebTool Admin - moderate limits for domain registry operations (WebTool v2)
app.use('/api/admin/webtool/*', createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'webtool_admin',
  useUserId: true,
}));

// Simulation Engine - moderate limits for simulation operations (Simulation Studio v1)
app.use('/api/admin/simulation/*', createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'simulation',
  useUserId: true,
}));

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
      'GET /api/foundation/projects',
      'GET /api/foundation/projects/:id',
      'POST /api/foundation/projects',
      'PATCH /api/foundation/projects/:id',
      'GET /api/foundation/projects/:id/contributions',
      'POST /api/foundation/projects/:id/contributions',
      'GET /api/foundation/projects/:id/impact-summary',
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
      'GET /api/org/organizations',
      'GET /api/org/organizations/:id',
      'POST /api/org/organizations',
      'PATCH /api/org/organizations/:id',
      'GET /api/playbooks',
      'GET /api/playbooks/:id',
      'POST /api/playbooks',
      'PATCH /api/playbooks/:id',
      'POST /api/playbooks/:id/run',
      'GET /api/playbook-runs',
      'GET /api/playbook-runs/:id',
      'PATCH /api/playbook-runs/:id/steps/:stepId',
      'GET /api/goes-green/profiles',
      'GET /api/goes-green/profiles/:id',
      'POST /api/goes-green/profiles',
      'PATCH /api/goes-green/profiles/:id',
      'GET /api/goes-green/profiles/:id/assets',
      'POST /api/goes-green/profiles/:id/assets',
      'GET /api/goes-green/profiles/:id/actions',
      'POST /api/goes-green/profiles/:id/actions',
      'PATCH /api/goes-green/actions/:actionId',
          'GET /api/goes-green/profiles/:id/summary',
          'GET /api/billing/plans',
          'GET /api/billing/plans/:id',
          'POST /api/billing/plans',
          'PATCH /api/billing/plans/:id',
          'GET /api/billing/subscription',
          'POST /api/billing/subscription',
          'POST /api/billing/webhooks/stripe',
          'POST /api/billing/webhooks/paypal',
          'GET /api/billing/events',
          'GET /api/shop/orders',
          'GET /api/shop/orders/:id',
          'POST /api/shop/orders',
          'PATCH /api/shop/orders/:id/status',
          'GET /api/shop/orders/summary',
          'GET /api/shop/commission-settings',
          'PUT /api/shop/commission-settings',
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
          'GET /api/admin/impact/summary (requires JWT, founder/brand_admin)',
          'GET /api/admin/impact/timeseries (requires JWT, founder/brand_admin)',
          'POST /api/admin/impact/snapshot (requires JWT, founder/brand_admin)',
        ],
  });
});

app.route('/api/status', statusHandler);
app.route('/api/admin', adminHandler);
app.route('/api/admin', adminMetricsHandler);  // Observability & Metrics v1 (Iteration 00B6)
app.route('/api/admin', adminImpactHandler);  // Global Impact & Data Aggregates v1 (Iteration 00D4)
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

// THE ZORA FOUNDATION v1 routes (Iteration 00C3)
app.route('/api/foundation', foundationHandler);

// Brand/Org & Playbooks v1 routes (Iteration 00C4)
app.route('/api/org/organizations', organizationsHandler);
app.route('/api/playbooks', playbooksHandler);
app.route('/api/playbook-runs', playbooksHandler);

// ZORA GOES GREEN v1 routes (Iteration 00C5)
app.route('/api/goes-green', goesGreenHandler);

// Climate Academy v1 routes (Iteration 00C7)
app.route('/api/academy', academyHandler);

// Billing & Commission v1 routes (Iteration 00C8)
app.route('/api/billing', billingHandler);
app.route('/api/shop/orders', shopOrdersHandler);

// Safety + Scheduling v1 routes (Iteration 00B5)
app.route('/api/autonomy/schedules', autonomySchedulesHandler);

// Workflow / DAG Engine v1 routes (Iteration 00D5)
app.route('/api/workflows', workflowsHandler);
app.route('/api/workflow-runs', workflowRunsHandler);

// Outcome Feedback & Continual Learning v1 routes (Iteration 00D6)
app.route('/api/outcomes', outcomesHandler);

// World Model / Knowledge Graph v1 routes
app.route('/api/admin/world-model', worldModelHandler);

// Hybrid Search & Reasoner v1 routes
app.route('/api/admin/hybrid-search', hybridSearchHandler);

// Health & Diagnostics routes (Backend Hardening v1)
app.route('/api/admin/health', healthHandler);

// ODIN Web Ingestion v1 routes (Agent Web Access v1)
app.route('/api/admin/odin', adminOdinHandler);

// WebTool Admin v2 routes (WebTool v2 - Auto-Managed Domains)
app.route('/api/admin/webtool', adminWebtoolHandler);

// Simulation Engine v1 routes (Simulation Studio v1)
app.route('/api/admin/simulation', simulationHandler);

// Agent Panel v1 routes (Cockpit v1 - Iteration 00F2)
app.route('/api/agent-panel', agentPanelHandler);

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
