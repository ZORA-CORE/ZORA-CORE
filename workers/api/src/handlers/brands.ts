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

interface Brand {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  country: string | null;
  sector: string | null;
  climate_tagline: string | null;
  website_url: string | null;
  logo_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

interface CreateBrandRequest {
  name: string;
  slug?: string;
  description?: string;
  country?: string;
  sector?: string;
  climate_tagline?: string;
  website_url?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  description?: string;
  country?: string;
  sector?: string;
  climate_tagline?: string;
  website_url?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
}

const app = new Hono<AuthAppEnv>();

// GET /api/mashups/brands - List all brands for the current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const sector = c.req.query('sector');
    const country = c.req.query('country');
    
    let query = supabase
      .from('brands')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (sector) {
      query = query.eq('sector', sector);
    }
    if (country) {
      query = query.eq('country', country);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching brands:', error);
      return serverErrorResponse('Failed to fetch brands');
    }
    
    return jsonResponse({
      data: data as Brand[],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Brands list error:', error);
    return serverErrorResponse('Failed to fetch brands');
  }
});

// GET /api/mashups/brands/:id - Get a specific brand
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const brandId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      return notFoundResponse('Brand');
    }
    
    return jsonResponse(data as Brand);
  } catch (error) {
    console.error('Brand fetch error:', error);
    return serverErrorResponse('Failed to fetch brand');
  }
});

// POST /api/mashups/brands - Create a new brand
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateBrandRequest>();
    
    if (!body.name) {
      return badRequestResponse('Brand name is required');
    }
    
    // Generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('brands')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        slug,
        description: body.description || null,
        country: body.country || null,
        sector: body.sector || null,
        climate_tagline: body.climate_tagline || null,
        website_url: body.website_url || null,
        logo_url: body.logo_url || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating brand:', error);
      if (error.code === '23505') {
        return badRequestResponse('A brand with this slug already exists');
      }
      return serverErrorResponse('Failed to create brand');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'mashup_brand_created',
      summary: `Brand created: ${body.name}${body.sector ? ` (${body.sector})` : ''}${body.climate_tagline ? ` - ${body.climate_tagline}` : ''}`,
      metadata: {
        brand_id: data.id,
        brand_name: body.name,
        sector: body.sector,
        country: body.country,
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse(data as Brand, 201);
  } catch (error) {
    console.error('Brand create error:', error);
    return serverErrorResponse('Failed to create brand');
  }
});

// PUT /api/mashups/brands/:id - Update a brand
app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const brandId = c.req.param('id');
    const body = await c.req.json<UpdateBrandRequest>();
    
    const supabase = getSupabaseClient(c.env);
    
    // First check if brand exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Brand');
    }
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.sector !== undefined) updateData.sector = body.sector;
    if (body.climate_tagline !== undefined) updateData.climate_tagline = body.climate_tagline;
    if (body.website_url !== undefined) updateData.website_url = body.website_url;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', brandId)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating brand:', error);
      if (error.code === '23505') {
        return badRequestResponse('A brand with this slug already exists');
      }
      return serverErrorResponse('Failed to update brand');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'mashup_brand_updated',
      summary: `Brand updated: ${data.name}`,
      metadata: {
        brand_id: data.id,
        brand_name: data.name,
        updated_fields: Object.keys(updateData),
      },
      relatedEntityIds: [data.id],
    });
    
    return jsonResponse(data as Brand);
  } catch (error) {
    console.error('Brand update error:', error);
    return serverErrorResponse('Failed to update brand');
  }
});

// DELETE /api/mashups/brands/:id - Delete a brand
app.delete('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const brandId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // First check if brand exists and get its name for journal
    const { data: existing, error: fetchError } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brandId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Brand');
    }
    
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error deleting brand:', error);
      return serverErrorResponse('Failed to delete brand');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'mashup_brand_deleted',
      summary: `Brand deleted: ${existing.name}`,
      metadata: {
        brand_id: brandId,
        brand_name: existing.name,
      },
      relatedEntityIds: [brandId],
    });
    
    return jsonResponse({ success: true, message: 'Brand deleted' });
  } catch (error) {
    console.error('Brand delete error:', error);
    return serverErrorResponse('Failed to delete brand');
  }
});

export default app;
