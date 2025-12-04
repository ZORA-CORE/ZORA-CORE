# Billing API v1.0

This document describes the Billing & Subscription API endpoints available in ZORA CORE.

## Overview

The Billing API provides endpoints for managing subscription plans, tenant subscriptions, and payment provider webhooks. All billing data is tenant-scoped and requires authentication.

## Endpoints

### GET /api/billing/plans

Returns all available billing plans.

**Query Parameters:**
- `is_active` (boolean, optional): Filter by active status
- `billing_interval` (string, optional): Filter by interval (`month` or `year`)
- `limit` (number, optional): Pagination limit (default: 50)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "CLIMATE_HERO",
      "name": "Climate Hero",
      "description": "For climate champions who want more impact",
      "price_amount": 99,
      "price_currency": "DKK",
      "billing_interval": "month",
      "is_active": true,
      "plan_type": "citizen",
      "features": {
        "max_users": 1,
        "max_climate_profiles": 3,
        "max_zora_shop_projects": 1,
        "can_access_simulation_studio": true,
        "priority_support": false
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 6,
    "has_more": false
  }
}
```

### GET /api/billing/plans/:id

Returns a specific billing plan by ID.

**Response:**
```json
{
  "id": "uuid",
  "code": "CLIMATE_HERO",
  "name": "Climate Hero",
  ...
}
```

### GET /api/billing/current-plan

Returns the current tenant's active plan with computed features. This endpoint resolves the plan join, normalizes prices, computes the features object, and falls back to the default CLIMATE_ASPECT plan if no subscription exists.

**Response:**
```json
{
  "plan_code": "CLIMATE_HERO",
  "name": "Climate Hero",
  "plan_type": "citizen",
  "description": "For climate champions who want more impact",
  "currency": "DKK",
  "billing_interval": "month",
  "base_price_monthly": 99,
  "effective_price_monthly": 99,
  "effective_price_currency": "DKK",
  "subscription_status": "active",
  "subscription_id": "uuid",
  "trial_ends_at": null,
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "features": {
    "max_users": 1,
    "max_organizations": 1,
    "max_climate_profiles": 3,
    "max_zora_shop_projects": 1,
    "max_goes_green_profiles": 3,
    "max_goes_green_assets": 10,
    "max_shop_products_live": 5,
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

### GET /api/billing/subscription

Returns the current tenant's subscription details.

**Response (with subscription):**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "plan_id": "uuid",
  "status": "active",
  "provider": "stripe",
  "provider_subscription_id": "sub_xxx",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "trial_ends_at": null,
  "canceled_at": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Response (no subscription):**
```json
{
  "subscription": null,
  "message": "No active subscription found"
}
```

### POST /api/billing/subscription

Creates or updates a tenant subscription.

**Request Body:**
```json
{
  "plan_id": "uuid",
  "status": "active",
  "provider": "manual",
  "provider_subscription_id": "optional_external_id",
  "trial_ends_at": "2024-02-01T00:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "plan_id": "uuid",
  "status": "active",
  ...
}
```

### POST /api/billing/webhooks/stripe

Handles Stripe webhook events for subscription lifecycle management.

**Supported Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### POST /api/billing/webhooks/paypal

Handles PayPal webhook events for subscription lifecycle management.

**Supported Events:**
- `BILLING.SUBSCRIPTION.CREATED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.UPDATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `PAYMENT.SALE.COMPLETED`

## Plan Types

ZORA CORE supports three plan types:

1. **citizen** - Individual user plans (CLIMATE_ASPECT, CLIMATE_HERO)
2. **brand** - Organization/brand plans (BRAND_STARTER, BRAND_PRO, BRAND_INFINITY)
3. **foundation** - NGO/partner plans (FOUNDATION_PARTNER)

## Subscription Statuses

- `trial` - User is in trial period
- `active` - Subscription is active and paid
- `past_due` - Payment failed, grace period
- `canceled` - Subscription has been canceled

## Feature Flags

Each plan includes feature flags that control access to ZORA CORE features:

| Feature | Description |
|---------|-------------|
| `max_users` | Maximum users per tenant (-1 = unlimited) |
| `max_organizations` | Maximum organizations per tenant |
| `max_climate_profiles` | Maximum climate profiles |
| `max_zora_shop_projects` | Maximum SHOP projects |
| `max_goes_green_profiles` | Maximum GOES GREEN profiles |
| `max_goes_green_assets` | Maximum GOES GREEN assets |
| `max_shop_products_live` | Maximum live products in SHOP |
| `max_academy_paths` | Maximum Academy learning paths |
| `max_autonomy_tasks_per_day` | Maximum agent autonomy tasks per day |
| `academy_level` | Academy access level (1-3) |
| `can_access_simulation_studio` | Access to Simulation Studio |
| `can_access_quantum_climate_lab` | Access to Quantum Climate Lab |
| `can_access_brand_mashups` | Access to brand mashup features |
| `foundation_partner` | Foundation partner status |
| `priority_support` | Priority support access |

## Default Plan

Users without a subscription default to the **CLIMATE_ASPECT** plan (free tier) with basic features:
- 1 user, 1 organization, 1 climate profile
- 10 autonomy tasks per day
- No Simulation Studio access
- No SHOP projects

## Related Documentation

- [FRONTEND_BILLING_UI_V1.md](./FRONTEND_BILLING_UI_V1.md) - Frontend billing UI implementation
- [BILLING_BACKEND_V1.md](./BILLING_BACKEND_V1.md) - Backend billing implementation details
