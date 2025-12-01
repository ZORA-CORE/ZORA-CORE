# Seed Data & Onboarding Backend v1.0

This document describes the seed data system for ZORA CORE, which allows tenants to be quickly populated with high-quality default data so the app feels alive and climate-focused out of the box.

## Overview

When a new tenant is created or bootstrapped, ZORA CORE can automatically seed the tenant with starter data across all major modules. This includes climate missions, sustainable materials, example products, foundation projects, learning content, and energy actions.

The seed system is designed to be:
- **Tenant-scoped**: Each tenant gets their own isolated seed data
- **Idempotent**: Seeds can be safely re-run without creating duplicates
- **Tracked**: The `seed_runs` table records which seeds have been applied

## Available Seed Sets (v1)

### climate_default_missions_v1
Default climate missions for new tenants spanning energy, transport, food, and products.

**Creates:**
- 1 default climate profile (if none exists)
- 10 climate missions with realistic impact estimates

**Example missions:**
- Switch to renewable energy provider (1,200 kg CO₂)
- Reduce car usage by 50% (800 kg CO₂)
- Try one meat-free day per week (200 kg CO₂)
- Choose sustainable clothing brands (250 kg CO₂)

### hemp_materials_v1
Hemp-based and sustainable materials for ZORA SHOP.

**Creates:**
- 8 materials including:
  - Organic Hemp Fleece
  - Hemp-Cotton Blend (55/45)
  - Hemp Canvas
  - Hemp Packaging Board
  - Hempcrete Block (carbon-negative!)
  - Organic Cotton
  - Recycled Polyester (rPET)
  - Tencel Lyocell

Each material includes CO₂ intensity data and climate benefit notes.

### zora_shop_starter_v1
Example brands, products, and ZORA SHOP projects.

**Creates:**
- 2 brands: "ZORA CORE Demo Brand" and "Green Fiber Co."
- 4 products: Climate Action Hoodie, Hemp Essential T-Shirt, Eco Canvas Cap, Sustainable Tote Bag
- 2 projects: "ZORA x Green Fiber Hemp Capsule" and "GOES GREEN Energy Hoodie Collection"

### foundation_starter_v1
Example ZORA FOUNDATION projects.

**Creates:**
- 3 foundation projects:
  - Urban Tree Planting (City Demo) - reforestation
  - Coastal Restoration (Demo) - ecosystem restoration
  - Solar For Schools (Demo) - renewable energy

Each project includes SDG tags, impact estimates, and funding targets.

### academy_starter_v1
Basic Climate Academy learning content.

**Creates:**
- 3 topics: Climate Basics, Hemp & Materials, GOES GREEN Energy
- 6 lessons covering fundamentals of each topic
- 2 learning paths: "Climate Basics for Individuals" and "Hemp & Materials 101"

### goes_green_starter_v1
Example GOES GREEN profiles and energy actions.

**Creates:**
- 1 household profile: "Demo Home" in Copenhagen
- 5 energy actions:
  - Switch to 100% Green Electricity (planned)
  - Install Rooftop Solar Panels (planned)
  - Replace Gas Boiler with Heat Pump (under evaluation)
  - Improve Home Insulation (under evaluation)
  - Install Smart Thermostat (completed)

Each action includes cost estimates, CO₂ savings, and payback periods.

## How to Run Seeds

### Via CLI (Python)

List available seeds:
```bash
PYTHONPATH=. python -m zora_core.seed.cli list-seeds
```

Run a specific seed for a tenant:
```bash
PYTHONPATH=. python -m zora_core.seed.cli run-seed --tenant <tenant-id> --key climate_default_missions_v1
```

Run all v1 seeds for a tenant:
```bash
PYTHONPATH=. python -m zora_core.seed.cli run-all --tenant <tenant-id>
```

### Via Workers API

**Endpoint:** `POST /api/admin/tenants/:id/seed`

**Headers:**
- `X-ZORA-ADMIN-SECRET`: Your admin secret

**Body (optional):**
```json
{
  "seeds": ["climate_default_missions_v1", "hemp_materials_v1"]
}
```

If the `seeds` array is omitted, all v1 seeds will be run.

**Response:**
```json
{
  "tenant_id": "uuid",
  "tenant_name": "My Tenant",
  "results": [
    { "seed_key": "climate_default_missions_v1", "status": "completed", "details": "Created 10 missions" },
    { "seed_key": "hemp_materials_v1", "status": "skipped_already_run", "details": "Seed already applied to this tenant" }
  ]
}
```

**Status values:**
- `completed`: Seed was successfully applied
- `skipped_already_run`: Seed was already applied to this tenant
- `error`: Seed failed (details will contain error message)

## The seed_runs Table

The `seed_runs` table tracks which seeds have been applied to each tenant:

```sql
CREATE TABLE seed_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  seed_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seed_runs_unique_tenant_seed UNIQUE (tenant_id, seed_key)
);
```

**Why it exists:**
- Prevents duplicate seeding when seeds are re-run
- Provides audit trail of when seeds were applied
- Allows partial seeding (run specific seeds, not all)

**RLS policies:**
- Tenants can only see their own seed_runs
- Service role has full access for admin operations

## Future Use Cases

The seed system is designed to support future enhancements:

### Onboarding Flows
When a new tenant signs up, the frontend can call the seed endpoint to automatically populate their account with starter data, making the app feel immediately useful.

### Demo Tenants
Create "demo" tenants with rich seed data for sales demonstrations or user trials.

### AGI-like Agent Onboarding
In the future, ZORA agents (like LUMINA or ORACLE) could use the seed system to intelligently populate tenant data based on their profile, industry, or stated goals.

### Versioned Seeds
The `_v1` suffix allows for future versions of seeds (e.g., `climate_default_missions_v2`) with updated content while maintaining backward compatibility.

## Schema Version

This feature was introduced in schema version **3.3.0** (Seed Data & Onboarding Backend v1.0).

To apply the schema update, run `supabase/SUPABASE_SCHEMA_V1_FULL.sql` in your Supabase SQL Editor.
