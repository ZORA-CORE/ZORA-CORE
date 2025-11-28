-- ZORA CORE Initial Database Schema
-- Migration: 00001_initial_schema
-- Description: Creates the foundational tables for ZORA CORE including
--              memory events, journal entries, and basic Climate OS structures.
-- Date: 2025-11-28

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- EIVOR MEMORY SYSTEM
-- ============================================================================

-- Memory types enum
CREATE TYPE memory_type AS ENUM (
    'decision',
    'reflection',
    'artifact',
    'conversation',
    'plan',
    'result',
    'research',
    'design',
    'safety_review',
    'climate_data',
    'brand_data'
);

-- Main memory events table
-- Stores all memory entries from EIVOR and other agents
CREATE TABLE memory_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent VARCHAR(50) NOT NULL,
    memory_type memory_type NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(100),
    embedding VECTOR(1536),  -- For future vector search with pgvector
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for memory_events
CREATE INDEX idx_memory_events_agent ON memory_events(agent);
CREATE INDEX idx_memory_events_type ON memory_events(memory_type);
CREATE INDEX idx_memory_events_session ON memory_events(session_id);
CREATE INDEX idx_memory_events_created_at ON memory_events(created_at DESC);
CREATE INDEX idx_memory_events_tags ON memory_events USING GIN(tags);
CREATE INDEX idx_memory_events_metadata ON memory_events USING GIN(metadata);
CREATE INDEX idx_memory_events_content_trgm ON memory_events USING GIN(content gin_trgm_ops);

-- ============================================================================
-- ZORA JOURNAL
-- ============================================================================

-- Journal category enum
CREATE TYPE journal_category AS ENUM (
    'release',
    'decision',
    'model_update',
    'experiment',
    'milestone',
    'incident',
    'config_change',
    'agent_action',
    'user_feedback',
    'system_event'
);

-- Journal entries table
-- High-level system events and decisions
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category journal_category NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT,
    details JSONB DEFAULT '{}',
    related_memory_ids UUID[] DEFAULT '{}',
    related_entity_ids UUID[] DEFAULT '{}',
    author VARCHAR(50),  -- Agent or user who created the entry
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for journal_entries
CREATE INDEX idx_journal_entries_category ON journal_entries(category);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX idx_journal_entries_author ON journal_entries(author);
CREATE INDEX idx_journal_entries_title_trgm ON journal_entries USING GIN(title gin_trgm_ops);

-- ============================================================================
-- CLIMATE OS - BASIC STRUCTURE
-- ============================================================================

-- Profile type enum
CREATE TYPE profile_type AS ENUM (
    'person',
    'brand',
    'organization'
);

-- Climate profiles table
-- Stores climate profiles for users, brands, and organizations
CREATE TABLE climate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id VARCHAR(255),  -- External user/brand ID
    profile_type profile_type NOT NULL DEFAULT 'person',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Basic climate data (simplified for v0.1)
    energy_source VARCHAR(100),
    transport_mode VARCHAR(100),
    diet_type VARCHAR(100),
    location_type VARCHAR(100),
    
    -- Calculated/estimated values
    climate_score INTEGER CHECK (climate_score >= 0 AND climate_score <= 100),
    estimated_footprint_kg DECIMAL(12, 2),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for climate_profiles
CREATE INDEX idx_climate_profiles_owner ON climate_profiles(owner_id);
CREATE INDEX idx_climate_profiles_type ON climate_profiles(profile_type);
CREATE INDEX idx_climate_profiles_score ON climate_profiles(climate_score DESC);

-- Mission status enum
CREATE TYPE mission_status AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled',
    'failed'
);

-- Climate missions table
-- Tracks climate actions and their impact
CREATE TABLE climate_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES climate_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- e.g., 'energy', 'transport', 'food', 'waste'
    
    -- Status tracking
    status mission_status NOT NULL DEFAULT 'planned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Impact estimation (stored as JSON for flexibility)
    impact_estimate JSONB DEFAULT '{}',
    -- Example: {"co2_kg": 500, "energy_kwh": 1000, "description": "Reduced carbon by switching to renewable energy"}
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(50),  -- Agent that verified (likely AEGIS)
    verification_notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for climate_missions
CREATE INDEX idx_climate_missions_profile ON climate_missions(profile_id);
CREATE INDEX idx_climate_missions_status ON climate_missions(status);
CREATE INDEX idx_climate_missions_category ON climate_missions(category);
CREATE INDEX idx_climate_missions_created_at ON climate_missions(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_missions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations for authenticated users
-- These policies should be refined based on actual auth requirements

-- Memory events: Allow all for service role
CREATE POLICY "Allow all for service role" ON memory_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Journal entries: Allow all for service role
CREATE POLICY "Allow all for service role" ON journal_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Climate profiles: Allow all for service role
CREATE POLICY "Allow all for service role" ON climate_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Climate missions: Allow all for service role
CREATE POLICY "Allow all for service role" ON climate_missions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_memory_events_updated_at
    BEFORE UPDATE ON memory_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climate_profiles_updated_at
    BEFORE UPDATE ON climate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climate_missions_updated_at
    BEFORE UPDATE ON climate_missions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE memory_events IS 'EIVOR memory storage - stores all agent memories and observations';
COMMENT ON TABLE journal_entries IS 'ZORA Journal - high-level system events and decisions';
COMMENT ON TABLE climate_profiles IS 'Climate OS profiles for users, brands, and organizations';
COMMENT ON TABLE climate_missions IS 'Climate missions and their tracked impact';

COMMENT ON COLUMN memory_events.embedding IS 'Vector embedding for semantic search (requires pgvector extension)';
COMMENT ON COLUMN memory_events.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN memory_events.metadata IS 'Flexible JSON metadata for additional context';

COMMENT ON COLUMN climate_missions.impact_estimate IS 'JSON object containing impact metrics like co2_kg, energy_kwh, etc.';
