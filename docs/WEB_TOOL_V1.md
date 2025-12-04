# ZORA CORE - WebTool v1

**Agent Web Access v1** | Backend Only

This document describes the WebTool v1 layer for ZORA CORE. This iteration provides controlled internet access for Nordic agents (especially ODIN) with domain allowlists, timeouts, size limits, and rate limiting.

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

## Future Enhancements

This is WebTool v1. Future iterations may include:

- `searchWeb()` function for web search APIs
- Caching layer for frequently accessed URLs
- Per-tenant domain allowlists
- Request queuing and prioritization
- Retry logic with exponential backoff
- Content type detection and handling
- PDF and document parsing
