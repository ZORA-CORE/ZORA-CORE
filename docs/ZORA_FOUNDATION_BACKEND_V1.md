# THE ZORA FOUNDATION Backend v1.0

This document describes THE ZORA FOUNDATION Backend v1.0, a non-profit flavored layer inside ZORA CORE focused 100% on climate projects and tracking real climate impact from contributions.

## Overview

THE ZORA FOUNDATION provides:

1. A formal data model for climate-relevant projects, contributions, and impact logs
2. Tracking of how tenants contribute (directly or via ZORA SHOP, subscriptions, etc.)
3. API endpoints to list/manage foundation projects, record contributions, and retrieve impact summaries
4. Integration with the existing multi-tenant model, journaling system, and schema automation

## Schema

### foundation_projects

Represents climate-relevant projects that ZORA and its tenants can support.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global ZORA-wide projects, set for tenant-owned projects |
| title | TEXT | Project title (required) |
| description | TEXT | Project description |
| category | TEXT | Project category (required) |
| status | TEXT | Project status (default: 'planned') |
| climate_focus_domain | TEXT | Climate focus area |
| location_country | TEXT | Country where project operates |
| location_region | TEXT | Region within country |
| sdg_tags | TEXT[] | UN SDG references (e.g., 'SDG13', 'SDG7') |
| estimated_impact_kgco2 | NUMERIC | Estimated CO2 impact in kg |
| verified_impact_kgco2 | NUMERIC | Verified CO2 impact after execution |
| impact_methodology | TEXT | How impact is measured |
| external_url | TEXT | External project URL |
| image_url | TEXT | Project image URL |
| min_contribution_amount_cents | BIGINT | Minimum contribution (default: 0) |
| currency | TEXT | Currency code (default: 'DKK') |
| tags | TEXT[] | Free-form tags for filtering |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Allowed Values:**

- **category**: `reforestation`, `renewable_energy`, `ocean`, `hemp_materials`, `community`, `adaptation`
- **status**: `planned`, `active`, `completed`, `paused`, `archived`
- **climate_focus_domain**: `energy`, `materials`, `transport`, `food`, `nature`, `adaptation`

### foundation_contributions

Tracks money/value that flows to foundation projects.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Contributing tenant (required) |
| project_id | UUID | Target project (required) |
| source_type | TEXT | Contribution source (required) |
| source_reference | TEXT | Reference ID (subscription ID, invoice ID, etc.) |
| amount_cents | BIGINT | Contribution amount in cents (required) |
| currency | TEXT | Currency code (default: 'DKK') |
| contributed_at | TIMESTAMPTZ | When contribution was made |
| contributor_label | TEXT | Optional label (e.g., 'Brand X', 'Anonymous') |
| notes | TEXT | Additional notes |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Allowed Values:**

- **source_type**: `manual`, `subscription`, `zora_shop_commission`, `external`

### foundation_impact_log

Logs climate impact over time in interpretable units.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | For tenant-specific views (optional) |
| project_id | UUID | Target project (required) |
| period_start | TIMESTAMPTZ | Start of impact period (required) |
| period_end | TIMESTAMPTZ | End of impact period (required) |
| impact_kgco2 | NUMERIC | Impact in kg CO2 equivalent (required) |
| impact_units | TEXT | Human-readable units |
| impact_units_value | NUMERIC | Value in human-readable units |
| description | TEXT | Summary of what was achieved |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Example impact_units**: `trees_planted`, `m2_restored`, `kWh_clean_energy`

## API Endpoints

All endpoints require JWT authentication and are tenant-scoped.

### Projects

#### GET /api/foundation/projects

List foundation projects visible to the current tenant.

**Query Parameters:**
- `status` (optional): Filter by status
- `category` (optional): Filter by category
- `climate_focus_domain` (optional): Filter by climate focus
- `tenant_scope` (optional): `global` (only global), `tenant` (only tenant-owned), `all` (default)
- `limit` (optional): Page size (default: 50)
- `offset` (optional): Page offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": null,
      "title": "Reforestation in Region X",
      "category": "reforestation",
      "status": "active",
      "contribution_count": 5,
      "total_contributions_cents": 250000,
      ...
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /api/foundation/projects

Create a tenant-owned foundation project.

**Required Role:** `founder`, `brand_admin`, or `admin`

