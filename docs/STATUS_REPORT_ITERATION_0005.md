# ZORA CORE Status Report - Iteration 0005

**Date:** November 28, 2025  
**Iteration:** 0005  
**Focus:** pgvector & Semantic Memory for EIVOR  
**Status:** In Progress

---

## Executive Summary

Iteration 0005 upgrades EIVOR's memory system to support semantic search using pgvector. This enables ZORA CORE to retrieve memories by meaning rather than just simple filters, making the AI operating system more intelligent in how it recalls and uses past information.

---

## Current Architecture Review

### Memory Layer Structure

The current memory implementation consists of:

```
zora_core/memory/
├── base.py           # Abstract MemoryBackend interface, Memory dataclass
├── memory_store.py   # In-memory backend for testing
├── supabase_adapter.py # Supabase/Postgres backend
├── config.py         # Factory function, backend detection
└── cli.py            # CLI tool for memory operations
```

### Existing Schema

The `memory_events` table already includes an `embedding VECTOR(1536)` column, but:
- The pgvector extension is not explicitly enabled in the migration
- The SupabaseMemoryAdapter doesn't write or query embeddings
- No embedding generation is implemented

### AI Providers Configuration

The `config/ai_providers.yaml` already defines embedding models:
- `openai/text-embedding-3-large` (3072 dimensions)
- `openai/text-embedding-3-small` (1536 dimensions) - matches current schema

---

## Design for Semantic Memory

### 1. Database Schema Changes

**New Migration: `00002_pgvector_semantic_memory.sql`**

- Enable pgvector extension explicitly
- Add HNSW index for fast similarity search on `memory_events.embedding`
- Create a helper function for cosine similarity search

**Dimension Choice:** 1536 (matches existing schema and `text-embedding-3-small`)

This dimension provides a good balance between quality and performance. The schema already uses 1536, so no column changes needed.

### 2. Embedding Provider Integration

**New Module: `zora_core/models/embedding.py`**

Provides a clean interface for text embedding:

```python
class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text."""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        pass
```

**Implementations:**
- `OpenAIEmbeddingProvider` - Uses OpenAI's text-embedding-3-small
- `StubEmbeddingProvider` - Returns zero vectors when no API key configured

**Configuration:**
- `OPENAI_API_KEY` environment variable
- Falls back to stub provider with warning if not configured

### 3. SupabaseMemoryAdapter Enhancements

**New Methods:**
- `save_memory()` - Extended to compute and store embeddings
- `semantic_search()` - New method for vector similarity search

**Embedding Strategy:**
- Embed the `content` field of memory events
- For large content, truncate to reasonable length (8000 chars)
- Store embedding in the `embedding` column

**Error Handling:**
- If embedding fails, log warning and save memory without embedding
- System remains functional even if embedding provider is unavailable

### 4. Semantic Search Implementation

**Query Flow:**
1. User provides natural language query
2. Compute embedding for query text
3. Query pgvector using cosine distance: `embedding <=> query_embedding`
4. Combine with optional filters (agent, tags, time range)
5. Return top-k results ordered by similarity

**SQL Pattern:**
```sql
SELECT *, 1 - (embedding <=> $1) as similarity
FROM memory_events
WHERE embedding IS NOT NULL
  AND ($2::text IS NULL OR agent = $2)
  AND ($3::timestamptz IS NULL OR created_at >= $3)
ORDER BY embedding <=> $1
LIMIT $4;
```

### 5. Configuration Options

**New Environment Variables:**
- `OPENAI_API_KEY` - Required for embeddings (existing)
- `ZORA_EMBEDDINGS_ENABLED` - Enable/disable embeddings (default: true if API key present)
- `ZORA_EMBEDDING_MODEL` - Model to use (default: text-embedding-3-small)

**Config Flag in Memory Backend:**
- `enable_embeddings` parameter in SupabaseMemoryAdapter
- Allows disabling embeddings even if API key is present

---

## Files to Create/Modify

### New Files
- `supabase/migrations/00002_pgvector_semantic_memory.sql` - pgvector setup
- `zora_core/models/embedding.py` - Embedding provider interface and implementations
- `docs/MODEL_ROUTER_AND_EMBEDDINGS.md` - Embedding configuration docs

### Modified Files
- `zora_core/memory/supabase_adapter.py` - Add embedding storage and semantic search
- `zora_core/memory/base.py` - Add semantic_search to MemoryBackend interface
- `zora_core/memory/memory_store.py` - Add stub semantic_search for in-memory backend
- `zora_core/memory/config.py` - Add embedding configuration
- `zora_core/memory/cli.py` - Add semantic-demo command
- `docs/DATABASE_SCHEMA_v0_1.md` - Update to v0.2 with pgvector details
- `docs/TESTING.md` - Add semantic memory test instructions
- `docs/DEVELOPER_SETUP.md` - Add embedding setup instructions

---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| pgvector extension enabled in migration | Pending |
| HNSW index created for embeddings | Pending |
| Embedding provider interface created | Pending |
| OpenAI embedding provider implemented | Pending |
| Stub provider for no-API-key scenarios | Pending |
| SupabaseMemoryAdapter stores embeddings | Pending |
| Semantic search method implemented | Pending |
| CLI semantic-demo command works | Pending |
| Tests for embedding interface | Pending |
| Tests for semantic search | Pending |
| Documentation updated | Pending |
| Status report completed | In Progress |

---

## Tradeoffs and Constraints

### Tradeoffs Made

1. **1536 dimensions** - Using text-embedding-3-small for cost efficiency. Can upgrade to 3072 (text-embedding-3-large) later if needed.

2. **HNSW index** - Chosen over IVFFlat for better recall and no training requirement. Slightly higher memory usage but better for our scale.

3. **Cosine distance** - Using `<=>` operator (cosine distance) as it works well for normalized embeddings from OpenAI.

4. **Graceful degradation** - System works without embeddings if API key not configured, just without semantic search.

### Constraints

1. **OpenAI dependency** - Currently only OpenAI embeddings supported. Can add more providers later.

2. **No batch backfill** - Existing memories won't have embeddings until re-saved. Could add backfill script in future iteration.

3. **Single embedding per memory** - One embedding per memory event. Could add multi-vector support later for long content.

---

## Proposed Next Tasks (Iteration 0006+)

### Iteration 0006: Authentication & Multi-Tenant
- Implement JWT-based authentication
- Add user registration and login
- Implement proper RLS policies for memory isolation

### Iteration 0007: Agent Dashboards
- Wire agent status to live data
- Surface EIVOR's semantic memory in UI
- Add memory search interface

### Iteration 0008: Memory Backfill & Optimization
- Backfill embeddings for existing memories
- Add caching for frequent queries
- Implement memory summarization for long-term storage

---

*Report for ZORA CORE Iteration 0005*
