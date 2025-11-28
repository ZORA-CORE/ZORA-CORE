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
  ClimateMaterialProfile,
  UpsertClimateMaterialProfileInput,
  MaterialImpactEstimate,
  MaterialImpactBreakdown,
  HempMaterial,
} from '../types';

const app = new Hono<AuthAppEnv>();

// GET /api/climate/materials/profiles - List climate material profiles for the current tenant
app.get('/profiles', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const materialId = c.req.query('material_id');
    const hempOnly = c.req.query('hemp_only') === 'true';
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    
    // If hemp_only is true, we need to join with materials table
    if (hempOnly) {
      // First get hemp material IDs
      const { data: hempMaterials, error: hempError } = await supabase
        .from('materials')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_hemp_or_cannabis_material', true);
      
      if (hempError) {
        console.error('Error fetching hemp materials:', hempError);
        return serverErrorResponse('Failed to fetch climate material profiles');
      }
      
      const hempMaterialIds = hempMaterials?.map(m => m.id) || [];
      
      if (hempMaterialIds.length === 0) {
        return jsonResponse({
          data: [],
          pagination: {
            limit,
            offset,
            total: 0,
            has_more: false,
          },
        });
      }
      
      let query = supabase
        .from('climate_material_profiles')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .in('material_id', hempMaterialIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching climate material profiles:', error);
        return serverErrorResponse('Failed to fetch climate material profiles');
      }
      
      return jsonResponse({
        data: data as ClimateMaterialProfile[],
        pagination: {
          limit,
          offset,
          total: count || 0,
          has_more: (offset + limit) < (count || 0),
        },
      });
    }
    
    // Standard query without hemp filter
    let query = supabase
      .from('climate_material_profiles')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (materialId) {
      query = query.eq('material_id', materialId);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching climate material profiles:', error);
      return serverErrorResponse('Failed to fetch climate material profiles');
    }
    
    return jsonResponse({
      data: data as ClimateMaterialProfile[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Climate material profiles list error:', error);
    return serverErrorResponse('Failed to fetch climate material profiles');
  }
});

// PUT /api/climate/materials/profiles/:materialId - Upsert climate material profile
app.put('/profiles/:materialId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const materialId = c.req.param('materialId');
    const body = await c.req.json<UpsertClimateMaterialProfileInput>();
    
    const supabase = getSupabaseClient(c.env);
    
    // First verify the material exists and belongs to tenant
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, name, is_hemp_or_cannabis_material')
      .eq('id', materialId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (materialError || !material) {
      return notFoundResponse('Material');
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('climate_material_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('material_id', materialId)
      .single();
    
    let data: ClimateMaterialProfile;
    let isUpdate = false;
    
    if (existingProfile) {
      // Update existing profile
      isUpdate = true;
      const updateData: Record<string, unknown> = {};
      if (body.baseline_unit !== undefined) updateData.baseline_unit = body.baseline_unit;
      if (body.baseline_co2_kg_per_unit !== undefined) updateData.baseline_co2_kg_per_unit = body.baseline_co2_kg_per_unit;
      if (body.reference_material_name !== undefined) updateData.reference_material_name = body.reference_material_name;
      if (body.co2_savings_vs_reference_kg_per_unit !== undefined) updateData.co2_savings_vs_reference_kg_per_unit = body.co2_savings_vs_reference_kg_per_unit;
      if (body.water_savings_l_per_unit !== undefined) updateData.water_savings_l_per_unit = body.water_savings_l_per_unit;
      if (body.land_savings_m2_per_unit !== undefined) updateData.land_savings_m2_per_unit = body.land_savings_m2_per_unit;
      if (body.data_source_label !== undefined) updateData.data_source_label = body.data_source_label;
      if (body.data_source_url !== undefined) updateData.data_source_url = body.data_source_url;
      
      const { data: updated, error: updateError } = await supabase
        .from('climate_material_profiles')
        .update(updateData)
        .eq('id', existingProfile.id)
        .select()
        .single();
      
      if (updateError || !updated) {
        console.error('Error updating climate material profile:', updateError);
        return serverErrorResponse('Failed to update climate material profile');
      }
      
      data = updated as ClimateMaterialProfile;
    } else {
      // Create new profile
      const { data: created, error: createError } = await supabase
        .from('climate_material_profiles')
        .insert({
          tenant_id: tenantId,
          material_id: materialId,
          baseline_unit: body.baseline_unit || 'kg',
          baseline_co2_kg_per_unit: body.baseline_co2_kg_per_unit || null,
          reference_material_name: body.reference_material_name || null,
          co2_savings_vs_reference_kg_per_unit: body.co2_savings_vs_reference_kg_per_unit || null,
          water_savings_l_per_unit: body.water_savings_l_per_unit || null,
          land_savings_m2_per_unit: body.land_savings_m2_per_unit || null,
          data_source_label: body.data_source_label || null,
          data_source_url: body.data_source_url || null,
        })
        .select()
        .single();
      
      if (createError || !created) {
        console.error('Error creating climate material profile:', createError);
        return serverErrorResponse('Failed to create climate material profile');
      }
      
      data = created as ClimateMaterialProfile;
    }
    
    // Create journal entry
    await insertJournalEntry(supabase, {
      tenantId,
      eventType: isUpdate ? 'climate_material_profile_updated' : 'climate_material_profile_created',
      summary: `Climate profile ${isUpdate ? 'updated' : 'created'} for material: ${material.name}${body.reference_material_name ? ` (vs ${body.reference_material_name})` : ''}`,
      metadata: {
        profile_id: data.id,
        material_id: materialId,
        material_name: material.name,
        is_hemp: material.is_hemp_or_cannabis_material,
        reference_material: body.reference_material_name,
        co2_savings: body.co2_savings_vs_reference_kg_per_unit,
      },
      relatedEntityIds: [data.id, materialId],
    });
    
    return jsonResponse(data, isUpdate ? 200 : 201);
  } catch (error) {
    console.error('Climate material profile upsert error:', error);
    return serverErrorResponse('Failed to upsert climate material profile');
  }
});

// GET /api/climate/materials/impact - Estimate climate impact for a material or product
app.get('/impact', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const supabase = getSupabaseClient(c.env);
    
    const materialId = c.req.query('material_id');
    const productId = c.req.query('product_id');
    
    if (!materialId && !productId) {
      return badRequestResponse('Either material_id or product_id is required');
    }
    
    // If material_id is provided, return the profile for that material
    if (materialId) {
      const { data: profile, error: profileError } = await supabase
        .from('climate_material_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('material_id', materialId)
        .single();
      
      if (profileError || !profile) {
        // No profile found - return empty impact
        const { data: material } = await supabase
          .from('materials')
          .select('id, name')
          .eq('id', materialId)
          .eq('tenant_id', tenantId)
          .single();
        
        const response: MaterialImpactEstimate = {
          material_id: materialId,
          total_co2_kg: null,
          breakdown: material ? [{
            material_id: materialId,
            material_name: material.name,
            percentage: 100,
            co2_kg_per_unit: null,
            contribution_kg: null,
          }] : [],
          data_completeness: 'none',
        };
        
        return jsonResponse(response);
      }
      
      // Get material name
      const { data: material } = await supabase
        .from('materials')
        .select('name')
        .eq('id', materialId)
        .single();
      
      const response: MaterialImpactEstimate = {
        material_id: materialId,
        total_co2_kg: profile.baseline_co2_kg_per_unit,
        breakdown: [{
          material_id: materialId,
          material_name: material?.name || 'Unknown',
          percentage: 100,
          co2_kg_per_unit: profile.baseline_co2_kg_per_unit,
          contribution_kg: profile.baseline_co2_kg_per_unit,
        }],
        data_completeness: profile.baseline_co2_kg_per_unit !== null ? 'full' : 'partial',
      };
      
      return jsonResponse(response);
    }
    
    // If product_id is provided, aggregate across product_materials
    if (productId) {
      // Get product materials with their percentages
      const { data: productMaterials, error: pmError } = await supabase
        .from('product_materials')
        .select('material_id, percentage')
        .eq('tenant_id', tenantId)
        .eq('product_id', productId);
      
      if (pmError) {
        console.error('Error fetching product materials:', pmError);
        return serverErrorResponse('Failed to fetch product materials');
      }
      
      if (!productMaterials || productMaterials.length === 0) {
        const response: MaterialImpactEstimate = {
          product_id: productId,
          total_co2_kg: null,
          breakdown: [],
          data_completeness: 'none',
        };
        return jsonResponse(response);
      }
      
      // Get material details and climate profiles for each material
      const materialIds = productMaterials.map(pm => pm.material_id);
      
      const { data: materials } = await supabase
        .from('materials')
        .select('id, name')
        .in('id', materialIds);
      
      const { data: profiles } = await supabase
        .from('climate_material_profiles')
        .select('material_id, baseline_co2_kg_per_unit')
        .eq('tenant_id', tenantId)
        .in('material_id', materialIds);
      
      const materialMap = new Map(materials?.map(m => [m.id, m.name]) || []);
      const profileMap = new Map(profiles?.map(p => [p.material_id, p.baseline_co2_kg_per_unit]) || []);
      
      let totalCo2 = 0;
      let hasAllData = true;
      let hasAnyData = false;
      
      const breakdown: MaterialImpactBreakdown[] = productMaterials.map(pm => {
        const co2PerUnit = profileMap.get(pm.material_id);
        const percentage = pm.percentage || 0;
        
        let contribution: number | null = null;
        if (co2PerUnit !== null && co2PerUnit !== undefined && percentage > 0) {
          contribution = (co2PerUnit * percentage) / 100;
          totalCo2 += contribution;
          hasAnyData = true;
        } else {
          hasAllData = false;
        }
        
        return {
          material_id: pm.material_id,
          material_name: materialMap.get(pm.material_id) || 'Unknown',
          percentage: pm.percentage,
          co2_kg_per_unit: co2PerUnit ?? null,
          contribution_kg: contribution,
        };
      });
      
      const response: MaterialImpactEstimate = {
        product_id: productId,
        total_co2_kg: hasAnyData ? totalCo2 : null,
        breakdown,
        data_completeness: hasAllData && hasAnyData ? 'full' : (hasAnyData ? 'partial' : 'none'),
      };
      
      return jsonResponse(response);
    }
    
    return badRequestResponse('Either material_id or product_id is required');
  } catch (error) {
    console.error('Material impact estimation error:', error);
    return serverErrorResponse('Failed to estimate material impact');
  }
});

export default app;
