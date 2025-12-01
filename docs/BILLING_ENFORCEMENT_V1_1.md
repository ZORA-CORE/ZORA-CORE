# Billing & Subscription Enforcement v1.1

This document describes the billing and subscription enforcement system implemented in ZORA CORE as part of Iteration 00D1.

## Overview

The Billing & Subscription Enforcement system ensures that tenants operate within their subscription plan limits and that subscription status affects what operations are allowed. This is a backend-only implementation that enforces limits at the API layer.

## Plan Codes and Limits

ZORA CORE supports three subscription plans with the following limits:

### Free Plan
- **max_users**: 1
- **max_organizations**: 1
- **max_climate_profiles**: 1
- **max_zora_shop_projects**: 1
- **max_goes_green_profiles**: 1
- **max_academy_paths**: 1
- **max_autonomy_tasks_per_day**: 20

### Starter Plan (99 DKK/month)
- **max_users**: 5
- **max_organizations**: 3
- **max_climate_profiles**: 10
- **max_zora_shop_projects**: 5
- **max_goes_green_profiles**: 5
- **max_academy_paths**: 5
- **max_autonomy_tasks_per_day**: 100

### Pro Plan (499 DKK/month)
- **max_users**: unlimited (null)
- **max_organizations**: unlimited (null)
- **max_climate_profiles**: unlimited (null)
- **max_zora_shop_projects**: unlimited (null)
- **max_goes_green_profiles**: unlimited (null)
- **max_academy_paths**: unlimited (null)
- **max_autonomy_tasks_per_day**: unlimited (null)

## Subscription Statuses

Subscriptions can have one of four statuses:

| Status | Description | Read Operations | Write Operations |
|--------|-------------|-----------------|------------------|
| `trial` | Tenant is in trial period | Allowed | Allowed |
| `active` | Subscription is active and paid | Allowed | Allowed |
| `past_due` | Payment has failed | Allowed | **Blocked** |
| `canceled` | Subscription has been canceled | Allowed | **Blocked** |

## Billing Context

The `BillingContext` object is loaded for each authenticated request and contains:

```typescript
interface BillingContext {
  planCode: string;        // 'free', 'starter', 'pro'
  planName: string;        // Human-readable plan name
  status: SubscriptionStatus;  // 'trial', 'active', 'past_due', 'canceled'
  features: PlanFeatures;  // Plan limits
  subscriptionId: string | null;
  planId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

interface PlanFeatures {
  maxUsers?: number | null;
  maxOrganizations?: number | null;
  maxClimateProfiles?: number | null;
  maxZoraShopProjects?: number | null;
  maxGoesGreenProfiles?: number | null;
  maxAcademyPaths?: number | null;
  maxAutonomyTasksPerDay?: number | null;
}
```

## Enforcement Points

Plan limits are enforced at the following API endpoints:

| Endpoint | Limit Key | Description |
|----------|-----------|-------------|
| `POST /api/admin/users` | `maxUsers` | Creating new users |
| `POST /api/organizations` | `maxOrganizations` | Creating organizations |
| `POST /api/climate/profiles` | `maxClimateProfiles` | Creating climate profiles |
| `POST /api/zora-shop/projects` | `maxZoraShopProjects` | Creating ZORA SHOP projects |
| `POST /api/goes-green/profiles` | `maxGoesGreenProfiles` | Creating GOES GREEN profiles |

## Error Responses

### Plan Limit Exceeded (HTTP 402)

When a tenant exceeds their plan limit:

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Your Free (Default) plan allows a maximum of 1 organizations. Please upgrade your subscription to add more."
  }
}
```

### Subscription Inactive (HTTP 403)

When a tenant's subscription is past_due or canceled:

```json
{
  "error": {
    "code": "SUBSCRIPTION_INACTIVE",
    "message": "Your subscription is past due. Write operations are temporarily disabled until payment is received."
  }
}
```

## Webhook Processing

The system processes Stripe and PayPal webhook events to automatically update subscription status.

### Stripe Events

| Event Type | Action |
|------------|--------|
| `invoice.paid` | Set status to `active` |
| `checkout.session.completed` | Set status to `active` |
| `invoice.payment_failed` | Set status to `past_due` |
| `customer.subscription.deleted` | Set status to `canceled` |
| `customer.subscription.created` | Sync status from Stripe |
| `customer.subscription.updated` | Sync status from Stripe |

### PayPal Events

| Event Type | Action |
|------------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Set status to `active` |
| `PAYMENT.SALE.COMPLETED` | Set status to `active` |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | Set status to `past_due` |
| `PAYMENT.SALE.DENIED` | Set status to `past_due` |
| `BILLING.SUBSCRIPTION.CANCELLED` | Set status to `canceled` |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Set status to `canceled` |
| `BILLING.SUBSCRIPTION.EXPIRED` | Set status to `canceled` |

## Default Behavior

If a tenant does not have a subscription record, the system defaults to:
- Plan: Free (Default)
- Status: trial
- All limits set to free plan values

This ensures new tenants can use the system immediately while being subject to free plan limits.

## Implementation Files

- **Middleware**: `workers/api/src/middleware/billingContext.ts`
- **Schema**: `supabase/SUPABASE_SCHEMA_V1_FULL.sql` (v3.2.0)
- **Webhook Handlers**: `workers/api/src/handlers/billing.ts`

## Usage in Handlers

To enforce billing limits in a handler:

```typescript
import {
  getBillingContext,
  enforceCreateLimit,
  handleBillingError,
} from '../middleware/billingContext';

// In your POST handler:
const billingCtx = getBillingContext(c);
const { count: currentCount } = await supabase
  .from('your_table')
  .select('*', { count: 'exact', head: true })
  .eq('tenant_id', tenantId);

try {
  enforceCreateLimit(billingCtx, currentCount || 0, 'maxYourResource');
} catch (err) {
  const billingResponse = handleBillingError(err);
  if (billingResponse) return billingResponse;
  throw err;
}
```

## Schema Version

This feature is part of schema version 3.2.0 (Billing & Subscription Enforcement v1.1).

## Related Documentation

- [BILLING_AND_COMMISSION_BACKEND_V1.md](./BILLING_AND_COMMISSION_BACKEND_V1.md) - Base billing system
- [SECURITY_AND_AUTH_HARDENING_V1.md](./SECURITY_AND_AUTH_HARDENING_V1.md) - Security features
