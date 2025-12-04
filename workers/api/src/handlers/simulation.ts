/**
 * Simulation Engine v1.0 API Handlers
 * 
 * Admin-protected endpoints for running climate simulations:
 * - POST /api/admin/simulation/run - Run a simulation with scenario inputs
 * - GET /api/admin/simulation/presets - Get preset scenario templates
 * - GET /api/admin/simulation/info - Get simulation engine info
 * 
 * Backend Hardening v1: All endpoints require founder/brand_admin role.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, standardError } from '../lib/response';
import type { AuthContext } from '../lib/auth';
import { logMetricEvent } from '../middleware/logging';
import {
  runSimulation,
  getSimulationInfo,
  SCENARIO_PRESETS,
  type ScenarioInput,
} from '../simulation/simulationEngine';

const simulationHandler = new Hono<AuthAppEnv>();

simulationHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return standardError('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return standardError('FORBIDDEN', 'Admin access required (founder or brand_admin role)', 403);
  }
  
  await next();
});

/**
 * GET /api/admin/simulation/info
 * Get information about the simulation engine
 */
simulationHandler.get('/info', async (c) => {
  const info = getSimulationInfo();
  return jsonResponse(info);
});

/**
 * GET /api/admin/simulation/presets
 * Get preset scenario templates
 */
simulationHandler.get('/presets', async (c) => {
  return jsonResponse({
    presets: SCENARIO_PRESETS,
    count: SCENARIO_PRESETS.length,
  });
});

/**
 * POST /api/admin/simulation/run
 * Run a simulation with the provided scenario inputs
 * 
 * Request body:
 * - tenant_id (optional): Override tenant for founder role
 * - time_horizon_months: Number of months to simulate (3, 6, 12, 24)
 * - deltas: Object containing scenario deltas
 *   - missions_delta: { missions_per_month, mission_type? }
 *   - goes_green_delta: { green_energy_share_increase_percent }
 *   - product_material_shift: { shift_percent, target_material? }
 *   - foundation_delta: { contribution_increase_percent }
 */
