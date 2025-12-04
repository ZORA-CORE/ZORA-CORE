# ZORA CORE - Observability & System Metrics v1

**Iteration 00B6** | Backend Only

This document describes the Observability & System Metrics v1 layer for ZORA CORE. This iteration adds system metrics endpoints, autonomy health monitoring, consistent error handling, and request ID propagation for debugging.

## Overview

The Observability & Metrics v1 layer provides:

1. **System Metrics API**: Tenant-scoped snapshot of users, climate, ZORA SHOP, and autonomy data
2. **Autonomy Health API**: Detailed view of tasks, schedules, and commands status
3. **Consistent Error Shape**: Standardized JSON error format across admin endpoints
4. **Request ID Propagation**: X-Request-ID header for request tracing and debugging

## API Endpoints

### GET /api/admin/system-metrics

Returns a tenant-scoped system metrics snapshot. Requires JWT authentication with `founder` or `brand_admin` role.

**Response Shape:**

```json
{
  "tenant": {
    "id": "uuid",
    "name": "ZORA CORE"
  },
  "users": {
    "total_users": 3
  },
  "climate": {
    "total_profiles": 2,
    "total_missions": 24,
    "missions_completed": 10,
    "missions_in_progress": 5,
    "missions_planned": 9,
    "total_estimated_impact_kgco2": 230.5
  },
  "zora_shop": {
    "total_brands": 4,
    "total_products": 12,
    "total_projects": 3,
    "projects_by_status": {
      "idea": 1,
      "concept": 1,
      "launched": 1
    }
  },
  "autonomy": {
    "total_agent_commands": 15,
    "commands_by_status": {
      "received": 3,
      "tasks_created": 10,
      "failed": 2
    },
    "total_agent_tasks": 40,
    "tasks_by_status": {
      "pending": 5,
      "in_progress": 1,
      "completed": 30,
      "failed": 4
    },
    "tasks_requiring_approval": 2,
    "total_schedules": 4,
    "schedules_enabled": 3,
    "schedules_due_now": 1
  }
}
```

### GET /api/admin/autonomy-status

Returns detailed autonomy health status for the current tenant. Requires JWT authentication with `founder` or `brand_admin` role.

**Response Shape:**

```json
{
  "tasks": {
    "pending_total": 5,
    "pending_auto_executable": 3,
    "pending_awaiting_approval": 2,
    "recent_failed": [
      {
        "id": "uuid",
        "task_type": "zora_shop.update_product_climate_meta",
        "error_message": "Product not found",
        "updated_at": "2025-11-28T07:45:00Z"
      }
    ]
  },
  "schedules": {
    "total": 4,
    "enabled": 3,
    "due_now": 1,
    "recently_run": [
      {
        "id": "uuid",
        "schedule_type": "climate.generate_weekly_plan",
        "last_run_at": "2025-11-28T07:00:00Z"
      }
    ]
  },
  "commands": {
    "recent_commands": [
      {
        "id": "uuid",
        "command_text": "Suggest 5 new climate missions...",
        "status": "tasks_created",
        "created_at": "2025-11-28T06:55:00Z"
      }
    ]
  }
}
```

## Access Control

Both endpoints require:

1. **JWT Authentication**: Valid Bearer token in Authorization header
2. **Role Check**: User must have `founder` or `brand_admin` role
3. **Tenant Scoping**: All metrics are scoped to the authenticated user's tenant

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid JWT token |
| 403 | FORBIDDEN | User role is not founder or brand_admin |

## Consistent Error Shape

All admin endpoints now return errors in a consistent JSON format:

```json
{
  "error": {
    "code": "string_error_code",
    "message": "Human readable message",
    "details": {
      "optional": "extra info",
      "request_id": "uuid"
    }
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `not_found` | 404 | Resource or endpoint not found |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Insufficient permissions |
| `validation_error` | 400 | Invalid request data |
| `internal_error` | 500 | Unexpected server error |

## Request ID Propagation

Every request to the ZORA CORE API now includes request ID tracking:

### How It Works

1. **Incoming Request**: If the request includes an `X-Request-ID` header, that ID is used
2. **ID Generation**: If no header is present, a new UUID v4 is generated
3. **Response Header**: The `X-Request-ID` header is included in all responses
4. **Error Logging**: All errors are logged with the request ID for debugging

### Usage

**Client-side (optional):**
```bash
curl -H "X-Request-ID: my-trace-id-123" \
     -H "Authorization: Bearer <token>" \
     https://api.zoracore.dk/api/admin/system-metrics
