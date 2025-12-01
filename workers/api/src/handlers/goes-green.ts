import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { insertJournalEntry } from '../lib/journal';
import {
  jsonResponse,
  paginatedResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from '../lib/response';
import type {
  GoesGreenProfile,
  GoesGreenEnergyAsset,
  GoesGreenAction,
  CreateGoesGreenProfileInput,
  UpdateGoesGreenProfileInput,
  CreateGoesGreenEnergyAssetInput,
  CreateGoesGreenActionInput,
  UpdateGoesGreenActionInput,
  GoesGreenProfileSummary,
  PaginationParams,
} from '../types';

const app = new Hono<AuthAppEnv>();

// ============================================================================
// GOES GREEN PROFILES
// ============================================================================

// GET /profiles - List GOES GREEN profiles for current tenant
app.get('/profiles', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const profile_type = c.req.query('profile_type');
    const organization_id = c.req.query('organization_id');
    const search = c.req.query('search');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query - profiles are tenant-scoped
    let query = supabase
      .from('goes_green_profiles')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply optional filters
    if (profile_type) {
      query = query.eq('profile_type', profile_type);
    }
    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Error fetching GOES GREEN profiles:', error);
      return serverErrorResponse('Failed to fetch GOES GREEN profiles');
    }

    return paginatedResponse(profiles || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /profiles:', err);
    return serverErrorResponse('Internal server error');
  }
});

// POST /profiles - Create a new GOES GREEN profile
app.post('/profiles', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    const body = await c.req.json<CreateGoesGreenProfileInput>();

    // Validate required fields
    if (!body.profile_type || !body.name) {
      return badRequestResponse('profile_type and name are required');
    }

    // Validate profile_type
    if (!['household', 'organization'].includes(body.profile_type)) {
      return badRequestResponse('profile_type must be "household" or "organization"');
    }

    // If organization profile, validate organization_id exists
    if (body.profile_type === 'organization' && body.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', body.organization_id)
        .eq('tenant_id', tenantId)
        .single();

      if (!org) {
        return badRequestResponse('Organization not found');
      }
    }

    // If climate_profile_id provided, validate it exists
    if (body.climate_profile_id) {
      const { data: climateProfile } = await supabase
        .from('climate_profiles')
        .select('id')
        .eq('id', body.climate_profile_id)
        .eq('tenant_id', tenantId)
        .single();

      if (!climateProfile) {
        return badRequestResponse('Climate profile not found');
      }
    }

    // Insert profile
    const { data: profile, error } = await supabase
      .from('goes_green_profiles')
      .insert({
        tenant_id: tenantId,
        profile_type: body.profile_type,
        name: body.name,
        organization_id: body.organization_id || null,
        climate_profile_id: body.climate_profile_id || null,
        country: body.country || null,
        city_or_region: body.city_or_region || null,
        annual_energy_kwh: body.annual_energy_kwh || null,
        primary_energy_source: body.primary_energy_source || null,
        grid_renewable_share_percent: body.grid_renewable_share_percent || null,
        target_green_share_percent: body.target_green_share_percent || null,
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating GOES GREEN profile:', error);
      return serverErrorResponse('Failed to create GOES GREEN profile');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'goes_green_profile_created',
      summary: `GOES GREEN profile "${body.name}" (${body.profile_type}) created`,
      category: 'climate_os',
      metadata: {
        profile_id: profile.id,
        profile_type: body.profile_type,
        name: body.name,
        target_green_share_percent: body.target_green_share_percent,
      },
      relatedEntityIds: [profile.id],
    });

    return jsonResponse(profile, 201);
  } catch (err) {
    console.error('Error in POST /profiles:', err);
    return serverErrorResponse('Internal server error');
  }
});

