# ZORA CORE - Knowledge Store v1

**Agent Web Access v1** | Backend Only

This document describes the Knowledge Store v1 for ZORA CORE. This iteration provides persistent storage for web-ingested documents with pgvector embeddings, enabling semantic search across curated climate and sustainability knowledge.

## Overview

The Knowledge Store is EIVOR's extended memory for external knowledge. It stores documents ingested from the web by ODIN, making them searchable via semantic similarity and available to all Nordic agents.

Key features:

1. **Persistent Storage**: Documents stored in Supabase with full metadata
2. **Semantic Search**: pgvector embeddings for similarity-based retrieval
3. **Domain Classification**: Documents tagged by knowledge domain
4. **Multi-tenant Support**: Tenant-scoped and global (shared) documents
5. **Quality Scoring**: Automated quality assessment for ingested content
6. **Curation Status**: Track document review state (auto, reviewed, discarded)

## Schema

### knowledge_documents Table

```sql
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('web_page', 'api', 'report', 'standard', 'article')),
  source_url TEXT,
  domain TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  raw_excerpt TEXT,
  summary TEXT,
  embedding vector(1536),
  quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  curation_status TEXT NOT NULL DEFAULT 'auto' CHECK (curation_status IN ('auto', 'reviewed', 'discarded')),
  ingested_by_agent TEXT,
  ingested_by_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### knowledge_document_tags Table

```sql
CREATE TABLE IF NOT EXISTS knowledge_document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, tag)
);
```

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant ON knowledge_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_domain ON knowledge_documents(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_url ON knowledge_documents(source_url);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_curation ON knowledge_documents(curation_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding ON knowledge_documents 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_tags_document ON knowledge_document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_tags_tag ON knowledge_document_tags(tag);
```

## Knowledge Domains

Documents are classified into knowledge domains relevant to ZORA's climate-first mission:

| Domain | Description |
|--------|-------------|
| `climate_policy` | Climate regulations, agreements, policies |
| `hemp_materials` | Hemp and sustainable materials |
| `energy_efficiency` | Household and industrial energy efficiency |
| `sustainable_fashion` | Sustainable fashion and textiles |
| `carbon_markets` | Carbon credits, offsets, trading |
| `renewable_energy` | Solar, wind, hydro, etc. |
| `circular_economy` | Recycling, reuse, waste reduction |
| `biodiversity` | Ecosystems, conservation |
| `sustainable_agriculture` | Farming, food systems |
| `green_building` | Sustainable construction |
| `sustainable_transport` | EVs, public transit, cycling |
| `climate_science` | Climate research, IPCC reports |
| `impact_investing` | ESG, sustainable finance |
| `general` | General sustainability topics |

## API Reference

### insertKnowledgeDocument

Insert a new document into the knowledge store.

```typescript
import { insertKnowledgeDocument } from '../lib/knowledgeStore';

const doc = await insertKnowledgeDocument(supabase, {
  tenant_id: null, // null for global documents
  source_type: 'web_page',
  source_url: 'https://example.com/article',
  domain: 'climate_policy',
  language: 'en',
  title: 'Climate Policy Update 2025',
  raw_excerpt: 'The full text content...',
  summary: 'A summary of the article...',
  embedding: [0.1, 0.2, ...], // 1536-dimensional vector
  quality_score: 0.85,
  curation_status: 'auto',
  ingested_by_agent: 'ODIN',
  metadata: { word_count: 1250 },
  tags: ['climate', 'policy', '2025'],
});
```

### searchKnowledgeDocuments

Search documents using semantic similarity.

```typescript
import { searchKnowledgeDocuments } from '../lib/knowledgeStore';

const result = await searchKnowledgeDocuments(supabase, env, {
  query: 'What are the latest climate policies?',
  tenant_id: 'uuid', // for tenant-scoped search
  domain: 'climate_policy', // optional domain filter
  limit: 10,
  min_similarity: 0.5,
  include_global: true, // include global documents
});

// result.documents: KnowledgeDocumentWithSimilarity[]
// result.query_embedding: number[]
```

### listKnowledgeDocuments

List documents with filtering and pagination.

```typescript
import { listKnowledgeDocuments } from '../lib/knowledgeStore';

const docs = await listKnowledgeDocuments(supabase, tenantId, {
  domain: 'climate_policy',
  source_type: 'web_page',
  curation_status: 'auto',
}, 20, 0, true);
```

### getKnowledgeDocument

Get a single document by ID.

```typescript
import { getKnowledgeDocument } from '../lib/knowledgeStore';

const doc = await getKnowledgeDocument(supabase, documentId);
```

### updateKnowledgeDocument

Update document fields.

```typescript
import { updateKnowledgeDocument } from '../lib/knowledgeStore';

const updated = await updateKnowledgeDocument(supabase, documentId, {
  curation_status: 'reviewed',
  quality_score: 0.9,
});
```

### deleteKnowledgeDocument

Delete a document.

```typescript
import { deleteKnowledgeDocument } from '../lib/knowledgeStore';

await deleteKnowledgeDocument(supabase, documentId);
```

