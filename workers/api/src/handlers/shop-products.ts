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
  Product,
  ProductWithDetails,
  CreateProductInput,
  UpdateProductInput,
  ProductMaterialInput,
  ProductClimateMetaInput,
} from '../types';

const VALID_STATUSES = ['draft', 'published', 'archived'];

const app = new Hono<AuthAppEnv>();

// GET /api/shop/products - List all products for the current tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const status = c.req.query('status');
    const brandId = c.req.query('brand_id');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    
    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands!products_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          climate_tagline,
          logo_url
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return serverErrorResponse('Failed to fetch products');
    }
    
    return jsonResponse({
      data: data as (Product & { brand: unknown })[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Products list error:', error);
    return serverErrorResponse('Failed to fetch products');
  }
});

// GET /api/shop/products/:id - Get a specific product with full details
app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const productId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    // Fetch product with brand
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands!products_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          climate_tagline,
          logo_url,
          website_url
        )
      `)
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (productError || !product) {
      return notFoundResponse('Product');
    }
    
    // Fetch product materials
    const { data: productMaterials } = await supabase
      .from('product_materials')
      .select(`
        *,
        material:materials (
          id,
          name,
          description,
          category
        )
      `)
      .eq('product_id', productId)
      .eq('tenant_id', tenantId);
    
    // Fetch product climate meta
    const { data: climateMeta } = await supabase
      .from('product_climate_meta')
      .select('*')
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .single();
    
    const result: ProductWithDetails = {
      ...product,
      materials: productMaterials || [],
      climate_meta: climateMeta || null,
    };
    
    return jsonResponse(result);
  } catch (error) {
    console.error('Product fetch error:', error);
    return serverErrorResponse('Failed to fetch product');
  }
});

// POST /api/shop/products - Create a new product with materials and climate meta
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateProductInput>();
    
    if (!body.name) {
      return badRequestResponse('Product name is required');
    }
    if (!body.brand_id) {
      return badRequestResponse('Brand ID is required');
    }
    
    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Verify brand exists and belongs to tenant
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', body.brand_id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (brandError || !brand) {
      return badRequestResponse('Brand not found');
    }
    
    // Generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        tenant_id: tenantId,
        brand_id: body.brand_id,
        name: body.name,
        slug,
        description: body.description || null,
        price_currency: body.price_currency || 'EUR',
        price_amount: body.price_amount || null,
        primary_image_url: body.primary_image_url || null,
        status: body.status || 'draft',
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
    
    // Add materials if provided
    if (body.materials && body.materials.length > 0) {
      const materialInserts = body.materials.map((m: ProductMaterialInput) => ({
        tenant_id: tenantId,
        product_id: product.id,
        material_id: m.material_id,
        percentage: m.percentage || null,
        notes: m.notes || null,
      }));
      
      const { error: materialsError } = await supabase
        .from('product_materials')
        .insert(materialInserts);
      
      if (materialsError) {
        console.error('Error adding product materials:', materialsError);
        // Don't fail the whole request, just log the error
      }
    }
    
    // Add climate meta if provided
    if (body.climate_meta) {
      const { error: climateError } = await supabase
        .from('product_climate_meta')
        .insert({
          tenant_id: tenantId,
          product_id: product.id,
          climate_label: body.climate_meta.climate_label || null,
          estimated_impact_kgco2: body.climate_meta.estimated_impact_kgco2 || null,
          certifications: body.climate_meta.certifications || null,
          notes: body.climate_meta.notes || null,
        });
      
      if (climateError) {
        console.error('Error adding product climate meta:', climateError);
        // Don't fail the whole request, just log the error
      }
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'shop_product_created',
      summary: `Product created: ${body.name} (${brand.name})${body.climate_meta?.climate_label ? ` - ${body.climate_meta.climate_label}` : ''}`,
      metadata: {
        product_id: product.id,
        product_name: body.name,
        brand_id: body.brand_id,
        brand_name: brand.name,
        status: body.status || 'draft',
        climate_label: body.climate_meta?.climate_label,
        materials_count: body.materials?.length || 0,
      },
      relatedEntityIds: [product.id, body.brand_id],
    });
    
    // Fetch complete product with all details
    const { data: completeProduct } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands!products_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          climate_tagline,
          logo_url
        )
      `)
      .eq('id', product.id)
      .single();
    
    // Fetch materials
    const { data: productMaterials } = await supabase
      .from('product_materials')
      .select(`
        *,
        material:materials (
          id,
          name,
          description,
          category
        )
      `)
      .eq('product_id', product.id);
    
    // Fetch climate meta
    const { data: climateMeta } = await supabase
      .from('product_climate_meta')
      .select('*')
      .eq('product_id', product.id)
      .single();
    
    const result: ProductWithDetails = {
      ...completeProduct,
      materials: productMaterials || [],
      climate_meta: climateMeta || null,
    };
    
    return jsonResponse(result, 201);
  } catch (error) {
    console.error('Product create error:', error);
    return serverErrorResponse('Failed to create product');
  }
});

