import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import type { AuthContext } from '../lib/auth';
import type { AgentTask, CreateAgentTaskInput, AgentTaskListItem } from '../types';
import { jsonResponse } from '../lib/response';
import { isValidAgentId } from './agents';

const app = new Hono<AuthAppEnv>();

const VALID_AGENT_IDS = ['CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed'];

// Supported v1 task types for the Task Execution Engine
const SUPPORTED_V1_TASK_TYPES = [
  'climate.create_missions_from_plan',
  'climate.create_single_mission',
  'zora_shop.create_project',
  'zora_shop.update_product_climate_meta',
];

/**
 * GET /api/agents/tasks
 * List agent tasks with optional filters
 */
app.get('/tasks', async (c) => {
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
  const taskType = c.req.query('task_type');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('agent_tasks')
    .select('id, agent_id, task_type, status, priority, title, command_id, created_at, started_at, completed_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (agentId) {
    query = query.eq('agent_id', agentId.toUpperCase());
  }
  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }
  if (taskType) {
    query = query.eq('task_type', taskType);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching agent tasks:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({
    data: data as AgentTaskListItem[],
    pagination: {
      limit,
      offset,
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    },
  });
});

/**
 * GET /api/agents/tasks/:id
 * Get a single agent task by ID
 */
app.get('/tasks/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const taskId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Task '${taskId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching agent task:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({ data: data as AgentTask });
});

/**
 * POST /api/agents/tasks
 * Create a new agent task
 */
app.post('/tasks', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: CreateAgentTaskInput;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse(
      { error: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
      400
    );
  }

  // Validate required fields
  if (!body.agent_id || !body.task_type || !body.title) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: 'agent_id, task_type, and title are required',
        status: 400,
      },
      400
    );
  }

  // Validate agent_id
  const normalizedAgentId = body.agent_id.toUpperCase();
  if (!VALID_AGENT_IDS.includes(normalizedAgentId)) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: `Invalid agent_id. Must be one of: ${VALID_AGENT_IDS.join(', ')}`,
        status: 400,
      },
      400
    );
  }

  // Create the task
  const taskData = {
    tenant_id: tenantId,
    agent_id: normalizedAgentId,
    task_type: body.task_type,
    title: body.title,
    description: body.description || null,
    payload: body.payload || {},
    priority: body.priority ?? 0,
    status: 'pending',
    created_by_user_id: userId || null,
  };

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) {
    console.error('Error creating agent task:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  // Create journal entry for task creation
  await supabase.from('journal_entries').insert({
    tenant_id: tenantId,
    category: 'agent_action',
    title: `Agent task created: ${body.title}`,
    body: `Task assigned to ${normalizedAgentId} (type: ${body.task_type})`,
    details: {
      event_type: 'agent_task_created',
      task_id: data.id,
      agent_id: normalizedAgentId,
      task_type: body.task_type,
    },
    author: 'system',
  });

  return jsonResponse({ data: data as AgentTask }, 201);
});

/**
 * POST /api/agents/tasks/run-dry
 * Validate task creation without actually creating it (dry run)
 * Returns validation result and what would be created
 */
app.post('/tasks/run-dry', async (c) => {
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  let body: CreateAgentTaskInput;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse(
      { error: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
      400
    );
  }

  const validationErrors: string[] = [];

  // Validate required fields
  if (!body.agent_id) {
    validationErrors.push('agent_id is required');
  }
  if (!body.task_type) {
    validationErrors.push('task_type is required');
  }
  if (!body.title) {
    validationErrors.push('title is required');
  }

  // Validate agent_id
  if (body.agent_id) {
    const normalizedAgentId = body.agent_id.toUpperCase();
    if (!VALID_AGENT_IDS.includes(normalizedAgentId)) {
      validationErrors.push(`Invalid agent_id '${body.agent_id}'. Must be one of: ${VALID_AGENT_IDS.join(', ')}`);
    }
  }

  // Validate priority if provided
  if (body.priority !== undefined && (typeof body.priority !== 'number' || body.priority < 0)) {
    validationErrors.push('priority must be a non-negative number');
  }

  if (validationErrors.length > 0) {
    return jsonResponse({
      valid: false,
      errors: validationErrors,
      message: 'Validation failed',
    });
  }

  // Return what would be created
  const normalizedAgentId = body.agent_id.toUpperCase();
  return jsonResponse({
    valid: true,
    message: 'Task would be created successfully',
    preview: {
      agent_id: normalizedAgentId,
      task_type: body.task_type,
      title: body.title,
      description: body.description || null,
      payload: body.payload || {},
      priority: body.priority ?? 0,
      status: 'pending',
    },
  });
});

/**
 * POST /api/agents/tasks/:id/run
 * Manually trigger execution of a specific task
 * 
 * This endpoint marks the task as "queued for execution" and returns
 * the updated task. For v1, actual execution happens via the Python
 * Task Executor CLI (run-pending-tasks or run-task commands).
 * 
 * In future iterations, this could trigger synchronous execution
 * or enqueue to a background worker.
 */
