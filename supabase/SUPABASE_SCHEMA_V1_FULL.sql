-- ============================================================================
-- ZORA CORE - CANONICAL SUPABASE SCHEMA V1
-- ============================================================================
-- 
-- This script is IDEMPOTENT and can be run multiple times safely.
-- It will repair/initialize the production database for ZORA CORE.
-- 
-- Usage:
--   1. Open Supabase SQL Editor
--   2. Copy this entire file
--   3. Paste and click "Run"
--   4. Expected: No fatal errors (warnings about "already exists" are OK)
-- 
-- After running:
--   - All required tables will exist: tenants, users, memory_events, 
--     journal_entries, climate_profiles, climate_missions, frontend_configs,
--     agent_suggestions
--   - The search_memories_by_embedding function will be correctly defined
--   - /admin/setup will work correctly
-- 
-- Date: 2025-11-28
-- Version: 1.5.0 (Mashup Shop v0.1 - Brands & Products)
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- STEP 2: CREATE ENUM TYPES (IF NOT EXISTS)
-- ============================================================================

-- Memory type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_type') THEN
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
    END IF;
END$$;

-- Journal category enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_category') THEN
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
            'system_event',
            'autonomy'
        );
    END IF;
END$$;

-- Add 'autonomy' to journal_category enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'journal_category'::regtype 
        AND enumlabel = 'autonomy'
    ) THEN
        ALTER TYPE journal_category ADD VALUE 'autonomy';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Value already exists
END$$;

-- Profile type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_type') THEN
        CREATE TYPE profile_type AS ENUM (
            'person',
            'brand',
            'organization'
        );
    END IF;
END$$;

-- Mission status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_status') THEN
        CREATE TYPE mission_status AS ENUM (
            'planned',
            'in_progress',
            'completed',
            'cancelled',
            'failed'
        );
    END IF;
END$$;

-- User role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'founder',
            'brand_admin',
            'viewer'
        );
    END IF;
END$$;

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTION FOR UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: CREATE TENANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);

-- Trigger for updated_at (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policy (drop first to avoid duplicate)
DROP POLICY IF EXISTS "Allow all for service role" ON tenants;
CREATE POLICY "Allow all for service role" ON tenants
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE tenants IS 'Multi-tenant registry - organizations, brands, or individuals using ZORA CORE';

-- ============================================================================
-- STEP 5: CREATE USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'viewer',
    metadata JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_tenant_id_email_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_tenant_id_email_key UNIQUE(tenant_id, email);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON users;
CREATE POLICY "Allow all for service role" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE users IS 'Users belonging to tenants with role-based access';

-- ============================================================================
-- STEP 6: CREATE MEMORY_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS memory_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent VARCHAR(50) NOT NULL,
    memory_type memory_type NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(100),
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add columns if they don't exist (for partial migrations)
ALTER TABLE memory_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE memory_events ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50);
ALTER TABLE memory_events ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);
ALTER TABLE memory_events ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(50);
ALTER TABLE memory_events ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100);

-- Set default tenant_id for existing records without one
UPDATE memory_events SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL and set default (only if column exists and is nullable)
DO $$
BEGIN
    -- First ensure the default tenant exists
    INSERT INTO tenants (id, name, slug, description)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', 'Default tenant for ZORA CORE')
    ON CONFLICT (id) DO NOTHING;
    
    -- Now we can safely set the default and NOT NULL
    ALTER TABLE memory_events ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    
    -- Only set NOT NULL if there are no NULL values
    IF NOT EXISTS (SELECT 1 FROM memory_events WHERE tenant_id IS NULL) THEN
        ALTER TABLE memory_events ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors (column might already be NOT NULL)
END$$;

