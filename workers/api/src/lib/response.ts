import type { ApiError, PaginatedResponse, PaginationParams } from '../types';

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function errorResponse(error: string, message: string, status: number): Response {
  const body: ApiError = { error, message, status };
  return jsonResponse(body, status);
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
