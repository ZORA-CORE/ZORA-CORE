import { Hono } from 'hono';
import type { 
  ClimateProfile, 
  CreateProfileInput, 
  UpdateProfileInput,
  ProfileSummary,
  ProfileTimeseries,
  TimeseriesPoint,
  ClimatePlan,
  ClimatePlanItem,
  ClimatePlanWithItems,
  SuggestWeeklyPlanInput,
  ApplyPlanInput,
} from '../types';
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

// ============================================================================
// PROFILE SUMMARY & TIMESERIES ENDPOINTS (Climate OS Backend v1.0)
// ============================================================================

// GET /api/climate/profiles/:id/summary - Profile summary with mission stats
app.get('/:id/summary', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('id');
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
    
    // Get mission counts by status
    const { data: missions, error } = await supabase
      .from('climate_missions')
      .select('status, estimated_impact_kgco2')
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error fetching missions for summary:', error);
      return serverErrorResponse('Failed to fetch profile summary');
    }
    
    const missionList = missions || [];
    const summary: ProfileSummary = {
      profile_id: profileId,
      total_missions: missionList.length,
      missions_completed: missionList.filter(m => m.status === 'completed').length,
      missions_in_progress: missionList.filter(m => m.status === 'in_progress').length,
      missions_planned: missionList.filter(m => m.status === 'planned').length,
      missions_cancelled: missionList.filter(m => m.status === 'cancelled').length,
      missions_failed: missionList.filter(m => m.status === 'failed').length,
      total_estimated_impact_kgco2: missionList.reduce(
        (sum, m) => sum + (m.estimated_impact_kgco2 || 0), 
        0
      ),
    };
    
    return jsonResponse(summary);
  } catch (error) {
    console.error('Profile summary error:', error);
    return serverErrorResponse('Failed to fetch profile summary');
  }
});

// GET /api/climate/profiles/:id/timeseries - Time-series aggregation of completed missions
app.get('/:id/timeseries', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('id');
    const url = new URL(c.req.url);
    const granularity = (url.searchParams.get('granularity') || 'week') as 'day' | 'week' | 'month';
    
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
    
    // Get completed missions with their completion dates
    const { data: missions, error } = await supabase
      .from('climate_missions')
      .select('completed_at, estimated_impact_kgco2')
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching missions for timeseries:', error);
      return serverErrorResponse('Failed to fetch profile timeseries');
    }
    
    // Group missions by period
    const missionList = missions || [];
    const periodMap = new Map<string, { count: number; impact: number }>();
    
    for (const mission of missionList) {
      if (!mission.completed_at) continue;
      
      const date = new Date(mission.completed_at);
      let periodStart: string;
      
      if (granularity === 'day') {
        periodStart = date.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        // Get Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        periodStart = monday.toISOString().split('T')[0];
      } else {
        // Month
        periodStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }
      
      const existing = periodMap.get(periodStart) || { count: 0, impact: 0 };
      periodMap.set(periodStart, {
        count: existing.count + 1,
        impact: existing.impact + (mission.estimated_impact_kgco2 || 0),
      });
    }
    
    // Convert to array and sort
    const points: TimeseriesPoint[] = Array.from(periodMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periodStart, data]) => ({
        period_start: periodStart,
        missions_completed: data.count,
        estimated_impact_kgco2_completed: data.impact,
      }));
    
    const timeseries: ProfileTimeseries = {
      profile_id: profileId,
      granularity,
      points,
    };
    
    return jsonResponse(timeseries);
  } catch (error) {
    console.error('Profile timeseries error:', error);
    return serverErrorResponse('Failed to fetch profile timeseries');
  }
});

// ============================================================================
// CLIMATE PLANS ENDPOINTS (Climate OS Backend v1.0)
// ============================================================================

// Template-based weekly plan suggestions
const WEEKLY_PLAN_TEMPLATES = [
  {
    title: 'Reduce energy consumption at home',
    description: 'Turn off lights and unplug devices when not in use. Consider using a smart power strip.',
    category: 'energy',
    estimated_impact_kgco2: 5,
  },
  {
    title: 'Choose sustainable transport',
    description: 'Walk, bike, or use public transport for at least 3 trips this week instead of driving.',
    category: 'transport',
    estimated_impact_kgco2: 12,
  },
  {
    title: 'Plan plant-based meals',
    description: 'Prepare at least 3 plant-based meals this week to reduce your food carbon footprint.',
    category: 'food',
    estimated_impact_kgco2: 8,
  },
  {
    title: 'Reduce water usage',
    description: 'Take shorter showers and fix any leaky faucets. Consider collecting rainwater for plants.',
    category: 'water',
    estimated_impact_kgco2: 3,
  },
  {
    title: 'Avoid single-use plastics',
    description: 'Bring reusable bags, bottles, and containers when shopping or eating out.',
    category: 'waste',
    estimated_impact_kgco2: 2,
  },
  {
    title: 'Support local and seasonal produce',
    description: 'Buy locally grown, seasonal fruits and vegetables to reduce transport emissions.',
    category: 'food',
    estimated_impact_kgco2: 4,
  },
];

