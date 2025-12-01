/**
 * Workflow Runs API handlers for ZORA CORE
 * 
 * Workflow / DAG Engine v1.0 (Iteration 00D5)
 * 
 * These endpoints provide workflow run management and execution capabilities.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import type { AuthContext } from '../lib/auth';

const workflowRunsHandler = new Hono<AuthAppEnv>();

// =============================================================================
// Types
// =============================================================================

const COMPLETED_STATUSES = new Set(['completed', 'skipped']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'skipped']);

// =============================================================================
// Middleware
// =============================================================================

workflowRunsHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  await next();
});

// =============================================================================
// Workflow Run Endpoints
// =============================================================================

/**
 * GET /api/workflow-runs
 * List workflow runs for the current tenant
 */
workflowRunsHandler.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  const workflowId = c.req.query('workflow_id');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  try {
    let query = supabase
      .from('workflow_runs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: runs, error } = await query;
    
    if (error) {
      return errorResponse('QUERY_ERROR', error.message, 500);
    }
    
    const workflowIds = [...new Set((runs || []).map(r => r.workflow_id))];
    const { data: workflows } = await supabase
      .from('workflows')
      .select('id, key, name')
      .in('id', workflowIds);
    
    const workflowMap = new Map((workflows || []).map(w => [w.id, w]));
    
    const enrichedRuns = (runs || []).map(run => ({
      ...run,
      workflow: workflowMap.get(run.workflow_id) || null,
    }));
    
    return jsonResponse({ data: enrichedRuns, error: null });
  } catch (err) {
    console.error('Error listing workflow runs:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to list workflow runs', 500);
  }
});

/**
 * GET /api/workflow-runs/:id
 * Get workflow run detail with steps
 */