app.post('/tasks/:id/run', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const auth = c.get('auth') as AuthContext | undefined;
  const taskId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  // Check if user has admin/founder role (only admins can manually run tasks)
  const userRole = auth?.role;
  if (!userRole || !['founder', 'brand_admin'].includes(userRole)) {
    return jsonResponse(
      { error: 'FORBIDDEN', message: 'Only founders and brand admins can manually run tasks', status: 403 },
      403
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch the task
  const { data: task, error: fetchError } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Task '${taskId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching task:', fetchError);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: fetchError.message, status: 500 },
      500
    );
  }

  // Check task status
  if (task.status === 'completed') {
    return jsonResponse(
      { error: 'INVALID_STATE', message: 'Task is already completed', status: 400 },
      400
    );
  }

  if (task.status === 'in_progress') {
    return jsonResponse(
      { error: 'INVALID_STATE', message: 'Task is already in progress', status: 400 },
      400
    );
  }

  // Check if task type is supported by v1 executor
  const isV1Supported = SUPPORTED_V1_TASK_TYPES.includes(task.task_type);

  // For v1, we mark the task as "pending" (ready for execution) and return info
  // The actual execution happens via CLI: python -m zora_core.autonomy.cli run-task <task-id>
  
  // If task is already pending, just return it with execution instructions
  if (task.status === 'pending') {
    // Create journal entry for manual run request
    await supabase.from('journal_entries').insert({
      tenant_id: tenantId,
      category: 'agent_action',
      title: `Manual task execution requested: ${task.title}`,
      body: `Task ${taskId} queued for execution via Task Executor v1.0`,
      details: {
        event_type: 'agent_task_run_requested',
        task_id: taskId,
        agent_id: task.agent_id,
        task_type: task.task_type,
        is_v1_supported: isV1Supported,
        requested_by_user_id: auth?.userId,
      },
      author: 'system',
    });

    return jsonResponse({
      data: task as AgentTask,
      execution: {
        status: 'queued',
        is_v1_supported: isV1Supported,
        message: isV1Supported
          ? 'Task is queued for execution. Run via CLI: python -m zora_core.autonomy.cli run-task ' + taskId
          : 'Task type not supported by v1 executor. Will be processed by legacy Agent Runtime.',
        supported_v1_types: SUPPORTED_V1_TASK_TYPES,
      },
    });
  }

  // If task was failed, reset it to pending for retry
  if (task.status === 'failed') {
    const { data: updatedTask, error: updateError } = await supabase
      .from('agent_tasks')
      .update({
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error resetting task:', updateError);
      return jsonResponse(
        { error: 'DATABASE_ERROR', message: updateError.message, status: 500 },
        500
      );
    }

    // Create journal entry for task retry
    await supabase.from('journal_entries').insert({
      tenant_id: tenantId,
      category: 'agent_action',
      title: `Task retry requested: ${task.title}`,
      body: `Task ${taskId} reset to pending for retry via Task Executor v1.0`,
      details: {
        event_type: 'agent_task_retry_requested',
        task_id: taskId,
        agent_id: task.agent_id,
        task_type: task.task_type,
        previous_status: 'failed',
        is_v1_supported: isV1Supported,
        requested_by_user_id: auth?.userId,
      },
      author: 'system',
    });

    return jsonResponse({
      data: updatedTask as AgentTask,
      execution: {
        status: 'reset_to_pending',
        is_v1_supported: isV1Supported,
        message: isV1Supported
          ? 'Task reset to pending for retry. Run via CLI: python -m zora_core.autonomy.cli run-task ' + taskId
          : 'Task type not supported by v1 executor. Will be processed by legacy Agent Runtime.',
        supported_v1_types: SUPPORTED_V1_TASK_TYPES,
      },
    });
  }

  // Fallback (shouldn't reach here)
  return jsonResponse({
    data: task as AgentTask,
    execution: {
      status: 'unknown',
      message: `Task is in unexpected state: ${task.status}`,
    },
  });
});

/**
 * GET /api/agents/tasks/types
 * List supported task types for the Task Executor v1.0
 */
app.get('/tasks/types', async (c) => {
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  return jsonResponse({
    data: {
      v1_supported: SUPPORTED_V1_TASK_TYPES,
      categories: {
        climate_os: [
          {
            type: 'climate.create_missions_from_plan',
            description: 'Create missions from a previously suggested weekly plan',
            payload_schema: {
              profile_id: 'UUID of the climate profile',
              plan_id: 'UUID of the climate plan to apply',
            },
          },
          {
            type: 'climate.create_single_mission',
            description: 'Create a single mission for a given profile',
            payload_schema: {
              profile_id: 'UUID of the climate profile',
              title: 'Mission title',
              category: 'Mission category (energy, transport, food, etc.)',
              estimated_impact_kgco2: 'Estimated CO2 impact (optional)',
              due_date: 'Due date (optional)',
              notes: 'Additional notes (optional)',
            },
          },
        ],
        zora_shop: [
          {
            type: 'zora_shop.create_project',
            description: 'Create a new ZORA SHOP Project from a structured brief',
            payload_schema: {
              title: 'Project title',
              description: 'Project description',
              primary_brand_id: 'UUID of the primary brand',
              secondary_brand_id: 'UUID of the secondary brand (optional)',
              status: 'Project status (default: idea)',
              theme: 'Project theme (optional)',
              target_launch_date: 'Target launch date (optional)',
            },
          },
          {
            type: 'zora_shop.update_product_climate_meta',
            description: 'Update the climate metadata for a given product',
            payload_schema: {
              product_id: 'UUID of the product',
              climate_label: 'Climate label (low_impact, climate_neutral, climate_positive)',
              estimated_impact_kgco2: 'Estimated CO2 impact (optional)',
              certifications: 'Certifications string (optional)',
              notes: 'Additional notes (optional)',
            },
          },
        ],
      },
    },
  });
});

export default app;
