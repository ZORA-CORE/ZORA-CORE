import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId, getUserId } from '../middleware/auth';
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
import type {
  ClimateExperiment,
  ClimateExperimentWithRunCount,
  ClimateExperimentRun,
  ClimateExperimentDetail,
  ClimateExperimentSummary,
  ClimateExperimentRunListItem,
  CreateClimateExperimentInput,
  UpdateClimateExperimentInput,
  CreateClimateExperimentRunInput,
  BestObjectiveRun,
} from '../types';

const app = new Hono<AuthAppEnv>();

// POST /api/climate/experiments - Create a new climate experiment
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const body = await c.req.json<CreateClimateExperimentInput>();
    
    if (!body.title) {
      return badRequestResponse('Title is required');
    }
    if (!body.problem_domain) {
      return badRequestResponse('Problem domain is required');
    }
    if (!body.method_family) {
      return badRequestResponse('Method family is required');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('climate_experiments')
      .insert({
        tenant_id: tenantId,
        title: body.title,
        description: body.description || null,
        problem_domain: body.problem_domain,
        method_family: body.method_family,
        status: body.status || 'design',
        linked_profile_id: body.linked_profile_id || null,
        linked_product_id: body.linked_product_id || null,
        linked_material_id: body.linked_material_id || null,
        tags: body.tags || null,
        created_by_user_id: userId || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating climate experiment:', error);
      return serverErrorResponse('Failed to create climate experiment');
    }
    
    await insertJournalEntry(supabase, {
      tenantId,
      category: 'quantum_climate_lab',
      eventType: 'experiment_created',
      summary: `Quantum Climate Lab experiment created: ${data.title} (${data.problem_domain}, ${data.method_family})`,
      metadata: {
        experiment_id: data.id,
        title: data.title,
        problem_domain: data.problem_domain,
        method_family: data.method_family,
        status: data.status,
        tags: data.tags,
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse<ClimateExperiment>(data, 201);
  } catch (error) {
    console.error('Climate experiment create error:', error);
    return serverErrorResponse('Failed to create climate experiment');
  }
});

// GET /api/climate/experiments - List experiments for current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);
    
    // Parse filters
    const status = url.searchParams.get('status');
    const problemDomain = url.searchParams.get('problem_domain');
    const methodFamily = url.searchParams.get('method_family');
    const tag = url.searchParams.get('tag');
    const linkedProfileId = url.searchParams.get('linked_profile_id');
    const linkedProductId = url.searchParams.get('linked_product_id');
    const linkedMaterialId = url.searchParams.get('linked_material_id');
    
    const supabase = getSupabaseClient(c.env);
    
    let query = supabase
      .from('climate_experiments')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    if (status) {
      query = query.eq('status', status);
    }
    if (problemDomain) {
      query = query.eq('problem_domain', problemDomain);
    }
    if (methodFamily) {
      query = query.eq('method_family', methodFamily);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    if (linkedProfileId) {
      query = query.eq('linked_profile_id', linkedProfileId);
    }
    if (linkedProductId) {
      query = query.eq('linked_product_id', linkedProductId);
    }
    if (linkedMaterialId) {
      query = query.eq('linked_material_id', linkedMaterialId);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching climate experiments:', error);
      return serverErrorResponse('Failed to fetch climate experiments');
    }
    
    // Get run counts for each experiment
    const experimentIds = (data || []).map(e => e.id);
    let runCounts: Record<string, number> = {};
    
    if (experimentIds.length > 0) {
      const { data: runCountData } = await supabase
        .from('climate_experiment_runs')
        .select('experiment_id')
        .eq('tenant_id', tenantId)
        .in('experiment_id', experimentIds);
      
      if (runCountData) {
        runCounts = runCountData.reduce((acc, run) => {
          acc[run.experiment_id] = (acc[run.experiment_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }
    
    const experimentsWithCounts: ClimateExperimentWithRunCount[] = (data || []).map(exp => ({
      ...exp,
      run_count: runCounts[exp.id] || 0,
    }));
    
    return paginatedResponse<ClimateExperimentWithRunCount>(experimentsWithCounts, count || 0, { limit, offset });
  } catch (error) {
    console.error('Climate experiments list error:', error);
    return serverErrorResponse('Failed to fetch climate experiments');
  }
});

// GET /api/climate/experiments/:id - Get experiment details with recent runs
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    
    const supabase = getSupabaseClient(c.env);
    
    const { data: experiment, error } = await supabase
      .from('climate_experiments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !experiment) {
      return notFoundResponse('Climate experiment');
    }
    
    // Get recent runs (last 5)
    const { data: recentRuns } = await supabase
      .from('climate_experiment_runs')
      .select('id, run_label, method_type, status, created_at')
      .eq('experiment_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    const experimentDetail: ClimateExperimentDetail = {
      ...experiment,
      recent_runs: (recentRuns || []) as ClimateExperimentRunListItem[],
    };
    
    return jsonResponse<ClimateExperimentDetail>(experimentDetail);
  } catch (error) {
    console.error('Climate experiment detail error:', error);
    return serverErrorResponse('Failed to fetch climate experiment');
  }
});

// PATCH /api/climate/experiments/:id - Update experiment
app.patch('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const body = await c.req.json<UpdateClimateExperimentInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    // Check if experiment exists
    const { data: existing } = await supabase
      .from('climate_experiments')
      .select('id, title, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!existing) {
      return notFoundResponse('Climate experiment');
    }
    
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.problem_domain !== undefined) updateData.problem_domain = body.problem_domain;
    if (body.method_family !== undefined) updateData.method_family = body.method_family;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.linked_profile_id !== undefined) updateData.linked_profile_id = body.linked_profile_id;
    if (body.linked_product_id !== undefined) updateData.linked_product_id = body.linked_product_id;
    if (body.linked_material_id !== undefined) updateData.linked_material_id = body.linked_material_id;
    if (body.tags !== undefined) updateData.tags = body.tags;
    
    const { data, error } = await supabase
      .from('climate_experiments')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating climate experiment:', error);
      return serverErrorResponse('Failed to update climate experiment');
    }
    
    // Log status change if applicable
    if (body.status && body.status !== existing.status) {
      await insertJournalEntry(supabase, {
        tenantId,
        category: 'quantum_climate_lab',
        eventType: 'experiment_status_changed',
        summary: `Experiment status changed: ${existing.title} (${existing.status} → ${body.status})`,
        metadata: {
          experiment_id: data.id,
          title: data.title,
          previous_status: existing.status,
          new_status: body.status,
        },
        relatedEntityIds: [data.id],
      });
    }
    
    return jsonResponse<ClimateExperiment>(data);
  } catch (error) {
    console.error('Climate experiment update error:', error);
    return serverErrorResponse('Failed to update climate experiment');
  }
});

