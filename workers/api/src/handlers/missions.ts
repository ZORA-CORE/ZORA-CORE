import { Hono } from 'hono';
import type { ClimateMission, CreateMissionInput, UpdateMissionInput } from '../types';
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
    
    const estimatedImpact = body.estimated_impact_kgco2 ?? null;
    const impactEstimate = body.impact_estimate || (estimatedImpact ? { co2_kg: estimatedImpact } : {});
    
    const { data, error } = await supabase
      .from('climate_missions')
      .insert({
        tenant_id: tenantId,
        profile_id: profileId,
        title: body.title,
        description: body.description || null,
        category: body.category || null,
        status: body.status || 'planned',
        impact_estimate: impactEstimate,
        estimated_impact_kgco2: estimatedImpact,
        due_date: body.due_date || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating mission:', error);
      return serverErrorResponse('Failed to create climate mission');
    }
    
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_mission_created',
      summary: `New mission created: ${data.title}`,
      metadata: {
        mission_id: data.id,
        profile_id: profileId,
        category: data.category,
        estimated_impact_kgco2: data.estimated_impact_kgco2,
      },
      relatedEntityIds: [data.id, profileId],
    });
    
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
    
    const { data: existing } = await supabase
      .from('climate_missions')
      .select('id, title, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate mission');
    }
    
    const previousStatus = existing.status;
    
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.started_at !== undefined) updateData.started_at = body.started_at;
    if (body.completed_at !== undefined) updateData.completed_at = body.completed_at;
    if (body.impact_estimate !== undefined) updateData.impact_estimate = body.impact_estimate;
    if (body.estimated_impact_kgco2 !== undefined) updateData.estimated_impact_kgco2 = body.estimated_impact_kgco2;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
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
    
    if (body.status && body.status !== previousStatus) {
      const statusMessages: Record<string, string> = {
        in_progress: `Mission started: ${data.title}`,
        completed: `Mission completed: ${data.title}`,
        cancelled: `Mission cancelled: ${data.title}`,
        failed: `Mission failed: ${data.title}`,
        planned: `Mission reset to planned: ${data.title}`,
      };
      
      await insertJournalEntry(supabase, {
        tenantId,
        eventType: 'climate_mission_status_updated',
        summary: statusMessages[body.status] || `Mission status updated: ${data.title}`,
        metadata: {
          mission_id: data.id,
          previous_status: previousStatus,
          new_status: body.status,
          estimated_impact_kgco2: data.estimated_impact_kgco2,
        },
        relatedEntityIds: [data.id],
      });
    }
    
    return jsonResponse<ClimateMission>(data);
  } catch (error) {
    console.error('Mission update error:', error);
    return serverErrorResponse('Failed to update climate mission');
  }
});

const STARTER_MISSIONS = [
  {
    title: 'Switch 5 bulbs to LED',
    description: 'Replace 5 traditional light bulbs with energy-efficient LED bulbs to reduce energy consumption.',
    category: 'energy',
    estimated_impact_kgco2: 20,
  },
  {
    title: 'Replace one weekly car trip with public transport',
    description: 'Choose public transport instead of driving for one trip per week to reduce your carbon footprint.',
    category: 'transport',
    estimated_impact_kgco2: 15,
  },
  {
    title: 'Try 2 meat-free days this week',
    description: 'Reduce your food-related emissions by eating plant-based meals for 2 days this week.',
    category: 'food',
    estimated_impact_kgco2: 10,
  },
  {
    title: 'Review your next 3 purchases for climate-friendly alternatives',
    description: 'Before making your next 3 purchases, research and choose more sustainable options.',
    category: 'products',
    estimated_impact_kgco2: 5,
  },
];

app.post('/missions/bootstrap', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    const { count, error: countError } = await supabase
      .from('climate_missions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (countError) {
      console.error('Error checking mission count:', countError);
      return serverErrorResponse('Failed to check existing missions');
    }
    
    if (count && count > 0) {
      return jsonResponse({
        created: false,
        reason: 'missions_already_exist',
        existing_count: count,
      });
    }
    
    const { data: profiles } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1);
    
    const profileId = profiles && profiles.length > 0 ? profiles[0].id : null;
    
    const missionsToInsert = STARTER_MISSIONS.map((mission) => ({
      tenant_id: tenantId,
      profile_id: profileId,
      title: mission.title,
      description: mission.description,
      category: mission.category,
      status: 'planned',
      impact_estimate: { co2_kg: mission.estimated_impact_kgco2 },
      estimated_impact_kgco2: mission.estimated_impact_kgco2,
      metadata: { source: 'bootstrap' },
    }));
    
    const { data: createdMissions, error: insertError } = await supabase
      .from('climate_missions')
      .insert(missionsToInsert)
      .select();
    
    if (insertError) {
      console.error('Error creating starter missions:', insertError);
      return serverErrorResponse('Failed to create starter missions');
    }
    
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_missions_bootstrapped',
      summary: `Created ${createdMissions.length} starter missions for Climate OS`,
      metadata: {
        mission_count: createdMissions.length,
        mission_ids: createdMissions.map((m) => m.id),
        total_estimated_impact_kgco2: STARTER_MISSIONS.reduce((sum, m) => sum + m.estimated_impact_kgco2, 0),
      },
      relatedEntityIds: createdMissions.map((m) => m.id),
    });
    
    return jsonResponse({
      created: true,
      missions: createdMissions,
    }, 201);
  } catch (error) {
    console.error('Bootstrap missions error:', error);
    return serverErrorResponse('Failed to bootstrap missions');
  }
});

export default app;
