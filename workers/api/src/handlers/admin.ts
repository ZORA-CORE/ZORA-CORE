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

export default adminHandler;