simulationHandler.post('/run', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const startTime = Date.now();
  
  let body: ScenarioInput;
  try {
    body = await c.req.json();
  } catch {
    return standardError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.time_horizon_months || typeof body.time_horizon_months !== 'number') {
    return standardError(
      'MISSING_PARAMS',
      'time_horizon_months is required and must be a number',
      400
    );
  }

  const validHorizons = [3, 6, 12, 24];
  if (!validHorizons.includes(body.time_horizon_months)) {
    return standardError(
      'INVALID_PARAMS',
      `time_horizon_months must be one of: ${validHorizons.join(', ')}`,
      400
    );
  }

  if (!body.deltas || typeof body.deltas !== 'object') {
    return standardError(
      'MISSING_PARAMS',
      'deltas object is required with at least one scenario delta',
      400
    );
  }

  const hasDeltas = 
    body.deltas.missions_delta ||
    body.deltas.goes_green_delta ||
    body.deltas.product_material_shift ||
    body.deltas.foundation_delta;

  if (!hasDeltas) {
    return standardError(
      'MISSING_PARAMS',
      'At least one delta must be provided (missions_delta, goes_green_delta, product_material_shift, or foundation_delta)',
      400
    );
  }

  if (body.deltas.missions_delta) {
    const md = body.deltas.missions_delta;
    if (typeof md.missions_per_month !== 'number' || md.missions_per_month < 0) {
      return standardError(
        'INVALID_PARAMS',
        'missions_delta.missions_per_month must be a non-negative number',
        400
      );
    }
  }

  if (body.deltas.goes_green_delta) {
    const ggd = body.deltas.goes_green_delta;
    if (typeof ggd.green_energy_share_increase_percent !== 'number' || 
        ggd.green_energy_share_increase_percent < 0 || 
        ggd.green_energy_share_increase_percent > 100) {
      return standardError(
        'INVALID_PARAMS',
        'goes_green_delta.green_energy_share_increase_percent must be a number between 0 and 100',
        400
      );
    }
  }

  if (body.deltas.product_material_shift) {
    const pms = body.deltas.product_material_shift;
    if (typeof pms.shift_percent !== 'number' || 
        pms.shift_percent < 0 || 
        pms.shift_percent > 100) {
      return standardError(
        'INVALID_PARAMS',
        'product_material_shift.shift_percent must be a number between 0 and 100',
        400
      );
    }
  }

  if (body.deltas.foundation_delta) {
    const fd = body.deltas.foundation_delta;
    if (typeof fd.contribution_increase_percent !== 'number' || 
        fd.contribution_increase_percent < 0) {
      return standardError(
        'INVALID_PARAMS',
        'foundation_delta.contribution_increase_percent must be a non-negative number',
        400
      );
    }
  }

  let effectiveTenantId = auth.tenantId;
  if (body.tenant_id && auth.role === 'founder') {
    effectiveTenantId = body.tenant_id;
  }

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await runSimulation(supabase, body, effectiveTenantId);
    
    logMetricEvent({
      category: 'simulation',
      name: 'run_simulation',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: true,
      metadata: {
        time_horizon_months: body.time_horizon_months,
        has_missions_delta: !!body.deltas.missions_delta,
        has_goes_green_delta: !!body.deltas.goes_green_delta,
        has_product_material_shift: !!body.deltas.product_material_shift,
        has_foundation_delta: !!body.deltas.foundation_delta,
        confidence_level: result.confidence.level,
      },
    });
    
    return jsonResponse({ data: result, error: null });
  } catch (error) {
    console.error('runSimulation error:', error);
    
    logMetricEvent({
      category: 'simulation',
      name: 'run_simulation',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: 'SIMULATION_ERROR',
    });
    
    return standardError(
      'SIMULATION_ERROR',
      'Failed to run simulation',
      500
    );
  }
});

/**
 * POST /api/admin/simulation/run-preset
 * Run a simulation using a preset scenario
 * 
 * Request body:
 * - preset_id: ID of the preset to use
 * - tenant_id (optional): Override tenant for founder role
 */
simulationHandler.post('/run-preset', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const startTime = Date.now();
  
  let body: { preset_id: string; tenant_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return standardError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.preset_id || typeof body.preset_id !== 'string') {
    return standardError(
      'MISSING_PARAMS',
      'preset_id is required',
      400
    );
  }

  const preset = SCENARIO_PRESETS.find(p => p.id === body.preset_id);
  if (!preset) {
    return standardError(
      'NOT_FOUND',
      `Preset not found: ${body.preset_id}. Available presets: ${SCENARIO_PRESETS.map(p => p.id).join(', ')}`,
      404
    );
  }

  let effectiveTenantId = auth.tenantId;
  if (body.tenant_id && auth.role === 'founder') {
    effectiveTenantId = body.tenant_id;
  }

  const scenarioInput: ScenarioInput = {
    tenant_id: effectiveTenantId,
    time_horizon_months: preset.time_horizon_months,
    deltas: preset.deltas,
  };

  try {
    const supabase = getSupabaseClient(c.env);
    const result = await runSimulation(supabase, scenarioInput, effectiveTenantId);
    
    logMetricEvent({
      category: 'simulation',
      name: 'run_simulation_preset',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: true,
      metadata: {
        preset_id: body.preset_id,
        preset_name: preset.name,
        confidence_level: result.confidence.level,
      },
    });
    
    return jsonResponse({ 
      data: result, 
      preset: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
      },
      error: null,
    });
  } catch (error) {
    console.error('runSimulation (preset) error:', error);
    
    logMetricEvent({
      category: 'simulation',
      name: 'run_simulation_preset',
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: 'SIMULATION_ERROR',
    });
    
    return standardError(
      'SIMULATION_ERROR',
      'Failed to run simulation with preset',
      500
    );
  }
});

export default simulationHandler;
