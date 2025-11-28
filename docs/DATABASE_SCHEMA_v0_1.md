# ZORA CORE Database Schema v0.1

**Version:** 0.1  
**Date:** November 28, 2025  
**Status:** Initial Release

---

## Overview

This document describes the initial Supabase (Postgres) database schema for ZORA CORE. The schema is designed to be minimal but forward-compatible, supporting the core functionality needed for Iteration 0002 while allowing for future expansion.

The schema covers three main areas:

1. **EIVOR Memory System** - Persistent storage for agent memories
2. **ZORA Journal** - High-level system events and decisions
3. **Climate OS (Basic)** - Foundation for climate profiles and missions

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│   memory_events     │
├─────────────────────┤
│ id (PK)             │
│ agent               │
│ memory_type         │
│ content             │
│ tags[]              │
│ metadata (JSONB)    │
│ session_id          │
│ embedding           │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌─────────────────────┐
│  journal_entries    │
├─────────────────────┤
│ id (PK)             │
│ category            │
│ title               │
│ body                │
│ details (JSONB)     │
│ related_memory_ids[]│
│ related_entity_ids[]│
│ author              │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│  climate_profiles   │         │  climate_missions   │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │◄────────│ profile_id (FK)     │
│ owner_id            │         │ id (PK)             │
│ profile_type        │         │ title               │
│ name                │         │ description         │
│ description         │         │ category            │
│ energy_source       │         │ status              │
│ transport_mode      │         │ started_at          │
│ diet_type           │         │ completed_at        │
│ location_type       │         │ impact_estimate     │
│ climate_score       │         │ verified            │
│ estimated_footprint │         │ verified_by         │
│ metadata (JSONB)    │         │ verification_notes  │
│ created_at          │         │ metadata (JSONB)    │
│ updated_at          │         │ created_at          │
└─────────────────────┘         │ updated_at          │
                                └─────────────────────┘
```

---

## Tables

### 1. memory_events

Stores all memory entries from EIVOR and other agents. This is the core table for ZORA CORE's persistent memory system.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| agent | VARCHAR(50) | NO | - | Agent name (CONNOR, LUMINA, etc.) |
| memory_type | memory_type | NO | - | Type of memory (enum) |
| content | TEXT | NO | - | The actual memory content |
| tags | TEXT[] | YES | '{}' | Array of tags for categorization |
| metadata | JSONB | YES | '{}' | Flexible additional metadata |
| session_id | VARCHAR(100) | YES | - | Session identifier for grouping |
| embedding | VECTOR(1536) | YES | - | Vector embedding for semantic search |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | YES | - | Last update timestamp |

**Memory Types (Enum):**
- `decision` - Decision records
- `reflection` - Agent reflections
- `artifact` - Created artifacts
- `conversation` - Conversation logs
- `plan` - Planning records
- `result` - Task results
- `research` - Research findings
- `design` - Design decisions
- `safety_review` - AEGIS safety reviews
- `climate_data` - Climate-related data
- `brand_data` - Brand-related data

**Indexes:**
- `idx_memory_events_agent` - Fast lookup by agent
- `idx_memory_events_type` - Fast lookup by memory type
- `idx_memory_events_session` - Fast lookup by session
- `idx_memory_events_created_at` - Chronological ordering
- `idx_memory_events_tags` - GIN index for tag filtering
- `idx_memory_events_metadata` - GIN index for JSON queries
- `idx_memory_events_content_trgm` - Trigram index for text search

### 2. journal_entries

High-level system events and decisions. This provides an audit trail and historical record of important ZORA CORE activities.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| category | journal_category | NO | - | Category of entry (enum) |
| title | VARCHAR(500) | NO | - | Entry title |
| body | TEXT | YES | - | Detailed description |
| details | JSONB | YES | '{}' | Structured details |
| related_memory_ids | UUID[] | YES | '{}' | Links to memory_events |
| related_entity_ids | UUID[] | YES | '{}' | Links to other entities |
| author | VARCHAR(50) | YES | - | Agent or user who created |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | YES | - | Last update timestamp |

**Journal Categories (Enum):**
- `release` - Software releases
- `decision` - Important decisions
- `model_update` - AI model updates
- `experiment` - Experiments and tests
- `milestone` - Project milestones
- `incident` - Incidents and issues
- `config_change` - Configuration changes
- `agent_action` - Significant agent actions
- `user_feedback` - User feedback records
- `system_event` - System-level events

### 3. climate_profiles

Stores climate profiles for users, brands, and organizations. This is the foundation for Climate OS.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| owner_id | VARCHAR(255) | YES | - | External user/brand ID |
| profile_type | profile_type | NO | 'person' | Type of profile (enum) |
| name | VARCHAR(255) | NO | - | Profile name |
| description | TEXT | YES | - | Profile description |
| energy_source | VARCHAR(100) | YES | - | Primary energy source |
| transport_mode | VARCHAR(100) | YES | - | Primary transport mode |
| diet_type | VARCHAR(100) | YES | - | Diet type |
| location_type | VARCHAR(100) | YES | - | Location type (urban/rural) |
| climate_score | INTEGER | YES | - | Climate score (0-100) |
| estimated_footprint_kg | DECIMAL(12,2) | YES | - | Estimated CO2 footprint |
| metadata | JSONB | YES | '{}' | Additional metadata |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | YES | - | Last update timestamp |

**Profile Types (Enum):**
- `person` - Individual user
- `brand` - Brand or company
- `organization` - Organization or group

### 4. climate_missions

Tracks climate actions and their impact. Missions are linked to profiles and can be verified by AEGIS.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| profile_id | UUID | YES | - | FK to climate_profiles |
| title | VARCHAR(500) | NO | - | Mission title |
| description | TEXT | YES | - | Mission description |
| category | VARCHAR(100) | YES | - | Category (energy, transport, etc.) |
| status | mission_status | NO | 'planned' | Current status (enum) |
| started_at | TIMESTAMPTZ | YES | - | When mission started |
| completed_at | TIMESTAMPTZ | YES | - | When mission completed |
| impact_estimate | JSONB | YES | '{}' | Estimated impact metrics |
| verified | BOOLEAN | YES | FALSE | Whether verified by AEGIS |
| verified_by | VARCHAR(50) | YES | - | Agent that verified |
| verification_notes | TEXT | YES | - | Verification notes |
| metadata | JSONB | YES | '{}' | Additional metadata |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | YES | - | Last update timestamp |

**Mission Status (Enum):**
- `planned` - Mission is planned
- `in_progress` - Mission is active
- `completed` - Mission completed successfully
- `cancelled` - Mission was cancelled
- `failed` - Mission failed

**Impact Estimate Structure:**
```json
{
  "co2_kg": 500,
  "energy_kwh": 1000,
  "water_liters": 5000,
  "description": "Reduced carbon by switching to renewable energy"
}
```

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Current policies allow all operations for the service role. These should be refined based on actual authentication requirements:

```sql
-- Example: Restrict memory_events to the creating agent
CREATE POLICY "Agents can only see their own memories" ON memory_events
    FOR SELECT
    USING (agent = current_setting('app.current_agent', true));
