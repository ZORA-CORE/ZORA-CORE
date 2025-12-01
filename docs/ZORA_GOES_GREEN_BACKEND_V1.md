# ZORA GOES GREEN Backend v1.0

This document describes the ZORA GOES GREEN backend implementation for ZORA CORE (Iteration 00C5).

## Overview

ZORA GOES GREEN is a dedicated energy and green-transition backend module for households and organizations, focused on achieving 100% green energy. It tracks energy profiles, green assets, actions, and impact, integrating with Climate OS, Missions, and THE ZORA FOUNDATION.

## Data Model

### goes_green_profiles

Represents a GOES GREEN energy profile for a household or organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants (required) |
| organization_id | UUID | Optional link to organizations table |
| climate_profile_id | UUID | Optional link to climate_profiles table |
| profile_type | TEXT | Type: "household" or "organization" |
| name | TEXT | Profile name (e.g., "Main Home", "HQ Building") |
| country | TEXT | Country |
| city_or_region | TEXT | City or region |
| annual_energy_kwh | NUMERIC | Approximate total annual energy consumption |
| primary_energy_source | TEXT | e.g., "grid_mixed", "grid_green_tariff", "on_site_solar" |
| grid_renewable_share_percent | NUMERIC | Percentage of renewable energy in current grid/contract |
| target_green_share_percent | NUMERIC | Target percentage (e.g., 100 for 100% green goal) |
| notes | TEXT | Optional notes |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### goes_green_energy_assets

Tracks installed or planned green energy assets for each profile.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| goes_green_profile_id | UUID | Foreign key to goes_green_profiles |
| asset_type | TEXT | Type of asset (see below) |
| status | TEXT | Status: "existing", "planned", "under_evaluation", "retired" |
| capacity_kw | NUMERIC | Capacity in kW (for PV, heat pump, etc.) |
| annual_production_kwh_estimated | NUMERIC | Estimated annual production |
| annual_savings_kgco2_estimated | NUMERIC | Estimated annual CO2 savings |
| installed_at | TIMESTAMPTZ | Installation date |
| retired_at | TIMESTAMPTZ | Retirement date |
| vendor_name | TEXT | Vendor/supplier name |
| notes | TEXT | Optional notes |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Asset Types:**
- `solar_pv_rooftop` - Rooftop solar PV system
- `solar_thermal` - Solar thermal system
- `heat_pump_air_to_water` - Air-to-water heat pump
- `heat_pump_ground_source` - Ground source heat pump
- `ev_vehicle` - Electric vehicle
- `battery_storage` - Battery storage system
- `green_power_contract` - Green power contract/tariff

### goes_green_actions

Represents energy actions/measures in GOES GREEN, optionally linked to Climate OS missions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| goes_green_profile_id | UUID | Foreign key to goes_green_profiles |
| climate_mission_id | UUID | Optional link to climate_missions |
| action_type | TEXT | Type of action (see below) |
| title | TEXT | Action title |
| description | TEXT | Action description |
| status | TEXT | Status: "planned", "in_progress", "completed", "canceled" |
| estimated_impact_kgco2 | NUMERIC | Estimated CO2 impact |
| estimated_annual_kwh_savings | NUMERIC | Estimated annual kWh savings |
| payback_period_years_estimated | NUMERIC | Estimated payback period |
| cost_estimate_cents | BIGINT | Cost estimate in cents |
| currency | TEXT | Currency (default: "DKK") |
| started_at | TIMESTAMPTZ | When action started |
| completed_at | TIMESTAMPTZ | When action completed |
| canceled_at | TIMESTAMPTZ | When action was canceled |
| notes | TEXT | Optional notes |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Action Types:**
- `switch_to_green_tariff` - Switch to 100% renewable power contract
- `install_solar_pv` - Install solar PV system
- `install_heat_pump` - Install heat pump
- `improve_insulation` - Improve building insulation
- `replace_appliances` - Replace with energy-efficient appliances

### goes_green_snapshots

Stores periodic snapshots of energy and green share for progress tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| goes_green_profile_id | UUID | Foreign key to goes_green_profiles |
| snapshot_date | DATE | Date of snapshot |
| total_energy_kwh | NUMERIC | Total energy consumption |
| green_energy_kwh | NUMERIC | Green energy consumption |
| grid_renewable_share_percent | NUMERIC | Grid renewable share at snapshot time |
| computed_green_share_percent | NUMERIC | Calculated green share percentage |
| notes | TEXT | Optional notes |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |

## API Endpoints

All endpoints require JWT authentication and are tenant-scoped.

### GOES GREEN Profiles

#### List Profiles
```
GET /api/goes-green/profiles
```

Query parameters:
- `profile_type` - Filter by type ("household" or "organization")
- `organization_id` - Filter by organization
- `search` - Search by name (case-insensitive)
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

#### Create Profile
```
POST /api/goes-green/profiles
```

Request body:
```json
{
  "profile_type": "household",
  "name": "Main Home",
  "country": "DK",
  "city_or_region": "Copenhagen",
  "annual_energy_kwh": 4000,
  "primary_energy_source": "grid_mixed",
  "grid_renewable_share_percent": 40,
  "target_green_share_percent": 100,
  "climate_profile_id": "<optional-uuid>",
  "organization_id": null,
  "notes": "Family home"
}
```

#### Get Profile
```
GET /api/goes-green/profiles/:id
```

#### Update Profile
```
PATCH /api/goes-green/profiles/:id
```

### Energy Assets

#### List Assets
```
GET /api/goes-green/profiles/:id/assets
```

