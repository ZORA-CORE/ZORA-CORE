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
  Material,
  CreateMaterialInput,
  UpdateMaterialInput,
} from '../types';

const app = new Hono<AuthAppEnv>();

// GET /api/shop/materials - List all materials for the current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const category = c.req.query('category');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    
    let query = supabase
      .from('materials')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching materials:', error);
      return serverErrorResponse('Failed to fetch materials');
    }
    
    return jsonResponse({
      data: data as Material[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Materials list error:', error);
    return serverErrorResponse('Failed to fetch materials');
  }
});

// GET /api/shop/materials/:id - Get a specific material
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const materialId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      return notFoundResponse('Material');
    }
    
    return jsonResponse(data as Material);
  } catch (error) {
    console.error('Material fetch error:', error);
    return serverErrorResponse('Failed to fetch material');
  }
});

// POST /api/shop/materials - Create a new material
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateMaterialInput>();
    
    if (!body.name) {
      return badRequestResponse('Material name is required');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('materials')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating material:', error);
      return serverErrorResponse('Failed to create material');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'shop_material_created',
      summary: `Material created: ${body.name}${body.category ? ` (${body.category})` : ''}`,
      metadata: {
        material_id: data.id,
        material_name: body.name,
        category: body.category,
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse(data as Material, 201);
  } catch (error) {
    console.error('Material create error:', error);
    return serverErrorResponse('Failed to create material');
  }
});

// PUT /api/shop/materials/:id - Update a material
app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const materialId = c.req.param('id');
    const body = await c.req.json<UpdateMaterialInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    // First check if material exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Material');
    }
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', materialId)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating material:', error);
      return serverErrorResponse('Failed to update material');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'shop_material_updated',
      summary: `Material updated: ${data.name}`,
      metadata: {
        material_id: data.id,
        material_name: data.name,
        updated_fields: Object.keys(updateData),
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse(data as Material);
  } catch (error) {
    console.error('Material update error:', error);
    return serverErrorResponse('Failed to update material');
  }
});

// DELETE /api/shop/materials/:id - Delete a material
app.delete('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const materialId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // First check if material exists and get its name for journal
    const { data: existing, error: fetchError } = await supabase
      .from('materials')
      .select('name')
      .eq('id', materialId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Material');
    }
    
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error deleting material:', error);
      return serverErrorResponse('Failed to delete material');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'shop_material_deleted',
      summary: `Material deleted: ${existing.name}`,
      metadata: {
        material_id: materialId,
        material_name: existing.name,
      },
      relatedEntityIds: [materialId],
    });
    
    return jsonResponse({ success: true, message: 'Material deleted' });
  } catch (error) {
    console.error('Material delete error:', error);
    return serverErrorResponse('Failed to delete material');
  }
});

export default app;