```

### Recommendations for Production

1. **Use service role key** for backend operations (never expose to frontend)
2. **Implement proper RLS policies** based on user authentication
3. **Add audit logging** for sensitive operations
4. **Enable SSL** for all database connections

---

## Extensions Required

The schema requires the following Postgres extensions:

1. **uuid-ossp** - For UUID generation
2. **pg_trgm** - For trigram-based text search
3. **pgvector** (optional) - For vector embeddings and semantic search

To enable pgvector for semantic search:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Migration Files

The schema is defined in SQL migration files located at:

```
supabase/migrations/
├── 00001_initial_schema.sql    # This schema
└── ...                         # Future migrations
```

### Applying Migrations

**Using Supabase CLI:**
```bash
supabase db push
```

**Using Supabase Dashboard:**
1. Go to SQL Editor
2. Copy the migration SQL
3. Execute

**Using MCP:**
```
apply_migration(project_id, name="00001_initial_schema", query="...")
```

---

## Usage Examples

### Saving a Memory Event

```sql
INSERT INTO memory_events (agent, memory_type, content, tags, metadata, session_id)
VALUES (
    'CONNOR',
    'decision',
    'Decided to use Supabase for persistent storage',
    ARRAY['architecture', 'database'],
    '{"confidence": 0.95, "alternatives_considered": ["MongoDB", "DynamoDB"]}',
    'session_abc123'
);
```

### Searching Memories

```sql
-- By agent and type
SELECT * FROM memory_events
WHERE agent = 'EIVOR' AND memory_type = 'reflection'
ORDER BY created_at DESC
LIMIT 10;

-- By tags
SELECT * FROM memory_events
WHERE 'climate' = ANY(tags)
ORDER BY created_at DESC;

-- Full-text search
SELECT * FROM memory_events
WHERE content ILIKE '%supabase%'
ORDER BY created_at DESC;
```

### Creating a Climate Profile

```sql
INSERT INTO climate_profiles (owner_id, profile_type, name, energy_source, climate_score)
VALUES (
    'user_123',
    'person',
    'John Doe',
    'mixed_grid',
    72
);
```

### Creating a Climate Mission

```sql
INSERT INTO climate_missions (profile_id, title, description, category, impact_estimate)
VALUES (
    'profile-uuid-here',
    'Switch to Renewable Energy',
    'Transition home to 100% renewable energy sources',
    'energy',
    '{"co2_kg": 2500, "description": "Annual CO2 reduction from renewable switch"}'
);
```

---

## Future Enhancements

### Planned for Future Iterations

1. **Vector Search** - Enable pgvector for semantic memory search
2. **Full-Text Search** - Add tsvector columns for better text search
3. **Partitioning** - Partition memory_events by date for performance
4. **Materialized Views** - Pre-computed aggregations for dashboards
5. **Foreign Keys** - Link journal entries to specific memory events
6. **Audit Tables** - Track all changes for compliance

### Schema Evolution

The schema is designed to be extended without breaking changes:
- Use JSONB columns for flexible data
- Add new enum values as needed
- Create new tables for new features
- Use migrations for all changes

---

## Tradeoffs and Assumptions

### Tradeoffs Made

1. **Simplicity over Completeness** - The schema is intentionally minimal to allow rapid iteration
2. **JSONB for Flexibility** - Using JSONB for metadata allows schema evolution without migrations
3. **No Foreign Keys to memory_events** - Journal entries reference memory IDs in arrays rather than FK constraints for flexibility
4. **Permissive RLS** - Current policies are permissive; should be tightened for production

### Assumptions

1. **Single Tenant** - Schema assumes single-tenant usage; multi-tenant would need additional isolation
2. **Service Role Access** - Backend uses service role key with full access
3. **UTC Timestamps** - All timestamps are stored in UTC
4. **English Content** - No special handling for internationalization yet

---

*Schema designed for ZORA CORE Iteration 0002*
