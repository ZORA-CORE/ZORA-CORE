import type { ApiError, PaginatedResponse, PaginationParams } from '../types';

/**
 * Standard JSON response with optional request ID header
 * 
 * Note: CORS headers are handled by the top-level cors() middleware in index.ts.
 * This function only sets Content-Type and optional X-Request-ID.
 */
export function jsonResponse<T>(data: T, status = 200, requestId?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }
  
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * ============================================================================
 * STANDARD ERROR MODEL (Backend Hardening v1)
 * ============================================================================
 * 
 * All API errors should use this consistent shape:
 * 
 * {
 *   "error": {
 *     "code": "SOME_ERROR_CODE",
 *     "message": "Human readable message",
 *     "details": { ... optional extra context ... }
 *   }
 * }
 * 
 * Error codes should be SCREAMING_SNAKE_CASE and descriptive.
 * Messages should be human-readable and safe to display to users.
 * Details can include additional context for debugging (never include secrets).
 * 
 * Common error codes:
 * - UNAUTHORIZED: Missing or invalid authentication
 * - FORBIDDEN: Authenticated but not authorized for this action
 * - NOT_FOUND: Resource does not exist
 * - BAD_REQUEST: Invalid request parameters or body
 * - VALIDATION_ERROR: Request validation failed
 * - RATE_LIMIT_EXCEEDED: Too many requests
 * - INTERNAL_ERROR: Server-side error (log details, don't expose to client)
 * - TENANT_NOT_FOUND: Tenant does not exist
 * - USER_NOT_FOUND: User does not exist
 * ============================================================================
 */

export interface StandardError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Create a standard error response (Backend Hardening v1)
 * 
 * This is the canonical error response helper. All new code should use this.
 * 
 * @param code - Error code in SCREAMING_SNAKE_CASE (e.g., 'NOT_FOUND', 'UNAUTHORIZED')
 * @param message - Human-readable error message (safe to display to users)
 * @param status - HTTP status code
 * @param details - Optional additional context (never include secrets)
 * @param requestId - Optional request ID for tracing
 */
export function standardError(
  code: string, 
  message: string, 
  status: number, 
  details?: Record<string, unknown>,
  requestId?: string
): Response {
  const body: StandardError = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return jsonResponse(body, status, requestId);
}

/**
 * Legacy error response (for backward compatibility)
 * 
 * @deprecated Use standardError() instead for new code.
 * This function returns both the new standard shape AND legacy fields
 * to maintain backward compatibility with existing clients.
 */
export function errorResponse(error: string, message: string, status: number, requestId?: string): Response {
  // Return both standard shape and legacy fields for backward compatibility
  const body = {
    error: {
      code: error,
      message,
    },
    // Legacy fields (deprecated)
    status,
    message,
  };
  return jsonResponse(body, status, requestId);
}

/**
 * Consistent error JSON shape for Observability v1
 * @deprecated Use standardError() instead
 */
export interface ConsistentError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * @deprecated Use standardError() instead
 */
export function consistentErrorResponse(
  code: string, 
  message: string, 
  status: number, 
  details?: Record<string, unknown>,
  requestId?: string
): Response {
  return standardError(code, message, status, details, requestId);
}

export function notFoundResponse(resource: string): Response {
  return errorResponse('NOT_FOUND', `${resource} not found`, 404);
}

export function badRequestResponse(message: string): Response {
  return errorResponse('BAD_REQUEST', message, 400);
}

export function serverErrorResponse(message = 'Internal server error'): Response {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

export function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse('FORBIDDEN', message, 403);
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): Response {
  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total,
      has_more: params.offset + data.length < total,
    },
  };
  return jsonResponse(response);
}

export function parsePaginationParams(url: URL): PaginationParams {
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  return { limit, offset };
}

export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
