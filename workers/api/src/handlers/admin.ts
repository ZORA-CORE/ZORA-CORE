/**
 * Admin API handlers for ZORA CORE
 * 
 * These endpoints are protected by ZORA_BOOTSTRAP_SECRET and provide
 * admin functionality for tenant/user management and JWT token issuance.
 */

import { Hono } from 'hono';
import type { Tenant, User, AdminStatusResponse, BootstrapTenantInput, CreateUserInput, TokenResponse, UserRole, SchemaStatusResponse } from '../types';
import type { AuthAppEnv } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import { createToken } from '../lib/auth';
import type { BillingContext, PlanFeatures } from '../middleware/billingContext';
import { PlanLimitExceededError, handleBillingError, requirePlanLimit, ensureWriteAllowed } from '../middleware/billingContext';

const adminHandler = new Hono<AuthAppEnv>();

/**
 * Middleware to verify admin secret
 */
adminHandler.use('*', async (c, next) => {
  const adminSecret = c.env.ZORA_BOOTSTRAP_SECRET;
  
  if (!adminSecret) {
    return errorResponse('ADMIN_NOT_CONFIGURED', 'ZORA_BOOTSTRAP_SECRET is not configured', 500);
  }
  
  const providedSecret = c.req.header('X-ZORA-ADMIN-SECRET');
  
  if (!providedSecret) {
    return errorResponse('MISSING_ADMIN_SECRET', 'X-ZORA-ADMIN-SECRET header is required', 401);
  }
  
  if (providedSecret !== adminSecret) {
    return errorResponse('INVALID_ADMIN_SECRET', 'Invalid admin secret', 403);
  }
  
  await next();
});

/**
 * GET /api/admin/status
 * Returns system status for admin setup
 */
adminHandler.get('/status', async (c) => {
  const jwtSecretConfigured = !!c.env.ZORA_JWT_SECRET;
  const bootstrapSecretConfigured = !!c.env.ZORA_BOOTSTRAP_SECRET;
  
  let supabaseConnected = false;
  let tenantsExist = false;
  let founderExists = false;
  let tenantCount = 0;
  let userCount = 0;
  
  try {
    const supabase = getSupabaseClient(c.env);
    
    // Check Supabase connection and get tenant count
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact' });
    
    if (!tenantError) {
      supabaseConnected = true;
      tenantCount = tenants?.length || 0;
      tenantsExist = tenantCount > 0;
    }
    
    // Get user count and check for founder
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, role');
    
    if (!userError && users) {
      userCount = users.length;
      founderExists = users.some(u => u.role === 'founder');
    }
  } catch (err) {
    console.error('Error checking admin status:', err);
  }
  
  const status: AdminStatusResponse = {
    jwt_secret_configured: jwtSecretConfigured,
    bootstrap_secret_configured: bootstrapSecretConfigured,
    supabase_connected: supabaseConnected,
    tenants_exist: tenantsExist,
    founder_exists: founderExists,
    tenant_count: tenantCount,
    user_count: userCount,
  };
  
  return jsonResponse(status);
});

/**
 * GET /api/admin/schema-status
 * Returns schema health status - checks for expected tables, columns, and schema version
 */
