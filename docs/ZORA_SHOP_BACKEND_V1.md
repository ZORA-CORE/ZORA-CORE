# ZORA SHOP Backend v1.0

This document describes the ZORA SHOP Backend v1.0 implementation, which provides the climate-first product universe and brand collaboration layer for ZORA CORE.

## Overview

ZORA SHOP Backend v1.0 introduces:

- **Climate-aware Brands**: Brands with metadata including name, description, website, logo, country, and sector
- **Materials**: Base materials (e.g., organic cotton, recycled polyester, hemp) with categories
- **Products**: ZORA SHOP products with pricing, status lifecycle, and primary images
- **Product Materials**: Join table linking products to materials with percentage composition
- **Product Climate Metadata**: Climate labels, estimated CO2 impact, and certifications
- **ZORA SHOP Projects**: Brand collaboration projects with status lifecycle (idea -> brief -> concept -> review -> launched -> archived)

All operations are tenant-scoped and create journal entries for lifecycle events.

## Database Schema

### Tables Added/Modified

#### materials
Stores base materials for products.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| name | VARCHAR(255) | Material name |
| description | TEXT | Material description |
| category | VARCHAR(100) | Material category (e.g., "natural", "recycled", "synthetic") |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### product_materials
Join table linking products to materials.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| product_id | UUID | Foreign key to products |
| material_id | UUID | Foreign key to materials |
| percentage | NUMERIC(5,2) | Percentage of material in product (0-100) |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### product_climate_meta
Climate metadata for products.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| product_id | UUID | Foreign key to products (unique) |
| climate_label | VARCHAR(100) | Climate label (e.g., "low_impact", "climate_neutral", "climate_positive") |
| estimated_impact_kgco2 | NUMERIC(12,2) | Estimated CO2 impact in kg |
| certifications | TEXT | Certifications (comma-separated or JSON) |
| notes | TEXT | Additional notes |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### zora_shop_projects
ZORA SHOP Projects for brand collaborations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| title | VARCHAR(500) | Project title |
| description | TEXT | Project description |
| status | VARCHAR(50) | Project status (idea/brief/concept/review/launched/archived) |
| primary_brand_id | UUID | Foreign key to brands (required) |
| secondary_brand_id | UUID | Foreign key to brands (optional) |
| theme | VARCHAR(255) | Project theme |
| target_launch_date | DATE | Target launch date |
| launched_at | TIMESTAMPTZ | Actual launch timestamp |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### products (modified)
Added columns for ZORA SHOP Backend v1.0:

| Column | Type | Description |
|--------|------|-------------|
| brand_id | UUID | Foreign key to brands |
| price_currency | VARCHAR(10) | Currency code (default: EUR) |
| price_amount | NUMERIC(12,2) | Price amount |
| description | TEXT | Product description |

## API Endpoints

All endpoints require JWT authentication and operate within the authenticated user's tenant.

### Brands

#### GET /api/shop/brands
List all brands for the current tenant.

**Query Parameters:**
- `sector` (optional): Filter by sector
- `country` (optional): Filter by country
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Brand Name",
      "slug": "brand-name",
      "description": "Brand description",
      "country": "DK",
      "sector": "fashion",
      "climate_tagline": "Climate-first fashion",
      "website_url": "https://example.com",
      "logo_url": "https://example.com/logo.png",
      "metadata": {},
      "created_at": "2025-01-01T00:00:00Z",
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

#### POST /api/shop/brands
Create a new brand.

**Request Body:**
```json
{
  "name": "Brand Name",
  "slug": "brand-name",
  "description": "Brand description",
  "country": "DK",
  "sector": "fashion",
  "climate_tagline": "Climate-first fashion",
  "website_url": "https://example.com",
  "logo_url": "https://example.com/logo.png",
  "metadata": {}
}
```

### Materials

#### GET /api/shop/materials
List all materials for the current tenant.

**Query Parameters:**
- `category` (optional): Filter by category
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Organic Cotton",
      "description": "100% organic cotton",
      "category": "natural",
      "metadata": {},
      "created_at": "2025-01-01T00:00:00Z",
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

#### POST /api/shop/materials
Create a new material.

**Request Body:**
```json
{
  "name": "Organic Cotton",
  "description": "100% organic cotton",
  "category": "natural",
  "metadata": {}
}
```

### Products

#### GET /api/shop/products
List all products for the current tenant.

**Query Parameters:**
- `brand_id` (optional): Filter by brand
- `status` (optional): Filter by status (draft/published/archived)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "brand_id": "uuid",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Product description",
      "price_currency": "EUR",
      "price_amount": 99.99,
      "primary_image_url": "https://example.com/image.png",
      "status": "draft",
      "metadata": {},
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": null,
      "brand": {
        "id": "uuid",
        "name": "Brand Name",
        "slug": "brand-name",
        "sector": "fashion",
        "climate_tagline": "Climate-first fashion",
        "logo_url": "https://example.com/logo.png"
      }
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

