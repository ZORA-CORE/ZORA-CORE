-- ZORA CORE pgvector Semantic Memory Migration
-- Migration: 00002_pgvector_semantic_memory
-- Description: Enables pgvector extension and adds HNSW index for semantic search
--              on memory_events embeddings.
-- Date: 2025-11-28

-- ============================================================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================================================

-- Enable the pgvector extension for vector similarity search
-- Note: This requires pgvector to be installed on the Postgres instance.
-- Supabase has pgvector pre-installed and available.
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- HNSW INDEX FOR FAST SIMILARITY SEARCH
-- ============================================================================

-- Create an HNSW (Hierarchical Navigable Small World) index on the embedding column
-- for fast approximate nearest neighbor search.
--
-- Parameters:
-- - m: Maximum number of connections per layer (default 16, higher = better recall, more memory)
-- - ef_construction: Size of dynamic candidate list during index construction (default 64)
--
-- Using cosine distance operator class (vector_cosine_ops) as OpenAI embeddings
-- are normalized and cosine similarity is the recommended metric.

CREATE INDEX IF NOT EXISTS idx_memory_events_embedding_hnsw
ON memory_events
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- HELPER FUNCTION FOR SEMANTIC SEARCH
-- ============================================================================

-- Function to search memories by semantic similarity
-- Returns memories ordered by similarity to the query embedding
--
-- Parameters:
-- - query_embedding: The embedding vector to search for (1536 dimensions)
-- - match_count: Maximum number of results to return
-- - filter_agent: Optional agent name filter (NULL for all agents)
-- - filter_tags: Optional tags filter (NULL for all tags)
-- - filter_start_time: Optional start time filter (NULL for no limit)
-- - filter_end_time: Optional end time filter (NULL for no limit)
--
-- Returns: Table of memory events with similarity score

CREATE OR REPLACE FUNCTION search_memories_by_embedding(
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    filter_agent text DEFAULT NULL,
    filter_tags text[] DEFAULT NULL,
    filter_start_time timestamptz DEFAULT NULL,
    filter_end_time timestamptz DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    agent varchar(50),
    memory_type memory_type,
    content text,
    tags text[],
    metadata jsonb,
    session_id varchar(100),
    embedding vector(1536),
    created_at timestamptz,
    updated_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.agent,
        m.memory_type,
        m.content,
        m.tags,
        m.metadata,
        m.session_id,
        m.embedding,
        m.created_at,
        m.updated_at,
        1 - (m.embedding <=> query_embedding) as similarity
    FROM memory_events m
    WHERE m.embedding IS NOT NULL
        AND (filter_agent IS NULL OR m.agent = filter_agent)
        AND (filter_tags IS NULL OR m.tags && filter_tags)
        AND (filter_start_time IS NULL OR m.created_at >= filter_start_time)
        AND (filter_end_time IS NULL OR m.created_at <= filter_end_time)
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_memory_events_embedding_hnsw IS 
    'HNSW index for fast approximate nearest neighbor search on memory embeddings';

COMMENT ON FUNCTION search_memories_by_embedding IS 
    'Search memories by semantic similarity using pgvector cosine distance';

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================

-- To use semantic search from the Supabase client:
--
-- 1. Generate an embedding for your query text using OpenAI's text-embedding-3-small
-- 2. Call the RPC function:
--
--    const { data, error } = await supabase.rpc('search_memories_by_embedding', {
--        query_embedding: queryVector,  // 1536-dimensional float array
--        match_count: 10,
--        filter_agent: 'EIVOR',  // optional
--        filter_tags: ['climate', 'decision'],  // optional
--    });
--
-- The function returns memories ordered by similarity (highest first).
-- Similarity scores range from 0 to 1, where 1 is an exact match.
--
-- Performance considerations:
-- - The HNSW index provides fast approximate search (sub-linear time complexity)
-- - For best performance, ensure the embedding column is populated
-- - Consider using ef_search parameter for query-time recall/speed tradeoff
