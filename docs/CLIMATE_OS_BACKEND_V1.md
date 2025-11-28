# Climate OS Backend v1.0 Documentation

**Iteration:** 00B2  
**Date:** 2025-11-28  
**Schema Version:** 2.0.0

## Overview

Climate OS Backend v1.0 provides a complete backend infrastructure for ZORA CORE's climate tracking and planning features. This iteration builds on the existing multi-profile support and adds summary endpoints, time-series aggregation, and weekly climate plan management.

## Multi-Profile Model

Climate OS supports multiple profiles per tenant, each with a specific scope and optional organization details.

### Profile Scopes

| Scope | Description |
|-------|-------------|
| individual | Personal climate profile for a single person |
| household | Shared profile for a household or family |
| organization | Profile for a company or non-profit organization |
| brand | Profile for a brand within the ZORA ecosystem |

### Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| name | VARCHAR(255) | Profile name |
| scope | VARCHAR(50) | One of: individual, household, organization, brand |
| is_primary | BOOLEAN | Whether this is the primary profile for the tenant |
| profile_type | profile_type | Legacy type: person, brand, organization |
| country | VARCHAR(100) | Country location |
| city_or_region | VARCHAR(255) | City or region |
| household_size | INTEGER | Number of people (for household scope) |
| primary_energy_source | VARCHAR(100) | Main energy source |
| notes | TEXT | Additional notes |
| organization_name | VARCHAR(255) | Organization name (for org/brand scopes) |
| sector | VARCHAR(100) | Industry sector |
| website_url | VARCHAR(500) | Organization website |
| logo_url | VARCHAR(500) | Organization logo |

### Primary Profile

Each tenant can have at most one primary profile (`is_primary = true`). This is enforced by a partial unique index on the database. When setting a profile as primary, all other profiles for the tenant are automatically set to `is_primary = false`.

## Missions

Missions are climate actions tied to a specific profile. Each mission has a status, category, and estimated CO2 impact.

### Mission Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| profile_id | UUID | Foreign key to climate_profiles |
| title | VARCHAR(500) | Mission title |
| description | TEXT | Detailed description |
| category | VARCHAR(100) | Category: energy, transport, food, water, waste, products |
| status | mission_status | One of: planned, in_progress, completed, cancelled, failed |
| estimated_impact_kgco2 | NUMERIC(12,2) | Estimated CO2 impact in kg |
| due_date | DATE | Target completion date |
| started_at | TIMESTAMPTZ | When mission was started |
| completed_at | TIMESTAMPTZ | When mission was completed |

## API Endpoints

### Profile Endpoints

#### GET /api/climate/profiles

Lists all profiles for the current tenant.

