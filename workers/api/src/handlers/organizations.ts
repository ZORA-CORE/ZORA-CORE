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
import {
  getBillingContext,
  enforceCreateLimit,
  handleBillingError,
  BillingError,
} from '../middleware/billingContext';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  PaginationParams,
} from '../types';

const app = new Hono<AuthAppEnv>();

// ============================================================================
// GET /organizations - List organizations for current tenant
// ============================================================================
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);

    // Parse query parameters
    const organization_type = c.req.query('organization_type');
    const search = c.req.query('search');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const params: PaginationParams = { limit, offset };

    // Build query - organizations are tenant-scoped
    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply optional filters
    if (organization_type) {
      query = query.eq('organization_type', organization_type);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: organizations, error, count } = await query;

    if (error) {
      console.error('Error fetching organizations:', error);
      return serverErrorResponse('Failed to fetch organizations');
    }

    return paginatedResponse(organizations || [], count || 0, params);
  } catch (err) {
    console.error('Error in GET /organizations:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// POST /organizations - Create an organization
// ============================================================================
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);

    // Only founder or brand_admin can create organizations
    if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
      return errorResponse('FORBIDDEN', 'Only founders or brand admins can create organizations', 403);
    }

    const body = await c.req.json<CreateOrganizationInput>();

    // Validate required fields
    if (!body.name || !body.organization_type) {
      return badRequestResponse('name and organization_type are required');
    }

    // Billing enforcement: Check plan limits for organizations
    const billingCtx = getBillingContext(c);
    const { count: currentOrgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    try {
      enforceCreateLimit(billingCtx, currentOrgCount || 0, 'maxOrganizations');
    } catch (err) {
      const billingResponse = handleBillingError(err);
      if (billingResponse) return billingResponse;
      throw err;
    }

    // Insert organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        organization_type: body.organization_type,
        description: body.description || null,
        homepage_url: body.homepage_url || null,
        country: body.country || null,
        city_or_region: body.city_or_region || null,
        industry: body.industry || null,
        tags: body.tags || null,
        linked_shop_brand_id: body.linked_shop_brand_id || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      return serverErrorResponse('Failed to create organization');
    }

    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'organization_created',
      summary: `Organization "${body.name}" (${body.organization_type}) created`,
      category: 'system',
      metadata: {
        organization_id: organization.id,
        organization_type: body.organization_type,
        name: body.name,
      },
      relatedEntityIds: [organization.id],
    });

    return jsonResponse(organization, 201);
  } catch (err) {
    console.error('Error in POST /organizations:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// GET /organizations/:id - Get a single organization
// ============================================================================
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    const organizationId = c.req.param('id');

    // Fetch organization - must be tenant-owned
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !organization) {
      return notFoundResponse('Organization');
    }

    return jsonResponse(organization);
  } catch (err) {
    console.error('Error in GET /organizations/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

// ============================================================================
// PATCH /organizations/:id - Update an organization
// ============================================================================
app.patch('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const auth = getAuthContext(c);
    const supabase = getSupabaseClient(c.env);
    const organizationId = c.req.param('id');

    // Only founder or brand_admin can update organizations
    if (auth.role !== 'founder' && auth.role !== 'brand_admin') {
      return errorResponse('FORBIDDEN', 'Only founders or brand admins can update organizations', 403);
    }

    // Fetch existing organization
    const { data: existingOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingOrg) {
      return notFoundResponse('Organization');
    }

    const body = await c.req.json<UpdateOrganizationInput>();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.organization_type !== undefined) updateData.organization_type = body.organization_type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.homepage_url !== undefined) updateData.homepage_url = body.homepage_url;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.city_or_region !== undefined) updateData.city_or_region = body.city_or_region;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.linked_shop_brand_id !== undefined) updateData.linked_shop_brand_id = body.linked_shop_brand_id;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Update organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return serverErrorResponse('Failed to update organization');
    }

    return jsonResponse(updatedOrg);
  } catch (err) {
    console.error('Error in PATCH /organizations/:id:', err);
    return serverErrorResponse('Internal server error');
  }
});

export default app;
