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

interface ProductBrand {
  id: string;
  product_id: string;
  brand_id: string;
  role: string;
  created_at: string;
  brand?: {
    id: string;
    name: string;
    slug: string | null;
    sector: string | null;
    climate_tagline: string | null;
  };
}

interface Product {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  primary_image_url: string | null;
  status: string;
  climate_score: number | null;
  estimated_impact_kgco2: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
  product_brands?: ProductBrand[];
}

interface BrandAssociation {
  brand_id: string;
  role?: string;
}

interface CreateProductRequest {
  name: string;
  slug?: string;
  short_description?: string;
  long_description?: string;
  primary_image_url?: string;
  status?: string;
  climate_score?: number;
  estimated_impact_kgco2?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  brands?: BrandAssociation[];
}

interface UpdateProductRequest {
  name?: string;
  slug?: string;
  short_description?: string;
  long_description?: string;
  primary_image_url?: string;
  status?: string;
  climate_score?: number;
  estimated_impact_kgco2?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  brands?: BrandAssociation[];
}

const app = new Hono<AuthAppEnv>();

// GET /api/mashups/products - List all products for the current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const status = c.req.query('status');
    const brandId = c.req.query('brand_id');
    
    let query = supabase
      .from('products')
      .select(`
        *,
        product_brands (
          id,
          brand_id,
          role,
          created_at,
          brand:brands (
            id,
            name,
            slug,
            sector,
            climate_tagline
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return serverErrorResponse('Failed to fetch products');
    }
    
    // If filtering by brand_id, filter in memory (Supabase doesn't support filtering on nested relations easily)
    let filteredData = data as Product[];
    if (brandId) {
      filteredData = filteredData.filter(product => 
        product.product_brands?.some(pb => pb.brand_id === brandId)
      );
    }
    
    return jsonResponse({
      data: filteredData,
      count: filteredData.length,
    });
  } catch (error) {
    console.error('Products list error:', error);
    return serverErrorResponse('Failed to fetch products');
  }
});

// GET /api/mashups/products/:id - Get a specific product
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const productId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_brands (
          id,
          brand_id,
          role,
          created_at,
          brand:brands (
            id,
            name,
            slug,
            sector,
            climate_tagline,
            logo_url
          )
        )
      `)
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      return notFoundResponse('Product');
    }
    
    return jsonResponse(data as Product);
  } catch (error) {
    console.error('Product fetch error:', error);
    return serverErrorResponse('Failed to fetch product');
  }
});

// POST /api/mashups/products - Create a new product
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateProductRequest>();
    
    if (!body.name) {
      return badRequestResponse('Product name is required');
    }
    
    // Generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const supabase = getSupabaseClient(c.env);
    
    // Create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        slug,
        short_description: body.short_description || null,
        long_description: body.long_description || null,
        primary_image_url: body.primary_image_url || null,
        status: body.status || 'draft',
        climate_score: body.climate_score || null,
        estimated_impact_kgco2: body.estimated_impact_kgco2 || null,
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();
    
    if (productError) {
      console.error('Error creating product:', productError);
      if (productError.code === '23505') {
        return badRequestResponse('A product with this slug already exists');
      }
      return serverErrorResponse('Failed to create product');
    }
    
    // Associate brands if provided
    const brandNames: string[] = [];
    if (body.brands && body.brands.length > 0) {
      const brandAssociations = body.brands.map(b => ({
        product_id: product.id,
        brand_id: b.brand_id,
        role: b.role || 'collab',
      }));
      
      const { error: brandsError } = await supabase
        .from('product_brands')
        .insert(brandAssociations);
      
      if (brandsError) {
        console.error('Error associating brands:', brandsError);
        // Don't fail the whole request, just log the error
      }
      
      // Fetch brand names for journal entry
      const { data: brands } = await supabase
        .from('brands')
        .select('name')
        .in('id', body.brands.map(b => b.brand_id));
      
      if (brands) {
        brandNames.push(...brands.map(b => b.name));
      }
    }
    
    // Create journal entry
    const brandText = brandNames.length > 0 ? ` with brands: ${brandNames.join(', ')}` : '';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'mashup_product_created',
      summary: `Product created: ${body.name}${brandText}${body.climate_score ? `. Climate score: ${body.climate_score}` : ''}`,
      metadata: {
        product_id: product.id,
        product_name: body.name,
        status: body.status || 'draft',
        climate_score: body.climate_score,
        brand_ids: body.brands?.map(b => b.brand_id) || [],
        brand_names: brandNames,
      },
      relatedEntityIds: [product.id],
    });
    
    // Fetch the complete product with brands
    const { data: completeProduct } = await supabase
      .from('products')
      .select(`
        *,
        product_brands (
          id,
          brand_id,
          role,
          created_at,
          brand:brands (
            id,
            name,
            slug,
            sector,
            climate_tagline
          )
        )
      `)
      .eq('id', product.id)
      .single();
    
    return jsonResponse(completeProduct as Product, 201);
  } catch (error) {
    console.error('Product create error:', error);
    return serverErrorResponse('Failed to create product');
  }
});

