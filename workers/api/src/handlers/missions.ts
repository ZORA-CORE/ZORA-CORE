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
    
    // Verify profile belongs to tenant and get profile details for journal
    const { data: profile } = await supabase
      .from('climate_profiles')
      .select('id, name, scope')
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
    
    const scopeLabel = profile.scope || 'individual';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_mission_created',
      summary: `Mission created for profile '${profile.name}' (scope: ${scopeLabel}): ${data.title}`,
      metadata: {
        mission_id: data.id,
        profile_id: profileId,
        profile_name: profile.name,
        profile_scope: profile.scope,
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
      .select('id, title, status, profile_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate mission');
    }
    
    // Get profile details for journal context
    let profileContext: { name: string; scope: string } | null = null;
    if (existing.profile_id) {
      const { data: profile } = await supabase
        .from('climate_profiles')
        .select('name, scope')
        .eq('id', existing.profile_id)
        .single();
      if (profile) {
        profileContext = { name: profile.name, scope: profile.scope || 'individual' };
      }
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
      const profileLabel = profileContext 
        ? ` for profile '${profileContext.name}' (${profileContext.scope})`
        : '';
      const statusMessages: Record<string, string> = {
        in_progress: `Mission started${profileLabel}: ${data.title}`,
        completed: `Mission completed${profileLabel}: ${data.title}`,
        cancelled: `Mission cancelled${profileLabel}: ${data.title}`,
        failed: `Mission failed${profileLabel}: ${data.title}`,
        planned: `Mission reset to planned${profileLabel}: ${data.title}`,
      };
      
      await insertJournalEntry(supabase, {
        tenantId,
        eventType: 'climate_mission_status_updated',
        summary: statusMessages[body.status] || `Mission status updated${profileLabel}: ${data.title}`,
        metadata: {
          mission_id: data.id,
          profile_id: existing.profile_id,
          profile_name: profileContext?.name,
          profile_scope: profileContext?.scope,
          previous_status: previousStatus,
          new_status: body.status,
          estimated_impact_kgco2: data.estimated_impact_kgco2,
        },
        relatedEntityIds: existing.profile_id ? [data.id, existing.profile_id] : [data.id],
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

// Bootstrap starter missions for a profile
// Accepts optional profile_id in body; if not provided, uses primary profile or first profile
app.post('/missions/bootstrap', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Parse optional profile_id from body
    let requestedProfileId: string | null = null;
    try {
      const body = await c.req.json<{ profile_id?: string }>();
      requestedProfileId = body.profile_id || null;
    } catch {
      // No body or invalid JSON, use default profile selection
    }
    
    // Determine which profile to use
    let targetProfile: { id: string; name: string; scope: string } | null = null;
    
    if (requestedProfileId) {
      // Use the requested profile
      const { data: profile } = await supabase
        .from('climate_profiles')
        .select('id, name, scope')
        .eq('id', requestedProfileId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (!profile) {
        return notFoundResponse('Climate profile');
      }
      targetProfile = { id: profile.id, name: profile.name, scope: profile.scope || 'individual' };
    } else {
      // Try to find primary profile first, then fall back to first profile
      const { data: primaryProfile } = await supabase
        .from('climate_profiles')
        .select('id, name, scope')
        .eq('tenant_id', tenantId)
        .eq('is_primary', true)
        .single();
      
      if (primaryProfile) {
        targetProfile = { id: primaryProfile.id, name: primaryProfile.name, scope: primaryProfile.scope || 'individual' };
      } else {
        const { data: firstProfile } = await supabase
          .from('climate_profiles')
          .select('id, name, scope')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (firstProfile) {
          targetProfile = { id: firstProfile.id, name: firstProfile.name, scope: firstProfile.scope || 'individual' };
        }
      }
    }
    
    // Check if the target profile already has missions
    if (targetProfile) {
      const { count: existingCount } = await supabase
        .from('climate_missions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('profile_id', targetProfile.id);
      
      if (existingCount && existingCount > 0) {
        return jsonResponse({
          created: false,
          reason: 'profile_already_has_missions',
          profile_id: targetProfile.id,
          profile_name: targetProfile.name,
          existing_count: existingCount,
        });
      }
    }
    
    const profileId = targetProfile?.id || null;
    
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
    
    const profileLabel = targetProfile 
      ? ` for profile '${targetProfile.name}' (scope: ${targetProfile.scope})`
      : '';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'climate_missions_bootstrapped',
      summary: `Created ${createdMissions.length} starter missions${profileLabel}`,
      metadata: {
        mission_count: createdMissions.length,
        mission_ids: createdMissions.map((m) => m.id),
        profile_id: targetProfile?.id,
        profile_name: targetProfile?.name,
        profile_scope: targetProfile?.scope,
        total_estimated_impact_kgco2: STARTER_MISSIONS.reduce((sum, m) => sum + m.estimated_impact_kgco2, 0),
      },
      relatedEntityIds: targetProfile 
        ? [...createdMissions.map((m) => m.id), targetProfile.id]
        : createdMissions.map((m) => m.id),
    });
    
    return jsonResponse({
      created: true,
      profile_id: targetProfile?.id,
      profile_name: targetProfile?.name,
      missions: createdMissions,
    }, 201);
  } catch (error) {
    console.error('Bootstrap missions error:', error);
    return serverErrorResponse('Failed to bootstrap missions');
  }
});

export default app;