// GET /profiles/:id - Get a single GOES GREEN profile
app.get('/profiles/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Fetch profile - must be tenant-owned
    const { data: profile, error } = await supabase
      .from('goes_green_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !profile) {
      return notFoundResponse('GOES GREEN profile');
    }

    return jsonResponse(profile);
  } catch (err) {
    console.error('Error in GET /profiles/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// PATCH /profiles/:id - Update a GOES GREEN profile
app.patch('/profiles/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Fetch existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('goes_green_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingProfile) {
      return notFoundResponse('GOES GREEN profile');
    }

    const body = await c.req.json<UpdateGoesGreenProfileInput>();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.city_or_region !== undefined) updateData.city_or_region = body.city_or_region;
    if (body.annual_energy_kwh !== undefined) updateData.annual_energy_kwh = body.annual_energy_kwh;
    if (body.primary_energy_source !== undefined) updateData.primary_energy_source = body.primary_energy_source;
    if (body.grid_renewable_share_percent !== undefined) updateData.grid_renewable_share_percent = body.grid_renewable_share_percent;
    if (body.target_green_share_percent !== undefined) updateData.target_green_share_percent = body.target_green_share_percent;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('goes_green_profiles')
      .update(updateData)
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating GOES GREEN profile:', updateError);
      return serverErrorResponse('Failed to update GOES GREEN profile');
    }

    return jsonResponse(updatedProfile);
  } catch (err) {
    console.error('Error in PATCH /profiles/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GOES GREEN ENERGY ASSETS
// ============================================================================

// GET /profiles/:id/assets - List assets for a GOES GREEN profile
app.get('/profiles/:id/assets', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Verify profile exists and is tenant-owned
    const { data: profile, error: profileError } = await supabase
      .from('goes_green_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return notFoundResponse('GOES GREEN profile');
    }

    // Parse query parameters
    const status = c.req.query('status');
    const asset_type = c.req.query('asset_type');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query
    let query = supabase
      .from('goes_green_energy_assets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('goes_green_profile_id', profileId);

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }
    if (asset_type) {
      query = query.eq('asset_type', asset_type);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: assets, error, count } = await query;

    if (error) {
      console.error('Error fetching GOES GREEN assets:', error);
      return serverErrorResponse('Failed to fetch GOES GREEN assets');
    }

    return paginatedResponse(assets || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /profiles/:id/assets:', err);
    return serverErrorResponse('Internal server error');
  }
});

// POST /profiles/:id/assets - Create a new energy asset
app.post('/profiles/:id/assets', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Verify profile exists and is tenant-owned
    const { data: profile, error: profileError } = await supabase
      .from('goes_green_profiles')
      .select('id, name')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return notFoundResponse('GOES GREEN profile');
    }

    const body = await c.req.json<CreateGoesGreenEnergyAssetInput>();

    // Validate required fields
    if (!body.asset_type || !body.status) {
      return badRequestResponse('asset_type and status are required');
    }

    // Validate status
    const validStatuses = ['existing', 'planned', 'under_evaluation', 'retired'];
    if (!validStatuses.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Insert asset
    const { data: asset, error } = await supabase
      .from('goes_green_energy_assets')
      .insert({
        tenant_id: tenantId,
        goes_green_profile_id: profileId,
        asset_type: body.asset_type,
        status: body.status,
        capacity_kw: body.capacity_kw || null,
        annual_production_kwh_estimated: body.annual_production_kwh_estimated || null,
        annual_savings_kgco2_estimated: body.annual_savings_kgco2_estimated || null,
        installed_at: body.installed_at || null,
        retired_at: body.retired_at || null,
        vendor_name: body.vendor_name || null,
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating GOES GREEN asset:', error);
      return serverErrorResponse('Failed to create GOES GREEN asset');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'goes_green_asset_added',
      summary: `Energy asset "${body.asset_type}" (${body.status}) added to "${profile.name}"`,
      category: 'climate_os',
      metadata: {
        asset_id: asset.id,
        profile_id: profileId,
        asset_type: body.asset_type,
        status: body.status,
        capacity_kw: body.capacity_kw,
      },
      relatedEntityIds: [asset.id, profileId],
    });

    return jsonResponse(asset, 201);
  } catch (err) {
    console.error('Error in POST /profiles/:id/assets:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GOES GREEN ACTIONS
// ============================================================================

// GET /profiles/:id/actions - List actions for a GOES GREEN profile
app.get('/profiles/:id/actions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Verify profile exists and is tenant-owned
    const { data: profile, error: profileError } = await supabase
      .from('goes_green_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return notFoundResponse('GOES GREEN profile');
    }

    // Parse query parameters
    const status = c.req.query('status');
    const action_type = c.req.query('action_type');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query
    let query = supabase
      .from('goes_green_actions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('goes_green_profile_id', profileId);

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }
    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: actions, error, count } = await query;

    if (error) {
      console.error('Error fetching GOES GREEN actions:', error);
      return serverErrorResponse('Failed to fetch GOES GREEN actions');
    }

    return paginatedResponse(actions || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /profiles/:id/actions:', err);
    return serverErrorResponse('Internal server error');
  }
});

// POST /profiles/:id/actions - Create a new GOES GREEN action
app.post('/profiles/:id/actions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Verify profile exists and is tenant-owned
    const { data: profile, error: profileError } = await supabase
      .from('goes_green_profiles')
      .select('id, name')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return notFoundResponse('GOES GREEN profile');
    }

    const body = await c.req.json<CreateGoesGreenActionInput>();

    // Validate required fields
    if (!body.action_type || !body.title) {
      return badRequestResponse('action_type and title are required');
    }

    // If climate_mission_id provided, validate it exists and belongs to tenant
    if (body.climate_mission_id) {
      const { data: mission } = await supabase
        .from('climate_missions')
        .select('id')
        .eq('id', body.climate_mission_id)
        .single();

      if (!mission) {
        return badRequestResponse('Climate mission not found');
      }
    }

    // Insert action
    const { data: action, error } = await supabase
      .from('goes_green_actions')
      .insert({
        tenant_id: tenantId,
        goes_green_profile_id: profileId,
        action_type: body.action_type,
        title: body.title,
        description: body.description || null,
        climate_mission_id: body.climate_mission_id || null,
        status: 'planned',
        estimated_impact_kgco2: body.estimated_impact_kgco2 || null,
        estimated_annual_kwh_savings: body.estimated_annual_kwh_savings || null,
        payback_period_years_estimated: body.payback_period_years_estimated || null,
        cost_estimate_cents: body.cost_estimate_cents || null,
        currency: body.currency || 'DKK',
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating GOES GREEN action:', error);
      return serverErrorResponse('Failed to create GOES GREEN action');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'goes_green_action_created',
      summary: `GOES GREEN action "${body.title}" created for "${profile.name}"`,
      category: 'climate_os',
      metadata: {
        action_id: action.id,
        profile_id: profileId,
        action_type: body.action_type,
        title: body.title,
        estimated_impact_kgco2: body.estimated_impact_kgco2,
      },
      relatedEntityIds: [action.id, profileId],
    });

    return jsonResponse(action, 201);
  } catch (err) {
    console.error('Error in POST /profiles/:id/actions:', err);
    return serverErrorResponse('Internal server error');
  }
});