adminHandler.get('/schema-status', async (c) => {
  const supabase = getSupabaseClient(c.env);
  
  // Define expected tables and their required columns
  const expectedSchema: Record<string, string[]> = {
    schema_metadata: ['id', 'schema_version', 'applied_at'],
    tenants: ['id', 'name', 'slug', 'description', 'metadata', 'created_at'],
    users: ['id', 'tenant_id', 'email', 'display_name', 'role', 'metadata', 'created_at'],
    memory_events: ['id', 'agent', 'memory_type', 'content', 'tags', 'metadata', 'created_at'],
    journal_entries: ['id', 'tenant_id', 'category', 'title', 'body', 'details', 'created_at'],
    climate_profiles: ['id', 'tenant_id', 'name', 'profile_type', 'country', 'household_size', 'created_at'],
    climate_missions: ['id', 'tenant_id', 'profile_id', 'title', 'status', 'estimated_impact_kgco2', 'created_at'],
    frontend_configs: ['id', 'tenant_id', 'page', 'config', 'created_at'],
    agent_suggestions: ['id', 'tenant_id', 'agent_id', 'suggestion_type', 'status', 'created_at'],
  };
  
  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  let schemaVersion: string | null = null;
  
  try {
    // First, try to get the current schema version from schema_metadata
    const { data: versionData, error: versionError } = await supabase
      .from('schema_metadata')
      .select('schema_version')
      .order('applied_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!versionError && versionData) {
      schemaVersion = versionData.schema_version;
    }
    
    // Check each expected table
    for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
      // Try to query the table to check if it exists
      const { error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (tableError) {
        // Table doesn't exist or is inaccessible
        missingTables.push(tableName);
        continue;
      }
      
      // Check columns by querying information_schema
      // Note: This requires the service role key to have access to information_schema
      const { data: columns, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name_param: tableName })
        .select('*');
      
      if (columnError || !columns) {
        // If we can't check columns via RPC, try a different approach
        // Just verify the table is accessible (columns check is best-effort)
        continue;
      }
      
      const existingColumns = new Set(columns.map((col: { column_name: string }) => col.column_name));
      for (const col of expectedColumns) {
        if (!existingColumns.has(col)) {
          missingColumns.push(`${tableName}.${col}`);
        }
      }
    }
  } catch (err) {
    console.error('Error checking schema status:', err);
    return errorResponse('SCHEMA_CHECK_FAILED', 'Failed to check schema status', 500);
  }
  
  const schemaOk = missingTables.length === 0 && missingColumns.length === 0;
  
  const response: SchemaStatusResponse = {
    schema_version: schemaVersion,
    schema_ok: schemaOk,
    missing_tables: missingTables,
    missing_columns: missingColumns,
    checked_at: new Date().toISOString(),
  };
  
  return jsonResponse(response);
});

/**
 * POST /api/admin/bootstrap-tenant
 * Creates the first tenant and founder user
 */
adminHandler.post('/bootstrap-tenant', async (c) => {
  const supabase = getSupabaseClient(c.env);
  
  // Check if tenants already exist
  const { data: existingTenants, error: checkError } = await supabase
    .from('tenants')
    .select('id')
    .limit(1);
  
  if (checkError) {
    return errorResponse('DATABASE_ERROR', `Failed to check existing tenants: ${checkError.message}`, 500);
  }
  
  if (existingTenants && existingTenants.length > 0) {
    return errorResponse('ALREADY_BOOTSTRAPPED', 'Bootstrap has already been completed. Tenants already exist.', 409);
  }
  
  // Parse request body
  let input: BootstrapTenantInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.tenant_name || !input.founder_email) {
    return errorResponse('MISSING_FIELDS', 'tenant_name and founder_email are required', 400);
  }
  
  // Create tenant
  const tenantSlug = input.tenant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: input.tenant_name,
      slug: tenantSlug,
      description: 'Default tenant created during bootstrap',
      metadata: { bootstrapped: true, bootstrapped_at: new Date().toISOString() },
    })
    .select()
    .single();
  
  if (tenantError || !tenant) {
    return errorResponse('TENANT_CREATE_FAILED', `Failed to create tenant: ${tenantError?.message}`, 500);
  }
  
  // Create founder user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      tenant_id: tenant.id,
      email: input.founder_email,
      display_name: 'Founder',
      role: 'founder',
      metadata: { bootstrapped: true },
    })
    .select()
    .single();
  
  if (userError || !user) {
    // Rollback tenant creation
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return errorResponse('USER_CREATE_FAILED', `Failed to create founder user: ${userError?.message}`, 500);
  }
  
  return jsonResponse({
    message: 'Bootstrap completed successfully',
    tenant: tenant as Tenant,
    user: user as User,
  }, 201);
});

/**
 * GET /api/admin/tenants
 * Lists all tenants
 */
adminHandler.get('/tenants', async (c) => {
  const supabase = getSupabaseClient(c.env);
  
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return errorResponse('DATABASE_ERROR', `Failed to fetch tenants: ${error.message}`, 500);
  }
  
  // Get user counts per tenant
  const { data: userCounts } = await supabase
    .from('users')
    .select('tenant_id');
  
  const countMap: Record<string, number> = {};
  if (userCounts) {
    for (const u of userCounts) {
      countMap[u.tenant_id] = (countMap[u.tenant_id] || 0) + 1;
    }
  }
  
  const tenantsWithCounts = (tenants || []).map(t => ({
    ...t,
    user_count: countMap[t.id] || 0,
  }));
  
  return jsonResponse({ data: tenantsWithCounts });
});

