-- ZORA CORE Memory Provider Metadata Migration
-- Migration: 00003_memory_provider_metadata
-- Description: Adds provider and model metadata columns to memory_events table
--              to track which LLM and embedding provider/model was used.
-- Date: 2025-11-28

-- ============================================================================
-- ADD PROVIDER/MODEL METADATA COLUMNS TO MEMORY_EVENTS
-- ============================================================================

-- Add LLM provider/model columns (for content generation)
-- These track which LLM was used to generate the memory content (if applicable)
ALTER TABLE memory_events
ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);

-- Add embedding provider/model columns
-- These track which embedding provider/model was used to generate the vector
ALTER TABLE memory_events
ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100);

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Index for filtering by LLM provider
CREATE INDEX IF NOT EXISTS idx_memory_events_llm_provider 
ON memory_events(llm_provider);

-- Index for filtering by embedding provider
CREATE INDEX IF NOT EXISTS idx_memory_events_embedding_provider 
ON memory_events(embedding_provider);

-- ============================================================================
-- UPDATE SEARCH FUNCTION TO RETURN NEW COLUMNS
-- ============================================================================

-- Drop and recreate the search function to include new columns
DROP FUNCTION IF EXISTS search_memories_by_embedding(vector(1536), int, text, text[], timestamptz, timestamptz);

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
    created_at timestamptz,
    updated_at timestamptz,
    llm_provider varchar(50),
    llm_model varchar(100),
    embedding_provider varchar(50),
    embedding_model varchar(100),
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
        m.created_at,
        m.updated_at,
        m.llm_provider,
        m.llm_model,
        m.embedding_provider,
        m.embedding_model,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM memory_events m
    WHERE 
        m.embedding IS NOT NULL
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

COMMENT ON COLUMN memory_events.llm_provider IS 'Provider that generated the content (e.g., openai, anthropic, google, xai, copilot)';
COMMENT ON COLUMN memory_events.llm_model IS 'Specific model used to generate content (e.g., gpt-4-turbo, claude-3-opus)';
COMMENT ON COLUMN memory_events.embedding_provider IS 'Provider used for embedding generation (e.g., openai)';
COMMENT ON COLUMN memory_events.embedding_model IS 'Specific embedding model used (e.g., text-embedding-3-small)';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 
-- This migration adds four new columns to track provider/model metadata:
-- 
-- 1. llm_provider: The AI provider that generated the memory content
--    - Values: openai, anthropic, google, xai, copilot, etc.
--    - NULL if content was not LLM-generated
-- 
-- 2. llm_model: The specific model used for content generation
--    - Values: gpt-4-turbo, claude-3-opus, gemini-pro, grok-beta, etc.
--    - NULL if content was not LLM-generated
-- 
-- 3. embedding_provider: The provider used for vector embedding
--    - Values: openai (currently the only supported provider)
--    - NULL if no embedding was generated
-- 
-- 4. embedding_model: The specific embedding model used
--    - Values: text-embedding-3-small, text-embedding-3-large, etc.
--    - NULL if no embedding was generated
-- 
-- The search_memories_by_embedding function is updated to return these
-- new columns so they can be surfaced in Agent Dashboards.
-- 
-- Existing rows will have NULL values for these columns, which is expected
-- for memories created before this migration.
