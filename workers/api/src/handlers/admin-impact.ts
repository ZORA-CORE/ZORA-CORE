/**
 * Admin Impact API handlers for ZORA CORE
 * 
 * Global Impact & Data Aggregates v1.0 (Iteration 00D4)
 * 
 * These endpoints provide tenant-wide impact metrics aggregated across all
 * ZORA CORE modules (Climate OS, GOES GREEN, ZORA SHOP, Foundation, Academy, Autonomy).
 * 
 * Designed to answer questions like:
 * - "How much climate impact does this tenant have?"
 * - "How is this evolving over time?"
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import type { AuthContext } from '../lib/auth';

const adminImpactHandler = new Hono<AuthAppEnv>();

/**
 * Middleware to verify user has admin access (founder or brand_admin)
 */
adminImpactHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  // Only founder and brand_admin can access impact metrics
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return errorResponse('FORBIDDEN', 'Admin access required (founder or brand_admin role)', 403);
  }
  
  await next();
});

// =============================================================================
// Impact Metrics Types
// =============================================================================

interface ClimateOSMetrics {
  climate_profiles_total: number;
  climate_missions_total: number;
  climate_missions_completed: number;
  climate_missions_in_progress: number;
  climate_missions_planned: number;
  climate_missions_estimated_impact_kgco2_total: number;
  climate_missions_completed_impact_kgco2_total: number;
}

interface GoesGreenMetrics {
  goes_green_profiles_total: number;
  goes_green_actions_total: number;
  goes_green_actions_completed: number;
  goes_green_estimated_savings_kgco2_total: number;
}

interface ZoraShopMetrics {
  zora_shop_brands_total: number;
  zora_shop_products_total: number;
  zora_shop_projects_total: number;
  zora_shop_projects_launched: number;
  zora_shop_orders_total: number;
  zora_shop_gmv_total: number;
  zora_shop_commission_total: number;
}

interface FoundationMetrics {
  foundation_projects_total: number;
  foundation_contributions_total_amount: number;
  foundation_impact_kgco2_total: number;
}

interface AcademyMetrics {
  academy_topics_total: number;
  academy_lessons_total: number;
  academy_learning_paths_total: number;
  academy_user_lessons_completed_total: number;
  academy_user_paths_completed_total: number;
}

interface AutonomyMetrics {
  autonomy_commands_total: number;
  autonomy_tasks_total: number;
  autonomy_tasks_completed: number;
  autonomy_tasks_failed: number;
  autonomy_schedules_total: number;
  autonomy_tasks_pending_approval: number;
}

