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

## WebTool & Knowledge Ingestion Metrics (Agent Web Access v1)

Agent Web Access v1 adds metrics for WebTool usage and ODIN knowledge ingestion operations.

### WebTool Usage Metrics

WebTool operations are logged with the following event structure:

```json
{
  "event_type": "webtool_usage",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "metadata": {
    "url": "https://example.com/api/data",
    "domain": "example.com",
    "status": 200,
    "duration_ms": 245,
    "content_length": 4096,
    "context": "agent_panel_ask"
  }
}
```

| Field | Description |
|-------|-------------|
| `url` | The URL that was fetched |
| `domain` | Extracted domain from URL |
| `status` | HTTP response status code |
| `duration_ms` | Request duration in milliseconds |
| `content_length` | Response body size in bytes |
| `context` | Where the WebTool was called from |

### Knowledge Ingestion Metrics

ODIN ingestion operations are logged with the following event structure:

```json
{
  "event_type": "odin_ingestion",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "metadata": {
    "url": "https://example.com/article",
    "domain": "climate_policy",
    "document_id": "uuid",
    "title": "Climate Policy Update 2025",
    "quality_score": 0.85,
    "word_count": 1250,
    "duration_ms": 3200
  }
}
```

| Field | Description |
|-------|-------------|
| `url` | Source URL that was ingested |
| `domain` | Knowledge domain classification |
| `document_id` | ID of created knowledge document |
| `title` | Extracted/generated document title |
| `quality_score` | Computed quality score (0-1) |
| `word_count` | Word count of extracted content |
| `duration_ms` | Total ingestion duration |

### Bootstrap Job Metrics

Bootstrap job executions are logged with aggregated results:

```json
{
  "event_type": "odin_bootstrap_job",
  "tenant_id": null,
  "user_id": "uuid",
  "metadata": {
    "job_name": "odin_bootstrap_climate_policy_knowledge",
    "topic": "climate policy",
    "domain": "climate_policy",
    "urls_attempted": 5,
    "urls_succeeded": 4,
    "urls_failed": 1,
    "documents_created": 4,
    "duration_ms": 15000
  }
}
```

### Agent Panel Ask Metrics

The `/api/agent-panel/ask` endpoint logs evidence attribution:

```json
{
  "event_type": "agent_panel_ask",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "metadata": {
    "question_length": 45,
    "context": "climate",
    "domain": "climate_policy",
    "knowledge_hits": 3,
    "internal_hits": 5,
    "live_web_used": false,
    "sources_used": ["zora_internal", "knowledge_documents"]
  }
}
```

| Field | Description |
|-------|-------------|
| `question_length` | Length of user's question |
| `context` | Agent panel context (climate, shop, etc.) |
| `domain` | Knowledge domain filter used |
| `knowledge_hits` | Number of knowledge documents matched |
| `internal_hits` | Number of internal ZORA strategies matched |
| `live_web_used` | Whether live web fallback was used |
| `sources_used` | Array of evidence sources used |

### Knowledge Store Statistics

The admin endpoint `GET /api/admin/odin/stats` returns knowledge store statistics:

```json
{
  "total_documents": 150,
  "by_domain": {
    "climate_policy": 45,
    "hemp_materials": 30,
    "energy_efficiency": 25,
    "sustainable_fashion": 20,
    "impact_investing": 15,
    "general": 15
  },
  "by_source_type": {
    "web_page": 100,
    "article": 30,
    "report": 15,
    "api": 5
  },
  "by_curation_status": {
    "auto": 140,
    "reviewed": 8,
    "discarded": 2
  }
}
```

### Example Queries for Knowledge Growth

Track knowledge store growth over time:

```sql
-- Documents ingested per day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as documents_ingested,
  AVG(quality_score) as avg_quality
FROM knowledge_documents
WHERE tenant_id IS NULL OR tenant_id = 'your-tenant-id'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Documents by domain
SELECT 
  domain,
  COUNT(*) as count,
  AVG(quality_score) as avg_quality
FROM knowledge_documents
GROUP BY domain
ORDER BY count DESC;

-- Top quality documents
SELECT 
  title,
  domain,
  quality_score,
  source_url
FROM knowledge_documents
WHERE quality_score > 0.8
ORDER BY quality_score DESC
LIMIT 20;
```

## Future Enhancements

This is Observability v1. Future iterations may include:

- External log aggregation (e.g., Datadog, Grafana)
- Real-time WebSocket updates
- Historical metrics and trends
- Alert thresholds and notifications
- Performance metrics (response times, error rates)
- Custom metric definitions per tenant
- WebTool usage dashboards and rate limit monitoring
- Knowledge ingestion pipeline health monitoring
- Evidence attribution analytics
