/**
 * Auth API handlers for ZORA CORE
 * 
 * Provides password-based authentication endpoints:
 * - POST /api/auth/register - Create new tenant + founder user
 * - POST /api/auth/login - Login with display_name + password (with lockout)
 * - GET /api/auth/me - Get current user info from JWT
 * - POST /api/auth/password/forgot - Request password reset token
 * - POST /api/auth/password/reset - Reset password with token
 * - POST /api/auth/email/verify-request - Request email verification token
 * - POST /api/auth/email/verify - Verify email with token
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { AuthAppEnv } from '../middleware/auth';
import { authMiddleware, getAuthContext } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, errorResponse } from '../lib/response';
import { createToken } from '../lib/auth';
import { generateTokenPair, hashToken, TOKEN_EXPIRY, getExpiryTimestamp } from '../lib/tokens';
import type { User, Tenant, UserRole } from '../types';

const authHandler = new Hono<AuthAppEnv>();

// Password hashing configuration
const BCRYPT_ROUNDS = 10;

// Account lockout configuration (can be overridden via env vars)
const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_DURATION_MINUTES = 15;

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
 * Login with display_name and password (with account lockout protection)
 */
authHandler.post('/login', async (c) => {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  // Get lockout configuration from env vars or use defaults
  const maxFailedAttempts = parseInt(c.env.AUTH_MAX_FAILED_ATTEMPTS || String(DEFAULT_MAX_FAILED_ATTEMPTS), 10);
  const lockoutDurationMinutes = parseInt(c.env.AUTH_LOCKOUT_DURATION_MINUTES || String(DEFAULT_LOCKOUT_DURATION_MINUTES), 10);
  
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
  
  // Check if account is locked
  if (user.locked_until) {
    const lockedUntil = new Date(user.locked_until);
    const now = new Date();
    
    if (lockedUntil > now) {
      const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / (60 * 1000));
      return errorResponse(
        'ACCOUNT_LOCKED',
        `Account is locked due to too many failed login attempts. Try again in ${remainingMinutes} minute(s).`,
        423
      );
    }
    
    // Lock has expired, reset the lockout fields
    await supabase
      .from('users')
      .update({ locked_until: null, failed_login_attempts: 0 })
      .eq('id', user.id);
  }
  
  // Check if user has a password set
  if (!user.password_hash) {
    return errorResponse('PASSWORD_NOT_SET', 'This account does not have password authentication enabled. Please use the admin token flow.', 401);
  }
  
  // Verify password
  const isValid = await verifyPassword(input.password, user.password_hash);
  
  if (!isValid) {
    // Increment failed login attempts
    const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
    
    if (newFailedAttempts >= maxFailedAttempts) {
      // Lock the account
      const lockUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000).toISOString();
      await supabase
        .from('users')
        .update({ 
          failed_login_attempts: newFailedAttempts,
          locked_until: lockUntil
        })
        .eq('id', user.id);
      
      return errorResponse(
        'ACCOUNT_LOCKED',
        `Account has been locked due to ${maxFailedAttempts} failed login attempts. Try again in ${lockoutDurationMinutes} minutes.`,
        423
      );
    } else {
      // Just increment the counter
      await supabase
        .from('users')
        .update({ failed_login_attempts: newFailedAttempts })
        .eq('id', user.id);
      
      const attemptsRemaining = maxFailedAttempts - newFailedAttempts;
      return errorResponse(
        'INVALID_CREDENTIALS',
        `Invalid display name or password. ${attemptsRemaining} attempt(s) remaining before account lockout.`,
        401
      );
    }
  }
  
  // Successful login - reset failed attempts and update last_login_at
  await supabase
    .from('users')
    .update({ 
      last_login_at: new Date().toISOString(),
      failed_login_attempts: 0,
      locked_until: null
    })
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
  
  // Get user info (including email_verified_at for Security & Auth Hardening v1.0)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, email, display_name, role, account_type, metadata, last_login_at, created_at, email_verified_at')
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
      email_verified_at: user.email_verified_at,
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

// ============================================================================
// PASSWORD RESET FLOW
// ============================================================================

