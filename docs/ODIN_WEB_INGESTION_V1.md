# ZORA CORE - ODIN Web Ingestion v1

**Agent Web Access v1** | Backend Only

This document describes the ODIN Web Ingestion v1 pipeline for ZORA CORE. This iteration enables ODIN (the Knowledge & Academy agent) to ingest external web content into the knowledge store, building a curated knowledge base for climate and sustainability topics.

## Overview

ODIN Web Ingestion is a pipeline that:

1. Fetches web content using WebTool
2. Extracts and cleans text content
3. Generates summaries using LLM (ODIN's voice)
4. Creates embeddings for semantic search
5. Stores documents in the knowledge store

Key features:

1. **Single URL Ingestion**: Ingest individual URLs on demand
2. **Batch Ingestion Jobs**: Process multiple URLs for a topic/domain
3. **Bootstrap Jobs**: Pre-defined jobs to populate initial knowledge
4. **Content Extraction**: Clean HTML to extract meaningful text
5. **LLM Summarization**: Generate concise summaries with ODIN's voice
6. **Quality Scoring**: Automated quality assessment
7. **Duplicate Detection**: Skip already-ingested URLs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ODIN Web Ingestion v1                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌────────────┐  │
│  │ WebTool │───▶│ Content  │───▶│   LLM   │───▶│ Knowledge  │  │
│  │ httpGet │    │ Extract  │    │ Summary │    │   Store    │  │
│  └─────────┘    └──────────┘    └─────────┘    └────────────┘  │
│       │              │               │               │          │
│       ▼              ▼               ▼               ▼          │
│  [Allowlist]   [Clean HTML]   [ODIN Voice]   [Embeddings]      │
│  [Timeout]     [Remove Nav]   [Quality]      [pgvector]        │
│  [Size Limit]  [Truncate]     [Domain]       [Tenant]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### ingestKnowledgeFromUrl

Ingest a single URL into the knowledge store.

```typescript
import { ingestKnowledgeFromUrl } from '../odin/ingestion';

const result = await ingestKnowledgeFromUrl(supabase, env, {
  url: 'https://en.wikipedia.org/wiki/Climate_change',
  domain: 'climate_science',
  language: 'en',
  tenant_id: null, // null for global documents
  initiated_by_user_id: 'user-uuid',
  initiated_by_agent: 'ODIN',
  skip_if_exists: true,
});

// result:
// {
//   success: true,
//   document_id: 'uuid',
//   title: 'Climate change - Wikipedia',
//   quality_score: 0.85,
//   word_count: 5000,
//   skipped: false,
//   error: null
// }
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | URL to ingest |
| `domain` | string | Yes | Knowledge domain classification |
| `language` | string | No | ISO language code (default: 'en') |
| `tenant_id` | string | No | Tenant ID (null for global) |
| `initiated_by_user_id` | string | No | User who triggered ingestion |
| `initiated_by_agent` | string | No | Agent that triggered ingestion |
| `skip_if_exists` | boolean | No | Skip if URL already ingested (default: true) |

### runOdinIngestionJob

Run a batch ingestion job with multiple URLs.

```typescript
import { runOdinIngestionJob } from '../odin/ingestion';

const result = await runOdinIngestionJob(supabase, env, {
  topic: 'climate policy',
  domain: 'climate_policy',
  language: 'en',
  urls: [
    'https://unfccc.int/process-and-meetings/the-paris-agreement',
    'https://www.ipcc.ch/report/ar6/syr/',
    // ... more URLs
  ],
  max_docs: 5,
  tenant_id: null,
  initiated_by_user_id: 'user-uuid',
});

// result:
// {
//   job_id: 'uuid',
//   topic: 'climate policy',
//   domain: 'climate_policy',
//   urls_attempted: 5,
//   urls_succeeded: 4,
//   urls_failed: 1,
//   urls_skipped: 0,
//   documents_created: ['uuid1', 'uuid2', ...],
//   errors: [{ url: '...', error: '...' }],
//   duration_ms: 15000
// }
```

### runBootstrapJob

Run a pre-defined bootstrap job.

```typescript
import { runBootstrapJob } from '../odin/ingestion';

const result = await runBootstrapJob(supabase, env, 'odin_bootstrap_climate_policy_knowledge', {
  initiated_by_user_id: 'user-uuid',
});
```

### getBootstrapJobNames

Get list of available bootstrap jobs.

```typescript
import { getBootstrapJobNames } from '../odin/ingestion';

const jobs = getBootstrapJobNames();
// ['odin_bootstrap_climate_policy_knowledge', 'odin_bootstrap_hemp_and_materials', ...]
```

## Bootstrap Jobs

Pre-defined bootstrap jobs populate the knowledge store with foundational content:

### odin_bootstrap_climate_policy_knowledge

Climate policy and regulations from authoritative sources.

**Sources:**
- UNFCCC Paris Agreement
- IPCC Reports
- EU Climate Law
- US EPA Climate Resources

**Domain:** `climate_policy`

### odin_bootstrap_hemp_and_materials

Hemp and sustainable materials knowledge.

**Sources:**
- Hemp industry resources
- Sustainable materials research
- Textile sustainability guides

**Domain:** `hemp_materials`

### odin_bootstrap_household_energy

Household energy efficiency and renewable energy.

**Sources:**
- Energy efficiency guides
- Renewable energy resources
- Home energy audits

**Domain:** `energy_efficiency`

### odin_bootstrap_sustainable_branding

Sustainable fashion and branding knowledge.

**Sources:**
- Sustainable fashion guides
- Eco-labeling standards
- Brand sustainability reports

**Domain:** `sustainable_fashion`

### odin_bootstrap_foundation_and_impact

Impact investing and foundation knowledge.

**Sources:**
- Impact investing resources
- ESG frameworks
- Foundation best practices

**Domain:** `impact_investing`

## Content Extraction

The ingestion pipeline extracts clean text from HTML:

1. **Remove Scripts/Styles**: Strip `<script>`, `<style>`, `<noscript>` tags
2. **Remove Navigation**: Strip `<nav>`, `<header>`, `<footer>`, `<aside>` tags
3. **Extract Text**: Get text content from remaining HTML
4. **Clean Whitespace**: Normalize whitespace and line breaks
5. **Truncate**: Limit to maximum content size (default 50,000 characters)

```typescript
function extractTextContent(html: string): string {
  // Remove script, style, and navigation elements
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Remove HTML tags and decode entities
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
```

## LLM Summarization

ODIN generates summaries using GPT-4o-mini with a specialized system prompt:

```typescript
const ODIN_SYSTEM_PROMPT = `You are ODIN, the Knowledge & Academy agent for ZORA CORE.
Your role is to analyze and summarize web content for the ZORA knowledge base.

When summarizing content:
1. Focus on key facts, insights, and actionable information
2. Preserve important numbers, dates, and specific claims
3. Maintain a neutral, informative tone
4. Highlight relevance to climate, sustainability, or ZORA's mission
5. Keep summaries concise but comprehensive (2-4 paragraphs)

Output format:
- Title: [extracted or generated title]
- Domain: [suggested knowledge domain]
- Quality: [0-1 score based on content quality]
- Summary: [your summary]`;
```

The LLM response is parsed to extract:
- **Title**: Document title (from content or generated)
- **Domain**: Suggested knowledge domain (may override input)
- **Quality Score**: Content quality assessment (0-1)
- **Summary**: Concise summary of the content

## Quality Scoring

Documents are assigned a quality score (0-1) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Word Count | 30% | Longer content scores higher (up to 5000 words) |
| Title Quality | 20% | Presence and descriptiveness of title |
| Summary Quality | 30% | Quality of generated summary |
| Source Domain | 20% | Trusted domains score higher |

```typescript
function computeQualityScore(content: string, title: string, summary: string, domain: string): number {
  let score = 0;
  
  // Word count (0-0.3)
  const wordCount = content.split(/\s+/).length;
  score += Math.min(wordCount / 5000, 1) * 0.3;
  
  // Title quality (0-0.2)
  if (title && title.length > 10) {
    score += 0.2;
  } else if (title) {
    score += 0.1;
  }
  
  // Summary quality (0-0.3)
  if (summary && summary.length > 200) {
    score += 0.3;
  } else if (summary && summary.length > 50) {
    score += 0.2;
  }
  
  // Source domain trust (0-0.2)
  const trustedDomains = ['wikipedia.org', 'ipcc.ch', 'unfccc.int', 'iea.org'];
  if (trustedDomains.some(d => domain.includes(d))) {
    score += 0.2;
  }
  
  return Math.min(score, 1);
}
```

## Admin API Endpoints

### POST /api/admin/odin/ingest-url

Ingest a single URL.

```bash
curl -X POST /api/admin/odin/ingest-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://en.wikipedia.org/wiki/Climate_change",
    "domain": "climate_science",
    "language": "en"
  }'
```

### POST /api/admin/odin/run-job

Run a bootstrap job.

```bash
curl -X POST /api/admin/odin/run-job \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "job_name": "odin_bootstrap_climate_policy_knowledge"
  }'
