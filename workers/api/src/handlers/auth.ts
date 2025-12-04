/**
 * Auth API handlers for ZORA CORE
 * 
 * Auth System v2 - Email + Password authentication with secure cookies
 * 
 * Provides password-based authentication endpoints:
 * - POST /api/auth/register - Create new tenant + founder user (email + password)
 * - POST /api/auth/login - Login with email + password (with lockout)
 * - POST /api/auth/refresh - Refresh access token using refresh token cookie
 * - POST /api/auth/logout - Logout and clear session cookies
 * - GET /api/auth/me - Get current user info from JWT/cookie
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
import { 
  generateTokenPair, 
  hashToken, 
  TOKEN_EXPIRY, 
  getExpiryTimestamp,
  COOKIE_CONFIG,
  buildCookieHeader,
  buildClearCookieHeader,
  parseCookies
} from '../lib/tokens';
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
  email: string;
  password: string;
  display_name?: string;
  account_type?: string;
}

interface LoginInput {
  email?: string;
  display_name?: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    display_name: string;
    account_type: string;
    role: UserRole;
    tenant_id: string;
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isProduction(env: AuthAppEnv['Bindings']): boolean {
  return env.ZORA_ENV === 'production' || !env.ZORA_ENV;
}

/**
 * POST /api/auth/register
 * Create a new tenant and founder user with email + password
 * Auth System v2: Uses email as primary identifier, sets secure cookies
 */
authHandler.post('/register', async (c) => {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  const supabase = getSupabaseClient(c.env);
  const isProd = isProduction(c.env);
  
  let input: RegisterInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.email || typeof input.email !== 'string' || !isValidEmail(input.email)) {
    return errorResponse('INVALID_EMAIL', 'A valid email address is required', 400);
  }
  
  if (!input.password || typeof input.password !== 'string' || input.password.length < 8) {
    return errorResponse('INVALID_PASSWORD', 'Password must be at least 8 characters', 400);
  }
  
  const accountType = input.account_type || 'private';
  if (!VALID_ACCOUNT_TYPES.includes(accountType)) {
    return errorResponse('INVALID_ACCOUNT_TYPE', `account_type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`, 400);
  }
  
  const email = input.email.trim().toLowerCase();
  const displayName = input.display_name?.trim() || email.split('@')[0];
  
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  
  if (existingUser) {
    return errorResponse('USER_EXISTS', 'A user with this email already exists', 409);
  }
  
  const passwordHash = await hashPassword(input.password);
  
  const tenantName = accountType === 'private' ? displayName : `${displayName}'s Organization`;
  const tenantSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: tenantName,
      slug: `${tenantSlug}-${Date.now()}`,
      description: `Tenant for ${displayName}`,
      tenant_type: accountType,
      metadata: { registered_at: new Date().toISOString() },
    })
    .select()
    .single();
  
  if (tenantError || !tenant) {
    return errorResponse('TENANT_CREATE_FAILED', `Failed to create tenant: ${tenantError?.message}`, 500);
  }
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      tenant_id: tenant.id,
      email: email,
      display_name: displayName,
      role: 'founder',
      account_type: accountType,
      password_hash: passwordHash,
      metadata: { registered: true },
    })
    .select()
    .single();
  
  if (userError || !user) {
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return errorResponse('USER_CREATE_FAILED', `Failed to create user: ${userError?.message}`, 500);
  }
  
  const accessToken = await createToken(
    {
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'founder',
      account_type: accountType,
    },
    jwtSecret,
    COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE
  );
  
  const { token: refreshToken, tokenHash: refreshTokenHash } = await generateTokenPair();
  const refreshExpiresAt = getExpiryTimestamp(TOKEN_EXPIRY.REFRESH_TOKEN);
  
  const userAgent = c.req.header('User-Agent') || null;
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null;
  
  await supabase.from('auth_sessions').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    refresh_token_hash: refreshTokenHash,
    expires_at: refreshExpiresAt,
    user_agent: userAgent,
    ip_address: ipAddress,
  });
  
  await supabase.from('journal_entries').insert({
    tenant_id: tenant.id,
    category: 'system_event',
    title: 'New User Registered',
    body: `New founder user registered: ${displayName} (${email})`,
    details: {
      user_id: user.id,
      email: email,
      display_name: displayName,
      account_type: accountType,
    },
  });
  
  const response: AuthResponse = {
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      account_type: user.account_type || 'private',
      role: user.role as UserRole,
      tenant_id: user.tenant_id,
    },
  };
  
  const accessCookie = buildCookieHeader(
    COOKIE_CONFIG.ACCESS_TOKEN_NAME,
    accessToken,
    COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    isProd
  );
  const refreshCookie = buildCookieHeader(
    COOKIE_CONFIG.REFRESH_TOKEN_NAME,
    refreshToken,
    COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    isProd
  );
  
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', accessCookie);
  headers.append('Set-Cookie', refreshCookie);
  
  return new Response(JSON.stringify(response), {
    status: 201,
    headers,
  });
});

