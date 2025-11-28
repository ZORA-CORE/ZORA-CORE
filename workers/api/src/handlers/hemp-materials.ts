import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import {
  jsonResponse,
  serverErrorResponse,
} from '../lib/response';
import type { HempMaterial, HempCategory } from '../types';

const app = new Hono<AuthAppEnv>();

// GET /api/shop/materials/hemp - List all hemp/cannabis materials for the current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const hempCategory = c.req.query('hemp_category') as HempCategory | undefined;
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    
    let query = supabase
      .from('materials')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_hemp_or_cannabis_material', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (hempCategory) {
      query = query.eq('hemp_category', hempCategory);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching hemp materials:', error);
      return serverErrorResponse('Failed to fetch hemp materials');
    }
    
    return jsonResponse({
      data: data as HempMaterial[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Hemp materials list error:', error);
    return serverErrorResponse('Failed to fetch hemp materials');
  }
});

export default app;
