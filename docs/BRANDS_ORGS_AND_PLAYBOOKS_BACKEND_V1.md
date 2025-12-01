# Brand/Org & Playbooks Backend v1.0

This document describes the Organizations and Playbooks backend implementation for ZORA CORE (Iteration 00C4).

## Overview

The Brand/Org & Playbooks module provides workflow automation capabilities for ZORA CORE. It introduces Organizations as first-class entities within tenants and Playbooks as reusable workflow templates that can be executed as runs with trackable steps.

## Data Model

### Organizations

Organizations represent entities (brands, NGOs, cities, startups, energy utilities, enterprises, governments) within a tenant. They can optionally link to existing ZORA SHOP brands for integration.

**Table: `organizations`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants (required) |
| name | TEXT | Organization name |
| organization_type | TEXT | Type: brand, ngo, city, startup, energy_utility, enterprise, government |
| description | TEXT | Optional description |
| homepage_url | TEXT | Optional website URL |
| country | TEXT | Optional country |
| city_or_region | TEXT | Optional city or region |
| industry | TEXT | Optional industry classification |
| tags | TEXT[] | Optional array of tags |
| linked_shop_brand_id | UUID | Optional link to brands table |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Playbooks

Playbooks are reusable workflow templates. They can be global (tenant_id IS NULL) or tenant-specific.

**Table: `playbooks`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global playbooks, or tenant-specific |
| code | TEXT | Unique identifier code |
| name | TEXT | Display name |
| description | TEXT | Optional description |
| category | TEXT | Category: onboarding, climate, zora_shop, foundation, goes_green |
| target_entity_type | TEXT | Target: tenant, organization, climate_profile, zora_shop_project |
| is_active | BOOLEAN | Whether playbook can be run |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Playbook Steps

Step templates within a playbook, defining the workflow sequence.

**Table: `playbook_steps`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| playbook_id | UUID | Foreign key to playbooks |
| step_order | INTEGER | Order of execution (unique per playbook) |
| code | TEXT | Step identifier code |
| name | TEXT | Display name |
| description | TEXT | Optional description |
| agent_suggestion | TEXT | Suggested agent to handle this step |
| task_type | TEXT | Optional task type for agent execution |
| config | JSONB | Step configuration |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Playbook Runs

Instances of playbooks executed for a specific tenant/entity.

**Table: `playbook_runs`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| playbook_id | UUID | Foreign key to playbooks |
| target_entity_type | TEXT | Type of target entity |
| target_entity_id | UUID | Optional ID of target entity |
| status | TEXT | Status: not_started, in_progress, completed, failed, paused |
| started_at | TIMESTAMPTZ | When run started |
| completed_at | TIMESTAMPTZ | When run completed |
| failed_at | TIMESTAMPTZ | When run failed |
| failure_reason | TEXT | Reason for failure |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Playbook Run Steps

Instances of steps within a run, tracking individual step progress.

**Table: `playbook_run_steps`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| playbook_run_id | UUID | Foreign key to playbook_runs |
| playbook_step_id | UUID | Foreign key to playbook_steps |
| step_order | INTEGER | Order of execution |
| status | TEXT | Status: not_started, pending, in_progress, completed, failed, skipped |
| agent_id | TEXT | Agent handling this step |
| agent_task_id | UUID | Link to agent_tasks if automated |
| started_at | TIMESTAMPTZ | When step started |
| completed_at | TIMESTAMPTZ | When step completed |
| failed_at | TIMESTAMPTZ | When step failed |
| failure_reason | TEXT | Reason for failure |
| notes | TEXT | Optional notes |
| metadata | JSONB | Flexible metadata storage |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## API Endpoints

### Organizations API

All endpoints require JWT authentication and are tenant-scoped.

#### List Organizations
```
GET /api/org/organizations
```

Query parameters:
- `organization_type` - Filter by type
- `search` - Search by name (case-insensitive)
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

#### Get Organization
```
GET /api/org/organizations/:id
```

#### Create Organization
```
POST /api/org/organizations
```

Requires `founder` or `brand_admin` role.

Request body:
```json
{
  "name": "Example Corp",
  "organization_type": "enterprise",
  "description": "A climate-focused enterprise",
  "homepage_url": "https://example.com",
  "country": "Denmark",
  "city_or_region": "Copenhagen",
  "industry": "Technology",
  "tags": ["climate", "tech"],
  "linked_shop_brand_id": "uuid-optional",
  "metadata": {}
}
```