### getKnowledgeStoreStats

Get statistics about the knowledge store.

```typescript
import { getKnowledgeStoreStats } from '../lib/knowledgeStore';

const stats = await getKnowledgeStoreStats(supabase, tenantId);
// {
//   total_documents: 150,
//   by_domain: { climate_policy: 45, ... },
//   by_source_type: { web_page: 100, ... },
//   by_curation_status: { auto: 140, ... }
// }
```

### isUrlAlreadyIngested

Check if a URL has already been ingested.

```typescript
import { isUrlAlreadyIngested } from '../lib/knowledgeStore';

const exists = await isUrlAlreadyIngested(supabase, url, tenantId);
```

## Multi-tenant Support

The knowledge store supports both tenant-scoped and global documents:

### Tenant-scoped Documents

Documents with a `tenant_id` are only visible to that tenant:

```typescript
await insertKnowledgeDocument(supabase, {
  tenant_id: 'tenant-uuid',
  // ... other fields
});
```

### Global Documents

Documents with `tenant_id = null` are visible to all tenants:

```typescript
await insertKnowledgeDocument(supabase, {
  tenant_id: null, // global document
  // ... other fields
});
```

### Search Behavior

When searching, use `include_global: true` to include global documents:

```typescript
const result = await searchKnowledgeDocuments(supabase, env, {
  query: 'climate policy',
  tenant_id: 'tenant-uuid',
  include_global: true, // includes both tenant and global docs
});
```

The search uses the following logic:
- If `tenant_id` is provided and `include_global` is true: returns documents where `tenant_id = provided_id OR tenant_id IS NULL`
- If `tenant_id` is provided and `include_global` is false: returns only documents where `tenant_id = provided_id`
- If `tenant_id` is null: returns only global documents

## Embeddings

The knowledge store uses OpenAI's `text-embedding-3-small` model (1536 dimensions) for embeddings, consistent with EIVOR's semantic memory.

### Embedding Generation

Embeddings are generated using the shared `generateEmbedding()` helper:

```typescript
import { generateEmbedding } from '../lib/openai';

const embedding = await generateEmbedding(text, env);
```

### Semantic Search

The `search_knowledge_by_embedding` RPC function performs cosine similarity search:

```sql
CREATE OR REPLACE FUNCTION search_knowledge_by_embedding(
  query_embedding vector(1536),
  match_tenant_id UUID,
  match_domain TEXT,
  match_limit INT,
  min_similarity FLOAT,
  include_global BOOLEAN
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  source_type TEXT,
  source_url TEXT,
  domain TEXT,
  language TEXT,
  title TEXT,
  raw_excerpt TEXT,
  summary TEXT,
  quality_score NUMERIC,
  curation_status TEXT,
  ingested_by_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
```

## Quality Scoring

Documents are assigned a quality score (0-1) based on:

1. **Content Length**: Longer, more substantial content scores higher
2. **Title Quality**: Presence and quality of title
3. **Summary Quality**: Presence and quality of generated summary
4. **Source Reliability**: Trusted domains score higher

The quality score is computed during ingestion and can be updated during curation.

## Curation Status

Documents have a curation status to track review state:

| Status | Description |
|--------|-------------|
| `auto` | Automatically ingested, not yet reviewed |
| `reviewed` | Manually reviewed and approved |
| `discarded` | Marked as low quality or irrelevant |

Admins can update curation status via the admin API:

```bash
curl -X PATCH /api/admin/odin/documents/:id \
  -H "Authorization: Bearer <token>" \
  -d '{"curation_status": "reviewed"}'
```

## Admin API Endpoints

### GET /api/admin/odin/stats

Get knowledge store statistics.

### GET /api/admin/odin/documents

List documents with pagination and filtering.

Query parameters:
- `domain`: Filter by domain
- `source_type`: Filter by source type
- `curation_status`: Filter by curation status
- `limit`: Number of results (default 20)
- `offset`: Pagination offset

### GET /api/admin/odin/documents/:id

Get a specific document by ID.

### POST /api/admin/odin/search

Search documents semantically.

```json
{
  "query": "climate policy updates",
  "domain": "climate_policy",
  "limit": 10,
  "min_similarity": 0.5
}
```

## Integration with Agent Panel

The agent-panel `/ask` endpoint queries the knowledge store as part of its evidence gathering:

```
Question → ZORA Internal Search → Knowledge Store Search → [Live Web] → Answer
```

Knowledge documents are included in the evidence list with source attribution:

```json
{
  "evidences": [
    {
      "source": "knowledge_documents",
      "title": "Climate Policy Update 2025",
      "excerpt": "Summary of the document...",
      "url": "https://example.com/article",
      "relevance_score": 0.85
    }
  ]
}
```

## Future Enhancements

This is Knowledge Store v1. Future iterations may include:

- Full-text search in addition to semantic search
- Document versioning and history
- Automatic re-ingestion of updated sources
- Knowledge graph relationships between documents
- Citation tracking and source verification
- Multi-language support with translation
- Document clustering and topic modeling
