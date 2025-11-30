import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId, getAuthContext } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { insertJournalEntry } from '../lib/journal';
import {
  jsonResponse,
  paginatedResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  errorResponse,
} from '../lib/response';
import type {
  FoundationProject,
  CreateFoundationProjectInput,
  UpdateFoundationProjectInput,
  CreateFoundationContributionInput,
  FoundationProjectImpactSummary,
  FoundationProjectListItem,
  PaginationParams,
} from '../types';

const app = new Hono<AuthAppEnv>();

// ============================================================================
// GET /projects - List foundation projects
// ============================================================================
app.get('/projects', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const status = c.req.query('status');
    const category = c.req.query('category');
    const climate_focus_domain = c.req.query('climate_focus_domain');
    const tenant_scope = c.req.query('tenant_scope') || 'all';
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query - projects visible to tenant: global (tenant_id IS NULL) OR tenant-owned
    let query = supabase
      .from('foundation_projects')
      .select('*', { count: 'exact' });

    // Apply tenant scope filter
    if (tenant_scope === 'global') {
      query = query.is('tenant_id', null);
    } else if (tenant_scope === 'tenant') {
      query = query.eq('tenant_id', tenantId);
    } else {
      // 'all' - show global + tenant-owned
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (climate_focus_domain) {
      query = query.eq('climate_focus_domain', climate_focus_domain);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Error fetching foundation projects:', error);
      return serverErrorResponse('Failed to fetch foundation projects');
    }

    // Get contribution counts for each project
    const projectIds = (projects || []).map((p: FoundationProject) => p.id);
    
    let projectsWithCounts: FoundationProjectListItem[] = projects || [];
    
    if (projectIds.length > 0) {
      const { data: contributionCounts } = await supabase
        .from('foundation_contributions')
        .select('project_id, amount_cents')
        .in('project_id', projectIds);

      // Aggregate contribution counts
      const countMap: Record<string, { count: number; total: number }> = {};
      (contributionCounts || []).forEach((contrib: { project_id: string; amount_cents: number }) => {
        if (!countMap[contrib.project_id]) {
          countMap[contrib.project_id] = { count: 0, total: 0 };
        }
        countMap[contrib.project_id].count += 1;
        countMap[contrib.project_id].total += contrib.amount_cents;
      });

      projectsWithCounts = (projects || []).map((p: FoundationProject) => ({
        ...p,
        contribution_count: countMap[p.id]?.count || 0,
        total_contributions_cents: countMap[p.id]?.total || 0,
      }));
    }

    return paginatedResponse(projectsWithCounts, count || 0, params);
  } catch (err) {
    console.error('Error in GET /projects:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /projects - Create a foundation project
// ============================================================================
app.post('/projects', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    // Only founder or brand_admin can create projects
    if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
      return errorResponse('FORBIDDEN', 'Only founders or brand admins can create foundation projects', 403);
    }

    const body = await c.req.json<CreateFoundationProjectInput>();

    // Validate required fields
    if (!body.title || !body.category) {
      return badRequestResponse('title and category are required');
    }

    // Insert project (tenant-owned)
    const { data: project, error } = await supabase
      .from('foundation_projects')
      .insert({
        tenant_id: tenantId,
        title: body.title,
        description: body.description || null,
        category: body.category,
        status: 'planned',
        climate_focus_domain: body.climate_focus_domain || null,
        location_country: body.location_country || null,
        location_region: body.location_region || null,
        sdg_tags: body.sdg_tags || null,
        estimated_impact_kgco2: body.estimated_impact_kgco2 || null,
        impact_methodology: body.impact_methodology || null,
        external_url: body.external_url || null,
        image_url: body.image_url || null,
        min_contribution_amount_cents: body.min_contribution_amount_cents || 0,
        currency: body.currency || 'DKK',
        tags: body.tags || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating foundation project:', error);
      return serverErrorResponse('Failed to create foundation project');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'foundation_project_created',
      summary: `Foundation project "${body.title}" created`,
      category: 'zora_foundation',
      metadata: {
        project_id: project.id,
        category: body.category,
        climate_focus_domain: body.climate_focus_domain,
      },
      relatedEntityIds: [project.id],
    });

    return jsonResponse(project, 201);
  } catch (err) {
    console.error('Error in POST /projects:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /projects/:id - Get a single project
// ============================================================================
app.get('/projects/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const projectId = c.req.param('id');

    // Fetch project - must be global or tenant-owned
    const { data: project, error } = await supabase
      .from('foundation_projects')
      .select('*')
      .eq('id', projectId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (error || !project) {
      return notFoundResponse('Project');
    }

    return jsonResponse(project);
  } catch (err) {
    console.error('Error in GET /projects/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PATCH /projects/:id - Update a project
// ============================================================================
app.patch('/projects/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    const projectId = c.req.param('id');

    // Fetch existing project
    const { data: existingProject, error: fetchError } = await supabase
      .from('foundation_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      return notFoundResponse('Project');
    }

    // Check permissions: tenant can only update their own projects
    // Founders can update global projects (tenant_id IS NULL)
    const isOwnProject = existingProject.tenant_id === tenantId;
    const isGlobalProject = existingProject.tenant_id === null;
    const isFounder = auth.role === 'founder';

    if (!isOwnProject && !(isGlobalProject && isFounder)) {
      return errorResponse('FORBIDDEN', 'You can only update your own projects', 403);
    }

    const body = await c.req.json<UpdateFoundationProjectInput>();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.climate_focus_domain !== undefined) updateData.climate_focus_domain = body.climate_focus_domain;
    if (body.location_country !== undefined) updateData.location_country = body.location_country;
    if (body.location_region !== undefined) updateData.location_region = body.location_region;
    if (body.sdg_tags !== undefined) updateData.sdg_tags = body.sdg_tags;
    if (body.estimated_impact_kgco2 !== undefined) updateData.estimated_impact_kgco2 = body.estimated_impact_kgco2;
    if (body.verified_impact_kgco2 !== undefined) updateData.verified_impact_kgco2 = body.verified_impact_kgco2;
    if (body.impact_methodology !== undefined) updateData.impact_methodology = body.impact_methodology;
    if (body.external_url !== undefined) updateData.external_url = body.external_url;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.min_contribution_amount_cents !== undefined) updateData.min_contribution_amount_cents = body.min_contribution_amount_cents;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.tags !== undefined) updateData.tags = body.tags;

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('foundation_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating foundation project:', updateError);
      return serverErrorResponse('Failed to update foundation project');
    }

    // Create journal entry if status changed
    if (body.status && body.status !== existingProject.status) {
      await insertJournalEntry(supabase, {
        tenantId,
        eventType: 'foundation_project_updated',
        summary: `Foundation project "${existingProject.title}" status changed from ${existingProject.status} to ${body.status}`,
        category: 'zora_foundation',
        metadata: {
          project_id: projectId,
          old_status: existingProject.status,
          new_status: body.status,
        },
        relatedEntityIds: [projectId],
      });
    }

    return jsonResponse(updatedProject);
  } catch (err) {
    console.error('Error in PATCH /projects/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /projects/:id/contributions - List contributions for a project
// ============================================================================
app.get('/projects/:id/contributions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    const projectId = c.req.param('id');

    // Verify project exists and is accessible
    const { data: project, error: projectError } = await supabase
      .from('foundation_projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project');
    }

    // Parse query parameters
    const from = c.req.query('from');
    const to = c.req.query('to');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query - show contributions from current tenant OR if tenant owns the project
    let query = supabase
      .from('foundation_contributions')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Tenant can see their own contributions, or all if they own the project
    const isProjectOwner = project.tenant_id === tenantId;
    if (!isProjectOwner && auth.role !== 'founder') {
      query = query.eq('tenant_id', tenantId);
    }

    // Apply date filters
    if (from) {
      query = query.gte('contributed_at', from);
    }
    if (to) {
      query = query.lte('contributed_at', to);
    }

    // Apply pagination and ordering
    query = query
      .order('contributed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: contributions, error, count } = await query;

    if (error) {
      console.error('Error fetching contributions:', error);
      return serverErrorResponse('Failed to fetch contributions');
    }

    return paginatedResponse(contributions || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /projects/:id/contributions:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /projects/:id/contributions - Record a contribution
// ============================================================================
app.post('/projects/:id/contributions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const projectId = c.req.param('id');

    // Verify project exists and is accessible
    const { data: project, error: projectError } = await supabase
      .from('foundation_projects')
      .select('id, title, tenant_id, min_contribution_amount_cents, currency')
      .eq('id', projectId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project');
    }

    const body = await c.req.json<CreateFoundationContributionInput>();

    // Validate required fields
    if (!body.amount_cents || !body.source_type) {
      return badRequestResponse('amount_cents and source_type are required');
    }

    // Check minimum contribution amount
    if (body.amount_cents < project.min_contribution_amount_cents) {
      return badRequestResponse(`Minimum contribution is ${project.min_contribution_amount_cents} ${project.currency}`);
    }

    // Insert contribution
    const { data: contribution, error } = await supabase
      .from('foundation_contributions')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        amount_cents: body.amount_cents,
        currency: body.currency || project.currency || 'DKK',
        source_type: body.source_type,
        source_reference: body.source_reference || null,
        contributor_label: body.contributor_label || null,
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contribution:', error);
      return serverErrorResponse('Failed to create contribution');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'foundation_contribution_recorded',
      summary: `Contribution of ${body.amount_cents / 100} ${body.currency || project.currency || 'DKK'} to "${project.title}"`,
      category: 'zora_foundation',
      metadata: {
        contribution_id: contribution.id,
        project_id: projectId,
        project_title: project.title,
        amount_cents: body.amount_cents,
        currency: body.currency || project.currency || 'DKK',
        source_type: body.source_type,
      },
      relatedEntityIds: [contribution.id, projectId],
    });

    return jsonResponse(contribution, 201);
  } catch (err) {
    console.error('Error in POST /projects/:id/contributions:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /projects/:id/impact-summary - Get impact summary for a project
// ============================================================================
app.get('/projects/:id/impact-summary', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const projectId = c.req.param('id');

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('foundation_projects')
      .select('id, title, status, currency')
      .eq('id', projectId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project');
    }

    // Get total contributions
    const { data: contributions } = await supabase
      .from('foundation_contributions')
      .select('amount_cents')
      .eq('project_id', projectId);

    const totalContributionsCents = (contributions || []).reduce(
      (sum: number, contrib: { amount_cents: number }) => sum + contrib.amount_cents,
      0
    );

    // Get impact logs
    const { data: impactLogs } = await supabase
      .from('foundation_impact_log')
      .select('impact_kgco2, impact_units, impact_units_value, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Calculate totals from impact logs
    let totalImpactKgco2: number | null = null;
    let impactUnits: string | null = null;
    let impactUnitsValue: number | null = null;
    let lastUpdate: string | null = null;

    if (impactLogs && impactLogs.length > 0) {
      totalImpactKgco2 = impactLogs.reduce(
        (sum: number, log: { impact_kgco2: number }) => sum + log.impact_kgco2,
        0
      );

      // Get the most recent impact log for units
      const latestLog = impactLogs[0];
      impactUnits = latestLog.impact_units;
      impactUnitsValue = impactLogs.reduce(
        (sum: number, log: { impact_units_value: number | null }) => sum + (log.impact_units_value || 0),
        0
      );
      lastUpdate = latestLog.created_at;
    }

    const summary: FoundationProjectImpactSummary = {
      project_id: project.id,
      title: project.title,
      status: project.status,
      total_contributions_cents: totalContributionsCents,
      currency: project.currency,
      total_impact_kgco2: totalImpactKgco2,
      impact_units: impactUnits,
      impact_units_value: impactUnitsValue,
      last_update: lastUpdate,
    };

    return jsonResponse(summary);
  } catch (err) {
    console.error('Error in GET /projects/:id/impact-summary:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default app;