/**
 * GET /api/admin/users
 * Lists users, optionally filtered by tenant_id and/or role
 */
adminHandler.get('/users', async (c) => {
  const supabase = getSupabaseClient(c.env);
  const tenantId = c.req.query('tenant_id');
  const role = c.req.query('role');
  
  let query = supabase
    .from('users')
    .select('id, tenant_id, email, display_name, role, account_type, last_login_at, created_at, updated_at')
    .order('created_at', { ascending: false });
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  
  if (role) {
    query = query.eq('role', role);
  }
  
  const { data: users, error } = await query;
  
  if (error) {
    return errorResponse('DATABASE_ERROR', `Failed to fetch users: ${error.message}`, 500);
  }
  
  return jsonResponse({ data: users || [] });
});

// Extended CreateUserInput with password support
interface CreateUserInputExtended {
  tenant_id: string;
  email?: string;
  display_name: string;
  role: UserRole;
  account_type?: string;
  password?: string;
}

/**
 * POST /api/admin/users
 * Creates a new user with optional password
 */
adminHandler.post('/users', async (c) => {
  const supabase = getSupabaseClient(c.env);
  
  let input: CreateUserInputExtended;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.tenant_id || !input.display_name || !input.role) {
    return errorResponse('MISSING_FIELDS', 'tenant_id, display_name, and role are required', 400);
  }
  
  // Validate role (now includes 'member')
  const validRoles: UserRole[] = ['founder', 'brand_admin', 'member', 'viewer'];
  if (!validRoles.includes(input.role)) {
    return errorResponse('INVALID_ROLE', `Role must be one of: ${validRoles.join(', ')}`, 400);
  }
  
  // Validate account_type if provided
  const validAccountTypes = ['private', 'company'];
  const accountType = input.account_type || 'private';
  if (!validAccountTypes.includes(accountType)) {
    return errorResponse('INVALID_ACCOUNT_TYPE', `account_type must be one of: ${validAccountTypes.join(', ')}`, 400);
  }
  
  // Verify tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', input.tenant_id)
    .single();
  
  if (tenantError || !tenant) {
    return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404);
  }
  
  // Billing enforcement: Load tenant's subscription and check plan limits for users
  const { data: subscription } = await supabase
    .from('tenant_subscriptions')
    .select(`
      id,
      status,
      trial_ends_at,
      current_period_end,
      plan:billing_plans(
        id,
        code,
        name,
        features
      )
    `)
    .eq('tenant_id', input.tenant_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // Build billing context from subscription
  // Handle the plan data - Supabase returns array for joins, we need the first element
  const plan = Array.isArray(subscription?.plan) ? subscription.plan[0] : subscription?.plan;
  
  const defaultFeatures: PlanFeatures = {
    maxUsers: 1,
    maxOrganizations: 1,
    maxClimateProfiles: 1,
    maxZoraShopProjects: 1,
    maxGoesGreenProfiles: 1,
    maxAcademyPaths: 1,
    maxAutonomyTasksPerDay: 20,
  };
  
  let billingCtx: BillingContext;
  if (subscription && plan) {
    const planFeatures = (plan.features as Record<string, unknown>) || {};
    billingCtx = {
      planCode: plan.code,
      planName: plan.name,
      status: subscription.status as 'trial' | 'active' | 'past_due' | 'canceled',
      features: {
        maxUsers: planFeatures.max_users === null || planFeatures.max_users === -1 ? null : (planFeatures.max_users as number | undefined) ?? 1,
        maxOrganizations: planFeatures.max_organizations === null || planFeatures.max_organizations === -1 ? null : (planFeatures.max_organizations as number | undefined) ?? 1,
        maxClimateProfiles: planFeatures.max_climate_profiles === null || planFeatures.max_climate_profiles === -1 ? null : (planFeatures.max_climate_profiles as number | undefined) ?? 1,
        maxZoraShopProjects: planFeatures.max_zora_shop_projects === null || planFeatures.max_zora_shop_projects === -1 ? null : (planFeatures.max_zora_shop_projects as number | undefined) ?? 1,
        maxGoesGreenProfiles: planFeatures.max_goes_green_profiles === null || planFeatures.max_goes_green_profiles === -1 ? null : (planFeatures.max_goes_green_profiles as number | undefined) ?? 1,
        maxAcademyPaths: planFeatures.max_academy_paths === null || planFeatures.max_academy_paths === -1 ? null : (planFeatures.max_academy_paths as number | undefined) ?? 1,
        maxAutonomyTasksPerDay: planFeatures.max_autonomy_tasks_per_day === null || planFeatures.max_autonomy_tasks_per_day === -1 ? null : (planFeatures.max_autonomy_tasks_per_day as number | undefined) ?? 20,
      },
      subscriptionId: subscription.id,
      planId: plan.id,
      trialEndsAt: subscription.trial_ends_at,
      currentPeriodEnd: subscription.current_period_end,
    };
  } else {
    billingCtx = {
      planCode: 'free',
      planName: 'Free (Default)',
      status: 'trial',
      features: defaultFeatures,
      subscriptionId: null,
      planId: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
    };
  }
  
  // Check subscription status allows writes
  try {
    ensureWriteAllowed(billingCtx);
  } catch (err) {
    const billingResponse = handleBillingError(err);
    if (billingResponse) return billingResponse;
    throw err;
  }
  
  // Count current users for this tenant
  const { count: currentUserCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', input.tenant_id);
  
  // Check plan limit for users
  try {
    requirePlanLimit(billingCtx, currentUserCount || 0, 'maxUsers');
  } catch (err) {
    const billingResponse = handleBillingError(err);
    if (billingResponse) return billingResponse;
    throw err;
  }
  
  // Check if display_name already exists for this tenant
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', input.tenant_id)
    .eq('display_name', input.display_name)
    .single();
  
  if (existingUser) {
    return errorResponse('USER_EXISTS', 'A user with this display name already exists for this tenant', 409);
  }
  
  // Hash password if provided
  let passwordHash: string | null = null;
  if (input.password) {
    if (input.password.length < 8) {
      return errorResponse('INVALID_PASSWORD', 'password must be at least 8 characters', 400);
    }
    const bcrypt = await import('bcryptjs');
    passwordHash = await bcrypt.hash(input.password, 10);
  }
  
  // Generate email if not provided
  const email = input.email || `${input.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@zora.local`;
  
  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      tenant_id: input.tenant_id,
      email: email,
      display_name: input.display_name,
      role: input.role,
      account_type: accountType,
      password_hash: passwordHash,
      metadata: {},
    })
    .select('id, tenant_id, email, display_name, role, account_type, last_login_at, created_at, updated_at')
    .single();
  
  if (userError || !user) {
    return errorResponse('USER_CREATE_FAILED', `Failed to create user: ${userError?.message}`, 500);
  }
  
  // Create journal entry
  await supabase.from('journal_entries').insert({
    tenant_id: input.tenant_id,
    category: 'system_event',
    event_type: 'user_created_by_admin',
    title: 'User Created by Admin',
    body: `Admin created user: ${input.display_name} (${input.role})`,
    details: {
      user_id: user.id,
      display_name: input.display_name,
      role: input.role,
      account_type: accountType,
    },
  });
  
  return jsonResponse({ data: user }, 201);
});

