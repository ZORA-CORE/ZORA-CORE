# Backend Hardening v1

This document describes the backend hardening changes implemented in ZORA CORE to improve stability, consistency, and production readiness.

## Overview

Backend Hardening v1 focuses on making the existing backend stable and production-ready through:

1. Error response standardization
2. Auth and tenant isolation audit
3. Rate limiting on critical endpoints
4. Centralized request logging
5. Health and diagnostics endpoints

## Error Model and Response Consistency

All API endpoints now return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

The `standardError()` helper function in `workers/api/src/lib/response.ts` ensures this format is used consistently across all handlers.

### Error Codes

Common error codes used across the API:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No valid authentication token provided |
| `FORBIDDEN` | 403 | User lacks required role/permissions |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `VALIDATION_ERROR` | 400 | Request data failed validation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Implementation

Handlers use the `standardError()` function:

```typescript
import { standardError } from '../lib/response';

// Return a standardized error
return standardError('UNAUTHORIZED', 'Authentication required', 401);
```

Internal errors are logged server-side but not exposed to clients to prevent information leakage.

## Auth and Tenant Isolation

### What's Guaranteed Where

All protected routes enforce:

1. Valid JWT authentication (via cookie or Authorization header)
2. Tenant isolation (users can only access their own tenant's data)
3. Role-based access control where applicable

### Route Protection Matrix

| Route Pattern | Auth Required | Roles Allowed | Tenant Isolated |
|---------------|---------------|---------------|-----------------|
| `/api/auth/*` | No (public) | N/A | N/A |
| `/api/admin/health/basic` | No | N/A | N/A |
| `/api/admin/health/deep` | Yes | founder, brand_admin | Yes |
| `/api/admin/world-model/*` | Yes | founder, brand_admin | Yes |
| `/api/admin/hybrid-search/*` | Yes | founder, brand_admin | Yes |
| `/api/agent-panel/*` | Yes | All authenticated | Yes |
| `/api/climate/*` | Yes | All authenticated | Yes |
| `/api/goes-green/*` | Yes | All authenticated | Yes |
| `/api/shop/*` | Yes | All authenticated | Yes |
| `/api/foundation/*` | Yes | All authenticated | Yes |
| `/api/academy/*` | Yes | All authenticated | Yes |

### Defense in Depth

Critical handlers implement explicit auth checks within the handler itself, in addition to middleware-level protection. This ensures that even if middleware is bypassed, the handler still validates authentication and authorization.

Example from `hybrid-search.ts`:

```typescript
hybridSearchHandler.use('*', async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth) {
    return standardError('UNAUTHORIZED', 'Authentication required', 401);
  }
  
  if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
    return standardError('FORBIDDEN', 'Admin access required', 403);
  }
  
  await next();
});
```

## Rate Limiting

Rate limiting protects critical endpoints from abuse and ensures fair resource allocation.

### Rate-Limited Endpoints

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `/api/auth/login` | 10 requests | 1 minute | IP |
| `/api/auth/register` | 5 requests | 1 minute | IP |
| `/api/admin/hybrid-search/*` | 30 requests | 1 minute | User ID |
| `/api/admin/world-model/*` | 60 requests | 1 minute | User ID |
| `/api/agent-panel/*` | 60 requests | 1 minute | User ID |

### Configuration

Rate limits are configured in `workers/api/src/index.ts` using the `createRateLimiter` middleware:

```typescript
app.use('/api/auth/login', createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'auth_login',
}));
```

Rate limit configuration can be adjusted via environment variables in future iterations.

### Rate Limit Response

When rate limited, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

HTTP Status: 429 Too Many Requests

## Health and Diagnostics Endpoints

Two health endpoints are available for monitoring and ops:

### GET /api/admin/health/basic

Quick health check for uptime monitors and load balancers. Unauthenticated.

Response:

```json
{
  "status": "ok",
  "version": "0.7.0",
  "commit": "abc123...",
  "environment": "production",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/admin/health/deep

Detailed health check with dependency verification. Requires founder or brand_admin role.

Response:

```json
{
  "status": "ok",
  "version": "0.7.0",
  "commit": "abc123...",
  "environment": "production",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 45,
      "tenant_count": 5
    },
    "world_model": {
      "status": "ok",
      "version": "1.0.0",
      "node_count": 150,
      "edge_count": 200
    }
  }
}
```

### Status Values

- `ok`: All systems operational
- `degraded`: Some non-critical issues detected
- `error`: Critical issues detected

## Request Logging

All requests are logged with structured data for observability. See `OBSERVABILITY_AND_METRICS_V1.md` for details.

Logged fields per request:

- Request ID
- Route/path
- HTTP method
- Status code
- Duration (ms)
- Tenant ID (if authenticated)
- User ID (if authenticated)
- Error code (if error response)

Slow requests (>1000ms) are flagged in logs.

## Files Changed

### New Files

- `workers/api/src/handlers/health.ts` - Health check endpoints
- `workers/api/src/middleware/logging.ts` - Request logging middleware

### Modified Files

- `workers/api/src/lib/response.ts` - Added `standardError()` helper
- `workers/api/src/handlers/hybrid-search.ts` - Standardized errors, added auth checks
- `workers/api/src/handlers/world-model.ts` - Standardized errors, added auth checks
- `workers/api/src/index.ts` - Added rate limiting, logging middleware, health routes

## Testing

To verify the hardening changes:

1. Test error responses return consistent format
2. Test rate limiting blocks requests after threshold
3. Test health endpoints return expected status
4. Test auth checks prevent unauthorized access
5. Verify logs capture request metadata

## Future Improvements

- Add metrics aggregation and dashboards
- Implement circuit breakers for external dependencies
- Add request tracing with correlation IDs
- Expand rate limiting to more endpoints
- Add alerting for health check failures