```

### GET /api/admin/odin/jobs

List available bootstrap jobs.

```bash
curl -X GET /api/admin/odin/jobs \
  -H "Authorization: Bearer <token>"
```

## Autonomy Integration

Bootstrap jobs are integrated into the autonomy system as task types:

| Task Type | Description |
|-----------|-------------|
| `odin.bootstrap_climate_policy_knowledge` | Run climate policy bootstrap job |
| `odin.bootstrap_hemp_and_materials` | Run hemp materials bootstrap job |
| `odin.bootstrap_household_energy` | Run household energy bootstrap job |
| `odin.bootstrap_sustainable_branding` | Run sustainable branding bootstrap job |
| `odin.bootstrap_foundation_and_impact` | Run foundation/impact bootstrap job |
| `odin.ingest_url` | Ingest a single URL (payload contains URL) |

Tasks can be created via the agent command console or scheduled via autonomy schedules.

## Observability

Ingestion operations are logged via the centralized logging middleware:

### Single URL Ingestion

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

### Batch Job Execution

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

## Error Handling

The ingestion pipeline handles errors gracefully:

| Error | Handling |
|-------|----------|
| Domain not allowed | Skip URL, log warning |
| Timeout | Skip URL, log error |
| Response too large | Skip URL, log error |
| LLM failure | Use fallback summary, reduce quality score |
| Embedding failure | Store without embedding, log error |
| Database error | Fail ingestion, log error |

Errors are collected and returned in the job result:

```typescript
{
  errors: [
    { url: 'https://blocked.com/page', error: 'DOMAIN_NOT_ALLOWED' },
    { url: 'https://slow.com/page', error: 'TIMEOUT' },
  ]
}
```

## Safety Considerations

### Rate Limiting

- Admin endpoints are rate-limited (30 requests/minute)
- Batch jobs process URLs sequentially with delays
- WebTool has built-in rate limiting per domain

### Content Limits

- Maximum content size: 50,000 characters
- Maximum URLs per job: 10
- Maximum response size: 1MB

### Domain Restrictions

- Only allowed domains can be fetched (see WEB_TOOL_V1.md)
- No internal/private network access
- No credential forwarding

### Human Oversight

- Bootstrap jobs require admin authentication
- All ingestion is logged for audit
- Documents can be reviewed and discarded via admin API

## Future Enhancements

This is ODIN Web Ingestion v1. Future iterations may include:

- Scheduled re-ingestion of updated sources
- RSS/Atom feed monitoring
- PDF and document parsing
- Multi-language content with translation
- Automatic domain classification
- Content deduplication across sources
- Citation and reference extraction
- Knowledge graph relationship building