workflowRunsHandler.get('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const runId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  try {
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (runError || !run) {
      return errorResponse('NOT_FOUND', 'Workflow run not found', 404);
    }
    
    const { data: workflow } = await supabase
      .from('workflows')
      .select('id, key, name, description, category')
      .eq('id', run.workflow_id)
      .single();
    
    const { data: runSteps } = await supabase
      .from('workflow_run_steps')
      .select('*')
      .eq('run_id', runId);
    
    const stepIds = (runSteps || []).map(rs => rs.step_id);
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('id, key, name, step_type, agent_id, task_type, order_index')
      .in('id', stepIds);
    
    const stepMap = new Map((steps || []).map(s => [s.id, s]));
    
    const enrichedSteps = (runSteps || []).map(rs => ({
      ...rs,
      step: stepMap.get(rs.step_id) || null,
    })).sort((a, b) => {
      const orderA = a.step?.order_index ?? 0;
      const orderB = b.step?.order_index ?? 0;
      return orderA - orderB;
    });
    
    return jsonResponse({
      data: {
        ...run,
        workflow: workflow || null,
        steps: enrichedSteps,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error getting workflow run:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to get workflow run', 500);
  }
});

/**
 * POST /api/workflow-runs/:id/advance
 * Manually advance a workflow run (founder/brand_admin only)
 */
workflowRunsHandler.post('/:id/advance', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const runId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required', 403);
  }
  
  try {
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (runError || !run) {
      return errorResponse('NOT_FOUND', 'Workflow run not found', 404);
    }
    
    if (['completed', 'failed', 'canceled'].includes(run.status)) {
      return jsonResponse({
        data: { run, message: 'Run is already in terminal state', steps_started: 0 },
        error: null,
      });
    }
    
    const { data: runSteps } = await supabase
      .from('workflow_run_steps')
      .select('*')
      .eq('run_id', runId);
    
    const { data: workflowSteps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', run.workflow_id);
    
    const { data: edges } = await supabase
      .from('workflow_step_edges')
      .select('*')
      .eq('workflow_id', run.workflow_id);
    
    const stepIdToRunStep = new Map((runSteps || []).map(rs => [rs.step_id, rs]));
    
    const predecessors: Map<string, string[]> = new Map();
    for (const step of (workflowSteps || [])) {
      predecessors.set(step.id, []);
    }
    for (const edge of (edges || [])) {
      const preds = predecessors.get(edge.to_step_id) || [];
      preds.push(edge.from_step_id);
      predecessors.set(edge.to_step_id, preds);
    }
    
    const runnableSteps: typeof runSteps = [];
    
    if (edges && edges.length > 0) {
      for (const runStep of (runSteps || [])) {
        if (runStep.status !== 'pending') continue;
        
        const predStepIds = predecessors.get(runStep.step_id) || [];
        
        if (predStepIds.length === 0) {
          runnableSteps.push(runStep);
          continue;
        }
        
        let allPredsDone = true;
        for (const predId of predStepIds) {
          const predRunStep = stepIdToRunStep.get(predId);
          if (!predRunStep || !COMPLETED_STATUSES.has(predRunStep.status)) {
            allPredsDone = false;
            break;
          }
        }
        
        if (allPredsDone) {
          runnableSteps.push(runStep);
        }
      }
    } else {
      const sortedSteps = [...(workflowSteps || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      for (const step of sortedSteps) {
        const runStep = stepIdToRunStep.get(step.id);
        if (!runStep) continue;
        
        if (runStep.status === 'pending') {
          runnableSteps.push(runStep);
          break;
        } else if (!TERMINAL_STATUSES.has(runStep.status)) {
          break;
        }
      }
    }
    
    const stepMap = new Map((workflowSteps || []).map(s => [s.id, s]));
    const now = new Date().toISOString();
    let stepsStarted = 0;
    
    for (const runStep of runnableSteps) {
      const step = stepMap.get(runStep.step_id);
      if (!step) continue;
      
      if (step.step_type === 'agent_task') {
        const payload = { ...runStep.input_context, ...(step.config || {}) };
        
        const { data: task, error: taskError } = await supabase
          .from('agent_tasks')
          .insert({
            tenant_id: tenantId,
            agent_id: step.agent_id || 'LUMINA',
            task_type: step.task_type || 'workflow_step',
            payload,
            status: 'pending',
          })
          .select()
          .single();
        
        if (taskError) {
          console.error('Error creating agent task:', taskError);
          continue;
        }
        
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'waiting_for_task',
            agent_task_id: task.id,
            started_at: now,
            updated_at: now,
          })
          .eq('id', runStep.id);
        
        stepsStarted++;
      } else if (step.step_type === 'noop') {
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'completed',
            started_at: now,
            completed_at: now,
            updated_at: now,
          })
          .eq('id', runStep.id);
        
        stepsStarted++;
      } else {
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'running',
            started_at: now,
            updated_at: now,
          })
          .eq('id', runStep.id);
        
        stepsStarted++;
      }
    }
    
    if (run.status === 'pending' && stepsStarted > 0) {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'running',
          started_at: now,
          updated_at: now,
        })
        .eq('id', runId);
    }
    
    const { data: updatedRunSteps } = await supabase
      .from('workflow_run_steps')
      .select('status')
      .eq('run_id', runId);
    
    const allTerminal = (updatedRunSteps || []).every(rs => TERMINAL_STATUSES.has(rs.status));
    const anyFailed = (updatedRunSteps || []).some(rs => rs.status === 'failed');
    
    if (allTerminal) {
      const finalStatus = anyFailed ? 'failed' : 'completed';
      await supabase
        .from('workflow_runs')
        .update({
          status: finalStatus,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', runId);
    }
    
    const { data: finalRun } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .single();
    
    const { data: finalSteps } = await supabase
      .from('workflow_run_steps')
      .select('*')
      .eq('run_id', runId);
    
    return jsonResponse({
      data: {
        run: finalRun,
        steps: finalSteps,
        steps_started: stepsStarted,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error advancing workflow run:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to advance workflow run', 500);
  }
});

/**
 * POST /api/workflow-runs/:id/cancel
 * Cancel a workflow run (founder/brand_admin only)
 */
workflowRunsHandler.post('/:id/cancel', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const runId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required', 403);
  }
  
  try {
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (runError || !run) {
      return errorResponse('NOT_FOUND', 'Workflow run not found', 404);
    }
    
    if (['completed', 'failed', 'canceled'].includes(run.status)) {
      return errorResponse('INVALID_STATE', 'Run is already in terminal state', 400);
    }
    
    const now = new Date().toISOString();
    
    const { data: updatedRun, error: updateError } = await supabase
      .from('workflow_runs')
      .update({
        status: 'canceled',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', runId)
      .select()
      .single();
    
    if (updateError) {
      return errorResponse('UPDATE_ERROR', updateError.message, 500);
    }
    
    await supabase
      .from('workflow_run_steps')
      .update({
        status: 'skipped',
        updated_at: now,
      })
      .eq('run_id', runId)
      .eq('status', 'pending');
    
    return jsonResponse({ data: updatedRun, error: null });
  } catch (err) {
    console.error('Error canceling workflow run:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to cancel workflow run', 500);
  }
});

/**
 * POST /api/workflow-runs/sync-from-tasks
 * Sync workflow step statuses from agent tasks (founder/brand_admin only)
 */
workflowRunsHandler.post('/sync-from-tasks', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required', 403);
  }
  
  try {
    const { data: waitingSteps } = await supabase
      .from('workflow_run_steps')
      .select('id, agent_task_id, run_id')
      .eq('status', 'waiting_for_task')
      .not('agent_task_id', 'is', null);
    
    let updatedCount = 0;
    const runsToAdvance = new Set<string>();
    const now = new Date().toISOString();
    
    for (const step of (waitingSteps || [])) {
      const { data: task } = await supabase
        .from('agent_tasks')
        .select('status, result, error_message')
        .eq('id', step.agent_task_id)
        .single();
      
      if (!task) continue;
      
      if (task.status === 'completed') {
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'completed',
            output_context: task.result,
            completed_at: now,
            updated_at: now,
          })
          .eq('id', step.id);
        
        updatedCount++;
        runsToAdvance.add(step.run_id);
      } else if (task.status === 'failed') {
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'failed',
            error_message: task.error_message,
            completed_at: now,
            updated_at: now,
          })
          .eq('id', step.id);
        
        updatedCount++;
        runsToAdvance.add(step.run_id);
      }
    }
    
    return jsonResponse({
      data: {
        steps_updated: updatedCount,
        runs_to_advance: Array.from(runsToAdvance),
      },
      error: null,
    });
  } catch (err) {
    console.error('Error syncing from tasks:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to sync from tasks', 500);
  }
});

export default workflowRunsHandler;
