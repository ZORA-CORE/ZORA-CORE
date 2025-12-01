/**
 * Billing Context Middleware - Billing & Subscription Enforcement v1.1
 * 
 * This middleware loads the tenant's subscription and plan information,
 * making it available to handlers for enforcing plan limits and subscription status.
 * 
 * Usage:
 * 1. Apply billingContextMiddleware to routes that need billing enforcement
 * 2. Use getBillingContext(c) to access the billing context in handlers
 * 3. Use helper functions to check limits and subscription status
 */

import { Context, Next } from 'hono';
import type { AuthAppEnv } from './auth';
import { getTenantId } from './auth';
import { getSupabaseClient } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface PlanFeatures {
  maxUsers?: number | null;
  maxOrganizations?: number | null;
  maxClimateProfiles?: number | null;
  maxZoraShopProjects?: number | null;
  maxGoesGreenProfiles?: number | null;
  maxAcademyPaths?: number | null;
  maxAutonomyTasksPerDay?: number | null;
}

export interface BillingContext {
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  features: PlanFeatures;
  subscriptionId: string | null;
  planId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

// Default billing context for tenants without a subscription (treated as free)
const DEFAULT_BILLING_CONTEXT: BillingContext = {
  planCode: 'free',
  planName: 'Free (Default)',
  status: 'trial',
  features: {
    maxUsers: 1,
    maxOrganizations: 1,
    maxClimateProfiles: 1,
    maxZoraShopProjects: 1,
    maxGoesGreenProfiles: 1,
    maxAcademyPaths: 1,
    maxAutonomyTasksPerDay: 20,
  },
  subscriptionId: null,
  planId: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BillingError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'BillingError';
  }
}

export class PlanLimitExceededError extends BillingError {
  constructor(message: string) {
    super('PLAN_LIMIT_EXCEEDED', message, 402);
  }
}

export class SubscriptionInactiveError extends BillingError {
  constructor(message: string) {
    super('SUBSCRIPTION_INACTIVE', message, 403);
  }
}

// ============================================================================
// CONTEXT KEY
// ============================================================================

const BILLING_CONTEXT_KEY = 'billingContext';

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware that loads the tenant's billing context (subscription + plan).
 * Should be applied after auth middleware.
 */
export async function billingContextMiddleware(c: Context<AuthAppEnv>, next: Next) {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Fetch the tenant's most recent subscription with plan details
    const { data: subscription, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        id,
        status,
        trial_ends_at,
        current_period_end,
        plan:billing_plans(
          id,
          code,
          name,
          features
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Handle the plan data - Supabase returns array for joins, we need the first element
    const plan = Array.isArray(subscription?.plan) ? subscription.plan[0] : subscription?.plan;
    
    if (error || !subscription || !plan) {
      // No subscription found - use default (free) context
      c.set(BILLING_CONTEXT_KEY, DEFAULT_BILLING_CONTEXT);
    } else {
      // Parse features from plan
      const planFeatures = (plan.features as Record<string, unknown>) || {};
      
      const billingContext: BillingContext = {
        planCode: plan.code,
        planName: plan.name,
        status: subscription.status as SubscriptionStatus,
        features: {
          maxUsers: parseLimit(planFeatures.max_users),
          maxOrganizations: parseLimit(planFeatures.max_organizations),
          maxClimateProfiles: parseLimit(planFeatures.max_climate_profiles),
          maxZoraShopProjects: parseLimit(planFeatures.max_zora_shop_projects),
          maxGoesGreenProfiles: parseLimit(planFeatures.max_goes_green_profiles),
          maxAcademyPaths: parseLimit(planFeatures.max_academy_paths),
          maxAutonomyTasksPerDay: parseLimit(planFeatures.max_autonomy_tasks_per_day),
        },
        subscriptionId: subscription.id,
        planId: plan.id,
        trialEndsAt: subscription.trial_ends_at,
        currentPeriodEnd: subscription.current_period_end,
      };

      c.set(BILLING_CONTEXT_KEY, billingContext);
    }

    await next();
  } catch (err) {
    console.error('Error in billingContextMiddleware:', err);
    // On error, use default context to avoid blocking requests
    c.set(BILLING_CONTEXT_KEY, DEFAULT_BILLING_CONTEXT);
    await next();
  }
}

/**
 * Parse a limit value from the features JSON.
 * Returns null for unlimited (null, -1, or undefined).
 */
function parseLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === -1) {
    return null; // Unlimited
  }
  if (typeof value === 'number') {
    return value;
  }
  return null;
}

// ============================================================================
// CONTEXT ACCESS
// ============================================================================

/**
 * Get the billing context from the request context.
 * Returns the default context if not set.
 */
export function getBillingContext(c: Context<AuthAppEnv>): BillingContext {
  const ctx = c.get(BILLING_CONTEXT_KEY) as BillingContext | undefined;
  return ctx || DEFAULT_BILLING_CONTEXT;
}

// ============================================================================
// SUBSCRIPTION STATUS HELPERS
// ============================================================================

