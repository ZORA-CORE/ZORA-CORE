import { Hono } from 'hono';
import type { ClimateMission, CreateMissionInput, UpdateMissionInput } from '../types';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import {
  jsonResponse,
  paginatedResponse,
  parsePaginationParams,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from '../lib/response';

const app = new Hono<AuthAppEnv>();

app.get('/profiles/:profileId/missions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('profileId');
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);
    const status = url.searchParams.get('status');
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify profile belongs to tenant
    const { data: profile } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!profile) {
      return notFoundResponse('Climate profile');
    }
    
    let query = supabase
      .from('climate_missions')
      .select('*', { count: 'exact' })
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching missions:', error);
      return serverErrorResponse('Failed to fetch climate missions');
    }
    
    return paginatedResponse<ClimateMission>(data || [], count || 0, { limit, offset });
  } catch (error) {
    console.error('Missions list error:', error);
    return serverErrorResponse('Failed to fetch climate missions');
  }
});

app.post('/profiles/:profileId/missions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('profileId');
    const body = await c.req.json<CreateMissionInput>();
    
    if (!body.title) {
      return badRequestResponse('Title is required');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify profile belongs to tenant
    const { data: profile } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!profile) {
      return notFoundResponse('Climate profile');
    }
    
    const { data, error } = await supabase
      .from('climate_missions')
      .insert({
        tenant_id: tenantId,
        profile_id: profileId,
        title: body.title,
        description: body.description || null,
        category: body.category || null,
        status: body.status || 'planned',
        impact_estimate: body.impact_estimate || {},
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating mission:', error);
      return serverErrorResponse('Failed to create climate mission');
    }
    
    return jsonResponse<ClimateMission>(data, 201);
  } catch (error) {
    console.error('Mission create error:', error);
    return serverErrorResponse('Failed to create climate mission');
  }
});

app.patch('/missions/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const body = await c.req.json<UpdateMissionInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify mission belongs to tenant
    const { data: existing } = await supabase
      .from('climate_missions')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate mission');
    }
    
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.started_at !== undefined) updateData.started_at = body.started_at;
    if (body.completed_at !== undefined) updateData.completed_at = body.completed_at;
    if (body.impact_estimate !== undefined) updateData.impact_estimate = body.impact_estimate;
    if (body.verified !== undefined) updateData.verified = body.verified;
    if (body.verified_by !== undefined) updateData.verified_by = body.verified_by;
    if (body.verification_notes !== undefined) updateData.verification_notes = body.verification_notes;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    if (body.status === 'in_progress' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    if (body.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('climate_missions')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating mission:', error);
      return serverErrorResponse('Failed to update climate mission');
    }
    
    return jsonResponse<ClimateMission>(data);
  } catch (error) {
    console.error('Mission update error:', error);
    return serverErrorResponse('Failed to update climate mission');
  }
});

export default app;
