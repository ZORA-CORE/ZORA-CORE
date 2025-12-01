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
  ZoraShopOrder,
  ZoraShopOrderItem,
  ZoraShopOrderWithItems,
  ZoraShopCommissionSettings,
  CreateZoraShopOrderInput,
  UpdateOrderStatusInput,
  UpdateCommissionSettingsInput,
  ZoraShopOrderFilters,
  PaginationParams,
} from '../types';

const app = new Hono<AuthAppEnv>();

// ============================================================================
// Helper: Get or create commission settings for tenant
// ============================================================================
async function getOrCreateCommissionSettings(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string
): Promise<ZoraShopCommissionSettings> {
  // Try to get existing settings
  const { data: existing } = await supabase
    .from('zora_shop_commission_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (existing) {
    return existing;
  }

  // Create default settings (10% commission, 0% foundation share)
  const { data: created, error } = await supabase
    .from('zora_shop_commission_settings')
    .insert({
      tenant_id: tenantId,
      commission_rate: 0.10,
      foundation_share_rate: 0.00,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create commission settings');
  }

  return created;
}

// ============================================================================
// Helper: Create foundation contribution from commission
// ============================================================================
async function createFoundationContribution(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  orderId: string,
  commissionAmount: number,
  foundationShareRate: number,
  currency: string
): Promise<string | null> {
  if (foundationShareRate <= 0 || commissionAmount <= 0) {
    return null;
  }

  const foundationAmount = commissionAmount * foundationShareRate;
  const foundationAmountCents = Math.round(foundationAmount * 100);

  if (foundationAmountCents <= 0) {
    return null;
  }

  // Find an active foundation project to contribute to (or use a default)
  const { data: project } = await supabase
    .from('foundation_projects')
    .select('id')
    .eq('status', 'active')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .limit(1)
    .single();

  // Create contribution
  const { data: contribution, error } = await supabase
    .from('foundation_contributions')
    .insert({
      tenant_id: tenantId,
      project_id: project?.id || null,
      amount_cents: foundationAmountCents,
      currency: currency,
      source_type: 'zora_shop_commission',
      source_reference: orderId,
      contributor_label: 'ZORA SHOP Commission',
      notes: `Automatic contribution from ZORA SHOP order ${orderId}`,
      metadata: {
        order_id: orderId,
        commission_amount: commissionAmount,
        foundation_share_rate: foundationShareRate,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating foundation contribution:', error);
    return null;
  }

  return contribution.id;
}

// ============================================================================
// GET /commission-settings - Get tenant commission settings
// ============================================================================
app.get('/commission-settings', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    const settings = await getOrCreateCommissionSettings(supabase, tenantId);
    return jsonResponse(settings);
  } catch (err) {
    console.error('Error in GET /commission-settings:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PUT /commission-settings - Update tenant commission settings
// ============================================================================
app.put('/commission-settings', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    // Only founder or brand_admin can update commission settings
    if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
      return errorResponse('FORBIDDEN', 'Only founders or brand admins can update commission settings', 403);
    }

    const body = await c.req.json<UpdateCommissionSettingsInput>();

    // Ensure settings exist
    const existing = await getOrCreateCommissionSettings(supabase, tenantId);

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.commission_rate !== undefined) {
      if (body.commission_rate < 0 || body.commission_rate > 1) {
        return badRequestResponse('commission_rate must be between 0 and 1');
      }
      updateData.commission_rate = body.commission_rate;
    }
    if (body.foundation_share_rate !== undefined) {
      if (body.foundation_share_rate < 0 || body.foundation_share_rate > 1) {
        return badRequestResponse('foundation_share_rate must be between 0 and 1');
      }
      updateData.foundation_share_rate = body.foundation_share_rate;
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update settings
    const { data: updated, error } = await supabase
      .from('zora_shop_commission_settings')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating commission settings:', error);
      return serverErrorResponse('Failed to update commission settings');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'commission_settings_updated',
      summary: `Commission settings updated: ${Object.keys(updateData).join(', ')}`,
      category: 'billing',
      metadata: {
        settings_id: updated.id,
        changes: updateData,
      },
      relatedEntityIds: [updated.id],
    });

    return jsonResponse(updated);
  } catch (err) {
    console.error('Error in PUT /commission-settings:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /orders - List tenant orders
// ============================================================================
app.get('/orders', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const project_id = c.req.query('project_id');
    const buyer_org_id = c.req.query('buyer_org_id');
    const status = c.req.query('status');
    const from_date = c.req.query('from_date');
    const to_date = c.req.query('to_date');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query
    let query = supabase
      .from('zora_shop_orders')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply optional filters
    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (buyer_org_id) {
      query = query.eq('buyer_org_id', buyer_org_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return serverErrorResponse('Failed to fetch orders');
    }

    return paginatedResponse(orders || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /orders:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /orders - Create a new order with commission calculation
// ============================================================================
app.post('/orders', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    const body = await c.req.json<CreateZoraShopOrderInput>();

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return badRequestResponse('items array is required and must not be empty');
    }

    // Validate items
    for (const item of body.items) {
      if (!item.product_id || !item.quantity || item.unit_price === undefined) {
        return badRequestResponse('Each item must have product_id, quantity, and unit_price');
      }
      if (item.quantity <= 0) {
        return badRequestResponse('Item quantity must be positive');
      }
    }

    // Get commission settings
    const commissionSettings = await getOrCreateCommissionSettings(supabase, tenantId);

    // Calculate totals
    let totalAmount = 0;
    const itemsWithTotals = body.items.map(item => {
      const lineTotal = item.quantity * item.unit_price;
      totalAmount += lineTotal;
      return {
        ...item,
        line_total: lineTotal,
      };
    });

    // Calculate commission
    const commissionRate = commissionSettings.is_active ? commissionSettings.commission_rate : 0;
    const commissionAmount = totalAmount * commissionRate;
    const foundationShareRate = commissionSettings.foundation_share_rate;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('zora_shop_orders')
      .insert({
        tenant_id: tenantId,
        project_id: body.project_id || null,
        buyer_org_id: body.buyer_org_id || null,
        total_amount: totalAmount,
        currency: body.currency || 'DKK',
        status: 'pending',
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        foundation_share_rate: foundationShareRate,
        foundation_contribution_id: null, // Will be updated after contribution is created
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return serverErrorResponse('Failed to create order');
    }

    // Create order items
    const orderItems = itemsWithTotals.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await supabase
      .from('zora_shop_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order
      await supabase.from('zora_shop_orders').delete().eq('id', order.id);
      return serverErrorResponse('Failed to create order items');
    }

    // Create foundation contribution if applicable
    let foundationContributionId: string | null = null;
    if (foundationShareRate > 0 && commissionAmount > 0) {
      foundationContributionId = await createFoundationContribution(
        supabase,
        tenantId,
        order.id,
        commissionAmount,
        foundationShareRate,
        body.currency || 'DKK'
      );

      // Update order with foundation contribution ID
      if (foundationContributionId) {
        await supabase
          .from('zora_shop_orders')
          .update({ foundation_contribution_id: foundationContributionId })
          .eq('id', order.id);
      }
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('zora_shop_orders')
      .select('*')
      .eq('id', order.id)
      .single();

    const { data: items } = await supabase
      .from('zora_shop_order_items')
      .select('*')
      .eq('order_id', order.id);

    const orderWithItems: ZoraShopOrderWithItems = {
      ...completeOrder,
      items: items || [],
    };

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'zora_shop_order_created',
      summary: `ZORA SHOP order created: ${totalAmount} ${body.currency || 'DKK'} (commission: ${commissionAmount.toFixed(2)})`,
      category: 'zora_shop',
      metadata: {
        order_id: order.id,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        foundation_share_rate: foundationShareRate,
        foundation_contribution_id: foundationContributionId,
        item_count: body.items.length,
      },
      relatedEntityIds: [order.id, ...(foundationContributionId ? [foundationContributionId] : [])],
    });

    return jsonResponse(orderWithItems, 201);
  } catch (err) {
    console.error('Error in POST /orders:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /orders/:id - Get a single order with items
// ============================================================================
app.get('/orders/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const orderId = c.req.param('id');

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('zora_shop_orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderError || !order) {
      return notFoundResponse('Order');
    }

    // Fetch order items
    const { data: items } = await supabase
      .from('zora_shop_order_items')
      .select('*')
      .eq('order_id', orderId);

    const orderWithItems: ZoraShopOrderWithItems = {
      ...order,
      items: items || [],
    };

    return jsonResponse(orderWithItems);
  } catch (err) {
    console.error('Error in GET /orders/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PATCH /orders/:id/status - Update order status
// ============================================================================
app.patch('/orders/:id/status', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const orderId = c.req.param('id');

    // Fetch existing order
    const { data: existingOrder, error: fetchError } = await supabase
      .from('zora_shop_orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingOrder) {
      return notFoundResponse('Order');
    }

    const body = await c.req.json<UpdateOrderStatusInput>();

    if (!body.status) {
      return badRequestResponse('status is required');
    }

    // Validate status transition
    const validStatuses = ['pending', 'paid', 'refunded', 'canceled'];
    if (!validStatuses.includes(body.status)) {
      return badRequestResponse(`status must be one of: ${validStatuses.join(', ')}`);
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('zora_shop_orders')
      .update({ status: body.status })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return serverErrorResponse('Failed to update order status');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'zora_shop_order_status_changed',
      summary: `ZORA SHOP order status changed from ${existingOrder.status} to ${body.status}`,
      category: 'zora_shop',
      metadata: {
        order_id: orderId,
        old_status: existingOrder.status,
        new_status: body.status,
        total_amount: existingOrder.total_amount,
      },
      relatedEntityIds: [orderId],
    });

    return jsonResponse(updatedOrder);
  } catch (err) {
    console.error('Error in PATCH /orders/:id/status:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /orders/summary - Get order summary statistics
// ============================================================================
app.get('/orders/summary', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Get all orders for tenant
    const { data: orders } = await supabase
      .from('zora_shop_orders')
      .select('total_amount, commission_amount, status, currency')
      .eq('tenant_id', tenantId);

    if (!orders || orders.length === 0) {
      return jsonResponse({
        total_orders: 0,
        total_revenue: 0,
        total_commission: 0,
        orders_by_status: {},
        currency: 'DKK',
      });
    }

    // Calculate summary
    const summary = {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      total_commission: orders.reduce((sum, o) => sum + (o.commission_amount || 0), 0),
      orders_by_status: {} as Record<string, number>,
      currency: orders[0]?.currency || 'DKK',
    };

    // Count by status
    for (const order of orders) {
      const status = order.status || 'unknown';
      summary.orders_by_status[status] = (summary.orders_by_status[status] || 0) + 1;
    }

    return jsonResponse(summary);
  } catch (err) {
    console.error('Error in GET /orders/summary:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default app;