interface ImpactSummary {
  tenant_id: string;
  computed_at: string;
  climate_os: ClimateOSMetrics;
  goes_green: GoesGreenMetrics;
  zora_shop: ZoraShopMetrics;
  foundation: FoundationMetrics;
  academy: AcademyMetrics;
  autonomy: AutonomyMetrics;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function computeClimateOSMetrics(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<ClimateOSMetrics> {
  const metrics: ClimateOSMetrics = {
    climate_profiles_total: 0,
    climate_missions_total: 0,
    climate_missions_completed: 0,
    climate_missions_in_progress: 0,
    climate_missions_planned: 0,
    climate_missions_estimated_impact_kgco2_total: 0,
    climate_missions_completed_impact_kgco2_total: 0,
  };
  
  try {
    const { count: profileCount } = await supabase
      .from('climate_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.climate_profiles_total = profileCount || 0;
  } catch (e) {
    console.warn('Error fetching climate_profiles:', e);
  }
  
  try {
    const { data: missions } = await supabase
      .from('climate_missions')
      .select('status, estimated_impact_kgco2')
      .eq('tenant_id', tenantId);
    
    if (missions) {
      metrics.climate_missions_total = missions.length;
      for (const mission of missions) {
        const estimated = mission.estimated_impact_kgco2 || 0;
        metrics.climate_missions_estimated_impact_kgco2_total += estimated;
        
        if (mission.status === 'completed') {
          metrics.climate_missions_completed += 1;
          metrics.climate_missions_completed_impact_kgco2_total += estimated;
        } else if (mission.status === 'in_progress') {
          metrics.climate_missions_in_progress += 1;
        } else if (mission.status === 'planned') {
          metrics.climate_missions_planned += 1;
        }
      }
    }
  } catch (e) {
    console.warn('Error fetching climate_missions:', e);
  }
  
  return metrics;
}

async function computeGoesGreenMetrics(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<GoesGreenMetrics> {
  const metrics: GoesGreenMetrics = {
    goes_green_profiles_total: 0,
    goes_green_actions_total: 0,
    goes_green_actions_completed: 0,
    goes_green_estimated_savings_kgco2_total: 0,
  };
  
  try {
    const { count: profileCount } = await supabase
      .from('goes_green_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.goes_green_profiles_total = profileCount || 0;
  } catch (e) {
    console.warn('Error fetching goes_green_profiles:', e);
  }
  
  try {
    const { data: actions } = await supabase
      .from('goes_green_actions')
      .select('status, estimated_savings_kgco2')
      .eq('tenant_id', tenantId);
    
    if (actions) {
      metrics.goes_green_actions_total = actions.length;
      for (const action of actions) {
        const estimated = action.estimated_savings_kgco2 || 0;
        metrics.goes_green_estimated_savings_kgco2_total += estimated;
        
        if (action.status === 'completed') {
          metrics.goes_green_actions_completed += 1;
        }
      }
    }
  } catch (e) {
    console.warn('Error fetching goes_green_actions:', e);
  }
  
  return metrics;
}

async function computeZoraShopMetrics(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<ZoraShopMetrics> {
  const metrics: ZoraShopMetrics = {
    zora_shop_brands_total: 0,
    zora_shop_products_total: 0,
    zora_shop_projects_total: 0,
    zora_shop_projects_launched: 0,
    zora_shop_orders_total: 0,
    zora_shop_gmv_total: 0,
    zora_shop_commission_total: 0,
  };
  
  try {
    const { count: brandCount } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.zora_shop_brands_total = brandCount || 0;
  } catch (e) {
    console.warn('Error fetching brands:', e);
  }
  
  try {
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.zora_shop_products_total = productCount || 0;
  } catch (e) {
    console.warn('Error fetching products:', e);
  }
  
  try {
    const { data: projects } = await supabase
      .from('zora_shop_projects')
      .select('status')
      .eq('tenant_id', tenantId);
    
    if (projects) {
      metrics.zora_shop_projects_total = projects.length;
      metrics.zora_shop_projects_launched = projects.filter(p => p.status === 'launched').length;
    }
  } catch (e) {
    console.warn('Error fetching zora_shop_projects:', e);
  }
  
  try {
    const { data: orders } = await supabase
      .from('zora_shop_orders')
      .select('total_amount, commission_amount')
      .eq('tenant_id', tenantId);
    
    if (orders) {
      metrics.zora_shop_orders_total = orders.length;
      for (const order of orders) {
        metrics.zora_shop_gmv_total += order.total_amount || 0;
        metrics.zora_shop_commission_total += order.commission_amount || 0;
      }
    }
  } catch (e) {
    console.warn('Error fetching zora_shop_orders:', e);
  }
  
  return metrics;
}

async function computeFoundationMetrics(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<FoundationMetrics> {
  const metrics: FoundationMetrics = {
    foundation_projects_total: 0,
    foundation_contributions_total_amount: 0,
    foundation_impact_kgco2_total: 0,
  };
  
  try {
    const { count: projectCount } = await supabase
      .from('foundation_projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.foundation_projects_total = projectCount || 0;
  } catch (e) {
    console.warn('Error fetching foundation_projects:', e);
  }
  
  try {
    const { data: contributions } = await supabase
      .from('foundation_contributions')
      .select('amount_cents')
      .eq('tenant_id', tenantId);
    
    if (contributions) {
      for (const contribution of contributions) {
        metrics.foundation_contributions_total_amount += (contribution.amount_cents || 0) / 100;
      }
    }
  } catch (e) {
    console.warn('Error fetching foundation_contributions:', e);
  }
  
  try {
    const { data: impactLogs } = await supabase
      .from('foundation_impact_log')
      .select('impact_kgco2')
      .eq('tenant_id', tenantId);
    
    if (impactLogs) {
      for (const log of impactLogs) {
        metrics.foundation_impact_kgco2_total += log.impact_kgco2 || 0;
      }
    }
  } catch (e) {
    console.warn('Error fetching foundation_impact_log:', e);
  }
  
  return metrics;
}

async function computeAcademyMetrics(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<AcademyMetrics> {
  const metrics: AcademyMetrics = {
    academy_topics_total: 0,
    academy_lessons_total: 0,
    academy_learning_paths_total: 0,
    academy_user_lessons_completed_total: 0,
    academy_user_paths_completed_total: 0,
  };
  
  try {
    const { count: topicCount } = await supabase
      .from('academy_topics')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.academy_topics_total = topicCount || 0;
  } catch (e) {
    console.warn('Error fetching academy_topics:', e);
  }
  
  try {
    const { count: lessonCount } = await supabase
      .from('academy_lessons')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.academy_lessons_total = lessonCount || 0;
  } catch (e) {
    console.warn('Error fetching academy_lessons:', e);
  }
  
  try {
    const { count: pathCount } = await supabase
      .from('academy_learning_paths')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.academy_learning_paths_total = pathCount || 0;
  } catch (e) {
    console.warn('Error fetching academy_learning_paths:', e);
  }
  
  try {
    const { data: progress } = await supabase
      .from('academy_user_progress')
      .select('lesson_id, learning_path_id, status')
      .eq('tenant_id', tenantId);
    
    if (progress) {
      for (const record of progress) {
        if (record.status === 'completed') {
          if (record.lesson_id) {
            metrics.academy_user_lessons_completed_total += 1;
          }
          if (record.learning_path_id && !record.lesson_id) {
            metrics.academy_user_paths_completed_total += 1;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error fetching academy_user_progress:', e);
  }
  
  return metrics;
}

async function computeAutonomyMetrics(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<AutonomyMetrics> {
  const metrics: AutonomyMetrics = {
    autonomy_commands_total: 0,
    autonomy_tasks_total: 0,
    autonomy_tasks_completed: 0,
    autonomy_tasks_failed: 0,
    autonomy_schedules_total: 0,
    autonomy_tasks_pending_approval: 0,
  };
  
  try {
    const { count: commandCount } = await supabase
      .from('agent_commands')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.autonomy_commands_total = commandCount || 0;
  } catch (e) {
    console.warn('Error fetching agent_commands:', e);
  }
  
  try {
    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('status, requires_approval, approved_at')
      .eq('tenant_id', tenantId);
    
    if (tasks) {
      metrics.autonomy_tasks_total = tasks.length;
      for (const task of tasks) {
        if (task.status === 'completed') {
          metrics.autonomy_tasks_completed += 1;
        } else if (task.status === 'failed') {
          metrics.autonomy_tasks_failed += 1;
        }
        
        if (task.requires_approval && !task.approved_at && task.status === 'pending') {
          metrics.autonomy_tasks_pending_approval += 1;
        }
      }
    }
  } catch (e) {
    console.warn('Error fetching agent_tasks:', e);
  }
  
  try {
    const { count: scheduleCount } = await supabase
      .from('agent_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    metrics.autonomy_schedules_total = scheduleCount || 0;
  } catch (e) {
    console.warn('Error fetching agent_schedules:', e);
  }
  
  return metrics;
}

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * GET /api/admin/impact/summary
 * Returns complete impact summary across all modules for the current tenant
 * 
 * Query params:
 * - tenant_id (optional): Override tenant for founder role
 */
adminImpactHandler.get('/impact/summary', async (c) => {
  const auth = c.get('auth') as AuthContext;
  let tenantId = auth.tenantId;
  
  // Allow founder to query other tenants
  const queryTenantId = c.req.query('tenant_id');
  if (queryTenantId && auth.role === 'founder') {
    tenantId = queryTenantId;
  }
  
  const supabase = getSupabaseClient(c.env);
  
  try {
    // Compute all metrics in parallel
    const [climateOs, goesGreen, zoraShop, foundation, academy, autonomy] = await Promise.all([
      computeClimateOSMetrics(supabase, tenantId),
      computeGoesGreenMetrics(supabase, tenantId),
      computeZoraShopMetrics(supabase, tenantId),
      computeFoundationMetrics(supabase, tenantId),
      computeAcademyMetrics(supabase, tenantId),
      computeAutonomyMetrics(supabase, tenantId),
    ]);
    
    const summary: ImpactSummary = {
      tenant_id: tenantId,
      computed_at: new Date().toISOString(),
      climate_os: climateOs,
      goes_green: goesGreen,
      zora_shop: zoraShop,
      foundation: foundation,
      academy: academy,
      autonomy: autonomy,
    };
    
    return jsonResponse({ data: summary, error: null });
  } catch (err) {
    console.error('Error computing impact summary:', err);
    return jsonResponse({
      data: null,
      error: {
        code: 'IMPACT_SUMMARY_FAILED',
        message: 'Failed to compute impact summary',
        details: err instanceof Error ? err.message : String(err),
      },
    }, 500);
  }
});

/**
 * GET /api/admin/impact/timeseries
 * Returns time-series impact data for the current tenant
 * 
 * Query params:
 * - period (optional): 'daily', 'weekly', 'monthly' (default: 'monthly')
 * - months (optional): Number of months to look back (default: 6)
 * - tenant_id (optional): Override tenant for founder role
 */
adminImpactHandler.get('/impact/timeseries', async (c) => {
  const auth = c.get('auth') as AuthContext;
  let tenantId = auth.tenantId;
  
  // Allow founder to query other tenants
  const queryTenantId = c.req.query('tenant_id');
  if (queryTenantId && auth.role === 'founder') {
    tenantId = queryTenantId;
  }
  
  const period = c.req.query('period') || 'monthly';
  const months = parseInt(c.req.query('months') || '6', 10);
  
  const supabase = getSupabaseClient(c.env);
  
  try {
    // First, try to get stored snapshots
    const { data: snapshots } = await supabase
      .from('tenant_impact_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('snapshot_period', period)
      .order('period_start', { ascending: false })
      .limit(months);
    
    if (snapshots && snapshots.length > 0) {
      // Return stored snapshots
      const points = snapshots.reverse().map(s => ({
        period_start: s.period_start,
        period_end: s.period_end,
        ...s.metrics,
      }));
      
      return jsonResponse({
        data: {
          period,
          source: 'snapshots',
          points,
        },
        error: null,
      });
    }
    
    // Fallback: compute time-buckets from base tables
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months);
    
    const points: Array<{
      period_start: string;
      period_end: string;
      climate_os: { climate_missions_created: number };
      goes_green: { actions_created: number };
      zora_shop: { orders_created: number };
      foundation: { contributions_created: number };
      academy: { lessons_completed: number };
      autonomy: { tasks_created: number };
    }> = [];
    
    if (period === 'monthly') {
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
      while (current <= now) {
        const nextMonth = new Date(current);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const periodStart = current.toISOString();
        const periodEnd = nextMonth.toISOString();
        
        // Count records created in this period
        const [missionsCount, actionsCount, ordersCount, contributionsCount, progressCount, tasksCount] = await Promise.all([
          supabase.from('climate_missions').select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', periodStart)
            .lt('created_at', periodEnd),
          supabase.from('goes_green_actions').select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', periodStart)
            .lt('created_at', periodEnd),
          supabase.from('zora_shop_orders').select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', periodStart)
            .lt('created_at', periodEnd),
          supabase.from('foundation_contributions').select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', periodStart)
            .lt('created_at', periodEnd),
          supabase.from('academy_user_progress').select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('completed_at', periodStart)
            .lt('completed_at', periodEnd),
          supabase.from('agent_tasks').select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', periodStart)
            .lt('created_at', periodEnd),
        ]);
        
        points.push({
          period_start: periodStart,
          period_end: periodEnd,
          climate_os: { climate_missions_created: missionsCount.count || 0 },
          goes_green: { actions_created: actionsCount.count || 0 },
          zora_shop: { orders_created: ordersCount.count || 0 },
          foundation: { contributions_created: contributionsCount.count || 0 },
          academy: { lessons_completed: progressCount.count || 0 },
          autonomy: { tasks_created: tasksCount.count || 0 },
        });
        
        current = nextMonth;
      }
    }
    
    return jsonResponse({
      data: {
        period,
        source: 'computed',
        points,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error computing impact timeseries:', err);
    return jsonResponse({
      data: null,
      error: {
        code: 'IMPACT_TIMESERIES_FAILED',
        message: 'Failed to compute impact timeseries',
        details: err instanceof Error ? err.message : String(err),
      },
    }, 500);
  }
});

/**
 * POST /api/admin/impact/snapshot
 * Create and store an impact snapshot for the current tenant
 * 
 * Body:
 * - period: 'daily', 'weekly', 'monthly' (required)
 */
adminImpactHandler.post('/impact/snapshot', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const tenantId = auth.tenantId;
  const supabase = getSupabaseClient(c.env);
  
  let body: { period?: string };
  try {
    body = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  const period = body.period || 'monthly';
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return errorResponse('INVALID_PERIOD', 'Period must be daily, weekly, or monthly', 400);
  }
  
  try {
    // Compute current metrics
    const [climateOs, goesGreen, zoraShop, foundation, academy, autonomy] = await Promise.all([
      computeClimateOSMetrics(supabase, tenantId),
      computeGoesGreenMetrics(supabase, tenantId),
      computeZoraShopMetrics(supabase, tenantId),
      computeFoundationMetrics(supabase, tenantId),
      computeAcademyMetrics(supabase, tenantId),
      computeAutonomyMetrics(supabase, tenantId),
    ]);
    
    // Calculate period boundaries
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    
    if (period === 'daily') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    
    const metrics = {
      climate_os: climateOs,
      goes_green: goesGreen,
      zora_shop: zoraShop,
      foundation: foundation,
      academy: academy,
      autonomy: autonomy,
    };
    
    const { data: snapshot, error } = await supabase
      .from('tenant_impact_snapshots')
      .insert({
        tenant_id: tenantId,
        snapshot_period: period,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        metrics,
      })
      .select()
      .single();
    
    if (error) {
      return jsonResponse({
        data: null,
        error: {
          code: 'SNAPSHOT_STORE_FAILED',
          message: 'Failed to store impact snapshot',
          details: error.message,
        },
      }, 500);
    }
    
    return jsonResponse({ data: snapshot, error: null }, 201);
  } catch (err) {
    console.error('Error creating impact snapshot:', err);
    return jsonResponse({
      data: null,
      error: {
        code: 'SNAPSHOT_CREATE_FAILED',
        message: 'Failed to create impact snapshot',
        details: err instanceof Error ? err.message : String(err),
      },
    }, 500);
  }
});

export default adminImpactHandler;