// POST /api/climate/experiments/:id/runs - Create a new run for an experiment
app.post('/:id/runs', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const experimentId = c.req.param('id');
    const body = await c.req.json<CreateClimateExperimentRunInput>();
    
    if (!body.method_type) {
      return badRequestResponse('Method type is required');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify experiment belongs to tenant
    const { data: experiment } = await supabase
      .from('climate_experiments')
      .select('id, title, problem_domain, method_family')
      .eq('id', experimentId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!experiment) {
      return notFoundResponse('Climate experiment');
    }
    
    const { data, error } = await supabase
      .from('climate_experiment_runs')
      .insert({
        tenant_id: tenantId,
        experiment_id: experimentId,
        run_label: body.run_label || null,
        method_type: body.method_type,
        backend_provider: body.backend_provider || null,
        input_summary: body.input_summary || null,
        parameters: body.parameters || null,
        metrics: body.metrics || null,
        evaluation: body.evaluation || null,
        status: body.status || 'completed',
        error_message: body.error_message || null,
        started_at: body.started_at || null,
        completed_at: body.completed_at || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating climate experiment run:', error);
      return serverErrorResponse('Failed to create climate experiment run');
    }
    
    await insertJournalEntry(supabase, {
      tenantId,
      category: 'quantum_climate_lab',
      eventType: 'experiment_run_recorded',
      summary: `Experiment run recorded: ${experiment.title} - ${body.run_label || body.method_type} (${data.status})`,
      metadata: {
        experiment_id: experimentId,
        run_id: data.id,
        experiment_title: experiment.title,
        run_label: data.run_label,
        method_type: data.method_type,
        backend_provider: data.backend_provider,
        status: data.status,
        metrics: data.metrics,
      },
      relatedEntityIds: [data.id, experimentId],
    });
    
    return jsonResponse<ClimateExperimentRun>(data, 201);
  } catch (error) {
    console.error('Climate experiment run create error:', error);
    return serverErrorResponse('Failed to create climate experiment run');
  }
});