/**
 * POST /api/admin/users/:id/token
 * Issues a JWT token for a specific user
 */
adminHandler.post('/users/:id/token', async (c) => {
  const userId = c.req.param('id');
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (userError || !user) {
    return errorResponse('USER_NOT_FOUND', 'User not found', 404);
  }
  
  // Get tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', user.tenant_id)
    .single();
  
  if (tenantError || !tenant) {
    return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404);
  }
  
  // Parse optional expires_in from request body
  let expiresInSeconds = 7 * 24 * 60 * 60; // Default: 7 days
  try {
    const body = await c.req.json();
    if (body.expires_in && typeof body.expires_in === 'number') {
      expiresInSeconds = body.expires_in;
    }
  } catch {
    // No body or invalid JSON, use default expiration
  }
  
  // Create token (includes account_type for Auth Backend v1.0)
  const token = await createToken(
    {
      tenant_id: user.tenant_id,
      user_id: user.id,
      role: user.role as 'founder' | 'brand_admin' | 'member' | 'viewer',
      account_type: user.account_type || 'private',
    },
    jwtSecret,
    expiresInSeconds
  );
  
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  
  // Update last_login_at
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
  
  const response: TokenResponse = {
    token,
    user: user as User,
    tenant: tenant as Tenant,
    expires_at: expiresAt,
  };
  
  return jsonResponse(response);
});