/**
 * POST /api/auth/login
 * Login with email + password (with account lockout protection)
 * Auth System v2: Uses email as primary identifier, sets secure cookies
 * Also supports display_name for backward compatibility
 */
authHandler.post('/login', async (c) => {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  const maxFailedAttempts = parseInt(c.env.AUTH_MAX_FAILED_ATTEMPTS || String(DEFAULT_MAX_FAILED_ATTEMPTS), 10);
  const lockoutDurationMinutes = parseInt(c.env.AUTH_LOCKOUT_DURATION_MINUTES || String(DEFAULT_LOCKOUT_DURATION_MINUTES), 10);
  const supabase = getSupabaseClient(c.env);
  const isProd = isProduction(c.env);
  
  let input: LoginInput;
  try {
    input = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  
  if (!input.email && !input.display_name) {
    return errorResponse('MISSING_IDENTIFIER', 'email or display_name is required', 400);
  }
  
  if (!input.password || typeof input.password !== 'string') {
    return errorResponse('MISSING_PASSWORD', 'password is required', 400);
  }
  
  let user;
  if (input.email) {
    const email = input.email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    user = data;
    if (error || !user) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }
  } else {
    const displayName = input.display_name!.trim();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('display_name', displayName)
      .single();
    user = data;
    if (error || !user) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid display name or password', 401);
    }
  }
  
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
    
    await supabase
      .from('users')
      .update({ locked_until: null, failed_login_attempts: 0 })
      .eq('id', user.id);
  }
  
  if (!user.password_hash) {
    return errorResponse('PASSWORD_NOT_SET', 'This account does not have password authentication enabled.', 401);
  }
  
  const isValid = await verifyPassword(input.password, user.password_hash);
  
  if (!isValid) {
    const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
    
    if (newFailedAttempts >= maxFailedAttempts) {
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
      await supabase
        .from('users')
        .update({ failed_login_attempts: newFailedAttempts })
        .eq('id', user.id);
      
      const attemptsRemaining = maxFailedAttempts - newFailedAttempts;
      return errorResponse(
        'INVALID_CREDENTIALS',
        `Invalid credentials. ${attemptsRemaining} attempt(s) remaining before account lockout.`,
        401
      );
    }
  }
  
  await supabase
    .from('users')
    .update({ 
      last_login_at: new Date().toISOString(),
      failed_login_attempts: 0,
      locked_until: null
    })
    .eq('id', user.id);
  
  const accessToken = await createToken(
    {
      tenant_id: user.tenant_id,
      user_id: user.id,
      role: user.role as 'founder' | 'brand_admin' | 'member' | 'viewer',
      account_type: user.account_type || 'private',
    },
    jwtSecret,
    COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE
  );
  
  const { token: refreshToken, tokenHash: refreshTokenHash } = await generateTokenPair();
  const refreshExpiresAt = getExpiryTimestamp(TOKEN_EXPIRY.REFRESH_TOKEN);
  
  const userAgent = c.req.header('User-Agent') || null;
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null;
  
  await supabase.from('auth_sessions').insert({
    tenant_id: user.tenant_id,
    user_id: user.id,
    refresh_token_hash: refreshTokenHash,
    expires_at: refreshExpiresAt,
    user_agent: userAgent,
    ip_address: ipAddress,
  });
  
  const response: AuthResponse = {
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      account_type: user.account_type || 'private',
      role: user.role as UserRole,
      tenant_id: user.tenant_id,
    },
  };
  
  const accessCookie = buildCookieHeader(
    COOKIE_CONFIG.ACCESS_TOKEN_NAME,
    accessToken,
    COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    isProd
  );
  const refreshCookie = buildCookieHeader(
    COOKIE_CONFIG.REFRESH_TOKEN_NAME,
    refreshToken,
    COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    isProd
  );
  
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', accessCookie);
  headers.append('Set-Cookie', refreshCookie);
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers,
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token cookie
 * Auth System v2: Issues new access token if refresh token is valid
 */