**Query Parameters:**
- `type` (optional): Filter by profile_type
- `scope` (optional): Filter by scope (individual, household, organization, brand)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Climate Profile",
      "scope": "individual",
      "is_primary": true,
      "country": "Denmark",
      "city_or_region": "Copenhagen",
      ...
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1,
    "has_more": false
  }
}
```

#### POST /api/climate/profiles

Creates a new climate profile.

**Request Body:**
```json
{
  "name": "My Climate Profile",
  "scope": "individual",
  "is_primary": true,
  "country": "Denmark",
  "city_or_region": "Copenhagen",
  "household_size": 2,
  "primary_energy_source": "renewable"
}
```

#### PUT /api/climate/profiles/:id

Updates an existing profile.

#### POST /api/climate/profiles/:id/set-primary

Sets the specified profile as the primary profile for the tenant.

### Profile Summary Endpoint

#### GET /api/climate/profiles/:id/summary

Returns aggregated statistics for a profile's missions.

**Response:**
```json
{
  "profile_id": "uuid",
  "total_missions": 12,
  "missions_completed": 5,
  "missions_in_progress": 3,
  "missions_planned": 4,
  "missions_cancelled": 0,
  "missions_failed": 0,
  "total_estimated_impact_kgco2": 123.45
}
```

### Profile Timeseries Endpoint

#### GET /api/climate/profiles/:id/timeseries

Returns time-series data of completed missions aggregated by period.

**Query Parameters:**
- `granularity` (optional): One of: day, week, month (default: week)

**Response:**
```json
{
  "profile_id": "uuid",
  "granularity": "week",
  "points": [
    {
      "period_start": "2025-11-01",
      "missions_completed": 2,
      "estimated_impact_kgco2_completed": 40.0
    },
    {
      "period_start": "2025-11-08",
      "missions_completed": 1,
      "estimated_impact_kgco2_completed": 15.0
    }
  ]
}
```

### Mission Endpoints

#### GET /api/climate/profiles/:profileId/missions

Lists missions for a specific profile.

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

#### POST /api/climate/profiles/:profileId/missions

Creates a new mission for a profile.

**Request Body:**
```json
{
  "title": "Switch to LED bulbs",
  "description": "Replace 5 traditional bulbs with LED",
  "category": "energy",
  "estimated_impact_kgco2": 20,
  "due_date": "2025-12-31"
}
```

#### PATCH /api/climate/missions/:id

Updates a mission (status, description, etc.).

### Climate Plans Endpoints

Climate plans are weekly or monthly action plans that can be suggested and applied to create missions.

#### GET /api/climate/profiles/:id/plans

Lists climate plans for a profile.

**Query Parameters:**
- `status` (optional): Filter by status (proposed, active, archived)
- `plan_type` (optional): Filter by type (weekly, monthly)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "profile_id": "uuid",
      "plan_type": "weekly",
      "period_start": "2025-12-01",
      "period_end": "2025-12-07",
      "status": "proposed",
      "created_at": "2025-11-28T12:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### GET /api/climate/profiles/:id/plans/:planId

Gets a specific plan with its items.

**Response:**
```json
{
  "id": "uuid",
  "profile_id": "uuid",
  "plan_type": "weekly",
  "period_start": "2025-12-01",
  "period_end": "2025-12-07",
  "status": "proposed",
  "items": [
    {
      "id": "uuid",
      "title": "Reduce energy consumption at home",
      "description": "Turn off lights and unplug devices...",
      "category": "energy",
      "estimated_impact_kgco2": 5,
      "status": "planned"
    }
  ]
}
```

#### POST /api/climate/profiles/:id/weekly-plan/suggest

Suggests a new weekly climate plan based on templates.

**Request Body (optional):**
```json
{
  "period_start": "2025-12-01",
  "period_end": "2025-12-07"
}
```

If not provided, defaults to the upcoming Monday through Sunday.

**Response:**
```json
{
  "id": "uuid",
  "profile_id": "uuid",
  "plan_type": "weekly",
  "period_start": "2025-12-01",
  "period_end": "2025-12-07",
  "status": "proposed",
  "items": [
    {
      "title": "Reduce energy consumption at home",
      "category": "energy",
      "estimated_impact_kgco2": 5,
      "status": "planned"
    },
    ...
  ]
}
```

#### POST /api/climate/profiles/:id/weekly-plan/:planId/apply

Applies a proposed plan, creating missions from plan items.

**Request Body (optional):**
```json
{
  "create_missions": true
}
```

**Response:**
```json
{
  "plan": {
    "id": "uuid",
    "status": "active",
    "items": [ ... ]
  },
  "missions_created": 4,
  "mission_ids": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

## Database Schema

### climate_plans Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| profile_id | UUID | Foreign key to climate_profiles |
| plan_type | VARCHAR(50) | Type: weekly, monthly |
| period_start | DATE | Start of plan period |
| period_end | DATE | End of plan period |
| status | VARCHAR(50) | Status: proposed, active, archived |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### climate_plan_items Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| plan_id | UUID | Foreign key to climate_plans |
| mission_id | UUID | Foreign key to climate_missions (optional) |
| title | VARCHAR(500) | Item title |
| description | TEXT | Item description |
| category | VARCHAR(100) | Category |
| estimated_impact_kgco2 | NUMERIC(12,2) | Estimated impact |
| status | VARCHAR(50) | Status: planned, completed, skipped |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Weekly Plan Lifecycle

1. **Suggest**: Call `POST /api/climate/profiles/:id/weekly-plan/suggest` to create a proposed plan with template-based items.

2. **Review**: The plan is created with `status: proposed`. Users can review the suggested items.

3. **Apply**: Call `POST /api/climate/profiles/:id/weekly-plan/:planId/apply` to:
   - Create missions from each plan item
   - Link plan items to the created missions
   - Set plan status to `active`

4. **Track**: Missions can be tracked and completed individually. The timeseries endpoint shows progress over time.

5. **Archive**: Plans can be archived when the period ends (future feature).

## Journal Events

Climate OS Backend v1.0 creates the following journal entries:

| Event Type | Description |
|------------|-------------|
| climate_profile_created | New profile created |
| climate_profile_updated | Profile updated |
| climate_mission_created | New mission created |
| climate_mission_status_updated | Mission status changed |
| climate_missions_bootstrapped | Starter missions created |
| climate_plan_suggested | Weekly plan suggested |
| climate_plan_applied | Weekly plan applied, missions created |

## Migration Guide

### Applying Schema Updates

Run the updated `SUPABASE_SCHEMA_V1_FULL.sql` script to add the new tables:

```sql
-- The script is idempotent and can be run multiple times safely
-- It will create climate_plans and climate_plan_items tables if they don't exist
```

### Existing Data

Existing profiles and missions will continue to work. The new plan features are additive and don't affect existing data.

## Future Improvements

The following features are planned for future iterations:

- LLM-assisted plan suggestions (using LUMINA/ORACLE agents)
- Monthly plan support
- Plan archiving and history
- Impact tracking and verification
- Integration with agent insights for personalized suggestions
- Recurring plan templates