```

**Response Headers:**
```
X-Request-ID: my-trace-id-123
Content-Type: application/json
```

### Debugging

When an error occurs, the request ID is included in:

1. Server-side logs (Cloudflare Workers logs)
2. Error response `details.request_id` field

This allows correlating client errors with server logs for debugging.

## Metrics Explained

### Climate Metrics

| Metric | Description |
|--------|-------------|
| `total_profiles` | Number of climate profiles for the tenant |
| `total_missions` | Total climate missions across all profiles |
| `missions_completed` | Missions with status = 'completed' |
| `missions_in_progress` | Missions with status = 'in_progress' |
| `missions_planned` | Missions with status = 'planned' |
| `total_estimated_impact_kgco2` | Sum of estimated CO2 impact across all missions |

### ZORA SHOP Metrics

| Metric | Description |
|--------|-------------|
| `total_brands` | Number of brands for the tenant |
| `total_products` | Number of products for the tenant |
| `total_projects` | Number of ZORA SHOP projects |
| `projects_by_status` | Breakdown of projects by status (idea, concept, launched, etc.) |

### Autonomy Metrics

| Metric | Description |
|--------|-------------|
| `total_agent_commands` | Total commands submitted to agents |
| `commands_by_status` | Breakdown by status (received, tasks_created, failed) |
| `total_agent_tasks` | Total tasks in the agent task queue |
| `tasks_by_status` | Breakdown by status (pending, in_progress, completed, failed) |
| `tasks_requiring_approval` | Tasks pending manual approval |
| `total_schedules` | Total autonomy schedules |
| `schedules_enabled` | Number of enabled schedules |
| `schedules_due_now` | Schedules that are due for execution |

### Autonomy Health Details

| Metric | Description |
|--------|-------------|
| `pending_total` | Total pending tasks |
| `pending_auto_executable` | Pending tasks that can auto-execute |
| `pending_awaiting_approval` | Pending tasks waiting for manual approval |
| `recent_failed` | Last 10 failed tasks with error details |
| `recently_run` | Last 10 schedules that have executed |
| `recent_commands` | Last 10 agent commands |

## Building Admin Dashboards

These endpoints provide the data layer for building admin dashboards. Example use cases:

1. **System Health Dashboard**: Display overall system metrics on a single page
2. **Autonomy Monitor**: Track task execution, failures, and approval queue
3. **Climate Progress Tracker**: Visualize mission completion and impact
4. **ZORA SHOP Overview**: Monitor brand/product/project counts

### Polling Strategy

For real-time dashboards, consider:

- **System Metrics**: Poll every 30-60 seconds
- **Autonomy Status**: Poll every 10-30 seconds for active monitoring
- **Use WebSockets**: For future iterations, consider WebSocket connections for real-time updates

## Request Logging Middleware (Backend Hardening v1)

Backend Hardening v1 adds a centralized request logging middleware that captures structured data for every API request.

### Logged Fields

| Field | Description |
|-------|-------------|
| `request_id` | Unique request identifier (from X-Request-ID or generated) |
| `method` | HTTP method (GET, POST, etc.) |
| `path` | Request path |
| `status` | HTTP response status code |
| `duration_ms` | Request duration in milliseconds |
| `tenant_id` | Authenticated user's tenant ID (if available) |
| `user_id` | Authenticated user's ID (if available) |
| `error_code` | Error code from response (if error) |
| `is_slow` | Boolean flag for slow requests (>1000ms) |

### Configuration

The logging middleware is configured in `workers/api/src/index.ts`:

```typescript
app.use('*', createLoggingMiddleware({
  enabled: true,
  slowThresholdMs: 1000,
  skipPaths: ['/api/admin/health/basic'],
}));
```

### Log Output

Logs are written to Cloudflare Workers logs in JSON format:

```json
{
  "type": "request",
  "request_id": "uuid",
  "method": "POST",
  "path": "/api/climate/missions",
  "status": 200,
  "duration_ms": 45,
  "tenant_id": "uuid",
  "user_id": "uuid",
  "is_slow": false
}
```

### Metric Events

The logging middleware also supports metric event logging for specific operations:

```typescript
import { logMetricEvent } from '../middleware/logging';

logMetricEvent('hybrid_search', 'find_similar_tenants', {
  tenant_id: auth.tenantId,
  result_count: results.length,
  duration_ms: endTime - startTime,
});
```

## Future Enhancements

This is Observability v1. Future iterations may include:

- External log aggregation (e.g., Datadog, Grafana)
- Real-time WebSocket updates
- Historical metrics and trends
- Alert thresholds and notifications
- Performance metrics (response times, error rates)
- Custom metric definitions per tenant
