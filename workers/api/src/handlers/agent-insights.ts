import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import type { AgentInsight, AgentInsightListItem, AgentInsightDecisionInput } from '../types';
import { jsonResponse } from '../lib/response';

const app = new Hono<AuthAppEnv>();

const VALID_AGENT_IDS = ['CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM'];
const VALID_STATUSES = ['proposed', 'accepted', 'rejected', 'implemented'];

/**
 * GET /api/agents/insights
 * List agent insights with optional filters
 */
app.get('/insights', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Parse query parameters
  const agentId = c.req.query('agent_id');
  const status = c.req.query('status');
  const category = c.req.query('category');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('agent_insights')
    .select('id, agent_id, category, title, status, related_entity_type, impact_estimate_kgco2, created_at, updated_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (agentId) {
    query = query.eq('agent_id', agentId.toUpperCase());
  }
  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching agent insights:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({
    data: data as AgentInsightListItem[],
    pagination: {
      limit,
      offset,
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    },
  });
});

/**
 * GET /api/agents/insights/:id
 * Get a single agent insight by ID
 */
app.get('/insights/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const insightId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('agent_insights')
    .select('*')
    .eq('id', insightId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Insight '${insightId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching agent insight:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({ data: data as AgentInsight });
});

/**
 * POST /api/agents/insights/:id/decision
 * Accept or reject an insight
 * If accepting a climate_mission_suggestion, auto-create the climate mission
 */
app.post('/insights/:id/decision', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  const insightId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: AgentInsightDecisionInput;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse(
      { error: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
      400
    );
  }

  // Validate decision
  if (!body.decision || !['accept', 'reject'].includes(body.decision)) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: "decision must be 'accept' or 'reject'",
        status: 400,
      },
      400
    );
  }

  // Fetch the insight
  const { data: insight, error: fetchError } = await supabase
    .from('agent_insights')
    .select('*')
    .eq('id', insightId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Insight '${insightId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching insight:', fetchError);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: fetchError.message, status: 500 },
      500
    );
  }

  // Check if insight is still in proposed status
  if (insight.status !== 'proposed') {
    return jsonResponse(
      {
        error: 'INVALID_STATE',
        message: `Insight is already ${insight.status}`,
        status: 400,
      },
      400
    );
  }

  const newStatus = body.decision === 'accept' ? 'accepted' : 'rejected';
  let createdMissionId: string | null = null;

  // If accepting a climate_mission_suggestion, auto-create the climate mission
  if (body.decision === 'accept' && insight.category === 'climate_mission_suggestion') {
    // Get the first profile for this tenant (or create one if needed)
    const { data: profiles } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    let profileId: string;
    if (profiles && profiles.length > 0) {
      profileId = profiles[0].id;
    } else {
      // Create a default profile
      const { data: newProfile, error: profileError } = await supabase
        .from('climate_profiles')
        .insert({
          tenant_id: tenantId,
          name: 'Default Profile',
          profile_type: 'person',
          scope: 'individual',
          is_primary: true,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating default profile:', profileError);
        return jsonResponse(
          { error: 'DATABASE_ERROR', message: 'Failed to create default profile', status: 500 },
          500
        );
      }
      profileId = newProfile.id;
    }

    // Extract mission details from insight metadata
    const metadata = insight.metadata || {};
    const missionData = {
      tenant_id: tenantId,
      profile_id: profileId,
      title: insight.title,
      description: insight.body,
      category: metadata.category || 'general',
      status: 'planned',
      estimated_impact_kgco2: insight.impact_estimate_kgco2,
      metadata: {
        created_from_insight_id: insightId,
        difficulty: metadata.difficulty,
        duration: metadata.duration,
        focus_area: metadata.focus_area,
      },
    };

    const { data: mission, error: missionError } = await supabase
      .from('climate_missions')
      .insert(missionData)
      .select()
      .single();

    if (missionError) {
      console.error('Error creating climate mission:', missionError);
      return jsonResponse(
        { error: 'DATABASE_ERROR', message: 'Failed to create climate mission', status: 500 },
        500
      );
    }

    createdMissionId = mission.id;

    // Create journal entry for mission creation
    await supabase.from('journal_entries').insert({
      tenant_id: tenantId,
      category: 'agent_action',
      title: `Climate mission created from insight: ${insight.title}`,
      body: `ORACLE suggested this mission and it was approved. Mission ID: ${mission.id}`,
      details: {
        event_type: 'climate_mission_from_insight',
        insight_id: insightId,
        mission_id: mission.id,
        agent_id: insight.agent_id,
      },
      author: 'system',
    });
  }

  // Update the insight status
  const { data: updatedInsight, error: updateError } = await supabase
    .from('agent_insights')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...insight.metadata,
        decision_by_user_id: userId,
        decision_reason: body.reason || null,
        decision_at: new Date().toISOString(),
        created_mission_id: createdMissionId,
      },
    })
    .eq('id', insightId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating insight:', updateError);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: updateError.message, status: 500 },
      500
    );
  }

  // Create journal entry for the decision
  await supabase.from('journal_entries').insert({
    tenant_id: tenantId,
    category: 'agent_action',
    title: `Agent insight ${newStatus}: ${insight.title}`,
    body: body.reason || `Insight from ${insight.agent_id} was ${newStatus}`,
    details: {
      event_type: 'agent_insight_decision',
      insight_id: insightId,
      agent_id: insight.agent_id,
      category: insight.category,
      decision: body.decision,
      created_mission_id: createdMissionId,
    },
    author: 'system',
  });

  return jsonResponse({
    data: updatedInsight as AgentInsight,
    created_mission_id: createdMissionId,
  });
});

export default app;
