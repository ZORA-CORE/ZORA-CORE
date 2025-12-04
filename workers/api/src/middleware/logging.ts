/**
 * Request Logging Middleware for ZORA CORE
 * 
 * Backend Hardening v1 - Centralized logging for observability.
 * 
 * This middleware logs structured request/response data that can be used by:
 * - HEIMDALL for system monitoring
 * - Cloudflare's logging infrastructure
 * - Future Supabase metrics integration
 * 
 * Logged data (per request):
 * - timestamp
 * - method
 * - path
 * - status code
 * - duration (ms)
 * - tenant_id (if authenticated)
 * - user_id (if authenticated)
 * - request_id
 * - error_code (if error response)
 * 
 * Configuration via environment variables:
 * - LOGGING_ENABLED: Enable/disable request logging (default: true)
 * - LOGGING_SLOW_THRESHOLD_MS: Log slow requests above this threshold (default: 1000)
 */

import { Context, Next } from 'hono';
import type { AuthContext } from '../lib/auth';

export interface RequestLogEntry {
  timestamp: string;
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  tenant_id?: string;
  user_id?: string;
  error_code?: string;
  is_slow?: boolean;
  cf_ray?: string;
  client_ip?: string;
}

export interface ErrorLogEntry {
  timestamp: string;
  request_id: string;
  method: string;
  path: string;
  error_code: string;
  error_message: string;
  tenant_id?: string;
  user_id?: string;
  stack?: string;
}

/**
 * Log a structured request entry
 * Uses console.log with JSON for Cloudflare's logging infrastructure
 */
function logRequest(entry: RequestLogEntry): void {
  console.log(JSON.stringify({
    type: 'request',
    ...entry,
  }));
}

/**
 * Log a structured error entry
 * Uses console.error with JSON for Cloudflare's logging infrastructure
 */
function logError(entry: ErrorLogEntry): void {
  console.error(JSON.stringify({
    type: 'error',
    ...entry,
  }));
}

/**
 * Extract error code from response body if it's a standard error response
 */
async function extractErrorCode(response: Response): Promise<string | undefined> {
  if (response.status >= 400) {
    try {
      const cloned = response.clone();
      const body = await cloned.json() as Record<string, unknown>;
      const errorObj = body?.error as Record<string, unknown> | string | undefined;
      if (errorObj && typeof errorObj === 'object' && 'code' in errorObj) {
        return errorObj.code as string;
      }
      if (typeof errorObj === 'string') {
        return errorObj;
      }
    } catch {
      // Not JSON or couldn't parse
    }
  }
  return undefined;
}

export interface LoggingConfig {
  /** Enable/disable logging (default: true) */
  enabled?: boolean;
  /** Threshold in ms for slow request logging (default: 1000) */
  slowThresholdMs?: number;
  /** Skip logging for these paths (e.g., health checks) */
  skipPaths?: string[];
}

/**
 * Create a request logging middleware
 */
export function createLoggingMiddleware(config: LoggingConfig = {}) {
  const enabled = config.enabled !== false;
  const slowThresholdMs = config.slowThresholdMs ?? 1000;
  const skipPaths = config.skipPaths ?? ['/api/admin/health/basic'];

  return async (c: Context, next: Next) => {
    if (!enabled) {
      return next();
    }

    const path = new URL(c.req.url).pathname;
    
    // Skip logging for certain paths
    if (skipPaths.some(skip => path.startsWith(skip))) {
      return next();
    }

    const startTime = Date.now();
    const requestId = c.get('requestId') || crypto.randomUUID();

    // Execute the request
    await next();

    const durationMs = Date.now() - startTime;
    const status = c.res.status;

    // Get auth context if available
    const auth = c.get('auth') as AuthContext | undefined;

    // Extract error code if this is an error response
    const errorCode = await extractErrorCode(c.res);

    const logEntry: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      method: c.req.method,
      path,
      status,
      duration_ms: durationMs,
      tenant_id: auth?.tenantId,
      user_id: auth?.userId,
      error_code: errorCode,
      is_slow: durationMs > slowThresholdMs,
      cf_ray: c.req.header('cf-ray'),
      client_ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
    };

    logRequest(logEntry);

    // Log additional error details for 5xx errors
    if (status >= 500 && errorCode) {
      logError({
        timestamp: logEntry.timestamp,
        request_id: requestId,
        method: c.req.method,
        path,
        error_code: errorCode,
        error_message: 'Internal server error',
        tenant_id: auth?.tenantId,
        user_id: auth?.userId,
      });
    }
  };
}

/**
 * Log a custom metric event (for important operations)
 * 
 * Use this for:
 * - Auth events (login success/failure, register, lockout)
 * - Hybrid search / world model invocations
 * - Agent panel calls
 * - Slow or failed operations
 */
export function logMetricEvent(event: {
  category: string;
  name: string;
  tenant_id?: string;
  user_id?: string;
  duration_ms?: number;
  success: boolean;
  error_code?: string;
  metadata?: Record<string, unknown>;
}): void {
  console.log(JSON.stringify({
    type: 'metric',
    timestamp: new Date().toISOString(),
    ...event,
  }));
}

/**
 * Log an agent invocation event
 */
export function logAgentEvent(event: {
  agent: string;
  action: string;
  tenant_id?: string;
  user_id?: string;
  duration_ms?: number;
  success: boolean;
  error_code?: string;
  context?: string;
}): void {
  console.log(JSON.stringify({
    type: 'agent_event',
    timestamp: new Date().toISOString(),
    ...event,
  }));
}

/**
 * Default logging middleware instance
 */
export const loggingMiddleware = createLoggingMiddleware();