// ============================================================================
// SEED DATA & ONBOARDING v1.0 (Iteration 00D2)
// ============================================================================

/**
 * Available seed sets for v1
 */
const SEED_SETS_V1: Record<string, string> = {
  'climate_default_missions_v1': 'Default climate missions for new tenants',
  'hemp_materials_v1': 'Hemp-based and sustainable materials for ZORA SHOP',
  'zora_shop_starter_v1': 'Example brands, products, and ZORA SHOP projects',
  'foundation_starter_v1': 'Example ZORA FOUNDATION projects',
  'academy_starter_v1': 'Basic Climate Academy learning content',
  'goes_green_starter_v1': 'Example GOES GREEN profiles and energy actions',
};

interface SeedResult {
  seed_key: string;
  status: 'completed' | 'skipped_already_run' | 'error';
  details?: string;
}

interface SeedRequestBody {
  seeds?: string[];
}

/**
 * POST /api/admin/tenants/:id/seed
 * Run seed data for a tenant
 * 
 * Body (optional):
 *   { "seeds": ["climate_default_missions_v1", "hemp_materials_v1"] }
 * 
 * If seeds array is omitted, runs all v1 seeds.
 */
adminHandler.post('/tenants/:id/seed', async (c) => {
  const tenantId = c.req.param('id');
  const supabase = getSupabaseClient(c.env);
  
  // Validate tenant ID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return errorResponse('INVALID_TENANT_ID', 'Invalid tenant ID format', 400);
  }
  
  // Verify tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single();
  
  if (tenantError || !tenant) {
    return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404);
  }
  
  // Parse request body
  let seedsToRun: string[];
  try {
    const body = await c.req.json<SeedRequestBody>().catch(() => ({ seeds: undefined }));
    if (body.seeds && Array.isArray(body.seeds)) {
      // Validate provided seed keys
      const invalidSeeds = body.seeds.filter((s: string) => !SEED_SETS_V1[s]);
      if (invalidSeeds.length > 0) {
        return errorResponse(
          'INVALID_SEED_KEYS',
          `Unknown seed keys: ${invalidSeeds.join(', ')}. Available: ${Object.keys(SEED_SETS_V1).join(', ')}`,
          400
        );
      }
      seedsToRun = body.seeds;
    } else {
      // Run all v1 seeds
      seedsToRun = Object.keys(SEED_SETS_V1);
    }
  } catch {
    seedsToRun = Object.keys(SEED_SETS_V1);
  }
  
  const results: SeedResult[] = [];
  
  for (const seedKey of seedsToRun) {
    try {
      // Check if seed already run
      const { data: existingRun } = await supabase
        .from('seed_runs')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('seed_key', seedKey)
        .eq('status', 'completed')
        .single();
      
      if (existingRun) {
        results.push({
          seed_key: seedKey,
          status: 'skipped_already_run',
          details: 'Seed already applied to this tenant',
        });
        continue;
      }
      
      // Run the seed based on key
      const seedResult = await runSeed(supabase, tenantId, seedKey);
      results.push(seedResult);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        seed_key: seedKey,
        status: 'error',
        details: errorMessage,
      });
      
      // Record the error (ignore failures)
      try {
        await supabase.from('seed_runs').upsert({
          tenant_id: tenantId,
          seed_key: seedKey,
          status: 'error',
          details: errorMessage,
        }, { onConflict: 'tenant_id,seed_key' });
      } catch {
        // Ignore errors when recording seed run failure
      }
    }
  }
  
  return jsonResponse({
    tenant_id: tenantId,
    tenant_name: tenant.name,
    results,
  });
});

/**
 * Run a specific seed for a tenant
 */
