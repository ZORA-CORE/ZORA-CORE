import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import { insertJournalEntry } from '../lib/journal';
import {
  jsonResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from '../lib/response';
import type {
  ZoraShopProject,
  ZoraShopProjectWithBrands,
  CreateZoraShopProjectInput,
  UpdateZoraShopProjectInput,
  UpdateProjectStatusInput,
  ZoraShopProjectStatus,
} from '../types';

const VALID_STATUSES: ZoraShopProjectStatus[] = ['idea', 'brief', 'concept', 'review', 'launched', 'archived'];

const app = new Hono<AuthAppEnv>();

// GET /api/zora-shop/projects - List all projects for the current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const status = c.req.query('status');
    const primaryBrandId = c.req.query('primary_brand_id');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    
    let query = supabase
      .from('zora_shop_projects')
      .select(`
        *,
        primary_brand:brands!zora_shop_projects_primary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        ),
        secondary_brand:brands!zora_shop_projects_secondary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    if (primaryBrandId) {
      query = query.eq('primary_brand_id', primaryBrandId);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching ZORA SHOP projects:', error);
      return serverErrorResponse('Failed to fetch projects');
    }
    
    return jsonResponse({
      data: data as ZoraShopProjectWithBrands[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('ZORA SHOP projects list error:', error);
    return serverErrorResponse('Failed to fetch projects');
  }
});

// GET /api/zora-shop/projects/:id - Get a specific project
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const projectId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('zora_shop_projects')
      .select(`
        *,
        primary_brand:brands!zora_shop_projects_primary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          climate_tagline,
          logo_url,
          website_url
        ),
        secondary_brand:brands!zora_shop_projects_secondary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          climate_tagline,
          logo_url,
          website_url
        )
      `)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      return notFoundResponse('ZORA SHOP Project');
    }
    
    return jsonResponse(data as ZoraShopProjectWithBrands);
  } catch (error) {
    console.error('ZORA SHOP project fetch error:', error);
    return serverErrorResponse('Failed to fetch project');
  }
});

// POST /api/zora-shop/projects - Create a new project
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateZoraShopProjectInput>();
    
    if (!body.title) {
      return badRequestResponse('Project title is required');
    }
    if (!body.primary_brand_id) {
      return badRequestResponse('Primary brand ID is required');
    }
    
    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify primary brand exists and belongs to tenant
    const { data: primaryBrand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', body.primary_brand_id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (brandError || !primaryBrand) {
      return badRequestResponse('Primary brand not found');
    }
    
    // Verify secondary brand if provided
    let secondaryBrandName: string | null = null;
    if (body.secondary_brand_id) {
      const { data: secondaryBrand, error: secondaryError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('id', body.secondary_brand_id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (secondaryError || !secondaryBrand) {
        return badRequestResponse('Secondary brand not found');
      }
      secondaryBrandName = secondaryBrand.name;
    }
    
    const { data, error } = await supabase
      .from('zora_shop_projects')
      .insert({
        tenant_id: tenantId,
        title: body.title,
        description: body.description || null,
        status: body.status || 'idea',
        primary_brand_id: body.primary_brand_id,
        secondary_brand_id: body.secondary_brand_id || null,
        theme: body.theme || null,
        target_launch_date: body.target_launch_date || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ZORA SHOP project:', error);
      return serverErrorResponse('Failed to create project');
    }
    
    // Create journal entry
    const brandText = secondaryBrandName 
      ? `${primaryBrand.name} x ${secondaryBrandName}` 
      : primaryBrand.name;
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'zora_shop_project_created',
      summary: `ZORA SHOP Project created: ${body.title} (${brandText})${body.theme ? ` - Theme: ${body.theme}` : ''}`,
      metadata: {
        project_id: data.id,
        project_title: body.title,
        primary_brand_id: body.primary_brand_id,
        primary_brand_name: primaryBrand.name,
        secondary_brand_id: body.secondary_brand_id,
        secondary_brand_name: secondaryBrandName,
        status: body.status || 'idea',
        theme: body.theme,
      },
      relatedEntityIds: [data.id, body.primary_brand_id, ...(body.secondary_brand_id ? [body.secondary_brand_id] : [])],
    });
    
    // Fetch complete project with brands
    const { data: completeProject } = await supabase
      .from('zora_shop_projects')
      .select(`
        *,
        primary_brand:brands!zora_shop_projects_primary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        ),
        secondary_brand:brands!zora_shop_projects_secondary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        )
      `)
      .eq('id', data.id)
      .single();
    
    return jsonResponse(completeProject as ZoraShopProjectWithBrands, 201);
  } catch (error) {
    console.error('ZORA SHOP project create error:', error);
    return serverErrorResponse('Failed to create project');
  }
});

// PUT /api/zora-shop/projects/:id - Update a project
app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const projectId = c.req.param('id');
    const body = await c.req.json<UpdateZoraShopProjectInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    // First check if project exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('zora_shop_projects')
      .select('*')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('ZORA SHOP Project');
    }
    
    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    
    // Verify primary brand if being updated
    if (body.primary_brand_id) {
      const { data: primaryBrand, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', body.primary_brand_id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (brandError || !primaryBrand) {
        return badRequestResponse('Primary brand not found');
      }
    }
    
    // Verify secondary brand if being updated
    if (body.secondary_brand_id) {
      const { data: secondaryBrand, error: secondaryError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', body.secondary_brand_id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (secondaryError || !secondaryBrand) {
        return badRequestResponse('Secondary brand not found');
      }
    }
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.primary_brand_id !== undefined) updateData.primary_brand_id = body.primary_brand_id;
    if (body.secondary_brand_id !== undefined) updateData.secondary_brand_id = body.secondary_brand_id;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.target_launch_date !== undefined) updateData.target_launch_date = body.target_launch_date;
    if (body.launched_at !== undefined) updateData.launched_at = body.launched_at;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    const { error } = await supabase
      .from('zora_shop_projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error updating ZORA SHOP project:', error);
      return serverErrorResponse('Failed to update project');
    }
    
    // Fetch updated project with brands
    const { data: updatedProject } = await supabase
      .from('zora_shop_projects')
      .select(`
        *,
        primary_brand:brands!zora_shop_projects_primary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        ),
        secondary_brand:brands!zora_shop_projects_secondary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        )
      `)
      .eq('id', projectId)
      .single();
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'zora_shop_project_updated',
      summary: `ZORA SHOP Project updated: ${updatedProject?.title || existing.title}`,
      metadata: {
        project_id: projectId,
        project_title: updatedProject?.title || existing.title,
        updated_fields: Object.keys(updateData),
      },
      relatedEntityIds: [projectId],
    });
    
    return jsonResponse(updatedProject as ZoraShopProjectWithBrands);
  } catch (error) {
    console.error('ZORA SHOP project update error:', error);
    return serverErrorResponse('Failed to update project');
  }
});

// PATCH /api/zora-shop/projects/:id/status - Update project status
app.patch('/:id/status', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const projectId = c.req.param('id');
    const body = await c.req.json<UpdateProjectStatusInput>();
    
    if (!body.status) {
      return badRequestResponse('Status is required');
    }
    
    if (!VALID_STATUSES.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // First check if project exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('zora_shop_projects')
      .select('title, status')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('ZORA SHOP Project');
    }
    
    const oldStatus = existing.status;
    
    // Build update object
    const updateData: Record<string, unknown> = {
      status: body.status,
    };
    
    // If status is 'launched', set launched_at
    if (body.status === 'launched' && oldStatus !== 'launched') {
      updateData.launched_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('zora_shop_projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error updating ZORA SHOP project status:', error);
      return serverErrorResponse('Failed to update project status');
    }
    
    // Fetch updated project
    const { data: updatedProject } = await supabase
      .from('zora_shop_projects')
      .select(`
        *,
        primary_brand:brands!zora_shop_projects_primary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        ),
        secondary_brand:brands!zora_shop_projects_secondary_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          logo_url
        )
      `)
      .eq('id', projectId)
      .single();
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'zora_shop_project_status_changed',
      summary: `ZORA SHOP Project status changed: ${existing.title} (${oldStatus} -> ${body.status})`,
      metadata: {
        project_id: projectId,
        project_title: existing.title,
        old_status: oldStatus,
        new_status: body.status,
      },
      relatedEntityIds: [projectId],
    });
    
    return jsonResponse(updatedProject as ZoraShopProjectWithBrands);
  } catch (error) {
    console.error('ZORA SHOP project status update error:', error);
    return serverErrorResponse('Failed to update project status');
  }
});

// DELETE /api/zora-shop/projects/:id - Delete a project
app.delete('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const projectId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // First check if project exists and get its title for journal
    const { data: existing, error: fetchError } = await supabase
      .from('zora_shop_projects')
      .select('title')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('ZORA SHOP Project');
    }
    
    const { error } = await supabase
      .from('zora_shop_projects')
      .delete()
      .eq('id', projectId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error deleting ZORA SHOP project:', error);
      return serverErrorResponse('Failed to delete project');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'zora_shop_project_deleted',
      summary: `ZORA SHOP Project deleted: ${existing.title}`,
      metadata: {
        project_id: projectId,
        project_title: existing.title,
      },
      relatedEntityIds: [projectId],
    });
    
    return jsonResponse({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('ZORA SHOP project delete error:', error);
    return serverErrorResponse('Failed to delete project');
  }
});

export default app;
