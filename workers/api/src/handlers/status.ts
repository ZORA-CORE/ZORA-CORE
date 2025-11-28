import { Hono } from 'hono';
import type { AppEnv, StatusResponse } from '../types';
import { checkSupabaseConnection } from '../lib/supabase';
import { jsonResponse, serverErrorResponse } from '../lib/response';

const app = new Hono<AppEnv>();

app.get('/', async (c) => {
  try {
    const env = c.env;
    const supabaseConnected = await checkSupabaseConnection(env);
    const supabaseUrl = env.SUPABASE_URL || 'not configured';
    
    const response: StatusResponse = {
      service: 'ZORA CORE API',
      version: '0.3.0',
      environment: env.ENVIRONMENT || 'dev',
      timestamp: new Date().toISOString(),
      supabase: {
        connected: supabaseConnected,
        url: supabaseUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1'),
      },
    };
    
    return jsonResponse(response);
  } catch (error) {
    console.error('Status check error:', error);
    return serverErrorResponse('Failed to check service status');
  }
});

export default app;
