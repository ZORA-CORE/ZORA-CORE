# ZORA CORE Billing Plans v1.0

This document describes the subscription plan taxonomy, pricing structure, and feature flags for ZORA CORE.

## Plan Types

ZORA CORE supports three plan types:

**citizen** - Plans for individual users focused on personal climate action and awareness. These plans are designed for people who want to track their personal climate impact and participate in climate missions.

**brand** - Plans for organizations, brands, and teams that need collaborative features, ZORA SHOP access, and advanced climate tools. These plans scale from small startups to enterprise-level organizations.

**foundation** - Plans for NGOs, climate partners, and non-profit organizations focused on impact reporting and visibility. These plans provide access to foundation-specific features without commercial pricing.

## Core Plans

### CLIMATE_ASPECT (citizen, 0 DKK/month)
The free tier for everyone. Basic personal climate OS for individuals who want to start their climate journey.

Features:
- 1 user, 1 organization, 1 climate profile
- 1 GOES GREEN profile with 3 assets
- 1 academy learning path (level 1)
- 10 autonomy tasks per day
- No ZORA SHOP project creation
- No Simulation Studio or Quantum Climate Lab access

### CLIMATE_HERO (citizen, 59 DKK/month)
A more powerful personal climate experience for engaged individuals who want deeper insights and more capabilities.

Features:
- 1 user, 1 organization, 5 climate profiles
- 3 GOES GREEN profiles with 10 assets
- 3 academy learning paths (level 2)
- 50 autonomy tasks per day
- 1 ZORA SHOP project (view only)
- Simulation Studio access (personal view)
- No Quantum Climate Lab access

### BRAND_STARTER (brand, 790 DKK/month)
For small brands and early-stage teams starting their climate journey. Includes team collaboration and basic ZORA SHOP features.

Features:
- 5 users, 3 organizations, 10 climate profiles
- 5 GOES GREEN profiles with 25 assets
- 5 academy learning paths (level 2)
- 100 autonomy tasks per day
- 3 ZORA SHOP projects, 10 live products
- Simulation Studio access
- Brand mashups access
- No Quantum Climate Lab access

### BRAND_PRO (brand, 1,990 DKK/month)
For serious climate and brand teams with advanced needs. Full access to most features with generous limits.

Features:
- 25 users, 10 organizations, 50 climate profiles
- 25 GOES GREEN profiles with 100 assets
- Unlimited academy learning paths (level 3)
- 500 autonomy tasks per day
- 10 ZORA SHOP projects, 50 live products
- Simulation Studio access
- Brand mashups access
- Priority support
- No Quantum Climate Lab access

### BRAND_INFINITY (brand, from 4,990 DKK/month)
Enterprise-level access with custom pricing and unlimited features. Designed for large organizations with specific needs.

Features:
- Unlimited users, organizations, climate profiles
- Unlimited GOES GREEN profiles and assets
- Unlimited academy learning paths (level 3)
- Unlimited autonomy tasks per day
- Unlimited ZORA SHOP projects and products
- Full Simulation Studio access
- Full Quantum Climate Lab access
- Brand mashups access
- Priority support
- Custom pricing available per tenant

### FOUNDATION_PARTNER (foundation, 0 DKK/month)
For NGOs and climate partners focused on impact and visibility. Free access to foundation-specific features.

Features:
- 10 users, 5 organizations, 25 climate profiles
- 10 GOES GREEN profiles with 50 assets
- Unlimited academy learning paths (level 3)
- 200 autonomy tasks per day
- 5 ZORA SHOP projects (visibility only)
- Simulation Studio access
- Foundation partner status
- Priority support
- No Quantum Climate Lab access

## Feature Flags

Each plan includes a JSON features object with the following keys:

### Numeric Limits (null = unlimited)
- `max_users` - Maximum number of users per tenant
- `max_organizations` - Maximum number of organizations
- `max_climate_profiles` - Maximum climate profiles
- `max_zora_shop_projects` - Maximum ZORA SHOP projects
- `max_goes_green_profiles` - Maximum GOES GREEN profiles
- `max_goes_green_assets` - Maximum GOES GREEN assets
- `max_shop_products_live` - Maximum live shop products
- `max_academy_paths` - Maximum academy learning paths
- `max_autonomy_tasks_per_day` - Daily autonomy task limit

### Level-based Features
- `academy_level` - Academy access level (1-3)

### Boolean Feature Flags
- `can_access_simulation_studio` - Access to Simulation Studio
- `can_access_quantum_climate_lab` - Access to Quantum Climate Lab
- `can_access_brand_mashups` - Access to brand mashup features
- `foundation_partner` - Foundation partner status
- `priority_support` - Priority support access

## Custom Pricing

For BRAND_INFINITY and enterprise customers, custom pricing can be configured per subscription using the `effective_price_amount` and `effective_price_currency` columns in the `tenant_subscriptions` table. When set, these override the base plan price for that specific subscription.

## API Endpoints

### GET /api/billing/current-plan
Returns the current tenant's plan with resolved features.

Response:
```json
{
  "plan_code": "CLIMATE_HERO",
  "name": "Climate Hero",
  "plan_type": "citizen",
  "description": "More powerful personal climate experience...",
  "currency": "DKK",
  "billing_interval": "month",
  "base_price_monthly": 59,
  "effective_price_monthly": 59,
  "subscription_status": "active",
  "subscription_id": "uuid",
  "trial_ends_at": null,
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "features": {
    "max_users": 1,
    "max_organizations": 1,
    "max_climate_profiles": 5,
    "max_zora_shop_projects": 1,
    "max_goes_green_profiles": 3,
    "max_goes_green_assets": 10,
    "max_shop_products_live": 0,
    "max_academy_paths": 3,
    "max_autonomy_tasks_per_day": 50,
    "academy_level": 2,
    "can_access_simulation_studio": true,
    "can_access_quantum_climate_lab": false,
    "can_access_brand_mashups": false,
    "foundation_partner": false,
    "priority_support": false
  }
}
```

### GET /api/billing/plans
Lists all available billing plans. Supports filtering by `is_active` and `billing_interval`.

### GET /api/billing/subscription
Returns the current tenant's subscription details with plan information.

## Default Plan Assignment

New individual accounts (citizen) should be assigned the CLIMATE_ASPECT plan by default. This provides free access to basic climate OS features.

Brand and foundation plans are assigned manually via admin tools or through the subscription management API.

## Database Schema

Plans are stored in the `billing_plans` table with the following structure:
- `id` (UUID) - Primary key
- `code` (TEXT, unique) - Plan code (e.g., CLIMATE_ASPECT)
- `name` (TEXT) - Display name
- `description` (TEXT) - Plan description
- `price_amount` (NUMERIC) - Base price
- `price_currency` (TEXT) - Currency (default: DKK)
- `billing_interval` (TEXT) - month or year
- `is_active` (BOOLEAN) - Whether plan is available
- `plan_type` (TEXT) - citizen, brand, or foundation
- `features` (JSONB) - Feature flags and limits

Subscriptions are stored in `tenant_subscriptions` with custom pricing support via `effective_price_amount` and `effective_price_currency` columns.

## Legacy Plans

The following legacy plans exist for backward compatibility but are marked as inactive:
- `free` - Use CLIMATE_ASPECT instead
- `starter` - Use BRAND_STARTER instead
- `pro` - Use BRAND_PRO instead

Existing subscriptions pointing to these plans will continue to work, but new subscriptions should use the new plan codes.
