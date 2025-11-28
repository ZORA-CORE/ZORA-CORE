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

const app = new Hono<AuthAppEnv>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-ZORA-ADMIN-SECRET'],
}));

// Apply auth middleware to protected routes
// Note: /api/status remains public for health checks
app.use('/api/climate/*', authMiddleware);
app.use('/api/agents/*', authMiddleware);
app.use('/api/missions/*', authMiddleware);
app.use('/api/journal/*', authMiddleware);
app.use('/api/frontend/*', authMiddleware);

app.get('/', (c) => {
  return c.json({
    name: 'ZORA CORE API',
    version: '0.5.0',
    docs: '/api/status',
        endpoints: [
          'GET /api/status',
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
        ],
    admin_endpoints: [
      'GET /api/admin/status (requires X-ZORA-ADMIN-SECRET)',
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
