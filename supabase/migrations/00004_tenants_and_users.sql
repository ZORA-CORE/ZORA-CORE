-- ZORA CORE Multi-Tenant Schema
-- Migration: 00004_tenants_and_users
-- Description: Adds tenants and users tables, and tenant_id columns to all core tables
--              for multi-tenant data isolation.
-- Date: 2025-11-28

-- ============================================================================
-- TENANTS TABLE
-- ============================================================================

-- Tenants represent organizations, brands, or individuals using ZORA CORE
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,  -- URL-friendly identifier
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Allow all for service role (to be refined later)
CREATE POLICY "Allow all for service role" ON tenants
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE tenants IS 'Multi-tenant registry - organizations, brands, or individuals using ZORA CORE';

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- User role enum
CREATE TYPE user_role AS ENUM (
    'founder',      -- Full access to tenant
    'brand_admin',  -- Administrative access
    'viewer'        -- Read-only access
);

-- Users belong to tenants
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'viewer',
    metadata JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    -- Unique email per tenant
    UNIQUE(tenant_id, email)
);

-- Indexes for users
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all for service role (to be refined later)
CREATE POLICY "Allow all for service role" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE users IS 'Users belonging to tenants with role-based access';

-- ============================================================================
-- CREATE DEFAULT TENANT FOR EXISTING DATA
-- ============================================================================

-- Insert a default tenant for migration of existing data
INSERT INTO tenants (id, name, slug, description)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    'Default tenant for pre-existing data. Created during multi-tenant migration.'
);

-- Insert a default founder user
INSERT INTO users (id, tenant_id, email, display_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'founder@zora.core',
    'ZORA Founder',
    'founder'
);

-- ============================================================================
-- ADD TENANT_ID TO MEMORY_EVENTS
-- ============================================================================

-- Add tenant_id column (nullable initially for migration)
ALTER TABLE memory_events
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant for existing records
UPDATE memory_events
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL after migration
ALTER TABLE memory_events
ALTER COLUMN tenant_id SET NOT NULL;

-- Add default for new records
ALTER TABLE memory_events
ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for tenant_id
CREATE INDEX idx_memory_events_tenant ON memory_events(tenant_id);

-- Create composite index for common queries
CREATE INDEX idx_memory_events_tenant_agent ON memory_events(tenant_id, agent);
CREATE INDEX idx_memory_events_tenant_created ON memory_events(tenant_id, created_at DESC);

COMMENT ON COLUMN memory_events.tenant_id IS 'Tenant that owns this memory event';

-- ============================================================================
-- ADD TENANT_ID TO JOURNAL_ENTRIES
-- ============================================================================

-- Add tenant_id column (nullable initially for migration)
ALTER TABLE journal_entries
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant for existing records
UPDATE journal_entries
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL after migration
ALTER TABLE journal_entries
ALTER COLUMN tenant_id SET NOT NULL;

-- Add default for new records
ALTER TABLE journal_entries
ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for tenant_id
CREATE INDEX idx_journal_entries_tenant ON journal_entries(tenant_id);

-- Create composite index for common queries
CREATE INDEX idx_journal_entries_tenant_category ON journal_entries(tenant_id, category);
CREATE INDEX idx_journal_entries_tenant_created ON journal_entries(tenant_id, created_at DESC);

COMMENT ON COLUMN journal_entries.tenant_id IS 'Tenant that owns this journal entry';

-- ============================================================================
-- ADD TENANT_ID TO CLIMATE_PROFILES
-- ============================================================================

-- Add tenant_id column (nullable initially for migration)
ALTER TABLE climate_profiles
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant for existing records
UPDATE climate_profiles
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL after migration
ALTER TABLE climate_profiles
ALTER COLUMN tenant_id SET NOT NULL;

-- Add default for new records
ALTER TABLE climate_profiles
ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for tenant_id
CREATE INDEX idx_climate_profiles_tenant ON climate_profiles(tenant_id);

-- Create composite index for common queries
CREATE INDEX idx_climate_profiles_tenant_type ON climate_profiles(tenant_id, profile_type);

COMMENT ON COLUMN climate_profiles.tenant_id IS 'Tenant that owns this climate profile';

-- ============================================================================
-- ADD TENANT_ID TO CLIMATE_MISSIONS
-- ============================================================================

-- Add tenant_id column (nullable initially for migration)
ALTER TABLE climate_missions
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant for existing records
UPDATE climate_missions
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL after migration
ALTER TABLE climate_missions
ALTER COLUMN tenant_id SET NOT NULL;

-- Add default for new records
ALTER TABLE climate_missions
ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for tenant_id
CREATE INDEX idx_climate_missions_tenant ON climate_missions(tenant_id);

-- Create composite index for common queries
CREATE INDEX idx_climate_missions_tenant_status ON climate_missions(tenant_id, status);

COMMENT ON COLUMN climate_missions.tenant_id IS 'Tenant that owns this climate mission';

-- ============================================================================
-- UPDATE SEARCH_MEMORIES_BY_EMBEDDING FUNCTION FOR TENANT SCOPING
-- ============================================================================

-- Drop and recreate the function with tenant_id parameter
DROP FUNCTION IF EXISTS search_memories_by_embedding(vector(1536), float, int, text);

CREATE OR REPLACE FUNCTION search_memories_by_embedding(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 20,
    filter_agent text DEFAULT NULL,
    filter_tenant_id uuid DEFAULT NULL
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
    tenant_id uuid,
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
        me.id,
        me.agent,
        me.memory_type,
        me.content,
        me.tags,
        me.metadata,
        me.session_id,
        me.embedding,
        me.created_at,
        me.updated_at,
        me.tenant_id,
        me.llm_provider,
        me.llm_model,
        me.embedding_provider,
        me.embedding_model,
        1 - (me.embedding <=> query_embedding) AS similarity
    FROM memory_events me
    WHERE me.embedding IS NOT NULL
        AND (filter_agent IS NULL OR me.agent = filter_agent)
        AND (filter_tenant_id IS NULL OR me.tenant_id = filter_tenant_id)
        AND 1 - (me.embedding <=> query_embedding) >= match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_memories_by_embedding IS 'Semantic search over memory events with optional agent and tenant filtering';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN tenants.slug IS 'URL-friendly unique identifier for the tenant';
COMMENT ON COLUMN users.role IS 'User role: founder (full access), brand_admin (admin), viewer (read-only)';
