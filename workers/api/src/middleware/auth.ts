/**
 * Authentication middleware for ZORA CORE API
 * 
 * Applies JWT authentication to protected routes and adds
 * auth context to the request for use by handlers.
 */

import { Context, Next, Env } from 'hono';
import type { Bindings } from '../types';
import { verifyAuthHeader, AuthError, AuthContext } from '../lib/auth';
import { jsonResponse } from '../lib/response';

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
 * Verifies JWT token from Authorization header and adds auth context to request.
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
    const authContext = await verifyAuthHeader(authHeader, jwtSecret);
    
    // Add auth context to request variables
    c.set('auth', authContext);
    
    await next();
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
