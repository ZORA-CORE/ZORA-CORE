# ZORA CORE – Schema Automation v1

This document explains how ZORA CORE automatically keeps the Supabase database schema in sync with the codebase. After one-time setup, you never need to manually copy/paste SQL into Supabase again.

## How It Works

Whenever changes land on the `main` branch that affect the schema file, GitHub Actions automatically applies `supabase/SUPABASE_SCHEMA_V1_FULL.sql` to the Supabase production database.

The schema script is **idempotent** - it's safe to run multiple times. It uses `CREATE TABLE IF NOT EXISTS`, `DO $$ ... END $$` blocks, and other patterns that gracefully handle existing objects.

### When Does Schema Sync Run?

The workflow runs automatically when:

1. **Push to main** with changes to:
   - `supabase/SUPABASE_SCHEMA_V1_FULL.sql`
   - `supabase/migrations/**`
   - `.github/workflows/supabase-schema-sync.yml`

2. **Manual trigger** from the GitHub Actions UI (useful for forcing a sync or testing)

## One-Time Setup (For Mads)

You only need to do this once to enable automatic schema sync.

### Step 1: Get Your Supabase Connection String

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **Project Settings** (gear icon in the sidebar)
3. Click on **Database** in the left menu
4. Scroll down to **Connection string**
5. Select **URI** format
6. Copy the connection string - it looks like:
   ```
   postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

> **Important**: Make sure to use the connection string with your actual password, not the placeholder `[YOUR-PASSWORD]`.

### Step 2: Add the Secret to GitHub

1. Go to the ZORA-CORE repository on GitHub: https://github.com/ZORA-CORE/ZORA-CORE
2. Click **Settings** (tab at the top)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in:
   - **Name**: `SUPABASE_DB_URL`
   - **Secret**: Paste the connection string from Step 1
6. Click **Add secret**

That's it! The schema sync will now run automatically on every relevant push to main.

## How to Run Schema Sync Manually

If you want to force a schema sync (for example, after fixing something in Supabase directly):

1. Go to the ZORA-CORE repository on GitHub
2. Click the **Actions** tab
3. In the left sidebar, click **Supabase Schema Sync**
4. Click the **Run workflow** dropdown button (on the right)
5. Optionally check "Dry run" to validate SQL without applying
6. Click **Run workflow**
7. Watch the logs to confirm success

## How to Verify Schema Health

### Option 1: Check the API Status

Visit https://api.zoracore.dk/api/status - if Supabase is connected, the schema is likely healthy.

### Option 2: Use the Admin Schema Status Endpoint

Visit `/api/admin/schema-status` (requires bootstrap secret or founder JWT) to see:
- Whether all expected tables exist
- Whether all expected columns exist
- Any missing tables or columns

### Option 3: Check via Admin UI

Navigate to `/admin/setup` and look for the "Schema Status" section, which shows a green/red indicator for schema health.

### Option 4: Visual Check in Supabase

1. Go to your Supabase project
2. Click **Table Editor** in the sidebar
3. Verify these tables exist:
   - `tenants`
   - `users`
   - `memory_events`
   - `journal_entries`
   - `climate_profiles`
   - `climate_missions`
   - `frontend_configs`
   - `agent_suggestions`

## Troubleshooting

### "Secret not found" Error

If the workflow fails with a secret-related error:
1. Verify `SUPABASE_DB_URL` is set in GitHub Secrets (Settings → Secrets → Actions)
2. Make sure there are no extra spaces or newlines in the secret value

### "Connection refused" Error

If the workflow can't connect to Supabase:
1. Check that your Supabase project is running (not paused)
2. Verify the connection string is correct
3. Some Supabase plans require IP allowlisting - check your project's network settings

### "Permission denied" Error

If the workflow fails with permission errors:
1. Make sure you're using the `postgres` user connection string (not a restricted role)
2. Check that the password in the connection string is correct

### Schema Sync Succeeded but Tables Missing

If the workflow reports success but tables are missing:
1. Check the workflow logs for any warnings
2. Run the schema sync manually with "Dry run" unchecked
3. As a fallback, you can still manually run the SQL in Supabase SQL Editor

## Manual Fallback

If automatic sync isn't working, you can always fall back to manual sync:

1. Go to your Supabase project
2. Click **SQL Editor** in the sidebar
3. Copy the contents of `supabase/SUPABASE_SCHEMA_V1_FULL.sql` from GitHub
4. Paste into the SQL Editor
5. Click **Run**

This is now only a fallback - the normal workflow is automatic sync via GitHub Actions.

## Security Notes

- The `SUPABASE_DB_URL` secret is never printed in logs
- The workflow uses `ON_ERROR_STOP=1` to fail fast on errors
- Only the `main` branch can trigger production schema changes
- Manual dispatch is available for emergency fixes

## Related Documentation

- [Supabase Setup (No-CLI)](./SUPABASE_SETUP_NO_CLI.md) - Original manual setup guide
- [Developer Setup](./DEVELOPER_SETUP.md) - Local development environment
- [Deployment Overview](./DEPLOYMENT_OVERVIEW.md) - Full deployment guide
