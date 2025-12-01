import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId, getAuthContext } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { insertJournalEntry } from '../lib/journal';
import {
  jsonResponse,
  paginatedResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  errorResponse,
} from '../lib/response';
import type {
  BillingPlan,
  CreateBillingPlanInput,
  UpdateBillingPlanInput,
  TenantSubscription,
  TenantSubscriptionWithPlan,
  UpsertTenantSubscriptionInput,
  CreateBillingEventInput,
  BillingPlanFilters,
  PaginationParams,
} from '../types';

const app = new Hono<AuthAppEnv>();

// ============================================================================
// GET /plans - List billing plans
// ============================================================================
app.get('/plans', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const is_active = c.req.query('is_active');
    const billing_interval = c.req.query('billing_interval');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query
    let query = supabase
      .from('billing_plans')
      .select('*', { count: 'exact' });

    // Apply optional filters
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }
    if (billing_interval) {
      query = query.eq('billing_interval', billing_interval);
    }

    // Apply pagination and ordering
    query = query
      .order('price_amount', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: plans, error, count } = await query;

    if (error) {
      console.error('Error fetching billing plans:', error);
      return serverErrorResponse('Failed to fetch billing plans');
    }

    return paginatedResponse(plans || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /plans:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /plans - Create a billing plan (founder only)
// ============================================================================
app.post('/plans', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    // Only founder can create plans
    if (auth.role !== 'founder') {
      return errorResponse('FORBIDDEN', 'Only founders can create billing plans', 403);
    }

    const body = await c.req.json<CreateBillingPlanInput>();

    // Validate required fields
    if (!body.code || !body.name || body.price_amount === undefined || !body.billing_interval) {
      return badRequestResponse('code, name, price_amount, and billing_interval are required');
    }

    // Insert plan
    const { data: plan, error } = await supabase
      .from('billing_plans')
      .insert({
        code: body.code,
        name: body.name,
        description: body.description || null,
        price_amount: body.price_amount,
        price_currency: body.price_currency || 'DKK',
        billing_interval: body.billing_interval,
        is_active: body.is_active !== undefined ? body.is_active : true,
        features: body.features || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating billing plan:', error);
      if (error.code === '23505') {
        return badRequestResponse('A plan with this code already exists');
      }
      return serverErrorResponse('Failed to create billing plan');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'billing_plan_created',
      summary: `Billing plan "${body.name}" (${body.code}) created`,
      category: 'billing',
      metadata: {
        plan_id: plan.id,
        code: body.code,
        price_amount: body.price_amount,
        billing_interval: body.billing_interval,
      },
      relatedEntityIds: [plan.id],
    });

    return jsonResponse(plan, 201);
  } catch (err) {
    console.error('Error in POST /plans:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /plans/:id - Get a single plan
// ============================================================================
app.get('/plans/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const planId = c.req.param('id');

    const { data: plan, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      return notFoundResponse('Plan');
    }

    return jsonResponse(plan);
  } catch (err) {
    console.error('Error in GET /plans/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PATCH /plans/:id - Update a plan (founder only)
// ============================================================================
app.patch('/plans/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    const planId = c.req.param('id');

    // Only founder can update plans
    if (auth.role !== 'founder') {
      return errorResponse('FORBIDDEN', 'Only founders can update billing plans', 403);
    }

    // Fetch existing plan
    const { data: existingPlan, error: fetchError } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (fetchError || !existingPlan) {
      return notFoundResponse('Plan');
    }

    const body = await c.req.json<UpdateBillingPlanInput>();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.code !== undefined) updateData.code = body.code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price_amount !== undefined) updateData.price_amount = body.price_amount;
    if (body.price_currency !== undefined) updateData.price_currency = body.price_currency;
    if (body.billing_interval !== undefined) updateData.billing_interval = body.billing_interval;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.features !== undefined) updateData.features = body.features;

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('billing_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating billing plan:', updateError);
      return serverErrorResponse('Failed to update billing plan');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'billing_plan_updated',
      summary: `Billing plan "${existingPlan.name}" updated`,
      category: 'billing',
      metadata: {
        plan_id: planId,
        changes: Object.keys(updateData),
      },
      relatedEntityIds: [planId],
    });

    return jsonResponse(updatedPlan);
  } catch (err) {
    console.error('Error in PATCH /plans/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /subscription - Get current tenant subscription
// ============================================================================
app.get('/subscription', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Fetch subscription with plan details
    const { data: subscription, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        plan:billing_plans(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No subscription found - return null (not an error)
      if (error.code === 'PGRST116') {
        return jsonResponse({ subscription: null, message: 'No active subscription' });
      }
      console.error('Error fetching subscription:', error);
      return serverErrorResponse('Failed to fetch subscription');
    }

    return jsonResponse(subscription);
  } catch (err) {
    console.error('Error in GET /subscription:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /subscription - Create or update tenant subscription
// ============================================================================
app.post('/subscription', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    const body = await c.req.json<UpsertTenantSubscriptionInput>();

    // Validate required fields
    if (!body.plan_id || !body.status || !body.provider) {
      return badRequestResponse('plan_id, status, and provider are required');
    }

    // Verify plan exists
    const { data: plan, error: planError } = await supabase
      .from('billing_plans')
      .select('id, name, code')
      .eq('id', body.plan_id)
      .single();

    if (planError || !plan) {
      return badRequestResponse('Invalid plan_id');
    }

    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from('tenant_subscriptions')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    let subscription;
    let isNew = false;

    if (existingSubscription) {
      // Update existing subscription
      const { data: updated, error: updateError } = await supabase
        .from('tenant_subscriptions')
        .update({
          plan_id: body.plan_id,
          status: body.status,
          current_period_start: body.current_period_start || null,
          current_period_end: body.current_period_end || null,
          provider: body.provider,
          provider_customer_id: body.provider_customer_id || null,
          provider_subscription_id: body.provider_subscription_id || null,
          trial_ends_at: body.trial_ends_at || null,
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return serverErrorResponse('Failed to update subscription');
      }
      subscription = updated;
    } else {
      // Create new subscription
      const { data: created, error: createError } = await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: body.plan_id,
          status: body.status,
          current_period_start: body.current_period_start || null,
          current_period_end: body.current_period_end || null,
          provider: body.provider,
          provider_customer_id: body.provider_customer_id || null,
          provider_subscription_id: body.provider_subscription_id || null,
          trial_ends_at: body.trial_ends_at || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating subscription:', createError);
        return serverErrorResponse('Failed to create subscription');
      }
      subscription = created;
      isNew = true;
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: isNew ? 'subscription_created' : 'subscription_updated',
      summary: `Subscription ${isNew ? 'created' : 'updated'} to plan "${plan.name}" (${body.status})`,
      category: 'billing',
      metadata: {
        subscription_id: subscription.id,
        plan_id: body.plan_id,
        plan_code: plan.code,
        status: body.status,
        provider: body.provider,
      },
      relatedEntityIds: [subscription.id, body.plan_id],
    });

    return jsonResponse(subscription, isNew ? 201 : 200);
  } catch (err) {
    console.error('Error in POST /subscription:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /webhooks/stripe - Handle Stripe webhook events
// ============================================================================
app.post('/webhooks/stripe', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);

    // Get raw body for signature verification (in production)
    const payload = await c.req.json();

    // Log the webhook event
    const { data: event, error } = await supabase
      .from('billing_events')
      .insert({
        tenant_id: null, // Will be resolved from payload if possible
        subscription_id: null,
        provider: 'stripe',
        event_type: payload.type || 'unknown',
        event_id: payload.id || null,
        payload: payload,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging Stripe webhook:', error);
      return serverErrorResponse('Failed to log webhook event');
    }

    // Process specific event types
    // In v1, we just log events. Actual processing would happen here in future versions.
    const eventType = payload.type;
    
    if (eventType === 'customer.subscription.created' || 
        eventType === 'customer.subscription.updated' ||
        eventType === 'customer.subscription.deleted') {
      // Mark as processed
      await supabase
        .from('billing_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', event.id);
    }

    // Return 200 to acknowledge receipt
    return jsonResponse({ received: true, event_id: event.id });
  } catch (err) {
    console.error('Error in POST /webhooks/stripe:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /webhooks/paypal - Handle PayPal webhook events
// ============================================================================
app.post('/webhooks/paypal', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);

    // Get raw body for signature verification (in production)
    const payload = await c.req.json();

    // Log the webhook event
    const { data: event, error } = await supabase
      .from('billing_events')
      .insert({
        tenant_id: null, // Will be resolved from payload if possible
        subscription_id: null,
        provider: 'paypal',
        event_type: payload.event_type || 'unknown',
        event_id: payload.id || null,
        payload: payload,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging PayPal webhook:', error);
      return serverErrorResponse('Failed to log webhook event');
    }

    // Process specific event types
    // In v1, we just log events. Actual processing would happen here in future versions.
    const eventType = payload.event_type;
    
    if (eventType === 'BILLING.SUBSCRIPTION.CREATED' || 
        eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
        eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      // Mark as processed
      await supabase
        .from('billing_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', event.id);
    }

    // Return 200 to acknowledge receipt
    return jsonResponse({ received: true, event_id: event.id });
  } catch (err) {
    console.error('Error in POST /webhooks/paypal:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /events - List billing events (founder only)
// ============================================================================
app.get('/events', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    // Only founder can view all events
    if (auth.role !== 'founder') {
      return errorResponse('FORBIDDEN', 'Only founders can view billing events', 403);
    }

    // Parse query parameters
    const provider = c.req.query('provider');
    const event_type = c.req.query('event_type');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query
    let query = supabase
      .from('billing_events')
      .select('*', { count: 'exact' });

    // Apply optional filters
    if (provider) {
      query = query.eq('provider', provider);
    }
    if (event_type) {
      query = query.eq('event_type', event_type);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error('Error fetching billing events:', error);
      return serverErrorResponse('Failed to fetch billing events');
    }

    return paginatedResponse(events || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /events:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default app;
