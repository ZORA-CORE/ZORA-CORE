# ZORA CORE - Status Report: Iteration 0010

## Supabase Production Schema Repair & One-Click Schema Script

**Date:** 2025-11-28  
**Status:** Complete  
**PR:** Pending

## Summary

This iteration provides a single, idempotent Supabase schema script and clear documentation so the Founder can repair/initialize the production database by copy-paste in Supabase SQL Editor (no CLI required).

## Problem Statement

The Founder encountered several issues when trying to set up the production database:

1. **Duplicate function error**: `ERROR: 42725: function name "search_memories_by_embedding" is not unique` - caused by running multiple migrations that each created/modified the function
2. **Missing tables**: `Could not find the table 'public.tenants' in the schema cache` - caused by incomplete migration application
3. **Brittle admin flow**: `/admin/setup` failed because the database schema was not clean/consistent

The Founder uses only browser-based tools (Supabase SQL Editor, Cloudflare UI, deployed frontends) and needed a simple, reliable way to fix the production database.

## Solution

### 1. Canonical Schema Script

Created `supabase/SUPABASE_SCHEMA_V1_FULL.sql` - a single, idempotent SQL script that:

- Uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` patterns
- Drops and recreates triggers/policies to avoid duplicates
- Explicitly drops ALL variants of `search_memories_by_embedding` before creating the canonical version
- Creates all required tables, enums, functions, and indexes
- Includes a verification block that reports schema status after running

The script can be run multiple times safely and will repair a partially migrated database.

### 2. Documentation

Created `docs/SUPABASE_SETUP_NO_CLI.md` with step-by-step instructions for:

- Verifying API connection to Supabase
- Applying the schema script via SQL Editor
- Bootstrapping the first tenant and user
- Generating JWT tokens
- Logging in and accessing the application
- Troubleshooting common issues

Updated existing documentation:
- `docs/DEVELOPER_SETUP.md` - Added reference to one-click schema script
- `docs/DEPLOYMENT_OVERVIEW.md` - Added "Part 0: Supabase Schema Setup" section

### 3. Tests

Created `tests/supabase/test_schema_idempotency.py` with 22 tests that verify:

- Schema file exists and is not empty
- Uses idempotent patterns (IF NOT EXISTS, DROP before CREATE)
- Creates all required extensions, tables, enums
- Creates the `search_memories_by_embedding` function with correct signature
- Drops duplicate functions before creating
- Adds `tenant_id` columns to all data tables
- Includes verification logic

## Files Changed

| File | Change |
|------|--------|
| `supabase/SUPABASE_SCHEMA_V1_FULL.sql` | New - Canonical idempotent schema script |
| `docs/SUPABASE_SETUP_NO_CLI.md` | New - Browser-based setup guide |
| `docs/DEVELOPER_SETUP.md` | Updated - Reference to one-click script |
| `docs/DEPLOYMENT_OVERVIEW.md` | Updated - Added Part 0 for schema setup |
| `tests/supabase/test_schema_idempotency.py` | New - Schema validation tests |
| `tests/supabase/__init__.py` | New - Test package init |

## How to Use

### For the Founder (Production Repair)

1. Go to your Supabase project dashboard
2. Open **SQL Editor**
3. Copy the contents of `supabase/SUPABASE_SCHEMA_V1_FULL.sql` from GitHub
4. Paste and click **Run**
5. Navigate to `https://zoracore.dk/admin/setup`
6. Enter your `ZORA_BOOTSTRAP_SECRET`
7. Bootstrap your first tenant and generate a JWT token
8. Log in at `https://zoracore.dk/login`

### For Developers (Local Setup)

Follow the same process using your local Supabase project, or use the Supabase CLI:

```bash
# Apply the canonical schema
psql $DATABASE_URL < supabase/SUPABASE_SCHEMA_V1_FULL.sql
```

## Schema Objects Created

### Extensions
- `uuid-ossp` - UUID generation
- `pg_trgm` - Text search
- `vector` - pgvector for semantic search

### Tables
- `tenants` - Multi-tenant registry
- `users` - Users with roles (founder, brand_admin, viewer)
- `memory_events` - EIVOR memory storage with embeddings
- `journal_entries` - System events and decisions
- `climate_profiles` - Climate OS profiles
- `climate_missions` - Climate actions and impact

### Enums
- `memory_type` - Types of memory events
- `journal_category` - Categories of journal entries
- `profile_type` - Types of climate profiles
- `mission_status` - Status of climate missions
- `user_role` - User roles for access control

### Functions
- `update_updated_at_column()` - Trigger function for timestamps
- `search_memories_by_embedding()` - Semantic search over memories

## Duplicate Function Fix

The script includes a PL/pgSQL block that:

1. Queries `pg_proc` for all functions named `search_memories_by_embedding`
2. Drops each one using `DROP FUNCTION IF EXISTS <signature> CASCADE`
3. Creates a single canonical version with the correct signature

This ensures that even if previous migrations left multiple function overloads, the script will clean them up.

## Known Limitations

1. **No automatic migration tracking**: The script doesn't use Supabase's migration system. It's designed for manual repair via SQL Editor.

2. **Existing data preserved**: The script doesn't delete existing data. It only adds missing columns/tables and fixes functions.

3. **RLS policies are permissive**: Current policies allow all operations for service role. More restrictive policies should be added in future iterations.

## Verification Query

After running the script, you can verify the schema with:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'users', 'memory_events', 'journal_entries', 'climate_profiles', 'climate_missions');

-- Check for duplicate functions (should return exactly 1 row)
SELECT oid::regprocedure AS function_signature
FROM pg_proc
WHERE proname = 'search_memories_by_embedding';
```

## Next Steps (Proposed for Future Iterations)

1. **Supabase CLI integration**: Add support for `supabase db push` with proper migration tracking
2. **Schema versioning**: Add a `schema_version` table to track applied migrations
3. **Automated testing**: Add CI job that tests schema against a real Postgres instance
4. **RLS refinement**: Implement proper row-level security policies per tenant

---

*ZORA CORE Iteration 0010 - Supabase Production Schema Repair*
