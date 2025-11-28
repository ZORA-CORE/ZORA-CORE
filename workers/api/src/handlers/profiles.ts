import { Hono } from 'hono';
import type { AppEnv, ClimateProfile, CreateProfileInput, UpdateProfileInput } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import {
  jsonResponse,
  paginatedResponse,
  parsePaginationParams,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from '../lib/response';

const app = new Hono<AppEnv>();

app.get('/', async (c) => {
  try {
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);
    const profileType = url.searchParams.get('type');
    
    const supabase = getSupabaseClient(c.env);
    
    let query = supabase
      .from('climate_profiles')
      .select('*', { count: 'exact' });
    
    if (profileType) {
      query = query.eq('profile_type', profileType);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return serverErrorResponse('Failed to fetch climate profiles');
    }
    
    return paginatedResponse<ClimateProfile>(data || [], count || 0, { limit, offset });
  } catch (error) {
    console.error('Profiles list error:', error);
    return serverErrorResponse('Failed to fetch climate profiles');
  }
});

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('climate_profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Climate profile');
      }
      console.error('Error fetching profile:', error);
      return serverErrorResponse('Failed to fetch climate profile');
    }
    
    return jsonResponse<ClimateProfile>(data);
  } catch (error) {
    console.error('Profile get error:', error);
    return serverErrorResponse('Failed to fetch climate profile');
  }
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateProfileInput>();
    
    if (!body.name) {
      return badRequestResponse('Name is required');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('climate_profiles')
      .insert({
        owner_id: body.owner_id || null,
        profile_type: body.profile_type || 'person',
        name: body.name,
        description: body.description || null,
        energy_source: body.energy_source || null,
        transport_mode: body.transport_mode || null,
        diet_type: body.diet_type || null,
        location_type: body.location_type || null,
        climate_score: body.climate_score || null,
        estimated_footprint_kg: body.estimated_footprint_kg || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating profile:', error);
      return serverErrorResponse('Failed to create climate profile');
    }
    
    return jsonResponse<ClimateProfile>(data, 201);
  } catch (error) {
    console.error('Profile create error:', error);
    return serverErrorResponse('Failed to create climate profile');
  }
});

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<UpdateProfileInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    const { data: existing } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate profile');
    }
    
    const updateData: Record<string, unknown> = {};
    if (body.owner_id !== undefined) updateData.owner_id = body.owner_id;
    if (body.profile_type !== undefined) updateData.profile_type = body.profile_type;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.energy_source !== undefined) updateData.energy_source = body.energy_source;
    if (body.transport_mode !== undefined) updateData.transport_mode = body.transport_mode;
    if (body.diet_type !== undefined) updateData.diet_type = body.diet_type;
    if (body.location_type !== undefined) updateData.location_type = body.location_type;
    if (body.climate_score !== undefined) updateData.climate_score = body.climate_score;
    if (body.estimated_footprint_kg !== undefined) updateData.estimated_footprint_kg = body.estimated_footprint_kg;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    const { data, error } = await supabase
      .from('climate_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return serverErrorResponse('Failed to update climate profile');
    }
    
    return jsonResponse<ClimateProfile>(data);
  } catch (error) {
    console.error('Profile update error:', error);
    return serverErrorResponse('Failed to update climate profile');
  }
});

export default app;