interface PasswordForgotInput {
  display_name: string;
}

interface PasswordResetInput {
  token: string;
  new_password: string;
}

/**
 * POST /api/auth/password/forgot
 * Request a password reset token
 * 
 * In production, this would send an email with the reset link.
 * For v1, we return a generic success message and log the token for founder access.
 */
authHandler.post('/password/forgot', async (c) => {
  const supabase = getSupabaseClient(c.env);
  const isDev = c.env.ZORA_ENV === 'development';
  
  // Parse request body
  let input: PasswordForgotInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.display_name || typeof input.display_name !== 'string') {
    return errorResponse('MISSING_DISPLAY_NAME', 'display_name is required', 400);
  }
  
  const displayName = input.display_name.trim();
  
  // Look up user by display_name
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id, display_name')
    .eq('display_name', displayName)
    .single();
  
  // Always return success to prevent user enumeration
  // Even if user doesn't exist, we don't reveal that
  if (!user) {
    return jsonResponse({ 
      message: 'If an account with that display name exists, a password reset link has been sent.' 
    });
  }
  
  // Generate token pair (raw token + hash)
  const { token, tokenHash } = await generateTokenPair();
  const expiresAt = getExpiryTimestamp(TOKEN_EXPIRY.PASSWORD_RESET);
  
  // Store the token hash in the database
  const { error: insertError } = await supabase
    .from('auth_password_reset_tokens')
    .insert({
      tenant_id: user.tenant_id,
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
  
  if (insertError) {
    console.error('Failed to store password reset token:', insertError);
    return errorResponse('TOKEN_STORE_FAILED', 'Failed to generate password reset token', 500);
  }
  
  // In dev mode, return the token for testing
  // In production, this would be sent via email
  if (isDev) {
    console.log(`[DEV] Password reset token for ${displayName}: ${token}`);
    return jsonResponse({ 
      message: 'If an account with that display name exists, a password reset link has been sent.',
      _dev_token: token // Only in dev mode
    });
  }
  
  // Log token for founder access (production)
  console.log(`[SECURITY] Password reset requested for user ${user.id}. Token hash: ${tokenHash.substring(0, 16)}...`);
  
  return jsonResponse({ 
    message: 'If an account with that display name exists, a password reset link has been sent.' 
  });
});

/**
 * POST /api/auth/password/reset
 * Reset password using a valid token
 */
authHandler.post('/password/reset', async (c) => {
  const supabase = getSupabaseClient(c.env);
  
  // Parse request body
  let input: PasswordResetInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.token || typeof input.token !== 'string') {
    return errorResponse('MISSING_TOKEN', 'token is required', 400);
  }
  
  if (!input.new_password || typeof input.new_password !== 'string' || input.new_password.length < 8) {
    return errorResponse('INVALID_PASSWORD', 'new_password must be at least 8 characters', 400);
  }
  
  // Hash the provided token to look up in database
  const tokenHash = await hashToken(input.token);
  
  // Find the token record
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('auth_password_reset_tokens')
    .select('id, user_id, tenant_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single();
  
  if (tokenError || !tokenRecord) {
    return errorResponse('INVALID_TOKEN', 'Invalid or expired password reset token', 400);
  }
  
  // Check if token has been used
  if (tokenRecord.used_at) {
    return errorResponse('TOKEN_USED', 'This password reset token has already been used', 400);
  }
  
  // Check if token has expired
  const expiresAt = new Date(tokenRecord.expires_at);
  if (expiresAt < new Date()) {
    return errorResponse('TOKEN_EXPIRED', 'This password reset token has expired', 400);
  }
  
  // Hash the new password
  const passwordHash = await hashPassword(input.new_password);
  
  // Update user's password and reset lockout counters
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      password_hash: passwordHash,
      failed_login_attempts: 0,
      locked_until: null
    })
    .eq('id', tokenRecord.user_id);
  
  if (updateError) {
    return errorResponse('PASSWORD_UPDATE_FAILED', 'Failed to update password', 500);
  }
  
  // Mark token as used
  await supabase
    .from('auth_password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id);
  
  // Create journal entry
  await supabase.from('journal_entries').insert({
    tenant_id: tokenRecord.tenant_id,
    category: 'system_event',
    event_type: 'password_reset',
    title: 'Password Reset',
    body: 'User password was reset via password reset token',
    details: { user_id: tokenRecord.user_id },
  });
  
  return jsonResponse({ message: 'Password has been reset successfully. You can now log in with your new password.' });
});

