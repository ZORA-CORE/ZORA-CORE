import { Hono } from 'hono';
import type { JournalEntry } from '../types';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import {
  paginatedResponse,
  parsePaginationParams,
  serverErrorResponse,
} from '../lib/response';

const app = new Hono<AuthAppEnv>();

app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);
    const category = url.searchParams.get('category');
    const author = url.searchParams.get('author');
    
    const supabase = getSupabaseClient(c.env);
    
    let query = supabase
      .from('journal_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    if (category) {
      query = query.eq('category', category);
    }
    if (author) {
      query = query.eq('author', author);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching journal entries:', error);
      return serverErrorResponse('Failed to fetch journal entries');
    }
    
    return paginatedResponse<JournalEntry>(data || [], count || 0, { limit, offset });
  } catch (error) {
    console.error('Journal list error:', error);
    return serverErrorResponse('Failed to fetch journal entries');
  }
});

export default app;
