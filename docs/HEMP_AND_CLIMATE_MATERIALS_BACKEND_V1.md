# Hemp & Climate Materials Backend v1.0

**Iteration 00C1** - Backend-only implementation for hemp and climate-relevant materials tracking.

## Overview

This iteration extends ZORA CORE's materials and climate models to support hemp and legally regulated cannabis-derived materials as climate-relevant materials with structured climate impact data. The implementation links into both Climate OS and ZORA SHOP, enabling material-switch missions and climate impact estimation.

**Important**: This module focuses strictly on industrial, sustainable, and climate-relevant uses of hemp and cannabis-derived materials (textiles, packaging, construction, bioplastics). It does NOT support recreational aspects.

## Schema Changes

All schema changes are idempotent and encoded in `supabase/SUPABASE_SCHEMA_V1_FULL.sql`.

### Extended Materials Table

The `materials` table now includes hemp/cannabis tagging fields:

```sql
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_hemp_or_cannabis_material BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS hemp_category TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS climate_benefit_note TEXT;
```

**Hemp Categories**: `fiber`, `bioplastic`, `construction`, `paper_packaging`, `other_industrial`

### New Climate Material Profiles Table

The `climate_material_profiles` table stores per-material climate impact data:

```sql
CREATE TABLE IF NOT EXISTS climate_material_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    baseline_unit TEXT NOT NULL DEFAULT 'kg',
    baseline_co2_kg_per_unit NUMERIC(12, 4),
    reference_material_name TEXT,
    co2_savings_vs_reference_kg_per_unit NUMERIC(12, 4),
    water_savings_l_per_unit NUMERIC(12, 4),
    land_savings_m2_per_unit NUMERIC(12, 4),
    data_source_label TEXT,
    data_source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
```

Each tenant can have one climate profile per material (unique constraint on `tenant_id, material_id`).

### Extended Product Climate Meta

The `product_climate_meta` table now includes derived material impact:

```sql
ALTER TABLE product_climate_meta ADD COLUMN IF NOT EXISTS derived_material_impact_kgco2 NUMERIC(12, 4);
```

This field stores the aggregated CO2 footprint per product unit, computed from material composition and climate_material_profiles.

### Extended Climate Missions (Material-Switch Missions)

The `climate_missions` table now supports material-switch mission fields:

```sql
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS material_mission_type TEXT;
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS from_material_id UUID REFERENCES materials(id);
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS to_material_id UUID REFERENCES materials(id);
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS material_quantity NUMERIC(12, 4);
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS material_quantity_unit TEXT;
ALTER TABLE climate_missions ADD COLUMN IF NOT EXISTS estimated_savings_kgco2 NUMERIC(12, 4);
```

**Material Mission Types**: `switch_material`, `increase_hemp_share`, `pilot_hemp_product`

## API Endpoints

### Hemp Materials

**GET /api/shop/materials/hemp**

List all hemp/cannabis materials for the current tenant.

Query parameters:
- `hemp_category` (optional): Filter by category (fiber, bioplastic, construction, paper_packaging, other_industrial)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Hemp Fiber",
      "description": "Industrial hemp fiber for textiles",
      "category": "textile",
      "is_hemp_or_cannabis_material": true,
      "hemp_category": "fiber",
      "climate_benefit_note": "Requires 50% less water than cotton",
      "metadata": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": null
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

### Climate Material Profiles

**GET /api/climate/materials/profiles**

List climate material profiles for the current tenant.

Query parameters:
- `material_id` (optional): Filter by specific material
- `hemp_only` (optional): If "true", only return profiles for hemp materials
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "material_id": "uuid",
      "baseline_unit": "kg",
      "baseline_co2_kg_per_unit": 2.5,
      "reference_material_name": "Cotton",
      "co2_savings_vs_reference_kg_per_unit": 5.0,
      "water_savings_l_per_unit": 1000,
      "land_savings_m2_per_unit": 0.5,
      "data_source_label": "Hemp Industry Report 2024",
      "data_source_url": "https://example.com/report",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": null
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

**PUT /api/climate/materials/profiles/:materialId**

Create or update a climate material profile for a specific material.

Request body:
```json
{
  "baseline_unit": "kg",
  "baseline_co2_kg_per_unit": 2.5,
  "reference_material_name": "Cotton",
  "co2_savings_vs_reference_kg_per_unit": 5.0,
  "water_savings_l_per_unit": 1000,
  "land_savings_m2_per_unit": 0.5,
  "data_source_label": "Hemp Industry Report 2024",
  "data_source_url": "https://example.com/report"
}
```

Creates a journal entry on success.

### Material Impact Estimation

**GET /api/climate/materials/impact**

Estimate climate impact for a material or product.

Query parameters (one required):
- `material_id`: Get impact for a single material
- `product_id`: Get aggregated impact across all product materials

Response:
```json
{
  "material_id": "uuid",
  "total_co2_kg": 2.5,
  "breakdown": [
    {
      "material_id": "uuid",
      "material_name": "Hemp Fiber",
      "percentage": 100,
      "co2_kg_per_unit": 2.5,
      "contribution_kg": 2.5
    }
  ],
  "data_completeness": "full"
}
```

For products, the response aggregates across all materials based on their percentages in `product_materials`.

**Data Completeness Values**:
- `full`: All materials have climate profiles with CO2 data
- `partial`: Some materials have climate profiles
- `none`: No materials have climate profiles

### Material-Switch Missions

The existing mission endpoints now accept material-switch fields:

**POST /api/climate/profiles/:profileId/missions**

Create a mission with optional material-switch fields:

```json
{
  "title": "Switch packaging from plastic to hemp",
  "description": "Replace plastic packaging with hemp-based alternatives",
  "category": "materials",
  "material_mission_type": "switch_material",
  "from_material_id": "uuid-of-plastic",
  "to_material_id": "uuid-of-hemp-packaging",
  "material_quantity": 100,
  "material_quantity_unit": "kg",
  "estimated_savings_kgco2": 500
}
```

**PATCH /api/missions/:id**

Update a mission with material-switch fields:

```json
{
  "status": "completed",
  "material_quantity": 150,
  "estimated_savings_kgco2": 750
}
```

Material IDs are validated to ensure they belong to the tenant.

## Journal Integration

All operations create journal entries with meaningful context:

- `climate_material_profile_created`: When a new climate profile is created
- `climate_material_profile_updated`: When a climate profile is updated
- `climate_material_mission_created`: When a material-switch mission is created
- `climate_material_mission_status_updated`: When a material-switch mission status changes

Example journal entry for material-switch mission:
```
Material switch mission created for profile 'My Climate Profile': Cotton → Hemp Fiber (100 kg)
```

## TypeScript Types

New types added to `workers/api/src/types.ts`:

```typescript
// Hemp material category types
export type HempCategory = 'fiber' | 'bioplastic' | 'construction' | 'paper_packaging' | 'other_industrial';

// Extended Material type with hemp fields
export interface HempMaterial extends Material {
  is_hemp_or_cannabis_material: boolean;
  hemp_category: HempCategory | null;
  climate_benefit_note: string | null;
}

// Climate Material Profile
export interface ClimateMaterialProfile {
  id: string;
  tenant_id: string;
  material_id: string;
  baseline_unit: string;
  baseline_co2_kg_per_unit: number | null;
  reference_material_name: string | null;
  co2_savings_vs_reference_kg_per_unit: number | null;
  water_savings_l_per_unit: number | null;
  land_savings_m2_per_unit: number | null;
  data_source_label: string | null;
  data_source_url: string | null;
  created_at: string;
  updated_at: string | null;
}

// Material mission types
export type MaterialMissionType = 'switch_material' | 'increase_hemp_share' | 'pilot_hemp_product';

// Extended ClimateMission with material-switch fields
export interface MaterialSwitchMission extends ClimateMission {
  material_mission_type: MaterialMissionType | null;
  from_material_id: string | null;
  to_material_id: string | null;
  material_quantity: number | null;
  material_quantity_unit: string | null;
  estimated_savings_kgco2: number | null;
}

// Material impact estimation response
export interface MaterialImpactEstimate {
  material_id?: string;
  product_id?: string;
  total_co2_kg: number | null;
  breakdown: MaterialImpactBreakdown[];
  data_completeness: 'full' | 'partial' | 'none';
}
```

## Usage Examples

### Creating a Hemp Material

```bash
curl -X POST https://api.zoracore.dk/api/shop/materials \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hemp Fiber",
    "description": "Industrial hemp fiber for sustainable textiles",
    "category": "textile",
    "metadata": {
      "is_hemp_or_cannabis_material": true,
      "hemp_category": "fiber",
      "climate_benefit_note": "Requires 50% less water than cotton"
    }
  }'
```

### Adding Climate Profile to Material

```bash
curl -X PUT https://api.zoracore.dk/api/climate/materials/profiles/MATERIAL_ID \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "baseline_co2_kg_per_unit": 2.5,
    "reference_material_name": "Cotton",
    "co2_savings_vs_reference_kg_per_unit": 5.0,
    "water_savings_l_per_unit": 1000,
    "data_source_label": "Hemp Industry Report 2024"
  }'
```

### Creating a Material-Switch Mission

```bash
curl -X POST https://api.zoracore.dk/api/climate/profiles/PROFILE_ID/missions \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Switch to hemp packaging",
    "material_mission_type": "switch_material",
    "from_material_id": "PLASTIC_MATERIAL_ID",
    "to_material_id": "HEMP_MATERIAL_ID",
    "material_quantity": 100,
    "material_quantity_unit": "kg",
    "estimated_savings_kgco2": 500
  }'
```

### Estimating Product Impact

```bash
curl "https://api.zoracore.dk/api/climate/materials/impact?product_id=PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_JWT"
```

## Security & Tenant Isolation

All endpoints enforce tenant scoping via RLS and JWT authentication:

- Materials, climate profiles, and missions are scoped to the authenticated tenant
- Material IDs are validated to ensure they belong to the tenant before use
- Cross-tenant data access is prevented at the database level

## Future Enhancements

Potential future iterations could include:

1. **Automatic CO2 Savings Calculation**: Compute `estimated_savings_kgco2` from climate profiles when creating material-switch missions
2. **Material Certification Tracking**: Add certification fields (organic, fair trade, etc.)
3. **Supply Chain Integration**: Link materials to suppliers and track sourcing
4. **Impact Visualization**: Frontend dashboards for material impact analysis
5. **Agent Integration**: ORACLE agent suggestions for material switches based on climate profiles

## Related Documentation

- [ZORA SHOP Backend v1.0](./ZORA_SHOP_BACKEND_V1.md)
- [Climate OS Backend v1.0](./CLIMATE_OS_BACKEND_V1.md)
- [Auth Backend v1.0](./AUTH_BACKEND_V1.md)