// ============================================================================
// EMAIL VERIFICATION FLOW
// ============================================================================

/**
 * POST /api/auth/email/verify-request
 * Request an email verification token (requires authentication)
 */
authHandler.post('/email/verify-request', authMiddleware, async (c) => {
  const auth = getAuthContext(c);
  const supabase = getSupabaseClient(c.env);
  const isDev = c.env.ZORA_ENV === 'development';
  
  // Check if email is already verified
  const { data: user } = await supabase
    .from('users')
    .select('id, email_verified_at, display_name')
    .eq('id', auth.userId)
    .single();
  
  if (!user) {
    return errorResponse('USER_NOT_FOUND', 'User not found', 404);
  }
  
  if (user.email_verified_at) {
    return errorResponse('ALREADY_VERIFIED', 'Email is already verified', 400);
  }
  
  // Generate token pair
  const { token, tokenHash } = await generateTokenPair();
  const expiresAt = getExpiryTimestamp(TOKEN_EXPIRY.EMAIL_VERIFICATION);
  
  // Store the token hash
  const { error: insertError } = await supabase
    .from('auth_email_verification_tokens')
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
  
  if (insertError) {
    console.error('Failed to store email verification token:', insertError);
    return errorResponse('TOKEN_STORE_FAILED', 'Failed to generate verification token', 500);
  }
  
  // In dev mode, return the token for testing
  if (isDev) {
    console.log(`[DEV] Email verification token for ${user.display_name}: ${token}`);
    return jsonResponse({ 
      message: 'Verification email has been sent.',
      _dev_token: token
    });
  }
  
  // Log for founder access (production)
  console.log(`[SECURITY] Email verification requested for user ${auth.userId}. Token hash: ${tokenHash.substring(0, 16)}...`);
  
  return jsonResponse({ message: 'Verification email has been sent.' });
});

interface EmailVerifyInput {
  token: string;
}

/**
 * POST /api/auth/email/verify
 * Verify email using a valid token
 */
authHandler.post('/email/verify', async (c) => {
  const supabase = getSupabaseClient(c.env);
  
  // Parse request body
  let input: EmailVerifyInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.token || typeof input.token !== 'string') {
    return errorResponse('MISSING_TOKEN', 'token is required', 400);
  }
  
  // Hash the provided token
  const tokenHash = await hashToken(input.token);
  
  // Find the token record
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('auth_email_verification_tokens')
    .select('id, user_id, tenant_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single();
  
  if (tokenError || !tokenRecord) {
    return errorResponse('INVALID_TOKEN', 'Invalid or expired verification token', 400);
  }
  
  // Check if token has been used
  if (tokenRecord.used_at) {
    return errorResponse('TOKEN_USED', 'This verification token has already been used', 400);
  }
  
  // Check if token has expired
  const expiresAt = new Date(tokenRecord.expires_at);
  if (expiresAt < new Date()) {
    return errorResponse('TOKEN_EXPIRED', 'This verification token has expired', 400);
  }
  
  // Update user's email_verified_at
  const { error: updateError } = await supabase
    .from('users')
    .update({ email_verified_at: new Date().toISOString() })
    .eq('id', tokenRecord.user_id);
  
  if (updateError) {
    return errorResponse('VERIFICATION_FAILED', 'Failed to verify email', 500);
  }
  
  // Mark token as used
  await supabase
    .from('auth_email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id);
  
  // Create journal entry
  await supabase.from('journal_entries').insert({
    tenant_id: tokenRecord.tenant_id,
    category: 'system_event',
    event_type: 'email_verified',
    title: 'Email Verified',
    body: 'User email was verified',
    details: { user_id: tokenRecord.user_id },
  });
  
  return jsonResponse({ message: 'Email has been verified successfully.' });
});

export default authHandler;
