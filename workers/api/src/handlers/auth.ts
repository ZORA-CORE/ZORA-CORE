/**
 * Auth API handlers for ZORA CORE
 * 
 * Provides password-based authentication endpoints:
 * - POST /api/auth/register - Create new tenant + founder user
 * - POST /api/auth/login - Login with display_name + password
 * - GET /api/auth/me - Get current user info from JWT
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { AuthAppEnv } from '../middleware/auth';
import { authMiddleware, getAuthContext } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import { createToken } from '../lib/auth';
import type { User, Tenant, UserRole } from '../types';

const authHandler = new Hono<AuthAppEnv>();

// Password hashing configuration
const BCRYPT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Valid roles for the system
const VALID_ROLES: UserRole[] = ['founder', 'brand_admin', 'member', 'viewer'];

// Valid account types
const VALID_ACCOUNT_TYPES = ['private', 'company'];

interface RegisterInput {
  display_name: string;
  account_type?: string;
  password: string;
}

interface LoginInput {
  display_name: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    display_name: string;
    account_type: string;
    role: UserRole;
    tenant_id: string;
  };
}

/**
 * POST /api/auth/register
 * Create a new tenant and founder user with password
 */
authHandler.post('/register', async (c) => {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  // Parse request body
  let input: RegisterInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  // Validate required fields
  if (!input.display_name || typeof input.display_name !== 'string' || input.display_name.trim().length === 0) {
    return errorResponse('MISSING_DISPLAY_NAME', 'display_name is required', 400);
  }
  
  if (!input.password || typeof input.password !== 'string' || input.password.length < 8) {
    return errorResponse('INVALID_PASSWORD', 'password must be at least 8 characters', 400);
  }
  
  // Validate account_type if provided
  const accountType = input.account_type || 'private';
  if (!VALID_ACCOUNT_TYPES.includes(accountType)) {
    return errorResponse('INVALID_ACCOUNT_TYPE', `account_type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`, 400);
  }
  
  const displayName = input.display_name.trim();
  
  // Check if a user with this display_name already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('display_name', displayName)
    .single();
  
  if (existingUser) {
    return errorResponse('USER_EXISTS', 'A user with this display name already exists', 409);
  }
  
  // Hash the password
  const passwordHash = await hashPassword(input.password);
  
  // Create tenant
  const tenantName = accountType === 'private' ? displayName : `${displayName}'s Organization`;
  const tenantSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: tenantName,
      slug: `${tenantSlug}-${Date.now()}`, // Add timestamp to ensure uniqueness
      description: `Tenant for ${displayName}`,
      tenant_type: accountType,
      metadata: { registered_at: new Date().toISOString() },
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
      email: `${tenantSlug}@zora.local`, // Placeholder email
      display_name: displayName,
      role: 'founder',
      account_type: accountType,
      password_hash: passwordHash,
      metadata: { registered: true },
    })
    .select()
    .single();
  
  if (userError || !user) {
    // Rollback tenant creation
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return errorResponse('USER_CREATE_FAILED', `Failed to create user: ${userError?.message}`, 500);
  }
  
  // Create JWT token (includes account_type for Auth Backend v1.0)
  const token = await createToken(
    {
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'founder',
      account_type: accountType,
    },
    jwtSecret,
    7 * 24 * 60 * 60 // 7 days
  );
  
  // Create journal entry for registration
  await supabase.from('journal_entries').insert({
    tenant_id: tenant.id,
    category: 'system_event',
    event_type: 'user_registered',
    title: 'New User Registered',
    body: `New founder user registered: ${displayName} (${accountType})`,
    details: {
      user_id: user.id,
      display_name: displayName,
      account_type: accountType,
    },
  });
  
  const response: AuthResponse = {
    token,
    user: {
      id: user.id,
      display_name: user.display_name,
      account_type: user.account_type || 'private',
      role: user.role as UserRole,
      tenant_id: user.tenant_id,
    },
  };
  
  return jsonResponse(response, 201);
});

/**
 * POST /api/auth/login
 * Login with display_name and password
 */
authHandler.post('/login', async (c) => {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  const supabase = getSupabaseClient(c.env);
  
  // Parse request body
  let input: LoginInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  // Validate required fields
  if (!input.display_name || typeof input.display_name !== 'string') {
    return errorResponse('MISSING_DISPLAY_NAME', 'display_name is required', 400);
  }
  
  if (!input.password || typeof input.password !== 'string') {
    return errorResponse('MISSING_PASSWORD', 'password is required', 400);
  }
  
  const displayName = input.display_name.trim();
  
  // Look up user by display_name
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('display_name', displayName)
    .single();
  
  if (userError || !user) {
    return errorResponse('INVALID_CREDENTIALS', 'Invalid display name or password', 401);
  }
  
  // Check if user has a password set
  if (!user.password_hash) {
    return errorResponse('PASSWORD_NOT_SET', 'This account does not have password authentication enabled. Please use the admin token flow.', 401);
  }
  
  // Verify password
  const isValid = await verifyPassword(input.password, user.password_hash);
  
  if (!isValid) {
    return errorResponse('INVALID_CREDENTIALS', 'Invalid display name or password', 401);
  }
  
  // Update last_login_at
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);
  
  // Create JWT token (includes account_type for Auth Backend v1.0)
  const token = await createToken(
    {
      tenant_id: user.tenant_id,
      user_id: user.id,
      role: user.role as 'founder' | 'brand_admin' | 'member' | 'viewer',
      account_type: user.account_type || 'private',
    },
    jwtSecret,
    7 * 24 * 60 * 60 // 7 days
  );
  
  const response: AuthResponse = {
    token,
    user: {
      id: user.id,
      display_name: user.display_name,
      account_type: user.account_type || 'private',
      role: user.role as UserRole,
      tenant_id: user.tenant_id,
    },
  };
  
  return jsonResponse(response);
});

/**
 * GET /api/auth/me
 * Get current user and tenant info from JWT
 */
authHandler.get('/me', authMiddleware, async (c) => {
  const auth = getAuthContext(c);
  const supabase = getSupabaseClient(c.env);
  
  // Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, email, display_name, role, account_type, metadata, last_login_at, created_at')
    .eq('id', auth.userId)
    .single();
  
  if (userError || !user) {
    return errorResponse('USER_NOT_FOUND', 'User not found', 404);
  }
  
  // Get tenant info
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, tenant_type, description, created_at')
    .eq('id', auth.tenantId)
    .single();
  
  if (tenantError || !tenant) {
    return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404);
  }
  
  return jsonResponse({
    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      account_type: user.account_type || 'private',
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tenant_type: tenant.tenant_type || 'private',
      description: tenant.description,
      created_at: tenant.created_at,
    },
  });
});

export default authHandler;
