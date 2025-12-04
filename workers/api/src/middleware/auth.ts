/**
 * Authentication middleware for ZORA CORE API
 * 
 * Auth System v2: Supports both cookie-based and header-based authentication
 * 
 * Applies JWT authentication to protected routes and adds
 * auth context to the request for use by handlers.
 */

import { Context, Next, Env } from 'hono';
import type { Bindings } from '../types';
import { verifyAuthHeader, verifyToken, AuthError, AuthContext } from '../lib/auth';
import { jsonResponse } from '../lib/response';
import { parseCookies, COOKIE_CONFIG } from '../lib/tokens';

/**
 * Variables added to context by auth middleware
 */
export interface AuthVariables {
  auth: AuthContext;
  [key: string]: unknown;
}

/**
 * App environment with auth variables
 */
export interface AuthAppEnv extends Env {
  Bindings: Bindings;
  Variables: AuthVariables;
}

/**
 * Authentication middleware
 * 
 * Auth System v2: Supports both cookie-based and header-based authentication
 * 
 * Priority:
 * 1. Authorization header (Bearer token) - for backward compatibility and CLI/API clients
 * 2. Cookie (zora_access_token) - for browser-based sessions
 * 
 * Verifies JWT token and adds auth context to request.
 * Returns 401 for missing/invalid tokens, 403 for insufficient permissions.
 */
export async function authMiddleware(c: Context<AuthAppEnv>, next: Next) {
  const jwtSecret = c.env.ZORA_JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('ZORA_JWT_SECRET not configured');
    return jsonResponse(
      {
        error: 'AUTH_NOT_CONFIGURED',
        message: 'Authentication is not configured on this server',
        status: 500,
      },
      500
    );
  }

  try {
    const authHeader = c.req.header('Authorization') ?? null;
    
    if (authHeader) {
      const authContext = await verifyAuthHeader(authHeader, jwtSecret);
      c.set('auth', authContext);
      await next();
      return;
    }
    
    const cookieHeader = c.req.header('Cookie');
    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies[COOKIE_CONFIG.ACCESS_TOKEN_NAME];
    
    if (accessToken) {
      const payload = await verifyToken(accessToken, jwtSecret);
      const authContext: AuthContext = {
        tenantId: payload.tenant_id,
        userId: payload.user_id,
        role: payload.role,
        accountType: payload.account_type,
      };
      c.set('auth', authContext);
      await next();
      return;
    }
    
    throw new AuthError('NO_TOKEN', 'No authentication token provided', 401);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
          status: error.status,
        },
        error.status
      );
    }
    
    console.error('Auth middleware error:', error);
    return jsonResponse(
      {
        error: 'AUTH_ERROR',
        message: 'Authentication failed',
        status: 401,
      },
      401
    );
  }
}

/**
 * Role-based access control middleware
 * 
 * Use after authMiddleware to restrict access to specific roles.
 */
export function requireRole(...roles: Array<'founder' | 'brand_admin' | 'member' | 'viewer'>) {
  return async (c: Context<AuthAppEnv>, next: Next) => {
    const auth = c.get('auth');
    
    if (!auth) {
      return jsonResponse(
        {
          error: 'AUTH_REQUIRED',
          message: 'Authentication is required',
          status: 401,
        },
        401
      );
    }
    
    if (!roles.includes(auth.role as 'founder' | 'brand_admin' | 'member' | 'viewer')) {
      return jsonResponse(
        {
          error: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
          status: 403,
        },
        403
      );
    }
    
    await next();
  };
}

/**
 * Require write access (founder or brand_admin)
 */
export function requireWriteAccess() {
  return requireRole('founder', 'brand_admin');
}

/**
 * Require founder access
 */
export function requireFounder() {
  return requireRole('founder');
}

/**
 * Get auth context from request (for use in handlers)
 */
export function getAuthContext(c: Context<AuthAppEnv>): AuthContext {
  const auth = c.get('auth');
  if (!auth) {
    throw new AuthError('AUTH_REQUIRED', 'Authentication context not found', 401);
  }
  return auth;
}

/**
 * Get tenant ID from auth context
 */
export function getTenantId(c: Context<AuthAppEnv>): string {
  return getAuthContext(c).tenantId;
}

/**
 * Get user ID from auth context
 */
export function getUserId(c: Context<AuthAppEnv>): string {
  return getAuthContext(c).userId;
}