// GET /api/climate/profiles/:id/plans - List plans for a profile
app.get('/:id/plans', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('id');
    const url = new URL(c.req.url);
    const status = url.searchParams.get('status');
    const planType = url.searchParams.get('plan_type');
    const { limit, offset } = parsePaginationParams(url);
    
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
      .from('climate_plans')
      .select('*', { count: 'exact' })
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId);
    
    if (status) {
      query = query.eq('status', status);
    }
    if (planType) {
      query = query.eq('plan_type', planType);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching plans:', error);
      return serverErrorResponse('Failed to fetch climate plans');
    }
    
    return paginatedResponse<ClimatePlan>(data || [], count || 0, { limit, offset });
  } catch (error) {
    console.error('Plans list error:', error);
    return serverErrorResponse('Failed to fetch climate plans');
  }
});

// GET /api/climate/profiles/:id/plans/:planId - Get a specific plan with items
app.get('/:id/plans/:planId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('id');
    const planId = c.req.param('planId');
    
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
    
    // Get plan
    const { data: plan, error: planError } = await supabase
      .from('climate_plans')
      .select('*')
      .eq('id', planId)
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (planError || !plan) {
      return notFoundResponse('Climate plan');
    }
    
    // Get plan items
    const { data: items, error: itemsError } = await supabase
      .from('climate_plan_items')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });
    
    if (itemsError) {
      console.error('Error fetching plan items:', itemsError);
      return serverErrorResponse('Failed to fetch plan items');
    }
    
    const planWithItems: ClimatePlanWithItems = {
      ...plan,
      items: items || [],
    };
    
    return jsonResponse(planWithItems);
  } catch (error) {
    console.error('Plan get error:', error);
    return serverErrorResponse('Failed to fetch climate plan');
  }
});

// POST /api/climate/profiles/:id/weekly-plan/suggest - Suggest a weekly plan
app.post('/:id/weekly-plan/suggest', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('id');
    
    let input: SuggestWeeklyPlanInput = {};
    try {
      input = await c.req.json<SuggestWeeklyPlanInput>();
    } catch {
      // No body or invalid JSON, use defaults
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify profile belongs to tenant and get profile details
    const { data: profile } = await supabase
      .from('climate_profiles')
      .select('id, name, scope')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!profile) {
      return notFoundResponse('Climate profile');
    }
    
    // Calculate period dates
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    
    if (input.period_start) {
      periodStart = new Date(input.period_start);
    } else {
      // Default to upcoming Monday (or today if it's Monday)
      const day = now.getDay();
      const daysUntilMonday = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() + daysUntilMonday);
      periodStart.setHours(0, 0, 0, 0);
    }
    
    if (input.period_end) {
      periodEnd = new Date(input.period_end);
    } else {
      // Default to 7 days after period_start
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
    }
    
    // Select 4-5 random items from templates for variety
    const shuffled = [...WEEKLY_PLAN_TEMPLATES].sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, 4 + Math.floor(Math.random() * 2));
    
    // Create the plan
    const { data: plan, error: planError } = await supabase
      .from('climate_plans')
      .insert({
        tenant_id: tenantId,
        profile_id: profileId,
        plan_type: 'weekly',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        status: 'proposed',
        metadata: {
          suggested_at: new Date().toISOString(),
          template_based: true,
        },
      })
      .select()
      .single();
    
    if (planError || !plan) {
      console.error('Error creating plan:', planError);
      return serverErrorResponse('Failed to create weekly plan');
    }
    
    // Create plan items
    const itemsToInsert = selectedItems.map(item => ({
      plan_id: plan.id,
      title: item.title,
      description: item.description,
      category: item.category,
      estimated_impact_kgco2: item.estimated_impact_kgco2,
      status: 'planned',
      metadata: {},
    }));
    
    const { data: items, error: itemsError } = await supabase
      .from('climate_plan_items')
      .insert(itemsToInsert)
      .select();
    
    if (itemsError) {
      console.error('Error creating plan items:', itemsError);
      // Clean up the plan if items failed
      await supabase.from('climate_plans').delete().eq('id', plan.id);
      return serverErrorResponse('Failed to create plan items');
    }
    
    // Create journal entry
    const scopeLabel = profile.scope || 'individual';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_plan_suggested',
      summary: `Weekly climate plan suggested for profile '${profile.name}' (scope: ${scopeLabel})`,
      metadata: {
        plan_id: plan.id,
        profile_id: profileId,
        profile_name: profile.name,
        profile_scope: profile.scope,
        period_start: plan.period_start,
        period_end: plan.period_end,
        items_count: items?.length || 0,
        total_estimated_impact_kgco2: selectedItems.reduce((sum, i) => sum + i.estimated_impact_kgco2, 0),
      },
      relatedEntityIds: [plan.id, profileId],
    });
    
    const planWithItems: ClimatePlanWithItems = {
      ...plan,
      items: items || [],
    };
    
    return jsonResponse(planWithItems, 201);
  } catch (error) {
    console.error('Suggest weekly plan error:', error);
    return serverErrorResponse('Failed to suggest weekly plan');
  }
});

