# Billing & Commission Backend v1.0

This document describes the Billing, Subscriptions & ZORA SHOP Commission Backend implemented in Iteration 00C8.

## Overview

The Billing & Commission Backend provides a monetization layer for ZORA CORE with:

1. **Billing Plans**: Subscription tiers (free/starter/pro) with configurable features and pricing
2. **Tenant Subscriptions**: Track subscription status, payment provider info, and trial periods
3. **Payment Provider Integration**: Webhook handlers for Stripe and PayPal events
4. **ZORA SHOP Commission**: Default 10% commission on orders, configurable per tenant
5. **Foundation Integration**: Optional share of commission flowing to THE ZORA FOUNDATION

## Schema Version

This iteration updates the schema to version **3.0.0** with 6 new tables:

- `billing_plans` - Subscription plan definitions
- `tenant_subscriptions` - Tenant subscription records
- `billing_events` - Webhook event log for Stripe/PayPal
- `zora_shop_commission_settings` - Per-tenant commission configuration
- `zora_shop_orders` - Orders with commission tracking
- `zora_shop_order_items` - Line items for orders

## Billing Plans

### Default Plans

The schema seeds three default billing plans:

| Code | Name | Price | Interval | Features |
|------|------|-------|----------|----------|
| `free` | Free | 0 DKK | month | 1 seat, 3 projects, 1,000 API calls/month |
| `starter` | Starter | 99 DKK | month | 3 seats, 10 projects, 10,000 API calls/month |
| `pro` | Pro | 499 DKK | month | 10 seats, unlimited projects, 100,000 API calls/month |

### Plan Features

The `features` JSONB column stores plan capabilities:

```json
{
  "seats": 10,
  "projects": -1,
  "api_calls_per_month": 100000
}
```

A value of `-1` indicates unlimited.

## API Endpoints

### Billing Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/billing/plans` | List all active plans | JWT |
| GET | `/api/billing/plans/:id` | Get a single plan | JWT |
| POST | `/api/billing/plans` | Create a new plan | JWT (founder only) |
| PATCH | `/api/billing/plans/:id` | Update a plan | JWT (founder only) |

### Tenant Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/billing/subscription` | Get current tenant subscription | JWT |
| POST | `/api/billing/subscription` | Create or update subscription | JWT |

### Webhook Handlers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/billing/webhooks/stripe` | Handle Stripe webhook events | None (verify signature in production) |
| POST | `/api/billing/webhooks/paypal` | Handle PayPal webhook events | None (verify signature in production) |

### Billing Events

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/billing/events` | List webhook events | JWT (founder only) |

### ZORA SHOP Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/shop/orders` | List tenant orders | JWT |
| GET | `/api/shop/orders/:id` | Get order with items | JWT |
| POST | `/api/shop/orders` | Create order with commission | JWT |
| PATCH | `/api/shop/orders/:id/status` | Update order status | JWT |
| GET | `/api/shop/orders/summary` | Get order statistics | JWT |

### Commission Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/shop/commission-settings` | Get tenant commission settings | JWT |
| PUT | `/api/shop/commission-settings` | Update commission settings | JWT (founder/brand_admin) |

## Commission Model

### Default Commission

By default, ZORA SHOP charges a 10% commission on all orders. This is configurable per tenant via the commission settings.

### Commission Calculation

When an order is created:

```
commission_amount = total_amount * commission_rate
```

### Foundation Share

Optionally, a portion of the commission can flow to THE ZORA FOUNDATION:

```
foundation_contribution = commission_amount * foundation_share_rate
```

When `foundation_share_rate > 0`, a `foundation_contributions` record is automatically created with `source_type = 'zora_shop_commission'`.

### Example

Consider an order with:
- Total amount: 1,000 DKK
- Commission rate: 10% (0.10)
- Foundation share rate: 20% (0.20)

Calculation:
- Commission: 1,000 * 0.10 = 100 DKK
- Foundation contribution: 100 * 0.20 = 20 DKK

