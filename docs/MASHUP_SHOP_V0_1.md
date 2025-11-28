# Mashup Shop v0.1

This document describes the Mashup Shop feature introduced in Iteration 0017, which enables climate-first cross-brand product collaborations within ZORA CORE.

## Overview

The Mashup Shop is a climate-focused product marketplace that enables cross-brand collaborations. Every product in the shop must be climate-neutral or climate-positive, with transparent climate metadata and impact estimates.

## Data Model

### Brands Table

The `brands` table stores partner brands that participate in mashup collaborations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| name | TEXT | Brand name (required) |
| slug | TEXT | URL-friendly identifier |
| description | TEXT | Brand description |
| logo_url | TEXT | URL to brand logo |
| website_url | TEXT | Brand website URL |
| climate_tagline | TEXT | Climate commitment tagline |
| sector | TEXT | Industry sector (fashion, food, tech, etc.) |
| country | TEXT | Country of origin |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Products Table

The `products` table stores mashup products with climate metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| name | TEXT | Product name (required) |
| slug | TEXT | URL-friendly identifier |
| short_description | TEXT | Brief product description |
| long_description | TEXT | Detailed product description |
| primary_image_url | TEXT | Main product image URL |
| status | product_status | draft, active, or archived |
| climate_score | INTEGER | Climate score (0-100) |
| estimated_impact_kgco2 | NUMERIC | Estimated CO2 impact in kg |
| notes | TEXT | Internal notes |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Product Brands Table

The `product_brands` table enables many-to-many relationships between products and brands.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| product_id | UUID | Foreign key to products table |
| brand_id | UUID | Foreign key to brands table |
| role | TEXT | Brand's role (lead, collab, sponsor, partner) |
| created_at | TIMESTAMPTZ | Creation timestamp |

## API Endpoints

### Brands API

All endpoints require JWT authentication and are tenant-scoped.

#### List Brands
```
GET /api/mashups/brands
```

Returns all brands for the current tenant.

#### Get Brand
```
GET /api/mashups/brands/:id
```

Returns a specific brand by ID.

#### Create Brand
```
POST /api/mashups/brands
Content-Type: application/json

{
  "name": "Brand Name",
  "description": "Brand description",
  "climate_tagline": "Carbon-neutral since 2020",
  "sector": "fashion",
  "country": "Denmark",
  "website_url": "https://example.com",
  "logo_url": "https://example.com/logo.png"
}
```

Creates a new brand. Only `name` is required.

#### Update Brand
```
PUT /api/mashups/brands/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "climate_tagline": "Updated tagline"
}
```

Updates an existing brand.

#### Delete Brand
```
DELETE /api/mashups/brands/:id
```

Deletes a brand. Will fail if the brand is associated with any products.

### Products API

#### List Products
```
GET /api/mashups/products
GET /api/mashups/products?status=active
GET /api/mashups/products?brand_id=<uuid>
```

Returns all products for the current tenant. Supports filtering by status and brand_id.

#### Get Product
```
GET /api/mashups/products/:id
```

Returns a specific product by ID, including associated brands.

#### Create Product
```
POST /api/mashups/products
Content-Type: application/json

{
  "name": "Product Name",
  "short_description": "Brief description",
  "long_description": "Detailed description",
  "status": "draft",
  "climate_score": 85,
  "estimated_impact_kgco2": -5.2,
  "primary_image_url": "https://example.com/product.jpg",
  "brands": [
    { "brand_id": "<uuid>", "role": "lead" },
    { "brand_id": "<uuid>", "role": "collab" }
  ]
}
```

Creates a new product with optional brand associations. Only `name` is required.

#### Update Product
```
PUT /api/mashups/products/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "active",
  "brands": [
    { "brand_id": "<uuid>", "role": "lead" }
  ]
}
```

Updates an existing product. If `brands` is provided, it replaces all existing brand associations.

#### Delete Product
```
DELETE /api/mashups/products/:id
```

Deletes a product and all its brand associations.

## Frontend Pages

### Admin Mashups Page (`/admin/mashups`)

The admin page provides a tabbed interface for managing brands and products:

**Brands Tab:**
- View all brands in a table with name, sector, country, and climate tagline
- Create new brands with a form
- Edit existing brands
- Delete brands (with confirmation)

**Products Tab:**
- View all products in a table with name, status, associated brands, and climate score
- Create new products with a form including brand selection
- Edit existing products
- Delete products (with confirmation)

### Public Mashups Page (`/mashups`)

The public page displays active products to users:

- Grid layout of product cards
- Each card shows product name, description, associated brands, climate score, and estimated impact
- Visual indicators for climate score (green/yellow/orange based on score)
- "Coming Soon" message if no active products exist
- Information section explaining the climate-first approach

## Journal Integration

All CRUD operations create journal entries for audit trail:

| Event Type | Description |
|------------|-------------|
| mashup_brand_created | Brand was created |
| mashup_brand_updated | Brand was updated |
| mashup_brand_deleted | Brand was deleted |
| mashup_product_created | Product was created |
| mashup_product_updated | Product was updated |
| mashup_product_deleted | Product was deleted |

Journal entries include metadata such as brand/product ID, name, and relevant fields.

## Schema Setup

The schema is included in `supabase/SUPABASE_SCHEMA_V1_FULL.sql`. To apply:

1. Open your Supabase project's SQL Editor
2. Copy and paste the contents of `SUPABASE_SCHEMA_V1_FULL.sql`
3. Click "Run"

The schema is idempotent and can be run multiple times safely.

## Navigation

Links to the Mashup Shop have been added to:

- Dashboard navigation bar (`/dashboard`)
- Admin Setup quick links (`/admin/setup`)

## Climate-First Principles

The Mashup Shop enforces ZORA CORE's climate-first values:

1. **Climate Score**: Products can have a climate score (0-100) indicating their environmental impact
2. **Impact Estimates**: Products can include estimated CO2 impact in kg (negative values indicate carbon reduction)
3. **Climate Taglines**: Brands can display their climate commitments
4. **Transparency**: All climate data is visible to users on the public page

## Future Enhancements

Potential improvements for future iterations:

- Product images gallery
- Climate certification badges
- Supply chain transparency
- Carbon offset integration
- Brand verification system
- Product lifecycle tracking
