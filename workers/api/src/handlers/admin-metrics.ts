/**
 * Admin Metrics API handlers for ZORA CORE
 * 
 * Observability & System Metrics v1 (Iteration 00B6)
 * 
 * These endpoints provide system metrics and autonomy health status
 * for tenant administrators (founder/brand_admin roles).
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import type { AuthContext } from '../lib/auth';

const adminMetricsHandler = new Hono<AuthAppEnv>();

/**
 * Middleware to verify user has admin access (founder or brand_admin)
 */
adminMetricsHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  // Only founder and brand_admin can access admin metrics
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required (founder or brand_admin role)', 403);
  }
  
  await next();
});

/**
 * GET /api/admin/system-metrics
 * Returns tenant-scoped system metrics snapshot
 */
adminMetricsHandler.get('/system-metrics', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  try {
    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();
    
    if (tenantError || !tenant) {
      return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }
    
    // Get user count for tenant
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    // Get climate profile count
    const { count: profileCount } = await supabase
      .from('climate_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    // Get climate missions with status breakdown
    const { data: missions } = await supabase
      .from('climate_missions')
      .select('status, estimated_impact_kgco2')
      .eq('tenant_id', tenantId);
    
    const missionStats = {
      total_missions: missions?.length || 0,
      missions_completed: missions?.filter(m => m.status === 'completed').length || 0,
      missions_in_progress: missions?.filter(m => m.status === 'in_progress').length || 0,
      missions_planned: missions?.filter(m => m.status === 'planned').length || 0,
      total_estimated_impact_kgco2: missions?.reduce((sum, m) => sum + (m.estimated_impact_kgco2 || 0), 0) || 0,
    };
    
    // Get ZORA SHOP brand count
    const { count: brandCount } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    // Get ZORA SHOP product count
    const { count: productCount } = await supabase
      .from('shop_products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    // Get ZORA SHOP projects with status breakdown
    const { data: projects } = await supabase
      .from('zora_shop_projects')
      .select('status')
      .eq('tenant_id', tenantId);
    
    const projectsByStatus: Record<string, number> = {};
    projects?.forEach(p => {
      projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
    });
    
    // Get agent commands with status breakdown
    const { data: commands } = await supabase
      .from('agent_commands')
      .select('status')
      .eq('tenant_id', tenantId);
    
    const commandsByStatus: Record<string, number> = {};
    commands?.forEach(cmd => {
      commandsByStatus[cmd.status] = (commandsByStatus[cmd.status] || 0) + 1;
    });
    
    // Get agent tasks with status breakdown
    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('status, requires_approval, approved_by_user_id, rejected_by_user_id')
      .eq('tenant_id', tenantId);
    
    const tasksByStatus: Record<string, number> = {};
    tasks?.forEach(t => {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    });
    
    // Count tasks requiring approval (pending, requires_approval=true, not yet decided)
    const tasksRequiringApproval = tasks?.filter(
      t => t.status === 'pending' && 
           t.requires_approval && 
           !t.approved_by_user_id && 
           !t.rejected_by_user_id
    ).length || 0;
    
    // Get autonomy schedules
    const { data: schedules } = await supabase
      .from('autonomy_schedules')
      .select('enabled, next_run_at')
      .eq('tenant_id', tenantId);
    
    const now = new Date().toISOString();
    const schedulesDueNow = schedules?.filter(
      s => s.enabled && s.next_run_at && s.next_run_at <= now
    ).length || 0;
    
    const response = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      users: {
        total_users: userCount || 0,
      },
      climate: {
        total_profiles: profileCount || 0,
        ...missionStats,
      },
      zora_shop: {
        total_brands: brandCount || 0,
        total_products: productCount || 0,
        total_projects: projects?.length || 0,
        projects_by_status: projectsByStatus,
      },
      autonomy: {
        total_agent_commands: commands?.length || 0,
        commands_by_status: commandsByStatus,
        total_agent_tasks: tasks?.length || 0,
        tasks_by_status: tasksByStatus,
        tasks_requiring_approval: tasksRequiringApproval,
        total_schedules: schedules?.length || 0,
        schedules_enabled: schedules?.filter(s => s.enabled).length || 0,
        schedules_due_now: schedulesDueNow,
      },
    };
    
    return jsonResponse(response);
  } catch (err) {
    console.error('Error fetching system metrics:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch system metrics', 500);
  }
});

/**
 * GET /api/admin/autonomy-status
 * Returns detailed autonomy health status for the current tenant
 */
adminMetricsHandler.get('/autonomy-status', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  try {
    // Get pending tasks breakdown
    const { data: pendingTasks } = await supabase
      .from('agent_tasks')
      .select('id, task_type, requires_approval, approved_by_user_id, rejected_by_user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');
    
    const pendingTotal = pendingTasks?.length || 0;
    
    // Pending auto-executable: requires_approval=false OR already approved
    const pendingAutoExecutable = pendingTasks?.filter(
      t => !t.requires_approval || t.approved_by_user_id
    ).length || 0;
    
    // Pending awaiting approval: requires_approval=true AND not yet decided
    const pendingAwaitingApproval = pendingTasks?.filter(
      t => t.requires_approval && !t.approved_by_user_id && !t.rejected_by_user_id
    ).length || 0;
    
    // Get recent failed tasks (last 10)
    const { data: recentFailed } = await supabase
      .from('agent_tasks')
      .select('id, task_type, error_message, updated_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    // Get schedules info
    const { data: allSchedules } = await supabase
      .from('autonomy_schedules')
      .select('id, schedule_type, enabled, next_run_at, last_run_at')
      .eq('tenant_id', tenantId);
    
    const now = new Date().toISOString();
    const schedulesDueNow = allSchedules?.filter(
      s => s.enabled && s.next_run_at && s.next_run_at <= now
    ).length || 0;
    
    // Get recently run schedules (last 10 with last_run_at)
    const recentlyRun = allSchedules
      ?.filter(s => s.last_run_at)
      .sort((a, b) => new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime())
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        schedule_type: s.schedule_type,
        last_run_at: s.last_run_at,
      })) || [];
    
    // Get recent commands (last 10)
    const { data: recentCommands } = await supabase
      .from('agent_commands')
      .select('id, raw_prompt, status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const response = {
      tasks: {
        pending_total: pendingTotal,
        pending_auto_executable: pendingAutoExecutable,
        pending_awaiting_approval: pendingAwaitingApproval,
        recent_failed: recentFailed?.map(t => ({
          id: t.id,
          task_type: t.task_type,
          error_message: t.error_message,
          updated_at: t.updated_at,
        })) || [],
      },
      schedules: {
        total: allSchedules?.length || 0,
        enabled: allSchedules?.filter(s => s.enabled).length || 0,
        due_now: schedulesDueNow,
        recently_run: recentlyRun,
      },
      commands: {
        recent_commands: recentCommands?.map(cmd => ({
          id: cmd.id,
          command_text: cmd.raw_prompt?.substring(0, 100) + (cmd.raw_prompt?.length > 100 ? '...' : ''),
          status: cmd.status,
          created_at: cmd.created_at,
        })) || [],
      },
    };
    
    return jsonResponse(response);
  } catch (err) {
    console.error('Error fetching autonomy status:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch autonomy status', 500);
  }
});

export default adminMetricsHandler;