// POST /api/climate/profiles/:id/weekly-plan/:planId/apply - Apply a proposed plan
app.post('/:id/weekly-plan/:planId/apply', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const profileId = c.req.param('id');
    const planId = c.req.param('planId');
    
    let input: ApplyPlanInput = { create_missions: true };
    try {
      const body = await c.req.json<ApplyPlanInput>();
      if (body.create_missions !== undefined) {
        input.create_missions = body.create_missions;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify profile belongs to tenant and get profile details
    const { data: profile } = await supabase
      .from('climate_profiles')
      .select('id, name, scope')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!profile) {
      return notFoundResponse('Climate profile');
    }
    
    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('climate_plans')
      .select('*')
      .eq('id', planId)
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (planError || !plan) {
      return notFoundResponse('Climate plan');
    }
    
    if (plan.status !== 'proposed') {
      return badRequestResponse(`Plan is already ${plan.status}, cannot apply`);
    }
    
    // Get plan items
    const { data: items, error: itemsError } = await supabase
      .from('climate_plan_items')
      .select('*')
      .eq('plan_id', planId);
    
    if (itemsError) {
      console.error('Error fetching plan items:', itemsError);
      return serverErrorResponse('Failed to fetch plan items');
    }
    
    const planItems = items || [];
    let createdMissions: { id: string; title: string }[] = [];
    
    // Create missions from plan items if requested
    if (input.create_missions && planItems.length > 0) {
      const missionsToInsert = planItems.map(item => ({
        tenant_id: tenantId,
        profile_id: profileId,
        title: item.title,
        description: item.description,
        category: item.category,
        status: 'planned',
        estimated_impact_kgco2: item.estimated_impact_kgco2,
        due_date: plan.period_end,
        impact_estimate: { co2_kg: item.estimated_impact_kgco2 },
        metadata: { 
          source: 'weekly_plan',
          plan_id: planId,
          plan_item_id: item.id,
        },
      }));
      
      const { data: missions, error: missionsError } = await supabase
        .from('climate_missions')
        .insert(missionsToInsert)
        .select('id, title');
      
      if (missionsError) {
        console.error('Error creating missions from plan:', missionsError);
        return serverErrorResponse('Failed to create missions from plan');
      }
      
      createdMissions = missions || [];
      
      // Update plan items with mission_id references
      for (let i = 0; i < planItems.length && i < createdMissions.length; i++) {
        await supabase
          .from('climate_plan_items')
          .update({ mission_id: createdMissions[i].id, status: 'planned' })
          .eq('id', planItems[i].id);
      }
    }
    
    // Update plan status to active
    const { data: updatedPlan, error: updateError } = await supabase
      .from('climate_plans')
      .update({ 
        status: 'active',
        metadata: {
          ...plan.metadata,
          applied_at: new Date().toISOString(),
          missions_created: createdMissions.length,
        },
      })
      .eq('id', planId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating plan status:', updateError);
      return serverErrorResponse('Failed to apply plan');
    }
    
    // Get updated items
    const { data: updatedItems } = await supabase
      .from('climate_plan_items')
      .select('*')
      .eq('plan_id', planId);
    
    // Create journal entry
    const scopeLabel = profile.scope || 'individual';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_plan_applied',
      summary: `Weekly climate plan applied for profile '${profile.name}' (scope: ${scopeLabel}), created ${createdMissions.length} missions`,
      metadata: {
        plan_id: planId,
        profile_id: profileId,
        profile_name: profile.name,
        profile_scope: profile.scope,
        missions_created: createdMissions.length,
        mission_ids: createdMissions.map(m => m.id),
      },
      relatedEntityIds: [planId, profileId, ...createdMissions.map(m => m.id)],
    });
    
    const planWithItems: ClimatePlanWithItems = {
      ...updatedPlan,
      items: updatedItems || [],
    };
    
    return jsonResponse({
      plan: planWithItems,
      missions_created: createdMissions.length,
      mission_ids: createdMissions.map(m => m.id),
    });
  } catch (error) {
    console.error('Apply weekly plan error:', error);
    return serverErrorResponse('Failed to apply weekly plan');
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