// GET /api/climate/experiments/:id/runs - List runs for an experiment
app.get('/:id/runs', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const experimentId = c.req.param('id');
    const url = new URL(c.req.url);
    const { limit, offset } = parsePaginationParams(url);
    
    // Parse filters
    const status = url.searchParams.get('status');
    const methodType = url.searchParams.get('method_type');
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') === 'asc' ? true : false;
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify experiment belongs to tenant
    const { data: experiment } = await supabase
      .from('climate_experiments')
      .select('id')
      .eq('id', experimentId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!experiment) {
      return notFoundResponse('Climate experiment');
    }
    
    let query = supabase
      .from('climate_experiment_runs')
      .select('*', { count: 'exact' })
      .eq('experiment_id', experimentId)
      .eq('tenant_id', tenantId);
    
    if (status) {
      query = query.eq('status', status);
    }
    if (methodType) {
      query = query.eq('method_type', methodType);
    }
    
    const validSortFields = ['created_at', 'completed_at', 'started_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    
    const { data, error, count } = await query
      .order(sortField, { ascending: sortOrder })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching climate experiment runs:', error);
      return serverErrorResponse('Failed to fetch climate experiment runs');
    }
    
    return paginatedResponse<ClimateExperimentRun>(data || [], count || 0, { limit, offset });
  } catch (error) {
    console.error('Climate experiment runs list error:', error);
    return serverErrorResponse('Failed to fetch climate experiment runs');
  }
});

// GET /api/climate/experiments/runs/:runId - Get a single run by ID
app.get('/runs/:runId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const runId = c.req.param('runId');
    
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('climate_experiment_runs')
      .select('*')
      .eq('id', runId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      return notFoundResponse('Climate experiment run');
    }
    
    return jsonResponse<ClimateExperimentRun>(data);
  } catch (error) {
    console.error('Climate experiment run detail error:', error);
    return serverErrorResponse('Failed to fetch climate experiment run');
  }
});

// GET /api/climate/experiments/:id/summary - Get experiment summary with analysis
app.get('/:id/summary', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const experimentId = c.req.param('id');
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify experiment belongs to tenant
    const { data: experiment } = await supabase
      .from('climate_experiments')
      .select('id')
      .eq('id', experimentId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!experiment) {
      return notFoundResponse('Climate experiment');
    }
    
    // Get all runs for this experiment
    const { data: runs, error } = await supabase
      .from('climate_experiment_runs')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error fetching runs for summary:', error);
      return serverErrorResponse('Failed to fetch experiment summary');
    }
    
    const allRuns = runs || [];
    
    // Calculate runs by status
    const runsByStatus: Record<string, number> = {};
    allRuns.forEach(run => {
      runsByStatus[run.status] = (runsByStatus[run.status] || 0) + 1;
    });
    
    // Calculate methods used
    const methodsUsed: Record<string, number> = {};
    allRuns.forEach(run => {
      methodsUsed[run.method_type] = (methodsUsed[run.method_type] || 0) + 1;
    });
    
    // Find best objective run (lowest objective_value in metrics)
    let bestObjectiveRun: BestObjectiveRun | null = null;
    let bestObjectiveValue: number | null = null;
    
    allRuns.forEach(run => {
      if (run.metrics && typeof run.metrics === 'object') {
        const metrics = run.metrics as Record<string, unknown>;
        const objectiveValue = metrics.objective_value;
        if (typeof objectiveValue === 'number') {
          if (bestObjectiveValue === null || objectiveValue < bestObjectiveValue) {
            bestObjectiveValue = objectiveValue;
            bestObjectiveRun = {
              run_id: run.id,
              method_type: run.method_type,
              backend_provider: run.backend_provider,
              metrics: run.metrics,
            };
          }
        }
      }
    });
    
    const summary: ClimateExperimentSummary = {
      experiment_id: experimentId,
      total_runs: allRuns.length,
      runs_by_status: runsByStatus,
      methods_used: methodsUsed,
      best_objective_run: bestObjectiveRun,
    };
    
    return jsonResponse<ClimateExperimentSummary>(summary);
  } catch (error) {
    console.error('Climate experiment summary error:', error);
    return serverErrorResponse('Failed to fetch experiment summary');
  }
});

export default app;
