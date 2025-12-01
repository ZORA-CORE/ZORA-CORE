# Schema Versioning v1.0

This document describes the schema versioning system introduced in Iteration 00C6 for ZORA CORE.

## Overview

ZORA CORE now tracks which schema version is deployed in production via a dedicated `schema_metadata` table. This provides a single source of truth for schema versioning and enables the `/api/admin/schema-status` endpoint to report the current schema version.

## The schema_metadata Table

The `schema_metadata` table stores version records each time the schema script is applied:

```sql
CREATE TABLE IF NOT EXISTS schema_metadata (
    id BIGSERIAL PRIMARY KEY,
    schema_version TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);
```

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Auto-incrementing primary key |
| `schema_version` | TEXT | Semantic version string (e.g., "2.8.0") |
| `applied_at` | TIMESTAMPTZ | Timestamp when this version was applied |
| `notes` | TEXT | Optional notes about what changed in this version |

## How Schema Versions Are Updated

When you run `SUPABASE_SCHEMA_V1_FULL.sql`, the script:

1. Creates the `schema_metadata` table if it doesn't exist
2. Creates/updates all other tables idempotently
3. Inserts a new version record at the end of the script

The version insert at the end of the schema script looks like:

```sql
INSERT INTO schema_metadata (schema_version, notes)
VALUES ('2.8.0', 'GOES GREEN + Foundation + Quantum Lab + Orgs/Playbooks + Schema Versioning v1.0');
```

Each time you run the schema script, a new row is added. The most recent row (by `applied_at`) represents the current schema version.

## Querying the Current Schema Version

To get the current schema version from the database:

```sql
SELECT schema_version, applied_at, notes
FROM schema_metadata
ORDER BY applied_at DESC
LIMIT 1;
```

## The /api/admin/schema-status Endpoint

The `/api/admin/schema-status` endpoint now returns the current schema version along with table health information:

### Request

```
GET /api/admin/schema-status
Headers:
  X-ZORA-ADMIN-SECRET: <your-bootstrap-secret>
```

### Response

```json
{
  "schema_version": "2.8.0",
  "schema_ok": true,
  "missing_tables": [],
  "missing_columns": [],
  "checked_at": "2025-12-01T00:30:00.000Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | string or null | Current schema version from database, or null if not found |
| `schema_ok` | boolean | True if all expected tables and columns exist |
| `missing_tables` | string[] | List of expected tables that are missing |
| `missing_columns` | string[] | List of expected columns that are missing (format: "table.column") |
| `checked_at` | string | ISO timestamp of when the check was performed |

## Workflow for Future Iterations

When creating a new iteration that modifies the schema:

1. Update the version header comment in `SUPABASE_SCHEMA_V1_FULL.sql`:
   ```sql
   -- Version: X.Y.Z (Description of changes)
   ```

2. Make your schema changes (add tables, columns, etc.)

3. Update the verification step to include any new tables in the count

4. Update the version INSERT at the end of the script:
   ```sql
   INSERT INTO schema_metadata (schema_version, notes)
   VALUES ('X.Y.Z', 'Description of what changed');
   ```

5. Run the schema script in Supabase SQL Editor

6. Verify via `/api/admin/schema-status` that the new version is reported

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 2.8.0 | 2025-12-01 | GOES GREEN + Foundation + Quantum Lab + Orgs/Playbooks + Schema Versioning v1.0 |
| 2.3.0 | 2025-11-28 | Safety + Scheduling v1 - Task approval policies and autonomy schedules |

## Idempotency

The schema script is designed to be idempotent and safe to run multiple times:

- All `CREATE TABLE` statements use `IF NOT EXISTS`
- All `ALTER TABLE ADD COLUMN` statements use `IF NOT EXISTS`
- Indexes use `IF NOT EXISTS`
- Triggers are dropped and recreated to avoid duplicates
- The version INSERT adds a new row each time (intentional for audit trail)

Running the script multiple times will not cause errors, but will add multiple version records. The most recent record (by `applied_at`) is always considered the current version.

## Troubleshooting

### schema_version is null

If `/api/admin/schema-status` returns `schema_version: null`:

1. The `schema_metadata` table may not exist - run the full schema script
2. No version records exist - the INSERT at the end of the script may have failed

### Version mismatch

If the version in the header comment doesn't match the database:

1. Someone may have edited the header without running the script
2. The script may have been partially executed
3. Re-run the full schema script to sync the version

### Multiple version records

Having multiple records with the same version is normal if you've run the script multiple times. The system always uses the most recent record by `applied_at`.