async function runSeed(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string
): Promise<SeedResult> {
  const now = new Date().toISOString();
  
  switch (seedKey) {
    case 'climate_default_missions_v1':
      return await seedClimateMissions(supabase, tenantId, seedKey, now);
    case 'hemp_materials_v1':
      return await seedHempMaterials(supabase, tenantId, seedKey, now);
    case 'zora_shop_starter_v1':
      return await seedZoraShopStarter(supabase, tenantId, seedKey, now);
    case 'foundation_starter_v1':
      return await seedFoundationStarter(supabase, tenantId, seedKey, now);
    case 'academy_starter_v1':
      return await seedAcademyStarter(supabase, tenantId, seedKey, now);
    case 'goes_green_starter_v1':
      return await seedGoesGreenStarter(supabase, tenantId, seedKey, now);
    default:
      return {
        seed_key: seedKey,
        status: 'error',
        details: `Unknown seed key: ${seedKey}`,
      };
  }
}

/**
 * Record a successful seed run
 */
async function recordSeedRun(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  details: string
): Promise<void> {
  await supabase.from('seed_runs').upsert({
    tenant_id: tenantId,
    seed_key: seedKey,
    status: 'completed',
    details,
  }, { onConflict: 'tenant_id,seed_key' });
}

/**
 * Seed climate missions
 */