#### Update Organization
```
PATCH /api/org/organizations/:id
```

Requires `founder` or `brand_admin` role.

### Playbooks API

#### List Playbooks
```
GET /api/playbooks
```

Returns playbooks visible to tenant (global + tenant-specific).

Query parameters:
- `category` - Filter by category
- `target_entity_type` - Filter by target type
- `is_active` - Filter by active status
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

#### Get Playbook with Steps
```
GET /api/playbooks/:id
```

Returns playbook details including all steps.

#### Create Playbook
```
POST /api/playbooks
```

Requires `founder` or `brand_admin` role.

Request body:
```json
{
  "code": "onboarding-v1",
  "name": "Standard Onboarding",
  "description": "Onboarding workflow for new organizations",
  "category": "onboarding",
  "target_entity_type": "organization",
  "is_active": true,
  "metadata": {},
  "steps": [
    {
      "step_order": 1,
      "code": "welcome",
      "name": "Welcome & Introduction",
      "description": "Send welcome message and collect initial info",
      "agent_suggestion": "LUMINA",
      "task_type": "onboarding_welcome",
      "config": {}
    },
    {
      "step_order": 2,
      "code": "climate-assessment",
      "name": "Climate Assessment",
      "description": "Assess current climate impact",
      "agent_suggestion": "ORACLE",
      "task_type": "climate_assessment",
      "config": {}
    }
  ]
}
```

#### Update Playbook
```
PATCH /api/playbooks/:id
```

Requires `founder` or `brand_admin` role. Can only update tenant-owned playbooks.

### Playbook Runs API

#### Start Playbook Run
```
POST /api/playbooks/:id/run
```

Creates a new run with all steps initialized to `not_started`.

Request body:
```json
{
  "target_entity_type": "organization",
  "target_entity_id": "uuid-of-target",
  "metadata": {}
}
```

#### List Playbook Runs
```
GET /api/playbook-runs
```

Query parameters:
- `playbook_id` - Filter by playbook
- `status` - Filter by status
- `target_entity_type` - Filter by target type
- `target_entity_id` - Filter by target entity
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

#### Get Playbook Run with Steps
```
GET /api/playbook-runs/:id
```

Returns run details including all steps and playbook info.

#### Update Run Step Status
```
PATCH /api/playbook-runs/:id/steps/:stepId
```

Request body:
```json
{
  "status": "completed",
  "notes": "Step completed successfully",
  "agent_id": "LUMINA",
  "agent_task_id": "uuid-optional"
}
```

Valid statuses: `not_started`, `pending`, `in_progress`, `completed`, `failed`, `skipped`

When a step status changes:
- Timestamps are automatically set (started_at, completed_at, failed_at)
- Run status is automatically updated based on step statuses
- Journal entry is created for status changes

## Journal Integration

The following journal events are created:

| Event Type | Description |
|------------|-------------|
| `organization_created` | When a new organization is created |
| `playbook_created` | When a new playbook is created |
| `playbook_run_started` | When a playbook run is started |
| `playbook_run_step_status_changed` | When a step status changes |

## Example Workflows

### Onboarding a New Organization

1. Create organization via `POST /api/org/organizations`
2. Find appropriate playbook via `GET /api/playbooks?category=onboarding`
3. Start playbook run via `POST /api/playbooks/:id/run`
4. Track progress via `GET /api/playbook-runs/:id`
5. Update step statuses as work progresses via `PATCH /api/playbook-runs/:id/steps/:stepId`

### Creating a Climate Plan Playbook

1. Create playbook with climate-focused steps
2. Define steps for assessment, goal-setting, action planning, and monitoring
3. Assign agent suggestions (ORACLE for research, LUMINA for planning)
4. Run playbook for climate profiles or organizations

## Security

All endpoints enforce:
- JWT authentication required
- Tenant isolation via RLS policies
- Role-based access control (founder/brand_admin for write operations)
- Organizations are strictly tenant-scoped
- Playbooks can be global (visible to all) or tenant-specific
- Runs and run steps are strictly tenant-scoped

## Schema Version

This module is part of schema version 2.7.0, adding 5 new tables to bring the total to 33 tables.
