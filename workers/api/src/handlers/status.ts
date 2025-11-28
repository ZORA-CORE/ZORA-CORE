import { Hono } from 'hono';
import type { AppEnv, StatusResponse } from '../types';
import { checkSupabaseConnection } from '../lib/supabase';
import { jsonResponse, serverErrorResponse } from '../lib/response';

// Version constants - update these when releasing new iterations
const API_VERSION = '0.4.0';
const ITERATION = '0016';
const DEFAULT_BUILD_TIME = '2025-01-28T00:00:00Z';

const app = new Hono<AppEnv>();

app.get('/', async (c) => {
  try {
    const env = c.env;
    const supabaseConnected = await checkSupabaseConnection(env);
    const supabaseUrl = env.SUPABASE_URL || 'not configured';
    
    // Get version info from env bindings or use defaults
    const gitCommit = env.ZORA_API_GIT_COMMIT || 'unknown';
    const buildTime = env.ZORA_API_BUILD_TIME || DEFAULT_BUILD_TIME;
    
    const response: StatusResponse = {
      service: 'ZORA CORE API',
      version: API_VERSION,
      environment: env.ENVIRONMENT || 'dev',
      timestamp: new Date().toISOString(),
      supabase: {
        connected: supabaseConnected,
        url: supabaseUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1'),
      },
      // Version info for deployment verification
      api_version: API_VERSION,
      git_commit: gitCommit,
      build_time: buildTime,
      iteration: ITERATION,
    };
    
    return jsonResponse(response);
  } catch (error) {
    console.error('Status check error:', error);
    return serverErrorResponse('Failed to check service status');
  }
});

export default app;