async function seedClimateMissions(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  now: string
): Promise<SeedResult> {
  // Check/create default profile
  const { data: profiles } = await supabase
    .from('climate_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);
  
  let profileId: string;
  if (!profiles || profiles.length === 0) {
    const { data: newProfile } = await supabase
      .from('climate_profiles')
      .insert({
        tenant_id: tenantId,
        name: 'Default Climate Profile',
        scope: 'individual',
        is_primary: true,
        baseline_kgco2_per_year: 8000,
        target_kgco2_per_year: 4000,
      })
      .select('id')
      .single();
    profileId = newProfile?.id;
  } else {
    profileId = profiles[0].id;
  }
  
  const baseDate = new Date();
  const missions = [
    { title: 'Switch to renewable energy provider', category: 'energy', estimated_impact_kgco2: 1200, days: 30 },
    { title: 'Install LED lighting throughout home', category: 'energy', estimated_impact_kgco2: 150, days: 14 },
    { title: 'Reduce car usage by 50%', category: 'transport', estimated_impact_kgco2: 800, days: 60 },
    { title: 'Try one meat-free day per week', category: 'food', estimated_impact_kgco2: 200, days: 7 },
    { title: 'Buy local and seasonal produce', category: 'food', estimated_impact_kgco2: 300, days: 21 },
    { title: 'Reduce single-use plastics', category: 'products', estimated_impact_kgco2: 50, days: 14 },
    { title: 'Choose sustainable clothing brands', category: 'products', estimated_impact_kgco2: 250, days: 45 },
    { title: 'Optimize home heating/cooling', category: 'energy', estimated_impact_kgco2: 400, days: 30 },
    { title: 'Calculate your carbon footprint', category: 'general', estimated_impact_kgco2: 0, days: 3 },
    { title: 'Share climate goals with friends/family', category: 'general', estimated_impact_kgco2: 0, days: 7 },
  ].map(m => ({
    tenant_id: tenantId,
    profile_id: profileId,
    title: m.title,
    category: m.category,
    status: 'planned',
    estimated_impact_kgco2: m.estimated_impact_kgco2,
    due_date: new Date(baseDate.getTime() + m.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));
  
  await supabase.from('climate_missions').insert(missions);
  await recordSeedRun(supabase, tenantId, seedKey, `Created ${missions.length} missions`);
  
  return { seed_key: seedKey, status: 'completed', details: `Created ${missions.length} missions` };
}

/**
 * Seed hemp materials
 */
async function seedHempMaterials(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  now: string
): Promise<SeedResult> {
  const materials = [
    { name: 'Organic Hemp Fleece', is_hemp: true, hemp_category: 'textile', co2: 2.5 },
    { name: 'Hemp-Cotton Blend (55/45)', is_hemp: true, hemp_category: 'textile', co2: 3.2 },
    { name: 'Hemp Canvas', is_hemp: true, hemp_category: 'textile', co2: 2.8 },
    { name: 'Hemp Packaging Board', is_hemp: true, hemp_category: 'packaging', co2: 1.5 },
    { name: 'Hempcrete Block', is_hemp: true, hemp_category: 'building_material', co2: -0.5 },
    { name: 'Organic Cotton', is_hemp: false, hemp_category: null, co2: 5.0 },
    { name: 'Recycled Polyester (rPET)', is_hemp: false, hemp_category: null, co2: 4.5 },
    { name: 'Tencel Lyocell', is_hemp: false, hemp_category: null, co2: 3.8 },
  ].map(m => ({
    tenant_id: tenantId,
    name: m.name,
    is_hemp_or_cannabis_material: m.is_hemp,
    hemp_category: m.hemp_category,
    co2_intensity_kg_per_kg: m.co2,
  }));
  
  await supabase.from('materials').insert(materials);
  await recordSeedRun(supabase, tenantId, seedKey, `Created ${materials.length} materials`);
  
  return { seed_key: seedKey, status: 'completed', details: `Created ${materials.length} materials` };
}

/**
 * Seed ZORA SHOP starter data
 */
async function seedZoraShopStarter(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  now: string
): Promise<SeedResult> {
  // Create brands
  const { data: brands } = await supabase
    .from('brands')
    .insert([
      { tenant_id: tenantId, name: 'ZORA CORE Demo Brand', is_verified: true },
      { tenant_id: tenantId, name: 'Green Fiber Co.', is_verified: true },
    ])
    .select('id');
  
  const brandIds = brands?.map(b => b.id) || [];
  
  // Create products
  const products = [
    { name: 'Climate Action Hoodie', sku: 'ZORA-HOODIE-001', price: 599, category: 'apparel' },
    { name: 'Hemp Essential T-Shirt', sku: 'ZORA-TEE-001', price: 299, category: 'apparel' },
    { name: 'Eco Canvas Cap', sku: 'ZORA-CAP-001', price: 199, category: 'accessories' },
    { name: 'Sustainable Tote Bag', sku: 'ZORA-TOTE-001', price: 149, category: 'accessories' },
  ].map(p => ({
    tenant_id: tenantId,
    name: p.name,
    sku: p.sku,
    price_amount: p.price,
    price_currency: 'DKK',
    category: p.category,
    is_active: true,
  }));
  
  const { data: createdProducts } = await supabase.from('products').insert(products).select('id');
  const productIds = createdProducts?.map(p => p.id) || [];
  
  // Link products to brands
  if (brandIds.length > 0 && productIds.length > 0) {
    const productBrands = productIds.map((pid, i) => ({
      product_id: pid,
      brand_id: brandIds[0],
      is_primary: true,
    }));
    await supabase.from('product_brands').insert(productBrands);
  }
  
  // Create projects
  if (brandIds.length > 0) {
    await supabase.from('zora_shop_projects').insert([
      { tenant_id: tenantId, title: 'ZORA x Green Fiber Hemp Capsule', primary_brand_id: brandIds[0], status: 'in_progress' },
      { tenant_id: tenantId, title: 'GOES GREEN Energy Hoodie Collection', primary_brand_id: brandIds[0], status: 'planned' },
    ]);
  }
  
  const details = `Created ${brandIds.length} brands, ${productIds.length} products, 2 projects`;
  await recordSeedRun(supabase, tenantId, seedKey, details);
  
  return { seed_key: seedKey, status: 'completed', details };
}

/**
 * Seed foundation starter data
 */
async function seedFoundationStarter(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  now: string
): Promise<SeedResult> {
  const projects = [
    { name: 'Urban Tree Planting (City Demo)', status: 'active', domain: 'reforestation', target: 500000, current: 125000 },
    { name: 'Coastal Restoration (Demo)', status: 'active', domain: 'ecosystem_restoration', target: 1000000, current: 350000 },
    { name: 'Solar For Schools (Demo)', status: 'planned', domain: 'renewable_energy', target: 2500000, current: 0 },
  ].map(p => ({
    tenant_id: tenantId,
    name: p.name,
    status: p.status,
    climate_focus_domain: p.domain,
    target_amount: p.target,
    target_currency: 'DKK',
    current_amount: p.current,
  }));
  
  await supabase.from('foundation_projects').insert(projects);
  await recordSeedRun(supabase, tenantId, seedKey, `Created ${projects.length} foundation projects`);
  
  return { seed_key: seedKey, status: 'completed', details: `Created ${projects.length} foundation projects` };
}

/**
 * Seed academy starter data
 */
async function seedAcademyStarter(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  now: string
): Promise<SeedResult> {
  // Create topics
  const { data: topics } = await supabase
    .from('academy_topics')
    .insert([
      { tenant_id: tenantId, name: 'Climate Basics', sort_order: 1 },
      { tenant_id: tenantId, name: 'Hemp & Materials', sort_order: 2 },
      { tenant_id: tenantId, name: 'GOES GREEN Energy', sort_order: 3 },
    ])
    .select('id, name');
  
  const topicMap: Record<string, string> = {};
  topics?.forEach(t => { topicMap[t.name] = t.id; });
  
  // Create lessons
  const lessons = [
    { topic: 'Climate Basics', title: 'What is Climate Change?', difficulty: 'beginner', minutes: 15 },
    { topic: 'Climate Basics', title: 'Understanding Carbon Footprints', difficulty: 'beginner', minutes: 10 },
    { topic: 'Hemp & Materials', title: 'Introduction to Hemp', difficulty: 'beginner', minutes: 15 },
    { topic: 'Hemp & Materials', title: 'Hemp vs Cotton: Environmental Impact', difficulty: 'intermediate', minutes: 12 },
    { topic: 'GOES GREEN Energy', title: 'Solar Energy Basics', difficulty: 'beginner', minutes: 10 },
    { topic: 'GOES GREEN Energy', title: 'Heat Pumps Explained', difficulty: 'intermediate', minutes: 15 },
  ].map((l, i) => ({
    tenant_id: tenantId,
    topic_id: topicMap[l.topic],
    title: l.title,
    difficulty: l.difficulty,
    duration_minutes: l.minutes,
    sort_order: i + 1,
  }));
  
  await supabase.from('academy_lessons').insert(lessons);
  
  // Create learning paths
  await supabase.from('academy_learning_paths').insert([
    { tenant_id: tenantId, name: 'Climate Basics for Individuals', difficulty: 'beginner', estimated_hours: 2, is_published: true },
    { tenant_id: tenantId, name: 'Hemp & Materials 101', difficulty: 'intermediate', estimated_hours: 1, is_published: true },
  ]);
  
  const details = `Created ${topics?.length || 0} topics, ${lessons.length} lessons, 2 learning paths`;
  await recordSeedRun(supabase, tenantId, seedKey, details);
  
  return { seed_key: seedKey, status: 'completed', details };
}

/**
 * Seed GOES GREEN starter data
 */
async function seedGoesGreenStarter(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  seedKey: string,
  now: string
): Promise<SeedResult> {
  // Create profile
  const { data: profile } = await supabase
    .from('goes_green_profiles')
    .insert({
      tenant_id: tenantId,
      name: 'Demo Home',
      profile_type: 'household',
      location_country: 'DK',
      location_city: 'Copenhagen',
      annual_energy_kwh: 4500,
      current_energy_source: 'grid_mixed',
    })
    .select('id')
    .single();
  
  const profileId = profile?.id;
  
  if (profileId) {
    // Create actions
    const actions = [
      { type: 'switch_to_green_tariff', title: 'Switch to 100% Green Electricity', status: 'planned', cost: 0, savings: 1200, payback: 0 },
      { type: 'install_solar_pv', title: 'Install Rooftop Solar Panels', status: 'planned', cost: 85000, savings: 2000, payback: 8 },
      { type: 'install_heat_pump', title: 'Replace Gas Boiler with Heat Pump', status: 'under_evaluation', cost: 120000, savings: 3000, payback: 10 },
      { type: 'improve_insulation', title: 'Improve Home Insulation', status: 'under_evaluation', cost: 50000, savings: 800, payback: 6 },
      { type: 'smart_thermostat', title: 'Install Smart Thermostat', status: 'completed', cost: 2500, savings: 200, payback: 2 },
    ].map(a => ({
      tenant_id: tenantId,
      profile_id: profileId,
      action_type: a.type,
      title: a.title,
      status: a.status,
      estimated_cost_amount: a.cost,
      estimated_cost_currency: 'DKK',
      estimated_savings_kgco2: a.savings,
      payback_years: a.payback,
    }));
    
    await supabase.from('goes_green_actions').insert(actions);
  }
  
  const details = `Created 1 profile, 5 actions`;
  await recordSeedRun(supabase, tenantId, seedKey, details);
  
  return { seed_key: seedKey, status: 'completed', details };
}

export default adminHandler;
