/**
 * Workflow API handlers for ZORA CORE
 * 
 * Workflow / DAG Engine v1.0 (Iteration 00D5)
 * 
 * These endpoints provide workflow management and execution capabilities
 * for system orchestration, agent tasks integration, and multi-step processes.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import type { AuthContext } from '../lib/auth';

const workflowsHandler = new Hono<AuthAppEnv>();

// =============================================================================
// Types
// =============================================================================

interface WorkflowStep {
  key: string;
  name: string;
  description?: string;
  step_type: string;
  agent_id?: string;
  task_type?: string;
  config?: Record<string, unknown>;
  order_index?: number;
}

interface WorkflowEdge {
  from_step_key: string;
  to_step_key: string;
  condition?: string;
}

interface CreateWorkflowBody {
  key: string;
  name: string;
  description?: string;
  category?: string;
  tenant_id?: string;
  steps?: WorkflowStep[];
  edges?: WorkflowEdge[];
}

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

interface CreateRunBody {
  context?: Record<string, unknown>;
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Middleware to verify user has appropriate access
 */
workflowsHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  await next();
});

// =============================================================================
// Workflow Definition Endpoints
// =============================================================================

/**
 * GET /api/workflows
 * List workflows visible to the current tenant (global + tenant-specific)
 */
workflowsHandler.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  const category = c.req.query('category');
  const active = c.req.query('active');
  
  try {
    let query = supabase
      .from('workflows')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('created_at', { ascending: false });
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }
    
    const { data: workflows, error } = await query;
    
    if (error) {
      return errorResponse('QUERY_ERROR', error.message, 500);
    }
    
    return jsonResponse({ data: workflows, error: null });
  } catch (err) {
    console.error('Error listing workflows:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to list workflows', 500);
  }
});

/**
 * GET /api/workflows/:id
 * Get workflow detail including steps and edges
 */
workflowsHandler.get('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const workflowId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  try {
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .single();
    
    if (workflowError || !workflow) {
      return errorResponse('NOT_FOUND', 'Workflow not found', 404);
    }
    
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('order_index');
    
    const { data: edges } = await supabase
      .from('workflow_step_edges')
      .select('*')
      .eq('workflow_id', workflowId);
    
    return jsonResponse({
      data: {
        ...workflow,
        steps: steps || [],
        edges: edges || [],
      },
      error: null,
    });
  } catch (err) {
    console.error('Error getting workflow:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to get workflow', 500);
  }
});

/**
 * POST /api/workflows
 * Create a new workflow (founder/brand_admin only)
 */
workflowsHandler.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required', 403);
  }
  
  let body: CreateWorkflowBody;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!body.key || !body.name) {
    return errorResponse('VALIDATION_ERROR', 'key and name are required', 400);
  }
  
  try {
    const workflowTenantId = body.tenant_id === null ? null : (body.tenant_id || tenantId);
    
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        tenant_id: workflowTenantId,
        key: body.key,
        name: body.name,
        description: body.description,
        category: body.category,
        is_active: true,
      })
      .select()
      .single();
    
    if (workflowError) {
      if (workflowError.code === '23505') {
        return errorResponse('DUPLICATE_KEY', 'Workflow with this key already exists', 409);
      }
      return errorResponse('INSERT_ERROR', workflowError.message, 500);
    }
    
    const stepIdMap: Record<string, string> = {};
    
    if (body.steps && body.steps.length > 0) {
      for (let i = 0; i < body.steps.length; i++) {
        const step = body.steps[i];
        const { data: insertedStep, error: stepError } = await supabase
          .from('workflow_steps')
          .insert({
            workflow_id: workflow.id,
            key: step.key,
            name: step.name,
            description: step.description,
            step_type: step.step_type,
            agent_id: step.agent_id,
            task_type: step.task_type,
            config: step.config || {},
            order_index: step.order_index ?? i,
          })
          .select()
          .single();
        
        if (stepError) {
          console.error('Error inserting step:', stepError);
          continue;
        }
        
        stepIdMap[step.key] = insertedStep.id;
      }
    }
    
    if (body.edges && body.edges.length > 0) {
      for (const edge of body.edges) {
        const fromStepId = stepIdMap[edge.from_step_key];
        const toStepId = stepIdMap[edge.to_step_key];
        
        if (!fromStepId || !toStepId) {
          console.warn(`Edge references unknown step: ${edge.from_step_key} -> ${edge.to_step_key}`);
          continue;
        }
        
        await supabase
          .from('workflow_step_edges')
          .insert({
            workflow_id: workflow.id,
            from_step_id: fromStepId,
            to_step_id: toStepId,
            condition: edge.condition,
          });
      }
    }
    
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflow.id)
      .order('order_index');
    
    const { data: edges } = await supabase
      .from('workflow_step_edges')
      .select('*')
      .eq('workflow_id', workflow.id);
    
    return jsonResponse({
      data: {
        ...workflow,
        steps: steps || [],
        edges: edges || [],
      },
      error: null,
    }, 201);
  } catch (err) {
    console.error('Error creating workflow:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to create workflow', 500);
  }
});

/**
 * PATCH /api/workflows/:id
 * Update a workflow (founder/brand_admin only)
 */
workflowsHandler.patch('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const workflowId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required', 403);
  }
  
  let body: UpdateWorkflowBody;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  try {
    const { data: existing, error: existingError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .single();
    
    if (existingError || !existing) {
      return errorResponse('NOT_FOUND', 'Workflow not found', 404);
    }
    
    if (existing.tenant_id === null && auth.role !== 'founder') {
      return errorResponse('FORBIDDEN', 'Only founder can modify global workflows', 403);
    }
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    
    const { data: workflow, error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', workflowId)
      .select()
      .single();
    
    if (updateError) {
      return errorResponse('UPDATE_ERROR', updateError.message, 500);
    }
    
    return jsonResponse({ data: workflow, error: null });
  } catch (err) {
    console.error('Error updating workflow:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to update workflow', 500);
  }
});

/**
 * POST /api/workflows/:id/run
 * Create and start a workflow run
 */
workflowsHandler.post('/:id/run', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const workflowId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  let body: CreateRunBody;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  
  try {
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq('is_active', true)
      .single();
    
    if (workflowError || !workflow) {
      return errorResponse('NOT_FOUND', 'Workflow not found or inactive', 404);
    }
    
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        tenant_id: tenantId,
        workflow_id: workflowId,
        triggered_by_user_id: auth.userId,
        status: 'pending',
        context: body.context || {},
      })
      .select()
      .single();
    
    if (runError) {
      return errorResponse('INSERT_ERROR', runError.message, 500);
    }
    
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('order_index');
    
    if (steps && steps.length > 0) {
      const runSteps = steps.map(step => ({
        run_id: run.id,
        step_id: step.id,
        status: 'pending',
        input_context: body.context || {},
      }));
      
      await supabase.from('workflow_run_steps').insert(runSteps);
    }
    
    const { data: runSteps } = await supabase
      .from('workflow_run_steps')
      .select('*')
      .eq('run_id', run.id);
    
    return jsonResponse({
      data: {
        ...run,
        steps: runSteps || [],
      },
      error: null,
    }, 201);
  } catch (err) {
    console.error('Error creating workflow run:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to create workflow run', 500);
  }
});

export default workflowsHandler;
