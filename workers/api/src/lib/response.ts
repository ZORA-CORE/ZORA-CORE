import type { ApiError, PaginatedResponse, PaginationParams } from '../types';

/**
 * Standard JSON response with optional request ID header
 */
export function jsonResponse<T>(data: T, status = 200, requestId?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  };
  
  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }
  
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Legacy error response (for backward compatibility)
 */
export function errorResponse(error: string, message: string, status: number, requestId?: string): Response {
  const body: ApiError = { error, message, status };
  return jsonResponse(body, status, requestId);
}

/**
 * Consistent error JSON shape for Observability v1
 * Returns: { error: { code, message, details? } }
 */
export interface ConsistentError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function consistentErrorResponse(
  code: string, 
  message: string, 
  status: number, 
  details?: Record<string, unknown>,
  requestId?: string
): Response {
  const body: ConsistentError = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return jsonResponse(body, status, requestId);
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
