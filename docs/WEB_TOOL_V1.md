# ZORA CORE - WebTool v1 & v2

**Agent Web Access v1 & v2** | Backend Only

This document describes the WebTool layer for ZORA CORE. This provides controlled internet access for Nordic agents (especially ODIN) with domain allowlists, timeouts, size limits, and rate limiting.

## Version History

| Version | Description |
|---------|-------------|
| v1.0.0 | Initial release with env-based domain allowlist |
| v2.0.0 | DB-managed domain registry with auto-seeding and auto-add from curated sources |

## Overview

WebTool v1 provides a safe HTTP client layer that allows ZORA agents to fetch external web content while enforcing security constraints. The tool is designed to be used by the ODIN ingestion pipeline and the agent-panel for live web fallback.

Key features:

1. **Domain Allowlist**: Only fetch from pre-approved domains
2. **Request Timeouts**: Configurable timeout per request (default 10s)
3. **Response Size Limits**: Maximum response body size (default 1MB)
4. **Rate Limiting**: Built-in rate limiting per domain
5. **Error Handling**: Structured error types for different failure modes

## Configuration

WebTool is configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ZORA_WEBTOOL_ALLOWED_DOMAINS` | Comma-separated list of allowed domains | See below |
| `ZORA_WEBTOOL_DEFAULT_TIMEOUT_MS` | Default request timeout in milliseconds | 10000 |
| `ZORA_WEBTOOL_MAX_RESPONSE_SIZE` | Maximum response body size in bytes | 1048576 (1MB) |

### Default Allowed Domains

If `ZORA_WEBTOOL_ALLOWED_DOMAINS` is not set, the following domains are allowed by default:

- `wikipedia.org`, `en.wikipedia.org`
- `ipcc.ch` (IPCC climate reports)
- `unfccc.int` (UN Climate Change)
- `iea.org` (International Energy Agency)
- `eea.europa.eu` (European Environment Agency)
- `climatewatchdata.org`
- `ourworldindata.org`
- `nature.com`, `science.org`
- `arxiv.org`
- `gov.uk`, `europa.eu`

## API Reference

### httpGet

Fetch content from a URL using HTTP GET.

```typescript
import { httpGet } from '../webtool';

const result = await httpGet(url, env, options);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The URL to fetch |
| `env` | Env | Yes | Cloudflare Workers environment |
| `options.timeout_ms` | number | No | Request timeout in milliseconds |
| `options.max_size` | number | No | Maximum response size in bytes |

**Returns:**

```typescript
interface WebToolResponse {
  status: number;
  headers: Record<string, string>;
  body: string | null;
  url: string;
  duration_ms: number;
}
```

**Example:**

```typescript
try {
  const result = await httpGet('https://en.wikipedia.org/wiki/Climate_change', env, {
    timeout_ms: 5000,
  });
  
  if (result.status === 200) {
    console.log('Content:', result.body);
  }
} catch (error) {
  if (error instanceof WebToolError) {
    console.error('WebTool error:', error.code, error.message);
  }
}
```

### httpPost

Send data to a URL using HTTP POST.

```typescript
import { httpPost } from '../webtool';

const result = await httpPost(url, body, env, options);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The URL to post to |
| `body` | string | Yes | Request body (JSON string) |
| `env` | Env | Yes | Cloudflare Workers environment |
| `options.timeout_ms` | number | No | Request timeout in milliseconds |
| `options.max_size` | number | No | Maximum response size in bytes |
| `options.content_type` | string | No | Content-Type header (default: application/json) |

### isWebToolConfigured

Check if WebTool is properly configured.

```typescript
import { isWebToolConfigured } from '../webtool';

if (isWebToolConfigured(env)) {
  // WebTool is available
}
```

### getWebToolInfo

Get information about WebTool configuration.

```typescript
import { getWebToolInfo } from '../webtool';

const info = getWebToolInfo(env);
// {
//   version: '1.0.0',
//   configured: true,
//   allowed_domains_count: 15,
//   default_timeout_ms: 10000,
//   max_response_size: 1048576
// }
```

## Error Handling

WebTool uses a custom `WebToolError` class for structured error handling:

```typescript
class WebToolError extends Error {
  code: WebToolErrorCode;
  details?: Record<string, unknown>;
}

type WebToolErrorCode =
  | 'DOMAIN_NOT_ALLOWED'
  | 'TIMEOUT'
  | 'RESPONSE_TOO_LARGE'
  | 'NETWORK_ERROR'
  | 'INVALID_URL'
  | 'HTTP_ERROR';
```

**Error Codes:**

| Code | Description |
|------|-------------|
| `DOMAIN_NOT_ALLOWED` | URL domain is not in the allowlist |
| `TIMEOUT` | Request exceeded timeout |
| `RESPONSE_TOO_LARGE` | Response body exceeded size limit |
| `NETWORK_ERROR` | Network-level error (DNS, connection, etc.) |
| `INVALID_URL` | URL is malformed or invalid |
| `HTTP_ERROR` | HTTP error response (4xx, 5xx) |

**Example Error Handling:**

```typescript
import { httpGet, WebToolError } from '../webtool';