/**
 * Check if the subscription is active (trial or active status).
 */
export function isSubscriptionActive(ctx: BillingContext): boolean {
  return ctx.status === 'trial' || ctx.status === 'active';
}

/**
 * Check if writes are allowed based on subscription status.
 * trial/active: writes allowed
 * past_due/canceled: writes blocked
 */
export function isWriteAllowed(ctx: BillingContext): boolean {
  return ctx.status === 'trial' || ctx.status === 'active';
}

/**
 * Require an active subscription (trial or active).
 * Throws SubscriptionInactiveError if not active.
 */
export function requireActiveSubscription(ctx: BillingContext): void {
  if (!isSubscriptionActive(ctx)) {
    throw new SubscriptionInactiveError(
      `Your subscription is ${ctx.status}. Some features are temporarily disabled. Please update your payment method or contact support.`
    );
  }
}

/**
 * Require that the subscription is not canceled.
 * Throws SubscriptionInactiveError if canceled.
 */
export function requireNotCanceled(ctx: BillingContext): void {
  if (ctx.status === 'canceled') {
    throw new SubscriptionInactiveError(
      'Your subscription has been canceled. Please reactivate your subscription to access this feature.'
    );
  }
}

/**
 * Ensure writes are allowed based on subscription status.
 * Throws SubscriptionInactiveError if writes are blocked.
 */
export function ensureWriteAllowed(ctx: BillingContext): void {
  if (!isWriteAllowed(ctx)) {
    const message = ctx.status === 'canceled'
      ? 'Your subscription has been canceled. Write operations are disabled.'
      : 'Your subscription is past due. Write operations are temporarily disabled until payment is received.';
    throw new SubscriptionInactiveError(message);
  }
}

// ============================================================================
// PLAN LIMIT HELPERS
// ============================================================================

export type PlanLimitKey = keyof PlanFeatures;

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number | null;
}

/**
 * Check if a plan limit allows the operation.
 * Returns { allowed: true } if within limits or unlimited.
 * Returns { allowed: false, reason: string } if limit exceeded.
 */
export function checkPlanLimit(
  ctx: BillingContext,
  currentCount: number,
  limitKey: PlanLimitKey
): LimitCheckResult {
  const limit = ctx.features[limitKey];

  // null means unlimited
  if (limit === null || limit === undefined) {
    return { allowed: true, currentCount, limit: null };
  }

  if (currentCount >= limit) {
    const limitName = formatLimitName(limitKey);
    return {
      allowed: false,
      reason: `Your ${ctx.planName} plan allows a maximum of ${limit} ${limitName}. Please upgrade your subscription to add more.`,
      currentCount,
      limit,
    };
  }

  return { allowed: true, currentCount, limit };
}

/**
 * Require that a plan limit is not exceeded.
 * Throws PlanLimitExceededError if limit is exceeded.
 */
export function requirePlanLimit(
  ctx: BillingContext,
  currentCount: number,
  limitKey: PlanLimitKey
): void {
  const result = checkPlanLimit(ctx, currentCount, limitKey);
  if (!result.allowed && result.reason) {
    throw new PlanLimitExceededError(result.reason);
  }
}

/**
 * Format a limit key into a human-readable name.
 */
function formatLimitName(limitKey: PlanLimitKey): string {
  const names: Record<PlanLimitKey, string> = {
    maxUsers: 'users',
    maxOrganizations: 'organizations',
    maxClimateProfiles: 'climate profiles',
    maxZoraShopProjects: 'ZORA SHOP projects',
    maxGoesGreenProfiles: 'GOES GREEN profiles',
    maxAcademyPaths: 'academy learning paths',
    maxAutonomyTasksPerDay: 'autonomy tasks per day',
  };
  return names[limitKey] || limitKey;
}

// ============================================================================
// COMBINED ENFORCEMENT HELPERS
// ============================================================================

/**
 * Enforce both subscription status and plan limit for a create operation.
 * This is the main helper to use in handlers.
 * 
 * @param ctx - The billing context
 * @param currentCount - Current count of the resource
 * @param limitKey - The plan limit key to check
 * @throws SubscriptionInactiveError if subscription is not active
 * @throws PlanLimitExceededError if plan limit is exceeded
 */
export function enforceCreateLimit(
  ctx: BillingContext,
  currentCount: number,
  limitKey: PlanLimitKey
): void {
  // First check subscription status
  ensureWriteAllowed(ctx);
  
  // Then check plan limit
  requirePlanLimit(ctx, currentCount, limitKey);
}

// ============================================================================
// ERROR RESPONSE HELPER
// ============================================================================

/**
 * Create a standardized error response for billing errors.
 */
export function billingErrorResponse(error: BillingError): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
      },
    }),
    {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Handle a billing error and return an appropriate response.
 * Use this in catch blocks to handle BillingError instances.
 */
export function handleBillingError(error: unknown): Response | null {
  if (error instanceof BillingError) {
    return billingErrorResponse(error);
  }
  return null;
}