-- Indexes for memory_events
CREATE INDEX IF NOT EXISTS idx_memory_events_agent ON memory_events(agent);
CREATE INDEX IF NOT EXISTS idx_memory_events_type ON memory_events(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_events_session ON memory_events(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_created_at ON memory_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_events_tags ON memory_events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memory_events_metadata ON memory_events USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_memory_events_tenant ON memory_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_tenant_agent ON memory_events(tenant_id, agent);
CREATE INDEX IF NOT EXISTS idx_memory_events_tenant_created ON memory_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_events_llm_provider ON memory_events(llm_provider);
CREATE INDEX IF NOT EXISTS idx_memory_events_embedding_provider ON memory_events(embedding_provider);

-- Text search index (may fail if already exists with different config)
DO $$
BEGIN
    CREATE INDEX idx_memory_events_content_trgm ON memory_events USING GIN(content gin_trgm_ops);
EXCEPTION WHEN duplicate_table THEN
    -- Index already exists
END$$;

-- HNSW index for vector search
DO $$
BEGIN
    CREATE INDEX idx_memory_events_embedding_hnsw ON memory_events USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
EXCEPTION WHEN duplicate_table THEN
    -- Index already exists
END$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_memory_events_updated_at ON memory_events;
CREATE TRIGGER update_memory_events_updated_at
    BEFORE UPDATE ON memory_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON memory_events;
CREATE POLICY "Allow all for service role" ON memory_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE memory_events IS 'EIVOR memory storage - stores all agent memories and observations';

-- ============================================================================
-- STEP 7: CREATE JOURNAL_ENTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category journal_category NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT,
    details JSONB DEFAULT '{}',
    related_memory_ids UUID[] DEFAULT '{}',
    related_entity_ids UUID[] DEFAULT '{}',
    author VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add tenant_id column if not exists
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant_id for existing records
UPDATE journal_entries SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Set default and NOT NULL
DO $$
BEGIN
    ALTER TABLE journal_entries ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    IF NOT EXISTS (SELECT 1 FROM journal_entries WHERE tenant_id IS NULL) THEN
        ALTER TABLE journal_entries ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END$$;

-- Indexes for journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_category ON journal_entries(category);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_author ON journal_entries(author);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_category ON journal_entries(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_created ON journal_entries(tenant_id, created_at DESC);

-- Text search index
DO $$
BEGIN
    CREATE INDEX idx_journal_entries_title_trgm ON journal_entries USING GIN(title gin_trgm_ops);
EXCEPTION WHEN duplicate_table THEN
    -- Index already exists
END$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON journal_entries;
CREATE POLICY "Allow all for service role" ON journal_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE journal_entries IS 'ZORA Journal - high-level system events and decisions';

-- ============================================================================
-- STEP 8: CREATE CLIMATE_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS climate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id VARCHAR(255),
    profile_type profile_type NOT NULL DEFAULT 'person',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    energy_source VARCHAR(100),
    transport_mode VARCHAR(100),
    diet_type VARCHAR(100),
    location_type VARCHAR(100),
    climate_score INTEGER CHECK (climate_score >= 0 AND climate_score <= 100),
    estimated_footprint_kg DECIMAL(12, 2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add tenant_id column if not exists
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add new Climate OS v0.2 columns for richer profiles
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS city_or_region VARCHAR(255);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS household_size INTEGER CHECK (household_size IS NULL OR household_size >= 1);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS primary_energy_source VARCHAR(100);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add new Climate OS v0.3 columns for multi-profile support
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS scope VARCHAR(50) DEFAULT 'individual';
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Set default tenant_id for existing records
UPDATE climate_profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Set default and NOT NULL
DO $$
BEGIN
    ALTER TABLE climate_profiles ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    IF NOT EXISTS (SELECT 1 FROM climate_profiles WHERE tenant_id IS NULL) THEN
        ALTER TABLE climate_profiles ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END$$;

-- Indexes for climate_profiles
CREATE INDEX IF NOT EXISTS idx_climate_profiles_owner ON climate_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_type ON climate_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_score ON climate_profiles(climate_score DESC);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_tenant ON climate_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_tenant_type ON climate_profiles(tenant_id, profile_type);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_scope ON climate_profiles(scope);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_tenant_scope ON climate_profiles(tenant_id, scope);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_is_primary ON climate_profiles(tenant_id, is_primary) WHERE is_primary = true;

-- Partial unique index to ensure only one primary profile per tenant
-- This enforces at most one is_primary = true per tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_climate_profiles_unique_primary'
    ) THEN
        CREATE UNIQUE INDEX idx_climate_profiles_unique_primary 
        ON climate_profiles(tenant_id) WHERE is_primary = true;
    END IF;
EXCEPTION WHEN duplicate_table THEN
    -- Index already exists
END$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_climate_profiles_updated_at ON climate_profiles;
CREATE TRIGGER update_climate_profiles_updated_at
    BEFORE UPDATE ON climate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE climate_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON climate_profiles;
CREATE POLICY "Allow all for service role" ON climate_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_profiles IS 'Climate OS profiles for users, brands, and organizations';

-- ============================================================================
-- STEP 9: CREATE CLIMATE_MISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS climate_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES climate_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status mission_status NOT NULL DEFAULT 'planned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    impact_estimate JSONB DEFAULT '{}',
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(50),
    verification_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add tenant_id column if not exists
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add new Climate OS v0.2 columns for missions
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS estimated_impact_kgco2 NUMERIC(12, 2);
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS due_date DATE;

-- Set default tenant_id for existing records
UPDATE climate_missions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Set default and NOT NULL
DO $$
BEGIN
    ALTER TABLE climate_missions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    IF NOT EXISTS (SELECT 1 FROM climate_missions WHERE tenant_id IS NULL) THEN
        ALTER TABLE climate_missions ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END$$;

-- Indexes for climate_missions
CREATE INDEX IF NOT EXISTS idx_climate_missions_profile ON climate_missions(profile_id);
CREATE INDEX IF NOT EXISTS idx_climate_missions_status ON climate_missions(status);
CREATE INDEX IF NOT EXISTS idx_climate_missions_category ON climate_missions(category);
CREATE INDEX IF NOT EXISTS idx_climate_missions_created_at ON climate_missions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_climate_missions_tenant ON climate_missions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_climate_missions_tenant_status ON climate_missions(tenant_id, status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_climate_missions_updated_at ON climate_missions;
CREATE TRIGGER update_climate_missions_updated_at
    BEFORE UPDATE ON climate_missions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE climate_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON climate_missions;
CREATE POLICY "Allow all for service role" ON climate_missions
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_missions IS 'Climate missions and their tracked impact';

-- ============================================================================
-- STEP 10: CREATE FRONTEND_CONFIGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS frontend_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    page VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add unique constraint for (tenant_id, page) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'frontend_configs_tenant_id_page_key'
    ) THEN
        ALTER TABLE frontend_configs ADD CONSTRAINT frontend_configs_tenant_id_page_key UNIQUE(tenant_id, page);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for frontend_configs
CREATE INDEX IF NOT EXISTS idx_frontend_configs_tenant ON frontend_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_frontend_configs_page ON frontend_configs(page);
CREATE INDEX IF NOT EXISTS idx_frontend_configs_tenant_page ON frontend_configs(tenant_id, page);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_frontend_configs_updated_at ON frontend_configs;
CREATE TRIGGER update_frontend_configs_updated_at
    BEFORE UPDATE ON frontend_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE frontend_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON frontend_configs;
CREATE POLICY "Allow all for service role" ON frontend_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE frontend_configs IS 'Frontend configuration per tenant and page - drives config-driven UI';

-- ============================================================================
-- STEP 11: CREATE AGENT_SUGGESTIONS TABLE
-- ============================================================================

-- Suggestion status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_status') THEN
        CREATE TYPE suggestion_status AS ENUM (
            'proposed',
            'applied',
            'rejected'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS agent_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL,
    suggestion_type VARCHAR(100) NOT NULL DEFAULT 'frontend_config_change',
    target_page VARCHAR(100),
    current_config JSONB,
    suggested_config JSONB NOT NULL,
    diff_summary TEXT,
    status suggestion_status NOT NULL DEFAULT 'proposed',
    decision_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    decision_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for agent_suggestions
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_tenant ON agent_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_agent ON agent_suggestions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_status ON agent_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_type ON agent_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_tenant_status ON agent_suggestions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_tenant_page ON agent_suggestions(tenant_id, target_page);
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_created_at ON agent_suggestions(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_suggestions_updated_at ON agent_suggestions;
CREATE TRIGGER update_agent_suggestions_updated_at
    BEFORE UPDATE ON agent_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON agent_suggestions;
CREATE POLICY "Allow all for service role" ON agent_suggestions
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE agent_suggestions IS 'Agent-generated suggestions for frontend config changes - requires human approval';

-- ============================================================================
-- STEP 12: CREATE BRANDS TABLE (Mashup Shop v0.1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100),
    description TEXT,
    country VARCHAR(100),
    sector VARCHAR(100),
    climate_tagline TEXT,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add unique constraint for (tenant_id, slug) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'brands_tenant_id_slug_key'
    ) THEN
        ALTER TABLE brands ADD CONSTRAINT brands_tenant_id_slug_key UNIQUE(tenant_id, slug);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for brands
CREATE INDEX IF NOT EXISTS idx_brands_tenant ON brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_sector ON brands(sector);
CREATE INDEX IF NOT EXISTS idx_brands_country ON brands(country);
CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON brands;
CREATE POLICY "Allow all for service role" ON brands
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE brands IS 'Brands for the climate-first Mashup Shop - partners in cross-brand collaborations';

-- ============================================================================
-- STEP 13: CREATE PRODUCTS TABLE (Mashup Shop v0.1)
-- ============================================================================

-- Product status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE product_status AS ENUM (
            'draft',
            'active',
            'archived'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100),
    short_description TEXT,
    long_description TEXT,
    primary_image_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft',
    climate_score NUMERIC(5, 2) CHECK (climate_score IS NULL OR (climate_score >= 0 AND climate_score <= 100)),
    estimated_impact_kgco2 NUMERIC(12, 2),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add unique constraint for (tenant_id, slug) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_tenant_id_slug_key'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_tenant_id_slug_key UNIQUE(tenant_id, slug);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_climate_score ON products(climate_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON products;
CREATE POLICY "Allow all for service role" ON products
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE products IS 'Products for the climate-first Mashup Shop - climate-neutral or climate-positive items';

-- ============================================================================
-- STEP 14: CREATE PRODUCT_BRANDS JOIN TABLE (Mashup Shop v0.1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'collab',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint for (product_id, brand_id) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_brands_product_id_brand_id_key'
    ) THEN
        ALTER TABLE product_brands ADD CONSTRAINT product_brands_product_id_brand_id_key UNIQUE(product_id, brand_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for product_brands
CREATE INDEX IF NOT EXISTS idx_product_brands_product ON product_brands(product_id);
CREATE INDEX IF NOT EXISTS idx_product_brands_brand ON product_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_brands_role ON product_brands(role);

-- Enable RLS
ALTER TABLE product_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON product_brands;
CREATE POLICY "Allow all for service role" ON product_brands
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE product_brands IS 'Join table linking products to brands - enables mashup/collab products with multiple brands';

-- ============================================================================
-- STEP 15: FIX DUPLICATE search_memories_by_embedding FUNCTIONS
-- ============================================================================
-- This is the critical fix for ERROR 42725: function name is not unique

-- First, drop ALL existing variants of the function
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find all functions named search_memories_by_embedding
    FOR func_record IN 
        SELECT oid::regprocedure::text AS func_signature
        FROM pg_proc 
        WHERE proname = 'search_memories_by_embedding'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.func_signature;
    END LOOP;
END$$;

-- Now create the single canonical version of the function
-- This matches what the Workers API expects
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
-- STEP 13: CREATE SCHEMA HEALTH CHECK FUNCTION
-- ============================================================================

-- Function to get columns for a table (used by /api/admin/schema-status)
CREATE OR REPLACE FUNCTION get_table_columns(table_name_param TEXT)
RETURNS TABLE (column_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::TEXT
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = table_name_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_table_columns IS 'Returns column names for a given table - used by schema health check endpoint';

-- ============================================================================
-- STEP 14: VERIFY SCHEMA
-- ============================================================================

-- This query will show all tables that should exist
-- Run this after the script to verify everything is set up correctly
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count required tables (now 11 with brands, products, product_brands)
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('tenants', 'users', 'memory_events', 'journal_entries', 'climate_profiles', 'climate_missions', 'frontend_configs', 'agent_suggestions', 'brands', 'products', 'product_brands');
    
    -- Count search_memories_by_embedding functions (should be exactly 1)
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE proname = 'search_memories_by_embedding';
    
    RAISE NOTICE '=== ZORA CORE Schema Verification ===';
    RAISE NOTICE 'Required tables found: % of 11', table_count;
    RAISE NOTICE 'search_memories_by_embedding functions: % (should be 1)', function_count;
    
    IF table_count = 11 AND function_count = 1 THEN
        RAISE NOTICE 'Schema is correctly configured!';
    ELSE
        RAISE WARNING 'Schema may have issues. Please check the tables and functions.';
    END IF;
END$$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- 
-- After running this script:
-- 1. Go to https://zoracore.dk/admin/setup
-- 2. Enter your ZORA_BOOTSTRAP_SECRET
-- 3. Bootstrap your first tenant and founder user
-- 4. Generate a JWT token
-- 5. Log in at https://zoracore.dk/login
-- 
-- If you see any errors, check the Supabase logs or contact support.
-- ============================================================================