#### GET /api/shop/products/:id
Get a specific product with full details including materials and climate metadata.

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "brand_id": "uuid",
  "name": "Product Name",
  "slug": "product-name",
  "description": "Product description",
  "price_currency": "EUR",
  "price_amount": 99.99,
  "primary_image_url": "https://example.com/image.png",
  "status": "draft",
  "metadata": {},
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": null,
  "brand": {
    "id": "uuid",
    "name": "Brand Name",
    "slug": "brand-name",
    "sector": "fashion",
    "climate_tagline": "Climate-first fashion",
    "logo_url": "https://example.com/logo.png",
    "website_url": "https://example.com"
  },
  "materials": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "material_id": "uuid",
      "percentage": 80,
      "notes": "Main fabric",
      "material": {
        "id": "uuid",
        "name": "Organic Cotton",
        "description": "100% organic cotton",
        "category": "natural"
      }
    }
  ],
  "climate_meta": {
    "id": "uuid",
    "product_id": "uuid",
    "climate_label": "climate_neutral",
    "estimated_impact_kgco2": 2.5,
    "certifications": "GOTS, OEKO-TEX",
    "notes": "Carbon offset included"
  }
}
```

#### POST /api/shop/products
Create a new product with materials and climate metadata.

**Request Body:**
```json
{
  "brand_id": "uuid",
  "name": "Product Name",
  "slug": "product-name",
  "description": "Product description",
  "price_currency": "EUR",
  "price_amount": 99.99,
  "primary_image_url": "https://example.com/image.png",
  "status": "draft",
  "materials": [
    {
      "material_id": "uuid",
      "percentage": 80,
      "notes": "Main fabric"
    }
  ],
  "climate_meta": {
    "climate_label": "climate_neutral",
    "estimated_impact_kgco2": 2.5,
    "certifications": "GOTS, OEKO-TEX",
    "notes": "Carbon offset included"
  },
  "metadata": {}
}
```

### ZORA SHOP Projects

#### GET /api/zora-shop/projects
List all projects for the current tenant.

**Query Parameters:**
- `status` (optional): Filter by status (idea/brief/concept/review/launched/archived)
- `primary_brand_id` (optional): Filter by primary brand
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "title": "Summer Collab 2025",
      "description": "Climate-first summer collection",
      "status": "concept",
      "primary_brand_id": "uuid",
      "secondary_brand_id": "uuid",
      "theme": "Sustainable Summer",
      "target_launch_date": "2025-06-01",
      "launched_at": null,
      "metadata": {},
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": null,
      "primary_brand": {
        "id": "uuid",
        "name": "Brand A",
        "slug": "brand-a",
        "sector": "fashion",
        "logo_url": "https://example.com/logo-a.png"
      },
      "secondary_brand": {
        "id": "uuid",
        "name": "Brand B",
        "slug": "brand-b",
        "sector": "lifestyle",
        "logo_url": "https://example.com/logo-b.png"
      }
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

#### POST /api/zora-shop/projects
Create a new project.

**Request Body:**
```json
{
  "title": "Summer Collab 2025",
  "description": "Climate-first summer collection",
  "status": "idea",
  "primary_brand_id": "uuid",
  "secondary_brand_id": "uuid",
  "theme": "Sustainable Summer",
  "target_launch_date": "2025-06-01",
  "metadata": {}
}
```

#### PATCH /api/zora-shop/projects/:id/status
Update project status.

**Request Body:**
```json
{
  "status": "concept"
}
```

**Valid Status Transitions:**
- `idea` -> `brief` -> `concept` -> `review` -> `launched` -> `archived`
- When status changes to `launched`, the `launched_at` timestamp is automatically set

## Journal Events

The following journal event types are created by ZORA SHOP Backend v1.0:

- `shop_material_created` - Material created
- `shop_material_updated` - Material updated
- `shop_material_deleted` - Material deleted
- `shop_product_created` - Product created
- `shop_product_updated` - Product updated
- `shop_product_deleted` - Product deleted
- `zora_shop_project_created` - Project created
- `zora_shop_project_updated` - Project updated
- `zora_shop_project_status_changed` - Project status changed
- `zora_shop_project_deleted` - Project deleted

## Climate Labels

Products can have the following climate labels:

- `low_impact` - Product has lower environmental impact than conventional alternatives
- `climate_neutral` - Product's carbon footprint has been offset
- `climate_positive` - Product actively removes more carbon than it produces

## Schema Version

ZORA SHOP Backend v1.0 updates the schema to version 2.1.0. Run the updated `SUPABASE_SCHEMA_V1_FULL.sql` script to apply the changes.

## Usage Example

### Creating a Climate-First Product

```bash
# 1. Create a brand
curl -X POST https://api.zoracore.dk/api/shop/brands \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EcoWear",
    "sector": "fashion",
    "climate_tagline": "Fashion that heals the planet"
  }'

# 2. Create materials
curl -X POST https://api.zoracore.dk/api/shop/materials \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Cotton",
    "category": "natural",
    "description": "GOTS certified organic cotton"
  }'

# 3. Create a product with materials and climate metadata
curl -X POST https://api.zoracore.dk/api/shop/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "BRAND_UUID",
    "name": "Climate-Positive T-Shirt",
    "price_currency": "EUR",
    "price_amount": 49.99,
    "status": "draft",
    "materials": [
      {
        "material_id": "MATERIAL_UUID",
        "percentage": 100
      }
    ],
    "climate_meta": {
      "climate_label": "climate_positive",
      "estimated_impact_kgco2": -1.5,
      "certifications": "GOTS, Climate Neutral Certified"
    }
  }'

# 4. Create a brand collaboration project
curl -X POST https://api.zoracore.dk/api/zora-shop/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "EcoWear x Partner Summer Drop",
    "primary_brand_id": "BRAND_UUID",
    "secondary_brand_id": "PARTNER_BRAND_UUID",
    "theme": "Sustainable Summer",
    "target_launch_date": "2025-06-01"
  }'

# 5. Update project status as it progresses
curl -X PATCH https://api.zoracore.dk/api/zora-shop/projects/PROJECT_UUID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "brief"}'
```

## Next Steps

Future iterations may include:

- Public product catalog endpoints
- Product search with climate filters
- Inventory management
- Order/checkout flow (when ready)
- Integration with Climate OS for product impact tracking
