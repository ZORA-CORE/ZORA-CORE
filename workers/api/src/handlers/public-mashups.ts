import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, serverErrorResponse, badRequestResponse } from '../lib/response';

interface PublicBrandInfo {
  id: string;
  name: string;
  slug: string | null;
  sector: string | null;
  country: string | null;
  climate_tagline: string | null;
  logo_url?: string | null;
  website_url?: string | null;
}

interface PublicProductBrand {
  id: string;
  role: string;
  brand: PublicBrandInfo | PublicBrandInfo[] | null;
}

interface PublicProduct {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  primary_image_url: string | null;
  climate_score: number | null;
  estimated_impact_kgco2: number | null;
  created_at: string;
  product_brands: PublicProductBrand[];
}

interface PublicBrand {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  climate_tagline: string | null;
  sector: string | null;
  country: string | null;
}

const app = new Hono<AppEnv>();

// Helper to safely get brand info (handles both single object and array from Supabase)
function getBrandInfo(brand: PublicBrandInfo | PublicBrandInfo[] | null): PublicBrandInfo | null {
  if (!brand) return null;
  if (Array.isArray(brand)) return brand[0] || null;
  return brand;
}

async function getPublicTenantId(env: AppEnv['Bindings']): Promise<string | null> {
  const publicTenantSlug = env.PUBLIC_TENANT_SLUG;
  
  if (!publicTenantSlug) {
    console.error('PUBLIC_TENANT_SLUG not configured');
    return null;
  }
  
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', publicTenantSlug)
    .single();
  
  if (error || !data) {
    console.error('Failed to find public tenant:', error);
    return null;
  }
  
  return data.id;
}

// GET /api/public/mashups/products - List active products for public tenant
app.get('/products', async (c) => {
  try {
    const tenantId = await getPublicTenantId(c.env);
    
    if (!tenantId) {
      return badRequestResponse('Public mashup access is not configured');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters (limited for public access)
    const sector = c.req.query('sector');
    const country = c.req.query('country');
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        short_description,
        long_description,
        primary_image_url,
        climate_score,
        estimated_impact_kgco2,
        created_at,
        product_brands (
          id,
          role,
          brand:brands (
            id,
            name,
            slug,
            sector,
            country,
            climate_tagline
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching public products:', error);
      return serverErrorResponse('Failed to fetch products');
    }
    
    let filteredData = data as PublicProduct[];
    
    // Filter by sector if provided (filter products that have at least one brand in the sector)
    if (sector) {
      filteredData = filteredData.filter(product =>
        product.product_brands?.some(pb => getBrandInfo(pb.brand)?.sector === sector)
      );
    }
    
    // Filter by country if provided
    if (country) {
      filteredData = filteredData.filter(product =>
        product.product_brands?.some(pb => getBrandInfo(pb.brand)?.country === country)
      );
    }
    
    return jsonResponse({
      data: filteredData,
      count: filteredData.length,
    });
  } catch (error) {
    console.error('Public products list error:', error);
    return serverErrorResponse('Failed to fetch products');
  }
});

// GET /api/public/mashups/products/:id - Get a specific active product
app.get('/products/:id', async (c) => {
  try {
    const tenantId = await getPublicTenantId(c.env);
    
    if (!tenantId) {
      return badRequestResponse('Public mashup access is not configured');
    }
    
    const productId = c.req.param('id');
    const supabase = getSupabaseClient(c.env);
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        short_description,
        long_description,
        primary_image_url,
        climate_score,
        estimated_impact_kgco2,
        created_at,
        product_brands (
          id,
          role,
          brand:brands (
            id,
            name,
            slug,
            sector,
            country,
            climate_tagline,
            logo_url,
            website_url
          )
        )
      `)
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();
    
    if (error || !data) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }
    
    return jsonResponse(data as PublicProduct);
  } catch (error) {
    console.error('Public product fetch error:', error);
    return serverErrorResponse('Failed to fetch product');
  }
});

// GET /api/public/mashups/brands - List brands for public tenant
app.get('/brands', async (c) => {
  try {
    const tenantId = await getPublicTenantId(c.env);
    
    if (!tenantId) {
      return badRequestResponse('Public mashup access is not configured');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Optional filters
    const sector = c.req.query('sector');
    const country = c.req.query('country');
    
    let query = supabase
      .from('brands')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        website_url,
        climate_tagline,
        sector,
        country
      `)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });
    
    if (sector) {
      query = query.eq('sector', sector);
    }
    
    if (country) {
      query = query.eq('country', country);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching public brands:', error);
      return serverErrorResponse('Failed to fetch brands');
    }
    
    return jsonResponse({
      data: data as PublicBrand[],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Public brands list error:', error);
    return serverErrorResponse('Failed to fetch brands');
  }
});

// GET /api/public/mashups/stats - Get public stats (counts)
app.get('/stats', async (c) => {
  try {
    const tenantId = await getPublicTenantId(c.env);
    
    if (!tenantId) {
      return badRequestResponse('Public mashup access is not configured');
    }
    
    const supabase = getSupabaseClient(c.env);
    
    // Get active products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    
    // Get brands count
    const { count: brandsCount } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    // Get unique sectors
    const { data: sectors } = await supabase
      .from('brands')
      .select('sector')
      .eq('tenant_id', tenantId)
      .not('sector', 'is', null);
    
    const uniqueSectors = [...new Set(sectors?.map(s => s.sector).filter(Boolean) || [])];
    
    // Get unique countries
    const { data: countries } = await supabase
      .from('brands')
      .select('country')
      .eq('tenant_id', tenantId)
      .not('country', 'is', null);
    
    const uniqueCountries = [...new Set(countries?.map(c => c.country).filter(Boolean) || [])];
    
    return jsonResponse({
      products_count: productsCount || 0,
      brands_count: brandsCount || 0,
      sectors: uniqueSectors,
      countries: uniqueCountries,
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return serverErrorResponse('Failed to fetch stats');
  }
});

export default app;