The order record will have:
- `commission_amount`: 100
- `foundation_share_rate`: 0.20
- `foundation_contribution_id`: (UUID of the created contribution)

## Subscription Flow

### Creating a Subscription

1. User selects a plan from `/api/billing/plans`
2. User completes payment via Stripe/PayPal (external)
3. Payment provider sends webhook to `/api/billing/webhooks/stripe` or `/api/billing/webhooks/paypal`
4. Webhook is logged in `billing_events`
5. Backend calls `/api/billing/subscription` to create/update subscription

### Subscription Statuses

| Status | Description |
|--------|-------------|
| `trial` | Free trial period |
| `active` | Paid and active |
| `past_due` | Payment failed, grace period |
| `canceled` | Subscription canceled |

### Payment Providers

| Provider | Description |
|----------|-------------|
| `stripe` | Stripe subscription |
| `paypal` | PayPal subscription |
| `manual` | Manually managed (e.g., enterprise) |

## Webhook Integration

### Stripe Events

The webhook handler logs and processes these Stripe events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### PayPal Events

The webhook handler logs and processes these PayPal events:
- `BILLING.SUBSCRIPTION.CREATED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`

### Signature Verification

In production, you should verify webhook signatures:

**Stripe**: Use the `stripe-signature` header with your webhook secret
**PayPal**: Use the PayPal webhook verification API

This v1 implementation logs all events but does not verify signatures. Add verification before going to production.

## Usage Examples

### List Available Plans

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.zoracore.dk/api/billing/plans
```

### Create a Subscription

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "uuid-of-starter-plan",
    "status": "active",
    "provider": "stripe",
    "provider_customer_id": "cus_xxx",
    "provider_subscription_id": "sub_xxx",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z"
  }' \
  https://api.zoracore.dk/api/billing/subscription
```

### Create an Order

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": "uuid-of-product", "quantity": 2, "unit_price": 199.00}
    ],
    "currency": "DKK"
  }' \
  https://api.zoracore.dk/api/shop/orders
```

### Update Commission Settings

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_rate": 0.10,
    "foundation_share_rate": 0.20
  }' \
  https://api.zoracore.dk/api/shop/commission-settings
```

## Database Schema

### billing_plans

```sql
CREATE TABLE billing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    price_currency TEXT NOT NULL DEFAULT 'DKK',
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    features JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### tenant_subscriptions

```sql
CREATE TABLE tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'manual')),
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### zora_shop_orders

```sql
CREATE TABLE zora_shop_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES zora_shop_projects(id) ON DELETE SET NULL,
    buyer_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'DKK',
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'canceled')),
    commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
    commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    foundation_share_rate NUMERIC(5,4) NOT NULL DEFAULT 0.00,
    foundation_contribution_id UUID REFERENCES foundation_contributions(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures in production
2. **Role-Based Access**: Only founders can create/update billing plans
3. **Tenant Isolation**: Tenants can only see their own subscriptions and orders
4. **Commission Settings**: Only founders and brand_admins can modify commission rates

## Future Enhancements

1. **Stripe SDK Integration**: Full Stripe SDK for checkout sessions and customer portal
2. **PayPal SDK Integration**: Full PayPal SDK for subscription management
3. **Invoice Generation**: Automatic invoice creation and PDF generation
4. **Usage-Based Billing**: Track and bill based on API usage
5. **Proration**: Handle plan upgrades/downgrades with prorated billing
6. **Multi-Currency**: Support for multiple currencies with exchange rates

## Related Documentation

- [ZORA SHOP Backend v1.0](./ZORA_SHOP_BACKEND_V1.md)
- [THE ZORA FOUNDATION Backend v1.0](./ZORA_FOUNDATION_BACKEND_V1.md)
- [Schema Versioning v1.0](./SCHEMA_VERSIONING_V1.md)
