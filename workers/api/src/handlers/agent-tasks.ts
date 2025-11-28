import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import type { AgentTask, CreateAgentTaskInput, AgentTaskListItem } from '../types';
import { jsonResponse } from '../lib/response';
import { isValidAgentId } from './agents';

const app = new Hono<AuthAppEnv>();

const VALID_AGENT_IDS = ['CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed'];

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
    .select('id, agent_id, task_type, status, priority, title, created_at, started_at, completed_at', { count: 'exact' })
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

export default app;
