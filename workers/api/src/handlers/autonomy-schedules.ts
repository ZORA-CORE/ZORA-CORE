import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import type { AuthContext } from '../lib/auth';
import type { AutonomySchedule, CreateAutonomyScheduleInput, UpdateAutonomyScheduleInput, AutonomyScheduleListItem } from '../types';
import { jsonResponse } from '../lib/response';

const app = new Hono<AuthAppEnv>();

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const VALID_SCHEDULE_TYPES = [
  'climate.weekly_plan_suggest',
  'climate.mission_reminder',
  'zora_shop.project_status_check',
  'odin.auto_bootstrap_check',
];

/**
 * GET /api/autonomy/schedules
 * List autonomy schedules for the current tenant
 */
app.get('/', async (c) => {
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
  const scheduleType = c.req.query('schedule_type');
  const enabled = c.req.query('enabled');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('autonomy_schedules')
    .select('id, profile_id, schedule_type, frequency, enabled, next_run_at, last_run_at, created_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('next_run_at', { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (scheduleType) {
    query = query.eq('schedule_type', scheduleType);
  }
  if (enabled !== undefined) {
    query = query.eq('enabled', enabled === 'true');
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching autonomy schedules:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({
    data: data as AutonomyScheduleListItem[],
    pagination: {
      limit,
      offset,
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    },
  });
});

/**
 * GET /api/autonomy/schedules/:id
 * Get a single autonomy schedule by ID
 */
app.get('/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const scheduleId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('autonomy_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Schedule '${scheduleId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching autonomy schedule:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({ data: data as AutonomySchedule });
});

/**
 * POST /api/autonomy/schedules
 * Create a new autonomy schedule
 */
app.post('/', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const auth = c.get('auth') as AuthContext | undefined;

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  // Check if user has admin/founder role
  const userRole = auth?.role;
  if (!userRole || !['founder', 'brand_admin'].includes(userRole)) {
    return jsonResponse(
      { error: 'FORBIDDEN', message: 'Only founders and brand admins can create schedules', status: 403 },
      403
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: CreateAutonomyScheduleInput;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse(
      { error: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
      400
    );
  }

  // Validate required fields
  if (!body.schedule_type || !body.frequency || !body.next_run_at) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: 'schedule_type, frequency, and next_run_at are required',
        status: 400,
      },
      400
    );
  }

  // Validate frequency
  if (!VALID_FREQUENCIES.includes(body.frequency)) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
        status: 400,
      },
      400
    );
  }

  // Validate profile_id if provided
  if (body.profile_id) {
    const { data: profile, error: profileError } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('id', body.profile_id)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return jsonResponse(
        { error: 'VALIDATION_ERROR', message: 'Invalid profile_id or profile not found', status: 400 },
        400
      );
    }
  }

  // Create the schedule
  const scheduleData = {
    tenant_id: tenantId,
    profile_id: body.profile_id || null,
    schedule_type: body.schedule_type,
    frequency: body.frequency,
    cron_hint: body.cron_hint || null,
    enabled: body.enabled ?? true,
    next_run_at: body.next_run_at,
    config: body.config || {},
  };

  const { data, error } = await supabase
    .from('autonomy_schedules')
    .insert(scheduleData)
    .select()
    .single();

  if (error) {
    console.error('Error creating autonomy schedule:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  // Create journal entry for schedule creation
  await supabase.from('journal_entries').insert({
    tenant_id: tenantId,
    category: 'autonomy',
    title: `Autonomy schedule created: ${body.schedule_type}`,
    body: `Schedule created with frequency: ${body.frequency}`,
    details: {
      event_type: 'autonomy_schedule_created',
      schedule_id: data.id,
      schedule_type: body.schedule_type,
      frequency: body.frequency,
      profile_id: body.profile_id || null,
      created_by_user_id: auth?.userId,
    },
    author: 'system',
  });

  return jsonResponse({ data: data as AutonomySchedule }, 201);
});

/**
 * PATCH /api/autonomy/schedules/:id
 * Update an existing autonomy schedule
 */
