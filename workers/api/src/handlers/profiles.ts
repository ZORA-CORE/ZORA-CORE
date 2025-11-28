import { Hono } from 'hono';
import type { ClimateProfile, CreateProfileInput, UpdateProfileInput } from '../types';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { insertJournalEntry } from '../lib/journal';
import {
  jsonResponse,
  paginatedResponse,
  parsePaginationParams,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from '../lib/response';

const app = new Hono<AuthAppEnv>();

app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);
    const profileType = url.searchParams.get('type');
    const scope = url.searchParams.get('scope');
    
    const supabase = getSupabaseClient(c.env);
    
    let query = supabase
      .from('climate_profiles')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    if (profileType) {
      query = query.eq('profile_type', profileType);
    }
    
    if (scope) {
      query = query.eq('scope', scope);
    }
    
    const { data, error, count } = await query
      .order('is_primary', { ascending: false })
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
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('climate_profiles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
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
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateProfileInput>();
    
    if (!body.name) {
      return badRequestResponse('Name is required');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // If this profile is being set as primary, unset any existing primary profiles
    if (body.is_primary) {
      await supabase
        .from('climate_profiles')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('is_primary', true);
    }
    
    // Check if this is the first profile for the tenant - if so, make it primary
    const { count: existingCount } = await supabase
      .from('climate_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    const shouldBePrimary = body.is_primary || (existingCount === 0);
    
    const { data, error } = await supabase
      .from('climate_profiles')
      .insert({
        tenant_id: tenantId,
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
        country: body.country || null,
        city_or_region: body.city_or_region || null,
        household_size: body.household_size || null,
        primary_energy_source: body.primary_energy_source || null,
        notes: body.notes || null,
        // Multi-profile fields (v0.3)
        scope: body.scope || 'individual',
        is_primary: shouldBePrimary,
        organization_name: body.organization_name || null,
        sector: body.sector || null,
        website_url: body.website_url || null,
        logo_url: body.logo_url || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating profile:', error);
      return serverErrorResponse('Failed to create climate profile');
    }
    
    const scopeLabel = data.scope || 'individual';
    const sectorLabel = data.sector ? `, sector: ${data.sector}` : '';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_profile_created',
      summary: `New profile created: ${data.name} (scope: ${scopeLabel}${sectorLabel})`,
      metadata: {
        profile_id: data.id,
        profile_name: data.name,
        profile_type: data.profile_type,
        scope: data.scope,
        sector: data.sector,
        country: data.country,
        is_primary: data.is_primary,
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse<ClimateProfile>(data, 201);
  } catch (error) {
    console.error('Profile create error:', error);
    return serverErrorResponse('Failed to create climate profile');
  }
});

app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const body = await c.req.json<UpdateProfileInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    const { data: existing } = await supabase
      .from('climate_profiles')
      .select('id, name, scope')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate profile');
    }
    
    // If this profile is being set as primary, unset any existing primary profiles
    if (body.is_primary === true) {
      await supabase
        .from('climate_profiles')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('is_primary', true)
        .neq('id', id);
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
    if (body.country !== undefined) updateData.country = body.country;
    if (body.city_or_region !== undefined) updateData.city_or_region = body.city_or_region;
    if (body.household_size !== undefined) updateData.household_size = body.household_size;
    if (body.primary_energy_source !== undefined) updateData.primary_energy_source = body.primary_energy_source;
    if (body.notes !== undefined) updateData.notes = body.notes;
    // Multi-profile fields (v0.3)
    if (body.scope !== undefined) updateData.scope = body.scope;
    if (body.is_primary !== undefined) updateData.is_primary = body.is_primary;
    if (body.organization_name !== undefined) updateData.organization_name = body.organization_name;
    if (body.sector !== undefined) updateData.sector = body.sector;
    if (body.website_url !== undefined) updateData.website_url = body.website_url;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    const { data, error } = await supabase
      .from('climate_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return serverErrorResponse('Failed to update climate profile');
    }
    
    const scopeLabel = data.scope || 'individual';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_profile_updated',
      summary: `Profile updated: ${data.name} (scope: ${scopeLabel})`,
      metadata: {
        profile_id: data.id,
        profile_name: data.name,
        scope: data.scope,
        updated_fields: Object.keys(updateData),
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse<ClimateProfile>(data);
  } catch (error) {
    console.error('Profile update error:', error);
    return serverErrorResponse('Failed to update climate profile');
  }
});

// Set a profile as primary (convenience endpoint)
app.post('/:id/set-primary', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    
    const supabase = getSupabaseClient(c.env);
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from('climate_profiles')
      .select('id, name, scope')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate profile');
    }
    
    // Unset any existing primary profiles
    await supabase
      .from('climate_profiles')
      .update({ is_primary: false })
      .eq('tenant_id', tenantId)
      .eq('is_primary', true);
    
    // Set this profile as primary
    const { data, error } = await supabase
      .from('climate_profiles')
      .update({ is_primary: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error setting primary profile:', error);
      return serverErrorResponse('Failed to set primary profile');
    }
    
    const scopeLabel = data.scope || 'individual';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_profile_updated',
      summary: `Profile set as primary: ${data.name} (scope: ${scopeLabel})`,
      metadata: {
        profile_id: data.id,
        profile_name: data.name,
        scope: data.scope,
        action: 'set_primary',
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse<ClimateProfile>(data);
  } catch (error) {
    console.error('Set primary profile error:', error);
    return serverErrorResponse('Failed to set primary profile');
  }
});

export default app;
