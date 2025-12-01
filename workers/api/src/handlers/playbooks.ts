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
  Playbook,
  PlaybookStep,
  PlaybookWithSteps,
  PlaybookRun,
  PlaybookRunStep,
  PlaybookRunWithSteps,
  CreatePlaybookInput,
  UpdatePlaybookInput,
  StartPlaybookRunInput,
  UpdatePlaybookRunStepInput,
  PaginationParams,
} from '../types';

const app = new Hono<AuthAppEnv>();

// ============================================================================
// GET /playbooks - List playbooks visible to tenant (global + tenant-specific)
// ============================================================================
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const category = c.req.query('category');
    const target_entity_type = c.req.query('target_entity_type');
    const is_active = c.req.query('is_active');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query - playbooks visible to tenant: global (tenant_id IS NULL) OR tenant-owned
    let query = supabase
      .from('playbooks')
      .select('*', { count: 'exact' })
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);

    // Apply optional filters
    if (category) {
      query = query.eq('category', category);
    }
    if (target_entity_type) {
      query = query.eq('target_entity_type', target_entity_type);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: playbooks, error, count } = await query;

    if (error) {
      console.error('Error fetching playbooks:', error);
      return serverErrorResponse('Failed to fetch playbooks');
    }

    return paginatedResponse(playbooks || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /playbooks:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /playbooks - Create a tenant-specific playbook
// ============================================================================
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    // Only founder or brand_admin can create playbooks
    if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
      return errorResponse('FORBIDDEN', 'Only founders or brand admins can create playbooks', 403);
    }

    const body = await c.req.json<CreatePlaybookInput>();

    // Validate required fields
    if (!body.code || !body.name || !body.category || !body.target_entity_type) {
      return badRequestResponse('code, name, category, and target_entity_type are required');
    }

    // Insert playbook (tenant-owned)
    const { data: playbook, error } = await supabase
      .from('playbooks')
      .insert({
        tenant_id: tenantId,
        code: body.code,
        name: body.name,
        description: body.description || null,
        category: body.category,
        target_entity_type: body.target_entity_type,
        is_active: body.is_active !== false,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating playbook:', error);
      if (error.code === '23505') {
        return badRequestResponse('A playbook with this code already exists');
      }
      return serverErrorResponse('Failed to create playbook');
    }

    // Insert steps if provided
    if (body.steps && body.steps.length > 0) {
      const stepsToInsert = body.steps.map((step) => ({
        playbook_id: playbook.id,
        step_order: step.step_order,
        code: step.code,
        name: step.name,
        description: step.description || null,
        agent_suggestion: step.agent_suggestion || null,
        task_type: step.task_type || null,
        config: step.config || {},
      }));

      const { error: stepsError } = await supabase
        .from('playbook_steps')
        .insert(stepsToInsert);

      if (stepsError) {
        console.error('Error creating playbook steps:', stepsError);
      }
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'playbook_created',
      summary: `Playbook "${body.name}" (${body.code}) created`,
      category: 'system',
      metadata: {
        playbook_id: playbook.id,
        code: body.code,
        category: body.category,
        target_entity_type: body.target_entity_type,
        steps_count: body.steps?.length || 0,
      },
      relatedEntityIds: [playbook.id],
    });

    return jsonResponse(playbook, 201);
  } catch (err) {
    console.error('Error in POST /playbooks:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /playbooks/:id - Get playbook detail with steps
// ============================================================================
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const playbookId = c.req.param('id');

    // Fetch playbook - must be global or tenant-owned
    const { data: playbook, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', playbookId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (error || !playbook) {
      return notFoundResponse('Playbook');
    }

    // Fetch steps
    const { data: steps } = await supabase
      .from('playbook_steps')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('step_order', { ascending: true });

    const playbookWithSteps: PlaybookWithSteps = {
      ...playbook,
      steps: steps || [],
    };

    return jsonResponse(playbookWithSteps);
  } catch (err) {
    console.error('Error in GET /playbooks/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PATCH /playbooks/:id - Update playbook fields
// ============================================================================
app.patch('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    const playbookId = c.req.param('id');

    // Only founder or brand_admin can update playbooks
    if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
      return errorResponse('FORBIDDEN', 'Only founders or brand admins can update playbooks', 403);
    }

    // Fetch existing playbook - can only update tenant-owned playbooks
    const { data: existingPlaybook, error: fetchError } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', playbookId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingPlaybook) {
      return notFoundResponse('Playbook');
    }

    const body = await c.req.json<UpdatePlaybookInput>();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.target_entity_type !== undefined) updateData.target_entity_type = body.target_entity_type;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update playbook
    const { data: updatedPlaybook, error: updateError } = await supabase
      .from('playbooks')
      .update(updateData)
      .eq('id', playbookId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating playbook:', updateError);
      return serverErrorResponse('Failed to update playbook');
    }

    return jsonResponse(updatedPlaybook);
  } catch (err) {
    console.error('Error in PATCH /playbooks/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /playbooks/:id/run - Start a new playbook run
// ============================================================================
app.post('/:id/run', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const playbookId = c.req.param('id');

    // Fetch playbook with steps - must be global or tenant-owned
    const { data: playbook, error: playbookError } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', playbookId)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (playbookError || !playbook) {
      return notFoundResponse('Playbook');
    }

    // Check if playbook is active
    if (!playbook.is_active) {
      return badRequestResponse('Cannot run an inactive playbook');
    }

    // Fetch playbook steps
    const { data: steps } = await supabase
      .from('playbook_steps')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('step_order', { ascending: true });

    if (!steps || steps.length === 0) {
      return badRequestResponse('Playbook has no steps defined');
    }

    const body = await c.req.json<StartPlaybookRunInput>();

    // Create playbook run
    const { data: run, error: runError } = await supabase
      .from('playbook_runs')
      .insert({
        tenant_id: tenantId,
        playbook_id: playbookId,
        target_entity_type: body.target_entity_type || playbook.target_entity_type,
        target_entity_id: body.target_entity_id || null,
        status: 'not_started',
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating playbook run:', runError);
      return serverErrorResponse('Failed to create playbook run');
    }

    // Create run steps for each playbook step
    const runStepsToInsert = steps.map((step: PlaybookStep) => ({
      tenant_id: tenantId,
      playbook_run_id: run.id,
      playbook_step_id: step.id,
      step_order: step.step_order,
      status: 'not_started',
      metadata: {},
    }));

    const { error: runStepsError } = await supabase
      .from('playbook_run_steps')
      .insert(runStepsToInsert);

    if (runStepsError) {
      console.error('Error creating playbook run steps:', runStepsError);
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'playbook_run_started',
      summary: `Playbook run started for "${playbook.name}" (${playbook.code})`,
      category: 'system',
      metadata: {
        playbook_run_id: run.id,
        playbook_id: playbookId,
        playbook_code: playbook.code,
        playbook_name: playbook.name,
        target_entity_type: body.target_entity_type || playbook.target_entity_type,
        target_entity_id: body.target_entity_id,
        steps_count: steps.length,
      },
      relatedEntityIds: [run.id, playbookId],
    });

    // Fetch the created run with steps
    const { data: runSteps } = await supabase
      .from('playbook_run_steps')
      .select('*')
      .eq('playbook_run_id', run.id)
      .order('step_order', { ascending: true });

    const runWithSteps: PlaybookRunWithSteps = {
      ...run,
      steps: runSteps || [],
      playbook: playbook,
    };

    return jsonResponse(runWithSteps, 201);
  } catch (err) {
    console.error('Error in POST /playbooks/:id/run:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /playbook-runs - List runs for current tenant
// ============================================================================
app.get('/runs', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const playbook_id = c.req.query('playbook_id');
    const status = c.req.query('status');
    const target_entity_type = c.req.query('target_entity_type');
    const target_entity_id = c.req.query('target_entity_id');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query - runs are tenant-scoped
    let query = supabase
      .from('playbook_runs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply optional filters
    if (playbook_id) {
      query = query.eq('playbook_id', playbook_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (target_entity_type) {
      query = query.eq('target_entity_type', target_entity_type);
    }
    if (target_entity_id) {
      query = query.eq('target_entity_id', target_entity_id);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: runs, error, count } = await query;

    if (error) {
      console.error('Error fetching playbook runs:', error);
      return serverErrorResponse('Failed to fetch playbook runs');
    }

    return paginatedResponse(runs || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /playbook-runs:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /playbook-runs/:id - Get run detail with steps
// ============================================================================
app.get('/runs/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const runId = c.req.param('id');

    // Fetch run - must be tenant-owned
    const { data: run, error } = await supabase
      .from('playbook_runs')
      .select('*')
      .eq('id', runId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !run) {
      return notFoundResponse('Playbook run');
    }

    // Fetch playbook
    const { data: playbook } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', run.playbook_id)
      .single();

    // Fetch run steps
    const { data: steps } = await supabase
      .from('playbook_run_steps')
      .select('*')
      .eq('playbook_run_id', runId)
      .order('step_order', { ascending: true });

    const runWithSteps: PlaybookRunWithSteps = {
      ...run,
      steps: steps || [],
      playbook: playbook || undefined,
    };

    return jsonResponse(runWithSteps);
  } catch (err) {
    console.error('Error in GET /playbook-runs/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PATCH /playbook-runs/:id/steps/:stepId - Update step status
// ============================================================================
app.patch('/runs/:id/steps/:stepId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const runId = c.req.param('id');
    const stepId = c.req.param('stepId');

    // Verify run exists and is tenant-owned
    const { data: run, error: runError } = await supabase
      .from('playbook_runs')
      .select('id, playbook_id, status')
      .eq('id', runId)
      .eq('tenant_id', tenantId)
      .single();

    if (runError || !run) {
      return notFoundResponse('Playbook run');
    }

    // Fetch existing step
    const { data: existingStep, error: stepError } = await supabase
      .from('playbook_run_steps')
      .select('*')
      .eq('id', stepId)
      .eq('playbook_run_id', runId)
      .eq('tenant_id', tenantId)
      .single();

    if (stepError || !existingStep) {
      return notFoundResponse('Playbook run step');
    }

    const body = await c.req.json<UpdatePlaybookRunStepInput>();

    // Validate status
    const validStatuses = ['not_started', 'pending', 'in_progress', 'completed', 'failed', 'skipped'];
    if (!validStatuses.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    // Set timestamps based on status
    const now = new Date().toISOString();
    if (body.status === 'in_progress' && !existingStep.started_at) {
      updateData.started_at = now;
    }
    if (body.status === 'completed') {
      updateData.completed_at = now;
    }
    if (body.status === 'failed') {
      updateData.failed_at = now;
      if (body.failure_reason) {
        updateData.failure_reason = body.failure_reason;
      }
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.agent_id !== undefined) {
      updateData.agent_id = body.agent_id;
    }
    if (body.agent_task_id !== undefined) {
      updateData.agent_task_id = body.agent_task_id;
    }

    // Update step
    const { data: updatedStep, error: updateError } = await supabase
      .from('playbook_run_steps')
      .update(updateData)
      .eq('id', stepId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating playbook run step:', updateError);
      return serverErrorResponse('Failed to update playbook run step');
    }

    // Create journal entry for status change
    if (body.status !== existingStep.status) {
      await insertJournalEntry(supabase, {
        tenantId,
        eventType: 'playbook_run_step_status_changed',
        summary: `Playbook run step status changed from ${existingStep.status} to ${body.status}`,
        category: 'system',
        metadata: {
          playbook_run_id: runId,
          playbook_run_step_id: stepId,
          old_status: existingStep.status,
          new_status: body.status,
          step_order: existingStep.step_order,
        },
        relatedEntityIds: [runId, stepId],
      });
    }

    // Check if all steps are completed/failed/skipped to update run status
    const { data: allSteps } = await supabase
      .from('playbook_run_steps')
      .select('status')
      .eq('playbook_run_id', runId);

    if (allSteps) {
      const allDone = allSteps.every((s: { status: string }) => 
        ['completed', 'failed', 'skipped'].includes(s.status)
      );
      const anyInProgress = allSteps.some((s: { status: string }) => 
        s.status === 'in_progress'
      );
      const anyFailed = allSteps.some((s: { status: string }) => 
        s.status === 'failed'
      );

      let newRunStatus = run.status;
      if (allDone) {
        newRunStatus = anyFailed ? 'failed' : 'completed';
      } else if (anyInProgress) {
        newRunStatus = 'in_progress';
      }

      if (newRunStatus !== run.status) {
        const runUpdateData: Record<string, unknown> = { status: newRunStatus };
        if (newRunStatus === 'in_progress' && run.status === 'not_started') {
          runUpdateData.started_at = now;
        }
        if (newRunStatus === 'completed') {
          runUpdateData.completed_at = now;
        }
        if (newRunStatus === 'failed') {
          runUpdateData.failed_at = now;
        }

        await supabase
          .from('playbook_runs')
          .update(runUpdateData)
          .eq('id', runId);
      }
    }

    return jsonResponse(updatedStep);
  } catch (err) {
    console.error('Error in PATCH /playbook-runs/:id/steps/:stepId:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default app;