// PUT /api/mashups/products/:id - Update a product
app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const productId = c.req.param('id');
    const body = await c.req.json<UpdateProductRequest>();
    
    const supabase = getSupabaseClient(c.env);
    
    // First check if product exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Product');
    }
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.short_description !== undefined) updateData.short_description = body.short_description;
    if (body.long_description !== undefined) updateData.long_description = body.long_description;
    if (body.primary_image_url !== undefined) updateData.primary_image_url = body.primary_image_url;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.climate_score !== undefined) updateData.climate_score = body.climate_score;
    if (body.estimated_impact_kgco2 !== undefined) updateData.estimated_impact_kgco2 = body.estimated_impact_kgco2;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    // Update product if there are changes
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .eq('tenant_id', tenantId);
      
      if (updateError) {
        console.error('Error updating product:', updateError);
        if (updateError.code === '23505') {
          return badRequestResponse('A product with this slug already exists');
        }
        return serverErrorResponse('Failed to update product');
      }
    }
    
    // Update brand associations if provided
    const brandNames: string[] = [];
    if (body.brands !== undefined) {
      // Delete existing associations
      await supabase
        .from('product_brands')
        .delete()
        .eq('product_id', productId);
      
      // Insert new associations
      if (body.brands.length > 0) {
        const brandAssociations = body.brands.map(b => ({
          product_id: productId,
          brand_id: b.brand_id,
          role: b.role || 'collab',
        }));
        
        await supabase
          .from('product_brands')
          .insert(brandAssociations);
        
        // Fetch brand names for journal entry
        const { data: brands } = await supabase
          .from('brands')
          .select('name')
          .in('id', body.brands.map(b => b.brand_id));
        
        if (brands) {
          brandNames.push(...brands.map(b => b.name));
        }
      }
    }
    
    // Fetch the updated product with brands
    const { data: updatedProduct } = await supabase
      .from('products')
      .select(`
        *,
        product_brands (
          id,
          brand_id,
          role,
          created_at,
          brand:brands (
            id,
            name,
            slug,
            sector,
            climate_tagline
          )
        )
      `)
      .eq('id', productId)
      .single();
    
    // Create journal entry
    const brandText = brandNames.length > 0 ? ` Brands: ${brandNames.join(', ')}` : '';
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'mashup_product_updated',
      summary: `Product updated: ${updatedProduct?.name || existing.name}${brandText}`,
      metadata: {
        product_id: productId,
        product_name: updatedProduct?.name || existing.name,
        updated_fields: Object.keys(updateData),
        brands_updated: body.brands !== undefined,
        brand_names: brandNames,
      },
      relatedEntityIds: [productId],
    });
    
    return jsonResponse(updatedProduct as Product);
  } catch (error) {
    console.error('Product update error:', error);
    return serverErrorResponse('Failed to update product');
  }
});

// DELETE /api/mashups/products/:id - Delete a product
app.delete('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const productId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // First check if product exists and get its name for journal
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !existing) {
      return notFoundResponse('Product');
    }
    
    // Delete product (product_brands will be cascade deleted)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error deleting product:', error);
      return serverErrorResponse('Failed to delete product');
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'mashup_product_deleted',
      summary: `Product deleted: ${existing.name}`,
      metadata: {
        product_id: productId,
        product_name: existing.name,
      },
      relatedEntityIds: [productId],
    });
    
    return jsonResponse({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Product delete error:', error);
    return serverErrorResponse('Failed to delete product');
  }
});

export default app;
