'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import { api } from '@/lib/api';
import type {
  Product,
  Brand,
  ProductWithDetails,
  ZoraShopProjectWithBrands,
} from '@/lib/types';

export default function ProductDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<ProductWithDetails | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [projects, setProjects] = useState<ZoraShopProjectWithBrands[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!productId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [productRes, detailsRes, projectsRes] = await Promise.all([
        api.getProduct(productId),
        api.getShopProductDetails(productId).catch(() => ({ data: null })),
        api.getZoraShopProjects().catch(() => ({ data: [] })),
      ]);
      
      setProduct(productRes);
      setProductDetails(detailsRes.data);
      setProjects(projectsRes.data || []);
      
      if (productRes.product_brands && productRes.product_brands.length > 0) {
        const primaryBrandId = productRes.product_brands[0].brand_id;
        try {
          const brandRes = await api.getBrand(primaryBrandId);
          setBrand(brandRes);
        } catch {
          setBrand(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product data');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isAuthenticated && productId) {
      loadData();
    }
  }, [isAuthenticated, productId, loadData]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const getClimateLabel = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { label: 'climate-positive', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (score >= 50) return { label: 'climate-neutral', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { label: 'low-impact', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const climateInfo = product ? getClimateLabel(product.climate_score) : null;
  const climateMeta = productDetails?.climate_meta;
  const materials = productDetails?.materials || [];

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push('/zora-shop?tab=products')}
              className="text-sm text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
              ← Back to ZORA SHOP
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-300 hover:text-red-200"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : !product ? (
            <div className="text-center py-16 text-[var(--foreground)]/50">
              <p>Product not found.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/zora-shop?tab=products')}
              >
                Back to Products
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card variant="default" padding="lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">{product.name}</h1>
                      {brand && (
                        <button
                          onClick={() => router.push(`/zora-shop/brands/${brand.id}`)}
                          className="text-sm text-amber-400 hover:text-amber-300"
                        >
                          by {brand.name} →
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-[var(--background)] text-[var(--foreground)]/60">
                        {product.status}
                      </span>
                      {climateInfo && (
                        <span className={`text-xs px-2 py-1 rounded border ${climateInfo.color}`}>
                          {climateInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {product.short_description && (
                    <p className="text-[var(--foreground)]/70 mb-4">{product.short_description}</p>
                  )}
                  
                  {product.long_description && (
                    <p className="text-[var(--foreground)]/60 text-sm">{product.long_description}</p>
                  )}
                </Card>

                <Card variant="bordered" padding="md">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Climate & Impact</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        {product.climate_score !== null ? product.climate_score : '-'}
                      </div>
                      <div className="text-xs text-[var(--foreground)]/50">Climate Score</div>
                    </div>
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-amber-400">
                        {product.estimated_impact_kgco2 !== null 
                          ? `${product.estimated_impact_kgco2.toFixed(1)}` 
                          : '-'}
                      </div>
                      <div className="text-xs text-[var(--foreground)]/50">kg CO2</div>
                    </div>
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-400">{materials.length}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Materials</div>
                    </div>
                  </div>

                  {climateMeta && (
                    <div className="space-y-3">
                      {climateMeta.climate_label && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <span className="text-xs text-[var(--foreground)]/50 block mb-1">Climate Label</span>
                          <span className="text-emerald-400">{climateMeta.climate_label}</span>
                        </div>
                      )}
                      {climateMeta.certifications && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <span className="text-xs text-[var(--foreground)]/50 block mb-1">Certifications</span>
                          <span className="text-blue-400">{climateMeta.certifications}</span>
                        </div>
                      )}
                      {climateMeta.notes && (
                        <div className="p-3 bg-[var(--background)] rounded-lg">
                          <span className="text-xs text-[var(--foreground)]/50 block mb-1">Notes</span>
                          <span className="text-[var(--foreground)]/70 text-sm">{climateMeta.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {materials.length > 0 && (
                  <Card variant="bordered" padding="md">
                    <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Materials</h2>
                    <div className="space-y-3">
                      {materials.map((pm) => (
                        <div
                          key={pm.id}
                          className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-[var(--foreground)]">
                              {pm.material?.name || 'Unknown Material'}
                            </h3>
                            {pm.percentage !== null && (
                              <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
                                {pm.percentage}%
                              </span>
                            )}
                          </div>
                          {pm.material?.description && (
                            <p className="text-sm text-[var(--foreground)]/60 mb-2">
                              {pm.material.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {pm.material?.is_renewable && (
                              <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                Renewable
                              </span>
                            )}
                            {pm.material?.is_recyclable && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                Recyclable
                              </span>
                            )}
                            {pm.material?.sustainability_score !== null && pm.material?.sustainability_score !== undefined && (
                              <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                                Score: {pm.material?.sustainability_score}/100
                              </span>
                            )}
                          </div>
                          {pm.notes && (
                            <p className="text-xs text-[var(--foreground)]/50 mt-2">{pm.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {projects.length > 0 && (
                  <Card variant="bordered" padding="md">
                    <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Related Capsules</h2>
                    <div className="space-y-3">
                      {projects.slice(0, 3).map((project) => (
                        <div
                          key={project.id}
                          className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-[var(--foreground)]">{project.title}</h3>
                            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                              {project.status}
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-[var(--foreground)]/60">{project.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card variant="bordered" padding="md">
                  <h3 className="font-semibold text-[var(--foreground)] mb-3">Product Info</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-[var(--foreground)]/50 block">Status</span>
                      <span className="text-sm text-[var(--foreground)]">{product.status}</span>
                    </div>
                    {product.climate_score !== null && (
                      <div>
                        <span className="text-xs text-[var(--foreground)]/50 block">Climate Score</span>
                        <span className="text-sm text-emerald-400">{product.climate_score}/100</span>
                      </div>
                    )}
                    {product.estimated_impact_kgco2 !== null && (
                      <div>
                        <span className="text-xs text-[var(--foreground)]/50 block">CO2 Impact</span>
                        <span className="text-sm text-[var(--foreground)]">
                          {product.estimated_impact_kgco2.toFixed(1)} kg CO2
                        </span>
                      </div>
                    )}
                    {brand && (
                      <div>
                        <span className="text-xs text-[var(--foreground)]/50 block">Brand</span>
                        <button
                          onClick={() => router.push(`/zora-shop/brands/${brand.id}`)}
                          className="text-sm text-amber-400 hover:text-amber-300"
                        >
                          {brand.name}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>

                {brand && (
                  <Card variant="bordered" padding="md">
                    <h3 className="font-semibold text-[var(--foreground)] mb-3">Brand</h3>
                    <div
                      onClick={() => router.push(`/zora-shop/brands/${brand.id}`)}
                      className="p-3 bg-[var(--background)] rounded-lg cursor-pointer hover:bg-amber-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <span className="text-amber-400 font-bold">{brand.name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-[var(--foreground)]">{brand.name}</h4>
                          {brand.sector && (
                            <span className="text-xs text-[var(--foreground)]/50">{brand.sector}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <AgentPanel
                  context="shop"
                  title="Ask BALDUR"
                  description="Get insights about this product"
                />

                <div className="flex gap-2">
                  <Button href="/zora-shop" variant="outline" className="flex-1">
                    Back to Shop
                  </Button>
                  <Button href="/mashups" variant="primary" className="flex-1">
                    Public Mashups
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