try {
  const result = await httpGet(url, env);
} catch (error) {
  if (error instanceof WebToolError) {
    switch (error.code) {
      case 'DOMAIN_NOT_ALLOWED':
        console.log('Domain not in allowlist:', error.details?.domain);
        break;
      case 'TIMEOUT':
        console.log('Request timed out');
        break;
      case 'RESPONSE_TOO_LARGE':
        console.log('Response too large:', error.details?.size);
        break;
      default:
        console.log('WebTool error:', error.message);
    }
  }
}
```

## Security Considerations

### Domain Allowlist

The domain allowlist is the primary security control. Only domains explicitly listed can be fetched. This prevents:

- Fetching from internal/private networks
- Accessing sensitive APIs without authorization
- Scraping arbitrary websites

To add a new domain, update the `ZORA_WEBTOOL_ALLOWED_DOMAINS` environment variable.

### Request Limits

Timeouts and size limits prevent:

- Denial of service from slow responses
- Memory exhaustion from large responses
- Resource starvation from long-running requests

### No Credential Forwarding

WebTool does not forward authentication headers or cookies. Each request is made as an anonymous client.

## Integration with ODIN Ingestion

WebTool is the foundation for ODIN's knowledge ingestion pipeline:

```
URL → WebTool.httpGet() → Content Extraction → LLM Summary → Knowledge Store
```

The ingestion pipeline uses WebTool to:

1. Fetch web pages from allowed domains
2. Extract text content (removing scripts, styles, navigation)
3. Generate summaries using ODIN's LLM
4. Store documents in the knowledge store with embeddings

See `ODIN_WEB_INGESTION_V1.md` for details on the ingestion pipeline.

## Integration with Agent Panel

The agent-panel `/ask` endpoint uses WebTool as a fallback when knowledge coverage is insufficient:

```
Question → ZORA Internal Search → Knowledge Store Search → [Live Web Fallback] → Answer
```

Live web fallback is:

- Disabled by default (opt-in via `include_live_web: true`)
- Only triggered when knowledge coverage is poor
- Limited to simple searches (Wikipedia API)
- Logged for observability

## Observability

WebTool usage is logged via the centralized logging middleware:

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
    "context": "odin_ingestion"
  }
}
```

See `OBSERVABILITY_AND_METRICS_V1.md` for details on metrics and logging.

## WebTool v2.0 - DB-Managed Domain Registry

WebTool v2.0 introduces a database-managed domain registry that replaces the env-only configuration. This provides better manageability, audit trails, and auto-seeding capabilities.

### Key Changes in v2.0

1. **DB-Managed Domain Registry**: Primary source of truth is now the `webtool_allowed_domains` table
2. **Auto-Seeding**: Registry is automatically seeded from env vars or code defaults when empty
3. **Auto-Add from Curated Sources**: ODIN bootstrap jobs automatically register their domains
4. **Admin API**: CRUD endpoints for managing allowed domains
5. **Per-Isolate Caching**: 60-second TTL cache for domain lookups in Cloudflare Workers

### Database Schema

```sql
CREATE TABLE webtool_allowed_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain TEXT NOT NULL UNIQUE,
    label TEXT,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'manual_admin',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Source Types:**

| Source | Description |
|--------|-------------|
| `hardcoded` | Default domains defined in code |
| `env_seed` | Seeded from `ZORA_WEBTOOL_ALLOWED_DOMAINS` env var |
| `bootstrap_job` | Auto-added from ODIN curated bootstrap jobs |
| `manual_admin` | Manually added via admin API |

### Admin API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/webtool/allowed-domains` | GET | List allowed domains with pagination/filters |
| `/api/admin/webtool/allowed-domains` | POST | Create a new allowed domain |
| `/api/admin/webtool/allowed-domains/:id` | GET | Get a specific domain |
| `/api/admin/webtool/allowed-domains/:id` | PATCH | Update a domain (toggle is_enabled, edit label) |
| `/api/admin/webtool/allowed-domains/:id` | DELETE | Delete a domain |
| `/api/admin/webtool/registry-stats` | GET | Get registry statistics |
| `/api/admin/webtool/seed-registry` | POST | Manually trigger registry seeding |

### Using v2 Registry Mode

To use the DB registry mode, pass a Supabase client to the WebTool options:

```typescript
import { httpGet } from '../webtool';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const result = await httpGet(url, env, {
  supabase,  // Enable DB registry mode
  timeout_ms: 5000,
});
```

Without the `supabase` option, WebTool falls back to the legacy env-based mode.

### Auto-Add Domains from Curated Sources

ODIN bootstrap jobs automatically register their domains before fetching:

```typescript
import { ensureCuratedDomainAllowed } from '../webtool';

// Before fetching from a curated URL
await ensureCuratedDomainAllowed(supabase, env, url, 'bootstrap_job');
```

This only works for curated (code-defined) URLs, not arbitrary user URLs.

### Registry Seeding

On first use, the registry is automatically seeded with default domains:

1. Code-defined defaults (Wikipedia, IPCC, UNFCCC, IEA, etc.)
2. Domains from `ZORA_WEBTOOL_ALLOWED_DOMAINS` env var (if set)

Seeding is idempotent - existing domains are not overwritten.

### Caching Strategy

Domain lookups use a per-isolate cache with 60-second TTL:

- Cache is stored in module-level variables
- Each Cloudflare Worker isolate has its own cache
- Cache is invalidated after 60 seconds or on admin updates

### Frontend Admin UI

A simple admin UI is available at `/admin/odin` for:

- Viewing all allowed domains with filters
- Toggling domain enabled/disabled status
- Viewing registry statistics

## Future Enhancements

Future iterations may include:

- `searchWeb()` function for web search APIs
- Per-tenant domain allowlists
- Request queuing and prioritization
- Retry logic with exponential backoff
- Content type detection and handling
- PDF and document parsing