authHandler.post('/refresh', async (c) => {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    return errorResponse('JWT_NOT_CONFIGURED', 'ZORA_JWT_SECRET is not configured', 500);
  }
  
  const supabase = getSupabaseClient(c.env);
  const isProd = isProduction(c.env);
  
  const cookieHeader = c.req.header('Cookie') ?? null;
  const cookies = parseCookies(cookieHeader);
  const refreshToken = cookies[COOKIE_CONFIG.REFRESH_TOKEN_NAME];
  
  if (!refreshToken) {
    return errorResponse('NO_REFRESH_TOKEN', 'No refresh token provided', 401);
  }
  
  const refreshTokenHash = await hashToken(refreshToken);
  
  const { data: session, error: sessionError } = await supabase
    .from('auth_sessions')
    .select('id, tenant_id, user_id, expires_at, revoked_at')
    .eq('refresh_token_hash', refreshTokenHash)
    .single();
  
  if (sessionError || !session) {
    return errorResponse('INVALID_REFRESH_TOKEN', 'Invalid refresh token', 401);
  }
  
  if (session.revoked_at) {
    return errorResponse('SESSION_REVOKED', 'Session has been revoked', 401);
  }
  
  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    return errorResponse('SESSION_EXPIRED', 'Session has expired', 401);
  }
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, email, display_name, role, account_type')
    .eq('id', session.user_id)
    .single();
  
  if (userError || !user) {
    return errorResponse('USER_NOT_FOUND', 'User not found', 404);
  }
  
  const accessToken = await createToken(
    {
      tenant_id: user.tenant_id,
      user_id: user.id,
      role: user.role as 'founder' | 'brand_admin' | 'member' | 'viewer',
      account_type: user.account_type || 'private',
    },
    jwtSecret,
    COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE
  );
  
  const accessCookie = buildCookieHeader(
    COOKIE_CONFIG.ACCESS_TOKEN_NAME,
    accessToken,
    COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    isProd
  );
  
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', accessCookie);
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
});

/**
 * POST /api/auth/logout
 * Logout and clear session cookies
 * Auth System v2: Revokes refresh token and clears cookies
 */
authHandler.post('/logout', async (c) => {
  const supabase = getSupabaseClient(c.env);
  const isProd = isProduction(c.env);
  
  const cookieHeader = c.req.header('Cookie') ?? null;
  const cookies = parseCookies(cookieHeader);
  const refreshToken = cookies[COOKIE_CONFIG.REFRESH_TOKEN_NAME];
  
  if (refreshToken) {
    const refreshTokenHash = await hashToken(refreshToken);
    
    await supabase
      .from('auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('refresh_token_hash', refreshTokenHash);
  }
  
  const clearAccessCookie = buildClearCookieHeader(COOKIE_CONFIG.ACCESS_TOKEN_NAME, isProd);
  const clearRefreshCookie = buildClearCookieHeader(COOKIE_CONFIG.REFRESH_TOKEN_NAME, isProd);
  
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', clearAccessCookie);
  headers.append('Set-Cookie', clearRefreshCookie);
  
  return new Response(JSON.stringify({ success: true, message: 'Logged out successfully' }), {
    status: 200,
    headers,
  });
});

/**
 * GET /api/auth/me
 * Get current user and tenant info from JWT/cookie
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
