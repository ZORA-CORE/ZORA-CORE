# Climate OS v0.3 - Multi-Profile & Organization/Brand Support

## Overview

Climate OS v0.3 introduces multi-profile support, allowing a single tenant to manage multiple climate profiles with different scopes (individual, household, organization, brand). This enables users to track climate impact across personal and professional contexts.

## Key Features

### Multi-Profile Support

Each tenant can now create and manage multiple climate profiles:

- **Individual**: Personal climate tracking for a single person
- **Household**: Climate tracking for a family or shared living situation
- **Organization**: Climate tracking for companies, NGOs, or other organizations
- **Brand**: Climate tracking for specific brands or product lines

### Primary Profile

One profile per tenant can be marked as the "primary" profile:

- The primary profile is shown by default on the dashboard
- Primary profiles appear first in profile lists
- Only one profile can be primary at a time
- Setting a new primary automatically unsets the previous one

### Organization/Brand Fields

Profiles with organization or brand scope have additional fields:

- **organization_name**: Formal name of the organization
- **sector**: Industry sector (fashion, tech, food, retail, manufacturing, services, other)
- **website_url**: Organization website
- **logo_url**: Organization logo URL

### Profile-Scoped Missions

Missions are now scoped to specific profiles:

- Each mission belongs to exactly one profile
- Switching profiles shows only that profile's missions
- Bootstrap missions are created for the selected profile
- Mission statistics are calculated per-profile

## Database Schema Changes

New columns added to `climate_profiles` table:

```sql
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'individual';
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE climate_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

Indexes added:

```sql
CREATE INDEX IF NOT EXISTS idx_climate_profiles_scope ON climate_profiles(scope);
CREATE INDEX IF NOT EXISTS idx_climate_profiles_is_primary ON climate_profiles(is_primary);
```

Partial unique index to enforce single primary per tenant:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_climate_profiles_primary_per_tenant 
ON climate_profiles(tenant_id) WHERE is_primary = TRUE;
```

## API Endpoints

### GET /api/climate/profiles

List all profiles for the authenticated tenant.

Query parameters:
- `limit`: Maximum number of profiles to return (default: 100)
- `scope`: Filter by scope (individual, household, organization, brand)

Response includes profiles ordered by `is_primary DESC, created_at DESC`.

### POST /api/climate/profiles

Create a new profile.

Request body:
```json
{
  "name": "My Organization",
  "profile_type": "organization",
  "scope": "organization",
  "organization_name": "ZORA CORE ApS",
  "sector": "tech",
  "website_url": "https://zoracore.dk",
  "is_primary": false
}
```

### PUT /api/climate/profiles/:id

Update an existing profile.

Request body:
```json
{
  "name": "Updated Name",
  "scope": "brand",
  "organization_name": "New Org Name",
  "sector": "fashion"
}
```

### POST /api/climate/profiles/:id/set-primary

Set a profile as the primary profile for the tenant.

This endpoint:
1. Unsets any existing primary profile
2. Sets the specified profile as primary
3. Creates a journal entry for the change

### POST /api/climate/profiles/:profileId/missions/bootstrap

Bootstrap starter missions for a specific profile.

The `profile_id` parameter ensures missions are created for the correct profile.

## Frontend Components

### Profile Selector

A dropdown component that allows switching between profiles:

- Shows profile name, scope badge, and primary indicator
- Includes "Create New Profile" option
- Auto-selects primary profile on page load

### Scope Badges

Color-coded badges indicating profile scope:

- Individual: Blue
- Household: Purple
- Organization: Amber
- Brand: Emerald

### Profile Detail Pane

Displays all profile information including:

- Basic info (name, type, country, city)
- Organization fields (for org/brand scopes)
- Climate settings (energy source, transport mode, diet type)
- Edit and Set Primary buttons

### Edit Profile Modal

Modal for editing profile details with:

- Dynamic fields based on scope
- Scope selector
- Organization-specific fields shown only for org/brand scopes

### Create Profile Modal

Modal for creating new profiles with:

- Scope selection
- Profile type selection
- Organization fields (shown for org/brand scopes)
- Location and energy settings

## Dashboard Integration

The dashboard now includes a Profiles Overview section:

- Shows count of profiles by scope
- Displays primary profile summary
- Links to Climate OS for profile management

## Journal Integration

Profile events are logged to the journal:

- `climate_profile_created`: When a new profile is created
- `climate_profile_updated`: When a profile is updated
- `climate_profile_set_primary`: When a profile is set as primary

Mission events include profile context:

- Profile name
- Profile scope
- Profile ID

## Migration Guide

### Existing Profiles

Existing profiles will have:
- `scope` defaulted to 'individual'
- `is_primary` defaulted to FALSE

To set an existing profile as primary:
1. Navigate to /climate
2. Select the profile
3. Click "Set as Primary"

### Schema Update

Run the updated `supabase/SUPABASE_SCHEMA_V1_FULL.sql` script in your Supabase SQL Editor. The script is idempotent and safe to run multiple times.

## Known Limitations

1. **No profile deletion**: Profiles cannot be deleted through the UI (to preserve mission history)
2. **No profile transfer**: Missions cannot be moved between profiles
3. **Single tenant**: Multi-profile is per-tenant, not cross-tenant

## Future Enhancements

Potential future improvements:

1. Profile archiving (soft delete)
2. Profile templates for common organization types
3. Profile sharing between tenants
4. Aggregated reporting across profiles
5. Profile-specific climate goals and targets