// PUT /api/shop/products/:id - Update a product
app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const productId = c.req.param('id');
    const body = await c.req.json<UpdateProductInput>();
    
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
    
    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    
    // Verify brand if being updated
    if (body.brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', body.brand_id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (brandError || !brand) {
        return badRequestResponse('Brand not found');
      }
    }
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (body.brand_id !== undefined) updateData.brand_id = body.brand_id;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price_currency !== undefined) updateData.price_currency = body.price_currency;
    if (body.price_amount !== undefined) updateData.price_amount = body.price_amount;
    if (body.primary_image_url !== undefined) updateData.primary_image_url = body.primary_image_url;
    if (body.status !== undefined) updateData.status = body.status;
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
    
    // Update materials if provided
    if (body.materials !== undefined) {
      // Delete existing materials
      await supabase
        .from('product_materials')
        .delete()
        .eq('product_id', productId)
        .eq('tenant_id', tenantId);
      
      // Insert new materials
      if (body.materials.length > 0) {
        const materialInserts = body.materials.map((m: ProductMaterialInput) => ({
          tenant_id: tenantId,
          product_id: productId,
          material_id: m.material_id,
          percentage: m.percentage || null,
          notes: m.notes || null,
        }));
        
        await supabase
          .from('product_materials')
          .insert(materialInserts);
      }
    }
    
    // Update climate meta if provided
    if (body.climate_meta !== undefined) {
      // Delete existing climate meta
      await supabase
        .from('product_climate_meta')
        .delete()
        .eq('product_id', productId)
        .eq('tenant_id', tenantId);
      
      // Insert new climate meta if provided
      if (body.climate_meta) {
        await supabase
          .from('product_climate_meta')
          .insert({
            tenant_id: tenantId,
            product_id: productId,
            climate_label: body.climate_meta.climate_label || null,
            estimated_impact_kgco2: body.climate_meta.estimated_impact_kgco2 || null,
            certifications: body.climate_meta.certifications || null,
            notes: body.climate_meta.notes || null,
          });
      }
    }
    
    // Fetch updated product with all details
    const { data: updatedProduct } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands!products_brand_id_fkey (
          id,
          name,
          slug,
          sector,
          climate_tagline,
          logo_url
        )
      `)
      .eq('id', productId)
      .single();
    
    // Fetch materials
    const { data: productMaterials } = await supabase
      .from('product_materials')
      .select(`
        *,
        material:materials (
          id,
          name,
          description,
          category
        )
      `)
      .eq('product_id', productId);
    
    // Fetch climate meta
    const { data: climateMeta } = await supabase
      .from('product_climate_meta')
      .select('*')
      .eq('product_id', productId)
      .single();
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: 'shop_product_updated',
      summary: `Product updated: ${updatedProduct?.name || existing.name}`,
      metadata: {
        product_id: productId,
        product_name: updatedProduct?.name || existing.name,
        updated_fields: Object.keys(updateData),
        materials_updated: body.materials !== undefined,
        climate_meta_updated: body.climate_meta !== undefined,
      },
      relatedEntityIds: [productId],
    });
    
    const result: ProductWithDetails = {
      ...updatedProduct,
      materials: productMaterials || [],
      climate_meta: climateMeta || null,
    };
    
    return jsonResponse(result);
  } catch (error) {
    console.error('Product update error:', error);
    return serverErrorResponse('Failed to update product');
  }
});

// DELETE /api/shop/products/:id - Delete a product
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
    
    // Delete product (product_materials and product_climate_meta will be cascade deleted)
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
      eventType: 'shop_product_deleted',
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