**Request Body:**
```json
{
  "title": "Hemp Materials Research",
  "category": "hemp_materials",
  "description": "Research into sustainable hemp-based building materials",
  "climate_focus_domain": "materials",
  "location_country": "DK",
  "sdg_tags": ["SDG13", "SDG12"],
  "estimated_impact_kgco2": 50000,
  "impact_methodology": "LCA-based estimation",
  "tags": ["research", "hemp", "construction"]
}
```

**Response:** Created project object with status 201

#### GET /api/foundation/projects/:id

Get a single project by ID.

**Response:** Project object

#### PATCH /api/foundation/projects/:id

Update a project. Tenants can only update their own projects. Founders can update global projects.

**Request Body:** Any updatable fields from the project schema

**Response:** Updated project object

### Contributions

#### GET /api/foundation/projects/:id/contributions

List contributions for a project.

**Query Parameters:**
- `from` (optional): Filter contributions from this date
- `to` (optional): Filter contributions to this date
- `limit` (optional): Page size (default: 50)
- `offset` (optional): Page offset (default: 0)

**Access Control:**
- Tenants see their own contributions
- Project owners see all contributions to their projects
- Founders see all contributions

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "project_id": "uuid",
      "amount_cents": 5000,
      "currency": "DKK",
      "source_type": "manual",
      "contributed_at": "2025-11-30T12:00:00Z",
      ...
    }
  ],
  "pagination": { ... }
}
```

#### POST /api/foundation/projects/:id/contributions

Record a contribution to a project.

**Request Body:**
```json
{
  "amount_cents": 5000,
  "currency": "DKK",
  "source_type": "manual",
  "source_reference": "INV-2025-001",
  "contributor_label": "Brand X",
  "notes": "Year-end climate support"
}
```

**Response:** Created contribution object with status 201

### Impact Summary

#### GET /api/foundation/projects/:id/impact-summary

Get an impact summary for a project combining contributions and impact logs.

**Response:**
```json
{
  "project_id": "uuid",
  "title": "Reforestation in Region X",
  "status": "active",
  "total_contributions_cents": 250000,
  "currency": "DKK",
  "total_impact_kgco2": 12345.67,
  "impact_units": "trees_planted",
  "impact_units_value": 5000,
  "last_update": "2025-11-30T12:34:56Z"
}
```

If no impact logs exist, `total_impact_kgco2`, `impact_units`, `impact_units_value`, and `last_update` will be `null`.

## Journal Integration

THE ZORA FOUNDATION creates journal entries in the `zora_foundation` category for key events:

- `foundation_project_created`: When a new project is created
- `foundation_project_updated`: When a project status changes
- `foundation_contribution_recorded`: When a contribution is recorded

## Example Workflows

### Tenant Creates a Climate Project

```bash
curl -X POST https://api.zoracore.dk/api/foundation/projects \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Local Reforestation Initiative",
    "category": "reforestation",
    "description": "Planting native trees in local community areas",
    "climate_focus_domain": "nature",
    "location_country": "DK",
    "location_region": "Zealand",
    "estimated_impact_kgco2": 10000
  }'
```

### Tenant Contributes to a Project

```bash
curl -X POST https://api.zoracore.dk/api/foundation/projects/<project_id>/contributions \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_cents": 10000,
    "source_type": "manual",
    "contributor_label": "My Brand",
    "notes": "Monthly climate contribution"
  }'
```

### Query Impact Summary

```bash
curl https://api.zoracore.dk/api/foundation/projects/<project_id>/impact-summary \
  -H "Authorization: Bearer <JWT>"
```

## Security & Tenant Isolation

- All endpoints require JWT authentication
- Projects with `tenant_id = NULL` are global (visible to all tenants)
- Projects with `tenant_id` set are tenant-owned (visible only to that tenant)
- Contributions are always tenant-scoped
- RLS policies enforce tenant isolation at the database level

## Future Enhancements

Future iterations may include:

- Automated routing of ZORA SHOP commission to foundation projects
- Subscription-based recurring contributions
- Richer impact analytics and reporting
- Public foundation dashboard
- Integration with external climate verification services
- Automated impact log creation from verified sources

## Schema Version

This iteration updates the schema to version 2.6.0, adding 3 new tables (28 total):
- `foundation_projects`
- `foundation_contributions`
- `foundation_impact_log`

Apply schema updates via `supabase/SUPABASE_SCHEMA_V1_FULL.sql` in your Supabase SQL Editor.
