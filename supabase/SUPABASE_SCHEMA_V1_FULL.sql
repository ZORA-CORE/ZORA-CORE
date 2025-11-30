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
--     journal_entries, climate_profiles, climate_missions, climate_plans,
--     climate_plan_items, frontend_configs, agent_suggestions, brands, products,
--     product_brands, agent_tasks, agent_insights, agent_commands
--   - The search_memories_by_embedding function will be correctly defined
--   - /admin/setup will work correctly
-- 
-- Date: 2025-11-28
-- Version: 2.3.0 (Safety + Scheduling v1 - Task approval policies and autonomy schedules)
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
            'member',
            'viewer'
        );
    END IF;
END$$;

-- Add 'member' to user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'member'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'member';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Value already exists
END$$;

-- Account type enum (private or company)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM (
            'private',
            'company'
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

-- Add tenant_type column if not exists (Auth Backend v1.0)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'private';
COMMENT ON COLUMN tenants.tenant_type IS 'Type of tenant: private (individual) or company (organization/brand)';

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

-- Add account_type column if not exists (Auth Backend v1.0)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'private';
COMMENT ON COLUMN users.account_type IS 'Type of account: private (individual) or company (organization/brand)';

-- Add password_hash column if not exists (Auth Backend v1.0)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
COMMENT ON COLUMN users.password_hash IS 'Bcrypt-hashed password for password-based authentication';

-- Add index for display_name lookups (used in login)
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

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
-- STEP 9B: CREATE CLIMATE_PLANS TABLE (Climate OS Backend v1.0)
-- ============================================================================

-- Plan status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_status') THEN
        CREATE TYPE plan_status AS ENUM (
            'proposed',
            'active',
            'archived'
        );
    END IF;
END$$;

-- Plan item status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_item_status') THEN
        CREATE TYPE plan_item_status AS ENUM (
            'planned',
            'completed',
            'skipped'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS climate_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES climate_profiles(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'weekly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'proposed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for climate_plans
CREATE INDEX IF NOT EXISTS idx_climate_plans_tenant ON climate_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_climate_plans_profile ON climate_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_climate_plans_status ON climate_plans(status);
CREATE INDEX IF NOT EXISTS idx_climate_plans_period ON climate_plans(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_climate_plans_tenant_profile ON climate_plans(tenant_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_climate_plans_tenant_status ON climate_plans(tenant_id, status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_climate_plans_updated_at ON climate_plans;
CREATE TRIGGER update_climate_plans_updated_at
    BEFORE UPDATE ON climate_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE climate_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON climate_plans;
CREATE POLICY "Allow all for service role" ON climate_plans
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_plans IS 'Weekly/monthly climate plans for profiles';

-- ============================================================================
-- STEP 9C: CREATE CLIMATE_PLAN_ITEMS TABLE (Climate OS Backend v1.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS climate_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES climate_plans(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES climate_missions(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    estimated_impact_kgco2 NUMERIC(12, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'planned',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for climate_plan_items
CREATE INDEX IF NOT EXISTS idx_climate_plan_items_plan ON climate_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_climate_plan_items_mission ON climate_plan_items(mission_id);
CREATE INDEX IF NOT EXISTS idx_climate_plan_items_status ON climate_plan_items(status);
CREATE INDEX IF NOT EXISTS idx_climate_plan_items_category ON climate_plan_items(category);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_climate_plan_items_updated_at ON climate_plan_items;
CREATE TRIGGER update_climate_plan_items_updated_at
    BEFORE UPDATE ON climate_plan_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE climate_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON climate_plan_items;
CREATE POLICY "Allow all for service role" ON climate_plan_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_plan_items IS 'Individual items within a climate plan';

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

COMMENT ON TABLE products IS 'Products for the climate-first ZORA SHOP - climate-neutral or climate-positive items';

-- Add ZORA SHOP Backend v1.0 columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_currency VARCHAR(10) DEFAULT 'EUR';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_amount NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

-- Rename short_description to description if needed (for backward compatibility, keep both)
-- The 'description' column is the primary one for ZORA SHOP Backend v1.0

-- Add index for brand_id
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_brand ON products(tenant_id, brand_id);

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
-- STEP 14B: CREATE MATERIALS TABLE (ZORA SHOP Backend v1.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for materials
CREATE INDEX IF NOT EXISTS idx_materials_tenant ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_name ON materials(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON materials;
CREATE POLICY "Allow all for service role" ON materials
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE materials IS 'Base materials for ZORA SHOP products - e.g. organic cotton, recycled polyester, hemp';

-- ============================================================================
-- STEP 14C: CREATE PRODUCT_MATERIALS JOIN TABLE (ZORA SHOP Backend v1.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    percentage NUMERIC(5, 2) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add unique constraint for (product_id, material_id) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_materials_product_id_material_id_key'
    ) THEN
        ALTER TABLE product_materials ADD CONSTRAINT product_materials_product_id_material_id_key UNIQUE(product_id, material_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for product_materials
CREATE INDEX IF NOT EXISTS idx_product_materials_tenant ON product_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_product ON product_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_material ON product_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_tenant_product ON product_materials(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_tenant_material ON product_materials(tenant_id, material_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_product_materials_updated_at ON product_materials;
CREATE TRIGGER update_product_materials_updated_at
    BEFORE UPDATE ON product_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON product_materials;
CREATE POLICY "Allow all for service role" ON product_materials
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE product_materials IS 'Join table linking products to materials with percentage composition';

-- ============================================================================
-- STEP 14D: CREATE PRODUCT_CLIMATE_META TABLE (ZORA SHOP Backend v1.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_climate_meta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    climate_label VARCHAR(100),
    estimated_impact_kgco2 NUMERIC(12, 2),
    certifications TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add unique constraint for (product_id) - one climate meta per product
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_climate_meta_product_id_key'
    ) THEN
        ALTER TABLE product_climate_meta ADD CONSTRAINT product_climate_meta_product_id_key UNIQUE(product_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for product_climate_meta
CREATE INDEX IF NOT EXISTS idx_product_climate_meta_tenant ON product_climate_meta(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_climate_meta_product ON product_climate_meta(product_id);
CREATE INDEX IF NOT EXISTS idx_product_climate_meta_label ON product_climate_meta(climate_label);
CREATE INDEX IF NOT EXISTS idx_product_climate_meta_tenant_label ON product_climate_meta(tenant_id, climate_label);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_product_climate_meta_updated_at ON product_climate_meta;
CREATE TRIGGER update_product_climate_meta_updated_at
    BEFORE UPDATE ON product_climate_meta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_climate_meta ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON product_climate_meta;
CREATE POLICY "Allow all for service role" ON product_climate_meta
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE product_climate_meta IS 'Climate metadata for ZORA SHOP products - labels, impact estimates, certifications';

-- ============================================================================
-- STEP 14E: CREATE ZORA_SHOP_PROJECTS TABLE (ZORA SHOP Backend v1.0)
-- ============================================================================

-- ZORA Shop project status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zora_shop_project_status') THEN
        CREATE TYPE zora_shop_project_status AS ENUM (
            'idea',
            'brief',
            'concept',
            'review',
            'launched',
            'archived'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS zora_shop_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'idea',
    primary_brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    secondary_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    theme VARCHAR(255),
    target_launch_date DATE,
    launched_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for zora_shop_projects
CREATE INDEX IF NOT EXISTS idx_zora_shop_projects_tenant ON zora_shop_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zora_shop_projects_status ON zora_shop_projects(status);
CREATE INDEX IF NOT EXISTS idx_zora_shop_projects_primary_brand ON zora_shop_projects(primary_brand_id);
CREATE INDEX IF NOT EXISTS idx_zora_shop_projects_secondary_brand ON zora_shop_projects(secondary_brand_id);
CREATE INDEX IF NOT EXISTS idx_zora_shop_projects_tenant_status ON zora_shop_projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_zora_shop_projects_created_at ON zora_shop_projects(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_zora_shop_projects_updated_at ON zora_shop_projects;
CREATE TRIGGER update_zora_shop_projects_updated_at
    BEFORE UPDATE ON zora_shop_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE zora_shop_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON zora_shop_projects;
CREATE POLICY "Allow all for service role" ON zora_shop_projects
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE zora_shop_projects IS 'ZORA SHOP Projects - brand collaboration projects/drops/campaigns';

-- ============================================================================
-- STEP 15: CREATE AGENT_TASKS TABLE (Agent Runtime v1)
-- ============================================================================

-- Agent task status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_task_status') THEN
        CREATE TYPE agent_task_status AS ENUM (
            'pending',
            'in_progress',
            'completed',
            'failed'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL CHECK (agent_id IN ('CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM')),
    task_type VARCHAR(100) NOT NULL,
    status agent_task_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    payload JSONB DEFAULT '{}',
    result JSONB,
    result_summary TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add command_id column if it doesn't exist (for linking to agent_commands)
-- Note: FK constraint added after agent_commands table is created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'command_id'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN command_id UUID;
    END IF;
END$$;

-- Add result column if it doesn't exist (for structured task results)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'result'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN result JSONB;
    END IF;
END$$;

-- Add approval-related columns for Safety Layer v1 (Iteration 00B5)
-- requires_approval: whether this task needs manual approval before execution
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'requires_approval'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT false;
    END IF;
END$$;

-- approved_by_user_id: FK to users.id for who approved the task
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'approved_by_user_id'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END$$;

-- approved_at: timestamp when the task was approved
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
END$$;

-- rejected_by_user_id: FK to users.id for who rejected the task
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'rejected_by_user_id'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN rejected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END$$;

-- rejected_at: timestamp when the task was rejected
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN rejected_at TIMESTAMPTZ;
    END IF;
END$$;

-- decision_reason: human-readable reason for approval/rejection
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'decision_reason'
    ) THEN
        ALTER TABLE agent_tasks ADD COLUMN decision_reason TEXT;
    END IF;
END$$;

-- Indexes for agent_tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant ON agent_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_task_type ON agent_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_status ON agent_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_agent ON agent_tasks(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at DESC);
-- Composite index for task claiming: pending tasks ordered by priority and creation time
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending_priority ON agent_tasks(tenant_id, status, priority DESC, created_at ASC) WHERE status = 'pending';
-- Index for command_id (linking tasks to commands)
CREATE INDEX IF NOT EXISTS idx_agent_tasks_command_id ON agent_tasks(command_id) WHERE command_id IS NOT NULL;
-- Index for tasks requiring approval (Safety Layer v1)
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending_approval ON agent_tasks(tenant_id, status, requires_approval) 
    WHERE status = 'pending' AND requires_approval = true AND approved_by_user_id IS NULL AND rejected_by_user_id IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON agent_tasks;
CREATE POLICY "Allow all for service role" ON agent_tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE agent_tasks IS 'Agent task queue - stores tasks for the 6 core agents to process via Agent Runtime v1';

-- ============================================================================
-- STEP 16: CREATE AGENT_INSIGHTS TABLE
-- ============================================================================
-- Agent insights store structured, actionable suggestions from agents
-- tied to Climate OS, Mashup Shop, and frontend domains

-- Agent insight status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_insight_status') THEN
        CREATE TYPE agent_insight_status AS ENUM (
            'proposed',
            'accepted',
            'rejected',
            'implemented'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS agent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    agent_id VARCHAR(50) NOT NULL CHECK (agent_id IN ('CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM')),
    source_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT,
    status agent_insight_status NOT NULL DEFAULT 'proposed',
    related_entity_type VARCHAR(100),
    related_entity_ref VARCHAR(500),
    impact_estimate_kgco2 NUMERIC,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for agent_insights
CREATE INDEX IF NOT EXISTS idx_agent_insights_tenant ON agent_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_agent ON agent_insights(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_category ON agent_insights(category);
CREATE INDEX IF NOT EXISTS idx_agent_insights_status ON agent_insights(status);
CREATE INDEX IF NOT EXISTS idx_agent_insights_source_task ON agent_insights(source_task_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_tenant_category_status ON agent_insights(tenant_id, category, status);
CREATE INDEX IF NOT EXISTS idx_agent_insights_agent_status ON agent_insights(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_insights_created_at ON agent_insights(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_insights_updated_at ON agent_insights;
CREATE TRIGGER update_agent_insights_updated_at
    BEFORE UPDATE ON agent_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON agent_insights;
CREATE POLICY "Allow all for service role" ON agent_insights
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE agent_insights IS 'Agent insights - structured, actionable suggestions from agents for Climate OS, Mashup Shop, and frontend';

-- ============================================================================
-- STEP 17: CREATE AGENT_COMMANDS TABLE (Agent Command Console v1)
-- ============================================================================
-- Agent commands store freeform prompts from the Founder that LUMINA
-- translates into structured agent_tasks

-- Agent command status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_command_status') THEN
        CREATE TYPE agent_command_status AS ENUM (
            'received',
            'parsing',
            'tasks_created',
            'failed'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS agent_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    raw_prompt TEXT NOT NULL,
    target_agents TEXT[] DEFAULT NULL,
    status agent_command_status NOT NULL DEFAULT 'received',
    parsed_summary TEXT,
    tasks_created_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for agent_commands
CREATE INDEX IF NOT EXISTS idx_agent_commands_tenant ON agent_commands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_at ON agent_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_tenant_status ON agent_commands(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_by ON agent_commands(created_by_user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_commands_updated_at ON agent_commands;
CREATE TRIGGER update_agent_commands_updated_at
    BEFORE UPDATE ON agent_commands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_commands ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON agent_commands;
CREATE POLICY "Allow all for service role" ON agent_commands
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE agent_commands IS 'Agent commands - freeform prompts from Founder that LUMINA translates into agent_tasks';

-- Add FK constraint from agent_tasks.command_id to agent_commands.id
-- (Now that agent_commands table exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agent_tasks_command_id' 
        AND table_name = 'agent_tasks'
    ) THEN
        ALTER TABLE agent_tasks 
        ADD CONSTRAINT fk_agent_tasks_command_id 
        FOREIGN KEY (command_id) REFERENCES agent_commands(id) ON DELETE SET NULL;
    END IF;
END$$;

-- ============================================================================
-- STEP 18: CREATE AGENT_TASK_POLICIES TABLE (Safety Layer v1)
-- ============================================================================
-- Defines default policies per task_type and optionally per tenant
-- Controls whether tasks auto-execute or require manual approval

CREATE TABLE IF NOT EXISTS agent_task_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    auto_execute BOOLEAN NOT NULL DEFAULT false,
    max_risk_level INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for agent_task_policies
CREATE INDEX IF NOT EXISTS idx_agent_task_policies_task_type ON agent_task_policies(task_type);
CREATE INDEX IF NOT EXISTS idx_agent_task_policies_tenant_task_type ON agent_task_policies(tenant_id, task_type);

-- Unique constraint: one policy per task_type per tenant (or global if tenant_id IS NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agent_task_policies_tenant_task_type_key'
    ) THEN
        ALTER TABLE agent_task_policies ADD CONSTRAINT agent_task_policies_tenant_task_type_key 
            UNIQUE (tenant_id, task_type);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists
END$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_task_policies_updated_at ON agent_task_policies;
CREATE TRIGGER update_agent_task_policies_updated_at
    BEFORE UPDATE ON agent_task_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_task_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON agent_task_policies;
CREATE POLICY "Allow all for service role" ON agent_task_policies
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE agent_task_policies IS 'Task execution policies - controls auto-execute vs manual approval per task_type';

-- Insert default global policies for v1 task types
-- Climate tasks default to auto_execute = true (relatively safe)
-- Shop tasks default to auto_execute = false (require approval)
INSERT INTO agent_task_policies (tenant_id, task_type, auto_execute, description)
VALUES 
    (NULL, 'climate.create_missions_from_plan', true, 'Create missions from weekly plan - auto-execute enabled'),
    (NULL, 'climate.create_single_mission', true, 'Create single mission - auto-execute enabled'),
    (NULL, 'zora_shop.create_project', false, 'Create ZORA SHOP project - requires approval'),
    (NULL, 'zora_shop.update_product_climate_meta', false, 'Update product climate metadata - requires approval')
ON CONFLICT (tenant_id, task_type) DO NOTHING;

-- ============================================================================
-- STEP 19: CREATE AUTONOMY_SCHEDULES TABLE (Scheduling v1)
-- ============================================================================
-- Defines recurring autonomy schedules that generate agent_tasks
-- Can be triggered by cron, GitHub Actions, or manual CLI execution

CREATE TABLE IF NOT EXISTS autonomy_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES climate_profiles(id) ON DELETE SET NULL,
    schedule_type VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    cron_hint TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    next_run_at TIMESTAMPTZ NOT NULL,
    last_run_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for autonomy_schedules
CREATE INDEX IF NOT EXISTS idx_autonomy_schedules_tenant ON autonomy_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_autonomy_schedules_enabled_next_run ON autonomy_schedules(tenant_id, enabled, next_run_at) 
    WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_autonomy_schedules_schedule_type ON autonomy_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_autonomy_schedules_profile ON autonomy_schedules(profile_id) WHERE profile_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_autonomy_schedules_updated_at ON autonomy_schedules;
CREATE TRIGGER update_autonomy_schedules_updated_at
    BEFORE UPDATE ON autonomy_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE autonomy_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON autonomy_schedules;
CREATE POLICY "Allow all for service role" ON autonomy_schedules
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE autonomy_schedules IS 'Autonomy schedules - recurring routines that generate agent_tasks';

-- ============================================================================
-- STEP 20: FIX DUPLICATE search_memories_by_embedding FUNCTIONS
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
-- STEP 14A: HEMP & CLIMATE MATERIALS v1.0 (Iteration 00C1)
-- ============================================================================

-- 14A.1: Extend materials table with hemp/cannabis tagging fields
-- is_hemp_or_cannabis_material: marks whether this material is hemp or a legally regulated cannabis-derived material
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_hemp_or_cannabis_material BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN materials.is_hemp_or_cannabis_material IS 'Whether this material is hemp or a legally regulated cannabis-derived material used in industrial/climate-relevant contexts';

-- hemp_category: expected values: fiber, bioplastic, construction, paper_packaging, other_industrial
ALTER TABLE materials ADD COLUMN IF NOT EXISTS hemp_category TEXT;
COMMENT ON COLUMN materials.hemp_category IS 'Hemp material category: fiber, bioplastic, construction, paper_packaging, other_industrial';

-- climate_benefit_note: short explanation of why this material is climate-beneficial
ALTER TABLE materials ADD COLUMN IF NOT EXISTS climate_benefit_note TEXT;
COMMENT ON COLUMN materials.climate_benefit_note IS 'Short explanation of why this material is considered climate-beneficial';

-- Index for hemp materials
CREATE INDEX IF NOT EXISTS idx_materials_is_hemp ON materials(tenant_id, is_hemp_or_cannabis_material) WHERE is_hemp_or_cannabis_material = true;
CREATE INDEX IF NOT EXISTS idx_materials_hemp_category ON materials(hemp_category) WHERE hemp_category IS NOT NULL;

-- 14A.2: Create climate_material_profiles table
-- Stores per-material climate impact profiles with baseline and comparison data
CREATE TABLE IF NOT EXISTS climate_material_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    baseline_unit TEXT NOT NULL DEFAULT 'kg',
    baseline_co2_kg_per_unit NUMERIC(12, 4),
    reference_material_name TEXT,
    co2_savings_vs_reference_kg_per_unit NUMERIC(12, 4),
    water_savings_l_per_unit NUMERIC(12, 4),
    land_savings_m2_per_unit NUMERIC(12, 4),
    data_source_label TEXT,
    data_source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Unique constraint: one profile per (tenant_id, material_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'climate_material_profiles_tenant_material_key'
    ) THEN
        ALTER TABLE climate_material_profiles ADD CONSTRAINT climate_material_profiles_tenant_material_key UNIQUE(tenant_id, material_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
END$$;

-- Indexes for climate_material_profiles
CREATE INDEX IF NOT EXISTS idx_climate_material_profiles_tenant ON climate_material_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_climate_material_profiles_material ON climate_material_profiles(material_id);
CREATE INDEX IF NOT EXISTS idx_climate_material_profiles_tenant_material ON climate_material_profiles(tenant_id, material_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_climate_material_profiles_updated_at ON climate_material_profiles;
CREATE TRIGGER update_climate_material_profiles_updated_at
    BEFORE UPDATE ON climate_material_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE climate_material_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all for service role" ON climate_material_profiles;
CREATE POLICY "Allow all for service role" ON climate_material_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_material_profiles IS 'Climate impact profiles for materials - baseline CO2, savings vs reference, water/land savings';

-- 14A.3: Extend product_climate_meta with derived material impact
ALTER TABLE product_climate_meta ADD COLUMN IF NOT EXISTS derived_material_impact_kgco2 NUMERIC(12, 4);
COMMENT ON COLUMN product_climate_meta.derived_material_impact_kgco2 IS 'Aggregated CO2 footprint per product unit, computed from material composition and climate_material_profiles';

-- 14A.4: Extend climate_missions with material-switch fields
-- material_mission_type: e.g. switch_material, increase_hemp_share, pilot_hemp_product
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS material_mission_type TEXT;
COMMENT ON COLUMN climate_missions.material_mission_type IS 'Type of material-related mission: switch_material, increase_hemp_share, pilot_hemp_product';

-- from_material_id: the material being switched from
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS from_material_id UUID REFERENCES materials(id) ON DELETE SET NULL;
COMMENT ON COLUMN climate_missions.from_material_id IS 'Material being switched from in a material-switch mission';

-- to_material_id: the material being switched to
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS to_material_id UUID REFERENCES materials(id) ON DELETE SET NULL;
COMMENT ON COLUMN climate_missions.to_material_id IS 'Material being switched to in a material-switch mission';

-- material_quantity: quantity of material involved
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS material_quantity NUMERIC(12, 4);
COMMENT ON COLUMN climate_missions.material_quantity IS 'Quantity of material involved in this mission';

-- material_quantity_unit: e.g. kg, units, m2
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS material_quantity_unit TEXT;
COMMENT ON COLUMN climate_missions.material_quantity_unit IS 'Unit for material_quantity: kg, units, m2, etc.';

-- estimated_savings_kgco2: estimate of CO2 savings for this mission
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS estimated_savings_kgco2 NUMERIC(12, 4);
COMMENT ON COLUMN climate_missions.estimated_savings_kgco2 IS 'Estimated CO2 savings for this material-switch mission';

-- Indexes for material-switch missions
CREATE INDEX IF NOT EXISTS idx_climate_missions_material_type ON climate_missions(material_mission_type) WHERE material_mission_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_climate_missions_from_material ON climate_missions(from_material_id) WHERE from_material_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_climate_missions_to_material ON climate_missions(to_material_id) WHERE to_material_id IS NOT NULL;

-- ============================================================================
-- STEP 14C: QUANTUM CLIMATE LAB v1.0 (Iteration 00C2)
-- ============================================================================

-- 14C.1: Create climate_experiments table
-- Represents a research experiment in the Quantum Climate Lab
CREATE TABLE IF NOT EXISTS climate_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    problem_domain TEXT NOT NULL,
    method_family TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    linked_profile_id UUID REFERENCES climate_profiles(id) ON DELETE SET NULL,
    linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    linked_material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    tags TEXT[],
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for climate_experiments
CREATE INDEX IF NOT EXISTS idx_climate_experiments_tenant ON climate_experiments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_climate_experiments_tenant_status ON climate_experiments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_climate_experiments_tenant_domain ON climate_experiments(tenant_id, problem_domain);
CREATE INDEX IF NOT EXISTS idx_climate_experiments_tenant_method ON climate_experiments(tenant_id, method_family);

-- Updated_at trigger for climate_experiments
DROP TRIGGER IF EXISTS update_climate_experiments_updated_at ON climate_experiments;
CREATE TRIGGER update_climate_experiments_updated_at
    BEFORE UPDATE ON climate_experiments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for climate_experiments
ALTER TABLE climate_experiments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for climate_experiments
DROP POLICY IF EXISTS "Allow all for service role" ON climate_experiments;
CREATE POLICY "Allow all for service role" ON climate_experiments
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_experiments IS 'Quantum Climate Lab experiments - research tracking for classical, quantum-inspired, and quantum-hardware methods';
COMMENT ON COLUMN climate_experiments.problem_domain IS 'Problem domain: energy_optimization, transport_routing, material_mix, supply_chain, scenario_modeling';
COMMENT ON COLUMN climate_experiments.method_family IS 'Method family: classical, quantum_inspired, quantum_hardware';
COMMENT ON COLUMN climate_experiments.status IS 'Experiment status: draft, design, running, analyzing, completed, archived';

-- 14C.2: Create climate_experiment_runs table
-- Represents a single run of a given experiment with concrete parameters + results
CREATE TABLE IF NOT EXISTS climate_experiment_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES climate_experiments(id) ON DELETE CASCADE,
    run_label TEXT,
    method_type TEXT NOT NULL,
    backend_provider TEXT,
    input_summary JSONB,
    parameters JSONB,
    metrics JSONB,
    evaluation JSONB,
    status TEXT NOT NULL DEFAULT 'completed',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for climate_experiment_runs
CREATE INDEX IF NOT EXISTS idx_climate_experiment_runs_tenant_experiment ON climate_experiment_runs(tenant_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_climate_experiment_runs_tenant_status ON climate_experiment_runs(tenant_id, status);

-- Updated_at trigger for climate_experiment_runs
DROP TRIGGER IF EXISTS update_climate_experiment_runs_updated_at ON climate_experiment_runs;
CREATE TRIGGER update_climate_experiment_runs_updated_at
    BEFORE UPDATE ON climate_experiment_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for climate_experiment_runs
ALTER TABLE climate_experiment_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for climate_experiment_runs
DROP POLICY IF EXISTS "Allow all for service role" ON climate_experiment_runs;
CREATE POLICY "Allow all for service role" ON climate_experiment_runs
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE climate_experiment_runs IS 'Individual runs of Quantum Climate Lab experiments with parameters, metrics, and evaluation';
COMMENT ON COLUMN climate_experiment_runs.method_type IS 'Specific method: linear_programming, greedy_heuristic, quantum_annealing, qaoa, vqe, other_quantum';
COMMENT ON COLUMN climate_experiment_runs.backend_provider IS 'Backend provider: classical_internal, qiskit, braket, cirq, simulator';
COMMENT ON COLUMN climate_experiment_runs.status IS 'Run status: queued, running, completed, failed';

-- ============================================================================
-- STEP 14D: VERIFY SCHEMA
-- ============================================================================

-- This query will show all tables that should exist
-- Run this after the script to verify everything is set up correctly
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count required tables (now 25 with climate_experiments and climate_experiment_runs)
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('tenants', 'users', 'memory_events', 'journal_entries', 'climate_profiles', 'climate_missions', 'climate_plans', 'climate_plan_items', 'frontend_configs', 'agent_suggestions', 'brands', 'products', 'product_brands', 'agent_tasks', 'agent_insights', 'agent_commands', 'materials', 'product_materials', 'product_climate_meta', 'zora_shop_projects', 'agent_task_policies', 'autonomy_schedules', 'climate_material_profiles', 'climate_experiments', 'climate_experiment_runs');
    
    -- Count search_memories_by_embedding functions (should be exactly 1)
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE proname = 'search_memories_by_embedding';
    
    RAISE NOTICE '=== ZORA CORE Schema Verification ===';
    RAISE NOTICE 'Required tables found: % of 25', table_count;
    RAISE NOTICE 'search_memories_by_embedding functions: % (should be 1)', function_count;
    
    IF table_count = 25 AND function_count = 1 THEN
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
