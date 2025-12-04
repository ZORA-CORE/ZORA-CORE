# FRONTEND_ZORA_SHOP_V1

ZORA SHOP Frontend v1 transforms the basic ZORA SHOP cockpit into a full "Shop OS" interface for climate-aware cross-branding and sustainable product management.

## Overview

ZORA SHOP is a climate-first marketplace for sustainable products and brand mashups. This frontend implementation provides a comprehensive interface for managing brands, products, materials, and cross-brand capsule projects.

## Routes

### Main Shop Page (`/zora-shop`)

The main ZORA SHOP page features five tabs accessible via the `?tab=` query parameter:

- **Overview** (`?tab=overview`): KPI dashboard with clickable metrics, active capsules list, and climate/impact summary
- **Brands** (`?tab=brands`): Grid of registered brands with climate taglines and sector badges
- **Products** (`?tab=products`): Product catalog with climate scores and impact metrics
- **Materials** (`?tab=materials`): Sustainable materials database with certifications
- **Capsules** (`?tab=projects`): Cross-brand collaboration projects with status tracking

### Brand Detail Page (`/zora-shop/brands/[brandId]`)

Displays comprehensive brand information including climate impact metrics for the brand's products, a list of products linked to the brand, capsule projects where the brand participates, and foundation project connections.

### Product Detail Page (`/zora-shop/products/[productId]`)

Shows detailed product information including climate score and CO2 impact, materials composition with sustainability scores, climate metadata (labels, certifications, notes), and related capsule projects.

## Components

### KPICard

Clickable metric card used in the Overview tab. Supports custom colors and navigation to relevant tabs.

### BrandCard

Displays brand information with logo, name, sector badge, country, description, and climate tagline. Includes "View Details" link to brand detail page.

### ProductCard

Shows product with name, climate label badge (climate-positive/neutral/low-impact), description, status, and climate score. Clickable to navigate to product detail page.

### MaterialCard

Displays material with category badge, renewable/recyclable indicators, sustainability score, carbon footprint per kg, and certifications.

### ProjectCard

Shows capsule/project with title, status badge, description, primary and secondary brand logos, theme, and target launch date.

### OverviewPanel

Dashboard component with 8 KPI cards in 2 rows, active capsules list (top 3-5), and climate/impact metrics with progress bars.

## API Integration

The frontend uses the following API endpoints:

- `GET /api/mashups/brands` - List all brands
- `GET /api/mashups/brands/:id` - Get single brand
- `GET /api/mashups/products` - List all products
- `GET /api/mashups/products/:id` - Get single product
- `GET /api/shop/products/:id` - Get product with materials and climate meta
- `GET /api/shop/materials` - List all materials
- `GET /api/zora-shop/projects` - List all capsule projects
- `GET /api/zora-shop/projects/:id` - Get single project
- `GET /api/foundation/projects` - List foundation projects (for impact connections)

## Command Palette Integration

The following commands are available via the Command Palette (Cmd/Ctrl+K):

- "Go to ZORA SHOP" - Navigate to main shop page
- "View SHOP Brands" - Navigate to brands tab
- "View SHOP Products" - Navigate to products tab
- "View SHOP Materials" - Navigate to materials tab
- "View SHOP Capsules" - Navigate to capsules/projects tab
- "Create product (ZORA SHOP)" - Navigate to product creation
- "Ask BALDUR for product design ideas" - Get AI suggestions

## Climate Labels

Products are automatically labeled based on their climate score:

- **climate-positive** (score >= 80): Green badge, indicates net positive climate impact
- **climate-neutral** (score >= 50): Blue badge, indicates carbon-neutral or offset
- **low-impact** (score < 50): Light green badge, indicates reduced but not neutral impact

## Empty States

All tabs include helpful empty states with CTAs:

- Brands: "No brands registered yet. Ask BALDUR for sustainable brand recommendations." + "Add Brand" button
- Products: "No products in the shop yet. Create a product or ask BALDUR for suggestions." + "Add Product" button
- Materials: "No materials in the database yet. Ask BALDUR for sustainable material recommendations." + "Add Material" button
- Capsules: "No capsules or cross-brand projects yet. Create a capsule to start a climate-focused brand collaboration." + "Create Capsule" button

## Agent Integration

Each page includes an AgentPanel component configured for the "shop" context, allowing users to ask BALDUR (the Nordic agent for sustainable product intelligence) for insights and suggestions.

## Types

New types added for ZORA SHOP Frontend v1:

```typescript
type ZoraShopProjectStatus = 'idea' | 'brief' | 'concept' | 'review' | 'launched' | 'archived';

interface ZoraShopProject {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: ZoraShopProjectStatus;
  primary_brand_id: string;
  secondary_brand_id: string | null;
  theme: string | null;
  target_launch_date: string | null;
  launched_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

interface ZoraShopProjectWithBrands extends ZoraShopProject {
  primary_brand?: Brand | null;
  secondary_brand?: Brand | null;
}

interface ProductMaterial {
  id: string;
  product_id: string;
  material_id: string;
  percentage: number | null;
  notes: string | null;
  material?: ShopMaterial;
}

interface ProductClimateMeta {
  id: string;
  product_id: string;
  climate_label: string | null;
  estimated_impact_kgco2: number | null;
  certifications: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}

interface ProductWithDetails extends Product {
  brand?: Brand | null;
  materials?: ProductMaterial[];
  climate_meta?: ProductClimateMeta | null;
}
```

## Future Enhancements

Potential improvements for future iterations:

1. Product creation form directly in the Products tab
2. Brand creation form with logo upload
3. Material creation with certification selection
4. Capsule/project creation wizard with brand selection
5. Bulk import/export for products and materials
6. Advanced filtering and search across all tabs
7. Climate impact calculator for product combinations
8. Integration with external sustainability certification APIs
