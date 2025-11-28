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
import frontendConfigHandler from './handlers/frontend-config';
import agentSuggestionsHandler from './handlers/agent-suggestions';
import brandsHandler from './handlers/brands';
import productsHandler from './handlers/products';
import publicMashupsHandler from './handlers/public-mashups';

const app = new Hono<AuthAppEnv>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-ZORA-ADMIN-SECRET'],
}));

// Apply auth middleware to protected routes
// Note: /api/status and /api/public/* remain public (no auth required)
app.use('/api/climate/*', authMiddleware);
app.use('/api/agents/*', authMiddleware);
app.use('/api/missions/*', authMiddleware);
app.use('/api/journal/*', authMiddleware);
app.use('/api/frontend/*', authMiddleware);
app.use('/api/autonomy/*', authMiddleware);
app.use('/api/mashups/*', authMiddleware);

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
    ],
    authenticated_endpoints: [
      'GET /api/agents',
      'GET /api/agents/:agentId',
      'GET /api/agents/:agentId/memory',
      'POST /api/agents/:agentId/memory/semantic-search',
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
    ],
    admin_endpoints: [
      'GET /api/admin/status (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/schema-status (requires X-ZORA-ADMIN-SECRET)',
      'POST /api/admin/bootstrap-tenant (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/tenants (requires X-ZORA-ADMIN-SECRET)',
      'GET /api/admin/users (requires X-ZORA-ADMIN-SECRET)',
      'POST /api/admin/users (requires X-ZORA-ADMIN-SECRET)',
      'POST /api/admin/users/:id/token (requires X-ZORA-ADMIN-SECRET)',
    ],
  });
});

app.route('/api/status', statusHandler);
app.route('/api/admin', adminHandler);
app.route('/api/agents', agentsHandler);
app.route('/api/agents', memoryHandler);
app.route('/api/climate/profiles', profilesHandler);
app.route('/api/climate', missionsHandler);
app.route('/api/missions', missionsHandler);
app.route('/api/journal', journalHandler);
app.route('/api/frontend/config', frontendConfigHandler);
app.route('/api/autonomy/frontend', agentSuggestionsHandler);
app.route('/api/mashups/brands', brandsHandler);
app.route('/api/mashups/products', productsHandler);

app.notFound((c) => {
  return c.json({
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
    status: 404,
  }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    status: 500,
  }, 500);
});

export default app;