app.patch('/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const auth = c.get('auth') as AuthContext | undefined;
  const scheduleId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  // Check if user has admin/founder role
  const userRole = auth?.role;
  if (!userRole || !['founder', 'brand_admin'].includes(userRole)) {
    return jsonResponse(
      { error: 'FORBIDDEN', message: 'Only founders and brand admins can update schedules', status: 403 },
      403
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Check if schedule exists
  const { data: existingSchedule, error: fetchError } = await supabase
    .from('autonomy_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Schedule '${scheduleId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching schedule:', fetchError);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: fetchError.message, status: 500 },
      500
    );
  }

  let body: UpdateAutonomyScheduleInput;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse(
      { error: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
      400
    );
  }

  // Validate frequency if provided
  if (body.frequency && !VALID_FREQUENCIES.includes(body.frequency)) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
        status: 400,
      },
      400
    );
  }

  // Validate profile_id if provided
  if (body.profile_id) {
    const { data: profile, error: profileError } = await supabase
      .from('climate_profiles')
      .select('id')
      .eq('id', body.profile_id)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile) {
      return jsonResponse(
        { error: 'VALIDATION_ERROR', message: 'Invalid profile_id or profile not found', status: 400 },
        400
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.profile_id !== undefined) updateData.profile_id = body.profile_id;
  if (body.schedule_type !== undefined) updateData.schedule_type = body.schedule_type;
  if (body.frequency !== undefined) updateData.frequency = body.frequency;
  if (body.cron_hint !== undefined) updateData.cron_hint = body.cron_hint;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;
  if (body.next_run_at !== undefined) updateData.next_run_at = body.next_run_at;
  if (body.config !== undefined) updateData.config = body.config;

  const { data, error } = await supabase
    .from('autonomy_schedules')
    .update(updateData)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating autonomy schedule:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  // Create journal entry for schedule update
  await supabase.from('journal_entries').insert({
    tenant_id: tenantId,
    category: 'autonomy',
    title: `Autonomy schedule updated: ${data.schedule_type}`,
    body: `Schedule ${scheduleId} updated`,
    details: {
      event_type: 'autonomy_schedule_updated',
      schedule_id: scheduleId,
      changes: body,
      updated_by_user_id: auth?.userId,
    },
    author: 'system',
  });

  return jsonResponse({ data: data as AutonomySchedule });
});

/**
 * DELETE /api/autonomy/schedules/:id
 * Delete an autonomy schedule
 */
app.delete('/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const auth = c.get('auth') as AuthContext | undefined;
  const scheduleId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  // Check if user has admin/founder role
  const userRole = auth?.role;
  if (!userRole || !['founder', 'brand_admin'].includes(userRole)) {
    return jsonResponse(
      { error: 'FORBIDDEN', message: 'Only founders and brand admins can delete schedules', status: 403 },
      403
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Check if schedule exists
  const { data: existingSchedule, error: fetchError } = await supabase
    .from('autonomy_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Schedule '${scheduleId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching schedule:', fetchError);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: fetchError.message, status: 500 },
      500
    );
  }

  const { error } = await supabase
    .from('autonomy_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error('Error deleting autonomy schedule:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  // Create journal entry for schedule deletion
  await supabase.from('journal_entries').insert({
    tenant_id: tenantId,
    category: 'autonomy',
    title: `Autonomy schedule deleted: ${existingSchedule.schedule_type}`,
    body: `Schedule ${scheduleId} deleted`,
    details: {
      event_type: 'autonomy_schedule_deleted',
      schedule_id: scheduleId,
      schedule_type: existingSchedule.schedule_type,
      deleted_by_user_id: auth?.userId,
    },
    author: 'system',
  });

  return jsonResponse({ message: 'Schedule deleted successfully' });
});

/**
 * GET /api/autonomy/schedules/types
 * List supported schedule types
 */
app.get('/types', async (c) => {
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

    return jsonResponse({
      data: {
        schedule_types: VALID_SCHEDULE_TYPES,
        frequencies: VALID_FREQUENCIES,
        descriptions: {
          'climate.weekly_plan_suggest': 'Suggest a weekly climate plan for a profile',
          'climate.mission_reminder': 'Send reminders for upcoming or overdue missions',
          'zora_shop.project_status_check': 'Check and update ZORA SHOP project statuses',
          'odin.auto_bootstrap_check': 'Check knowledge thresholds and auto-bootstrap ODIN domains if needed',
        },
      },
    });
});

export default app;