// PATCH /actions/:actionId - Update a GOES GREEN action
app.patch('/actions/:actionId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const actionId = c.req.param('actionId');

    // Fetch existing action
    const { data: existingAction, error: fetchError } = await supabase
      .from('goes_green_actions')
      .select('*')
      .eq('id', actionId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingAction) {
      return notFoundResponse('GOES GREEN action');
    }

    const body = await c.req.json<UpdateGoesGreenActionInput>();

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['planned', 'in_progress', 'completed', 'canceled'];
      if (!validStatuses.includes(body.status)) {
        return badRequestResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.estimated_impact_kgco2 !== undefined) updateData.estimated_impact_kgco2 = body.estimated_impact_kgco2;
    if (body.estimated_annual_kwh_savings !== undefined) updateData.estimated_annual_kwh_savings = body.estimated_annual_kwh_savings;
    if (body.payback_period_years_estimated !== undefined) updateData.payback_period_years_estimated = body.payback_period_years_estimated;
    if (body.cost_estimate_cents !== undefined) updateData.cost_estimate_cents = body.cost_estimate_cents;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.started_at !== undefined) updateData.started_at = body.started_at;
    if (body.completed_at !== undefined) updateData.completed_at = body.completed_at;
    if (body.canceled_at !== undefined) updateData.canceled_at = body.canceled_at;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Set timestamps based on status
    if (body.status === 'in_progress' && !existingAction.started_at && !body.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    if (body.status === 'completed' && !existingAction.completed_at && !body.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (body.status === 'canceled' && !existingAction.canceled_at && !body.canceled_at) {
      updateData.canceled_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update action
    const { data: updatedAction, error: updateError } = await supabase
      .from('goes_green_actions')
      .update(updateData)
      .eq('id', actionId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating GOES GREEN action:', updateError);
      return serverErrorResponse('Failed to update GOES GREEN action');
    }

    // Create journal entry if status changed
    if (body.status && body.status !== existingAction.status) {
      await insertJournalEntry(supabase, {
        tenantId,
        eventType: 'goes_green_action_status_changed',
        summary: `GOES GREEN action "${existingAction.title}" status changed from ${existingAction.status} to ${body.status}`,
        category: 'climate_os',
        metadata: {
          action_id: actionId,
          profile_id: existingAction.goes_green_profile_id,
          old_status: existingAction.status,
          new_status: body.status,
        },
        relatedEntityIds: [actionId, existingAction.goes_green_profile_id],
      });
    }

    return jsonResponse(updatedAction);
  } catch (err) {
    console.error('Error in PATCH /actions/:actionId:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GOES GREEN SUMMARY
// ============================================================================

// GET /profiles/:id/summary - Get summary for a GOES GREEN profile
app.get('/profiles/:id/summary', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const profileId = c.req.param('id');

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('goes_green_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return notFoundResponse('GOES GREEN profile');
    }

    // Fetch assets
    const { data: assets } = await supabase
      .from('goes_green_energy_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('goes_green_profile_id', profileId)
      .neq('status', 'retired');

    // Fetch actions
    const { data: actions } = await supabase
      .from('goes_green_actions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('goes_green_profile_id', profileId);

    // Calculate asset aggregates
    const assetsByType: Record<string, number> = {};
    let totalAnnualProductionKwh = 0;
    let totalAnnualSavingsKgco2 = 0;

    (assets || []).forEach((asset: GoesGreenEnergyAsset) => {
      assetsByType[asset.asset_type] = (assetsByType[asset.asset_type] || 0) + 1;
      totalAnnualProductionKwh += asset.annual_production_kwh_estimated || 0;
      totalAnnualSavingsKgco2 += asset.annual_savings_kgco2_estimated || 0;
    });

    // Calculate action aggregates
    let completedCount = 0;
    let inProgressCount = 0;
    let plannedCount = 0;
    let totalEstimatedImpactKgco2 = 0;

    (actions || []).forEach((action: GoesGreenAction) => {
      if (action.status === 'completed') completedCount++;
      else if (action.status === 'in_progress') inProgressCount++;
      else if (action.status === 'planned') plannedCount++;
      totalEstimatedImpactKgco2 += action.estimated_impact_kgco2 || 0;
    });

    // Estimate green share percentage
    // Simple calculation: if we have production data and annual energy, calculate ratio
    let greenSharePercentEstimated: number | null = null;
    if (profile.annual_energy_kwh && profile.annual_energy_kwh > 0) {
      // Start with grid renewable share
      const gridShare = profile.grid_renewable_share_percent || 0;
      // Add on-site production as additional green energy
      const onSiteGreenPercent = (totalAnnualProductionKwh / profile.annual_energy_kwh) * 100;
      greenSharePercentEstimated = Math.min(100, gridShare + onSiteGreenPercent);
    } else if (profile.grid_renewable_share_percent) {
      greenSharePercentEstimated = profile.grid_renewable_share_percent;
    }

    const summary: GoesGreenProfileSummary = {
      profile_id: profile.id,
      profile_type: profile.profile_type,
      name: profile.name,
      annual_energy_kwh: profile.annual_energy_kwh,
      green_share_percent_estimated: greenSharePercentEstimated,
      target_green_share_percent: profile.target_green_share_percent,
      assets: {
        count: (assets || []).length,
        by_type: assetsByType,
        total_annual_production_kwh_estimated: totalAnnualProductionKwh,
        total_annual_savings_kgco2_estimated: totalAnnualSavingsKgco2,
      },
      actions: {
        total: (actions || []).length,
        completed: completedCount,
        in_progress: inProgressCount,
        planned: plannedCount,
        estimated_total_impact_kgco2: totalEstimatedImpactKgco2,
      },
    };

    return jsonResponse(summary);
  } catch (err) {
    console.error('Error in GET /profiles/:id/summary:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default app;
