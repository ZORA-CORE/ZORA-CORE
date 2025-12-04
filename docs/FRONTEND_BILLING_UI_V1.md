# Frontend Billing UI v1.0

This document describes the frontend billing UI implementation in ZORA CORE.

## Overview

The Billing UI v1 provides a user-facing interface for viewing subscription plans, managing subscriptions, and soft feature gating throughout the application. This is a "v1" implementation focused on surfacing the existing billing backend in the frontend with soft nudges for upgrades.

## Components

### BillingProvider Context

Located at `frontend/src/lib/BillingContext.tsx`, the BillingProvider provides centralized billing state management.

**Features:**
- Fetches current plan on mount (after auth is ready)
- Caches plan data for the session
- Provides helper methods for feature access checks
- Falls back to CLIMATE_ASPECT (free tier) for unauthenticated users

**Hooks:**

```typescript
// Access full billing context
const { currentPlan, isLoading, error, refreshPlan } = useBilling();

// Access current plan directly
const currentPlan = useCurrentPlan();

// Check feature access with upgrade path
const { hasAccess, limit, planName, upgradePath } = useFeatureAccess('can_access_simulation_studio');
```

**Helper Methods:**

```typescript
const { 
  canAccessFeature,      // Check if user can access a feature
  getFeatureLimit,       // Get numeric limit for a feature
  isSubscriptionActive,  // Check if subscription is active
  getPlanDisplayName,    // Get human-readable plan name
  getStatusBadge,        // Get status badge with label and color
} = useBilling();
```

### Plans & Pricing Page

Located at `frontend/src/app/billing/plans/page.tsx`, this page displays all available subscription plans.

**Features:**
- Groups plans by type (citizen, brand, foundation)
- Shows current plan badge
- Displays plan features and pricing
- Allows plan selection/upgrade via manual subscription
- Supports URL parameter `?highlight=PLAN_CODE` to highlight a specific plan

**Plan Sections:**
1. **For Individuals** - citizen plans (CLIMATE_ASPECT, CLIMATE_HERO)
2. **For Brands & Organizations** - brand plans (BRAND_STARTER, BRAND_PRO, BRAND_INFINITY)
3. **For Foundations & Partners** - foundation plans (FOUNDATION_PARTNER)

### Subscription Status Widget

Integrated into the AppShell user dropdown menu at `frontend/src/components/layout/AppShell.tsx`.

**Features:**
- Shows current plan name
- Displays subscription status badge (Trial, Active, Past Due, Canceled)
- Links to Plans & Pricing page
- Color-coded status indicators

### Feature Gating (Soft)

v1 implements soft feature gating with upgrade prompts. Users are not blocked from using features, but see upgrade banners when they don't have access.

**Simulation Studio** (`frontend/src/app/simulation/page.tsx`):
- Shows upgrade banner for users without `can_access_simulation_studio` access
- Links to Plans page with highlighted upgrade path

**ZORA SHOP** (`frontend/src/app/zora-shop/page.tsx`):
- Shows upgrade banner when users reach their `max_zora_shop_projects` limit
- Displays current count vs limit
- Links to Plans page with highlighted upgrade path

### Command Palette Integration

Billing commands added to `frontend/src/components/CommandPaletteProvider.tsx`:

- **View Plans & Pricing** - Navigate to /billing/plans
- **Upgrade subscription plan** - Navigate to /billing/plans
- **View my subscription** - Navigate to /billing/plans

## API Integration

The frontend uses the following API methods from `frontend/src/lib/api.ts`:

```typescript
// Get all available plans
api.getBillingPlans({ is_active: true });

// Get a specific plan
api.getBillingPlan(planId);

// Get current tenant's plan with features
api.getCurrentPlan();

// Get current subscription details
api.getSubscription();

// Create or update subscription
api.upsertSubscription({
  plan_id: 'uuid',
  status: 'active',
  provider: 'manual',
});
```

## Types

Located in `frontend/src/lib/types.ts`:

```typescript
type PlanType = 'citizen' | 'brand' | 'foundation';
type BillingInterval = 'month' | 'year';
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';
type BillingProvider = 'stripe' | 'paypal' | 'manual';

interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_amount: number;
  price_currency: string;
  billing_interval: BillingInterval;
  is_active: boolean;
  plan_type: PlanType;
  features: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CurrentPlan {
  plan_code: string;
  name: string;
  plan_type: PlanType;
  description: string | null;
  currency: string;
  billing_interval: BillingInterval;
  base_price_monthly: number;
  effective_price_monthly: number;
  effective_price_currency: string | null;
  subscription_status: SubscriptionStatus;
  subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  features: CurrentPlanFeatures;
}

interface CurrentPlanFeatures {
  max_users: number | null;
  max_organizations: number | null;
  max_climate_profiles: number | null;
  max_zora_shop_projects: number | null;
  max_goes_green_profiles: number | null;
  max_goes_green_assets: number | null;
  max_shop_products_live: number | null;
  max_academy_paths: number | null;
  max_autonomy_tasks_per_day: number | null;
  academy_level: number | null;
  can_access_simulation_studio: boolean;
  can_access_quantum_climate_lab: boolean;
  can_access_brand_mashups: boolean;
  foundation_partner: boolean;
  priority_support: boolean;
}
```

## Usage Examples

### Check Feature Access

```tsx
import { useFeatureAccess } from '@/lib/BillingContext';

function SimulationPage() {
  const simulationAccess = useFeatureAccess('can_access_simulation_studio');
  
  return (
    <div>
      {!simulationAccess.hasAccess && (
        <UpgradeBanner 
          planName={simulationAccess.planName}
          upgradePath={simulationAccess.upgradePath}
        />
      )}
      {/* Rest of page */}
    </div>
  );
}
```

### Display Current Plan in UI

```tsx
import { useBilling } from '@/lib/BillingContext';

function AccountMenu() {
  const { currentPlan, getPlanDisplayName, getStatusBadge } = useBilling();
  const badge = getStatusBadge();
  
  return (
    <div>
      <span className={badge.color}>{badge.label}</span>
      <p>{getPlanDisplayName()}</p>
    </div>
  );
}
```

### Check Numeric Limits

```tsx
import { useFeatureAccess } from '@/lib/BillingContext';

function ShopPage() {
  const projectsAccess = useFeatureAccess('max_zora_shop_projects');
  const currentCount = projects.length;
  const limit = typeof projectsAccess.limit === 'number' ? projectsAccess.limit : null;
  
  const isAtLimit = limit !== null && limit !== -1 && currentCount >= limit;
  
  return (
    <div>
      {isAtLimit && <UpgradeBanner />}
      {/* Rest of page */}
    </div>
  );
}
```

## Future Enhancements (v2+)

1. **Stripe Checkout Integration** - Direct payment flow instead of manual subscriptions
2. **Hard Feature Gating** - Block access to premium features for non-subscribers
3. **Usage Metering** - Track and display feature usage against limits
4. **Billing History** - View past invoices and payment history
5. **Plan Comparison Modal** - Side-by-side feature comparison
6. **Upgrade/Downgrade Flows** - Proration and confirmation dialogs

## Related Documentation

- [BILLING_API_V1.md](./BILLING_API_V1.md) - Backend billing API endpoints
- [BILLING_BACKEND_V1.md](./BILLING_BACKEND_V1.md) - Backend billing implementation