Query parameters:
- `status` - Filter by status
- `asset_type` - Filter by asset type
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

#### Create Asset
```
POST /api/goes-green/profiles/:id/assets
```

Request body:
```json
{
  "asset_type": "solar_pv_rooftop",
  "status": "existing",
  "capacity_kw": 5.0,
  "annual_production_kwh_estimated": 4500,
  "annual_savings_kgco2_estimated": 2000,
  "installed_at": "2024-06-01T00:00:00Z",
  "vendor_name": "GreenSolar ApS",
  "notes": "Installed on main roof"
}
```

### GOES GREEN Actions

#### List Actions
```
GET /api/goes-green/profiles/:id/actions
```

Query parameters:
- `status` - Filter by status
- `action_type` - Filter by action type
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

#### Create Action
```
POST /api/goes-green/profiles/:id/actions
```

Request body:
```json
{
  "action_type": "switch_to_green_tariff",
  "title": "Switch to 100% renewable power contract",
  "description": "Change current power contract to certified green electricity.",
  "estimated_impact_kgco2": 800,
  "estimated_annual_kwh_savings": null,
  "payback_period_years_estimated": 0.5,
  "cost_estimate_cents": 0,
  "currency": "DKK",
  "notes": "Check local providers",
  "climate_mission_id": "<optional-uuid>"
}
```

#### Update Action
```
PATCH /api/goes-green/actions/:actionId
```

Request body:
```json
{
  "status": "completed",
  "completed_at": "2025-01-15T12:00:00Z",
  "notes": "Switched supplier to Green Power DK"
}
```

### GOES GREEN Summary

#### Get Profile Summary
```
GET /api/goes-green/profiles/:id/summary
```

Returns aggregated data for a profile:
```json
{
  "profile_id": "...",
  "profile_type": "household",
  "name": "Main Home",
  "annual_energy_kwh": 4000,
  "green_share_percent_estimated": 65.0,
  "target_green_share_percent": 100.0,
  "assets": {
    "count": 2,
    "by_type": {
      "solar_pv_rooftop": 1,
      "heat_pump_air_to_water": 1
    },
    "total_annual_production_kwh_estimated": 4500,
    "total_annual_savings_kgco2_estimated": 3200
  },
  "actions": {
    "total": 5,
    "completed": 3,
    "in_progress": 1,
    "planned": 1,
    "estimated_total_impact_kgco2": 5000
  }
}
```

## Journal Integration

The following journal events are created:

| Event Type | Description |
|------------|-------------|
| `goes_green_profile_created` | When a new GOES GREEN profile is created |
| `goes_green_asset_added` | When an energy asset is added to a profile |
| `goes_green_action_created` | When a new action is created |
| `goes_green_action_status_changed` | When an action status changes |

## Example Workflows

### Setting Up a Household Profile

1. Create a GOES GREEN profile:
```bash
curl -X POST /api/goes-green/profiles \
  -H "Authorization: Bearer <token>" \
  -d '{
    "profile_type": "household",
    "name": "Main Home",
    "country": "DK",
    "annual_energy_kwh": 4000,
    "grid_renewable_share_percent": 40,
    "target_green_share_percent": 100
  }'
```

2. Add existing solar installation:
```bash
curl -X POST /api/goes-green/profiles/<id>/assets \
  -H "Authorization: Bearer <token>" \
  -d '{
    "asset_type": "solar_pv_rooftop",
    "status": "existing",
    "capacity_kw": 5.0,
    "annual_production_kwh_estimated": 4500
  }'
```

3. Create action to switch to green tariff:
```bash
curl -X POST /api/goes-green/profiles/<id>/actions \
  -H "Authorization: Bearer <token>" \
  -d '{
    "action_type": "switch_to_green_tariff",
    "title": "Switch to 100% green electricity",
    "estimated_impact_kgco2": 800
  }'
```

4. Get summary to see progress:
```bash
curl /api/goes-green/profiles/<id>/summary \
  -H "Authorization: Bearer <token>"
```

### Organization Energy Profile

1. Create organization profile linked to an existing organization:
```bash
curl -X POST /api/goes-green/profiles \
  -H "Authorization: Bearer <token>" \
  -d '{
    "profile_type": "organization",
    "name": "HQ Building",
    "organization_id": "<org-uuid>",
    "annual_energy_kwh": 50000,
    "target_green_share_percent": 100
  }'
```

## Integration Points

### Climate OS Integration

GOES GREEN actions can optionally link to Climate OS missions via `climate_mission_id`. This allows:
- Tracking energy actions as part of broader climate missions
- Unified impact reporting across Climate OS and GOES GREEN
- Mission-driven energy transition planning

### Playbooks Integration

Playbooks can target GOES GREEN profiles using:
- `playbooks.target_entity_type = 'goes_green_profile'`
- Playbook steps can create actions, add assets, or update profile data

### Autonomy Integration

Future agent tasks can use task types like:
- `goes_green.create_action`
- `goes_green.add_asset`
- `goes_green.update_profile`

## Security

All endpoints enforce:
- JWT authentication required
- Tenant isolation via RLS policies
- Profiles, assets, and actions are strictly tenant-scoped
- Cross-tenant access is prevented at the database level

## Future Extensions (v2+)

- Integration with external energy APIs (smart meters, utility providers)
- Deeper link to Climate OS missions with automatic action creation
- Playbook-driven GOES GREEN journeys
- Real-time energy monitoring and alerts
- Carbon offset integration via THE ZORA FOUNDATION
- Multi-building/site management for organizations

## Schema Version

This module is part of schema version 2.8.0, adding 4 new tables to bring the total to 37 tables.
