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
  Brand,
  Product,
  ZoraShopProjectWithBrands,
  FoundationProject,
} from '@/lib/types';

export default function BrandDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const brandId = params.brandId as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<ZoraShopProjectWithBrands[]>([]);
  const [foundationProjects, setFoundationProjects] = useState<FoundationProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!brandId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [brandRes, productsRes, projectsRes, foundationRes] = await Promise.all([
        api.getBrand(brandId),
        api.getProducts(),
        api.getZoraShopProjects({ primary_brand_id: brandId }),
        api.getFoundationProjects().catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);
      
      setBrand(brandRes);
      const brandProducts = productsRes.data?.filter(
        (p) => p.product_brands?.some((pb) => pb.brand_id === brandId)
      ) || [];
      setProducts(brandProducts);
      setProjects(projectsRes.data || []);
      setFoundationProjects(foundationRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand data');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    if (isAuthenticated && brandId) {
      loadData();
    }
  }, [isAuthenticated, brandId, loadData]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const climatePositiveProducts = products.filter(
    (p) => p.climate_score !== null && p.climate_score >= 80
  ).length;
  
  const avgClimateScore = products.length > 0
    ? Math.round(
        products
          .filter((p) => p.climate_score !== null)
          .reduce((sum, p) => sum + (p.climate_score || 0), 0) /
          products.filter((p) => p.climate_score !== null).length
      )
    : null;

  const getClimateLabel = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { label: 'climate-positive', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (score >= 50) return { label: 'climate-neutral', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { label: 'low-impact', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push('/zora-shop?tab=brands')}
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
          ) : !brand ? (
            <div className="text-center py-16 text-[var(--foreground)]/50">
              <p>Brand not found.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/zora-shop?tab=brands')}
              >
                Back to Brands
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card variant="default" padding="lg">
                  <div className="flex items-start gap-6 mb-6">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-400 text-3xl font-bold">{brand.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-[var(--foreground)]">{brand.name}</h1>
                        {brand.sector && (
                          <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                            {brand.sector}
                          </span>
                        )}
                      </div>
                      {brand.country && (
                        <p className="text-sm text-[var(--foreground)]/50 mb-2">{brand.country}</p>
                      )}
                      {brand.description && (
                        <p className="text-[var(--foreground)]/70">{brand.description}</p>
                      )}
                      {brand.climate_tagline && (
                        <p className="text-emerald-400 mt-3 text-sm">{brand.climate_tagline}</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card variant="bordered" padding="md">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Climate & Impact</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-[var(--foreground)]">{products.length}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Products</div>
                    </div>
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-emerald-400">{climatePositiveProducts}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Climate+</div>
                    </div>
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-amber-400">{avgClimateScore || '-'}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Avg Score</div>
                    </div>
                    <div className="p-4 bg-[var(--background)] rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-400">{projects.length}</div>
                      <div className="text-xs text-[var(--foreground)]/50">Capsules</div>
                    </div>
                  </div>
                  
                  {products.length > 0 && (
                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--foreground)]">Climate-Positive Rate</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {Math.round((climatePositiveProducts / products.length) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-[var(--background)] rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${(climatePositiveProducts / products.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>

                <Card variant="bordered" padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">Products</h2>
                    <span className="text-sm text-[var(--foreground)]/50">{products.length} total</span>
                  </div>
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-[var(--foreground)]/50">
                      <p>No products for this brand yet.</p>
                      <p className="text-sm mt-1">Create products in ZORA SHOP.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {products.map((product) => {
                        const climateInfo = getClimateLabel(product.climate_score);
                        return (
                          <div
                            key={product.id}
                            onClick={() => router.push(`/zora-shop/products/${product.id}`)}
                            className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-amber-500/30 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium text-[var(--foreground)]">{product.name}</h3>
                              {climateInfo && (
                                <span className={`text-xs px-2 py-1 rounded border ${climateInfo.color}`}>
                                  {climateInfo.label}
                                </span>
                              )}
                            </div>
                            {product.short_description && (
                              <p className="text-sm text-[var(--foreground)]/60 line-clamp-2">
                                {product.short_description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs mt-3">
                              <span className="text-[var(--foreground)]/40">{product.status}</span>
                              {product.climate_score !== null && (
                                <span className="text-[var(--foreground)]">Score: {product.climate_score}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {projects.length > 0 && (
                  <Card variant="bordered" padding="md">
                    <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Capsules & Projects</h2>
                    <div className="space-y-3">
                      {projects.map((project) => (
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
                            <p className="text-sm text-[var(--foreground)]/60 mb-2">{project.description}</p>
                          )}
                          {project.secondary_brand && (
                            <p className="text-xs text-amber-400">
                              Collab with: {project.secondary_brand.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card variant="bordered" padding="md">
                  <h3 className="font-semibold text-[var(--foreground)] mb-3">Brand Info</h3>
                  <div className="space-y-3">
                    {brand.website_url && (
                      <div>
                        <span className="text-xs text-[var(--foreground)]/50 block">Website</span>
                        <a
                          href={brand.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-400 hover:text-amber-300"
                        >
                          {brand.website_url}
                        </a>
                      </div>
                    )}
                    {brand.country && (
                      <div>
                        <span className="text-xs text-[var(--foreground)]/50 block">Country</span>
                        <span className="text-sm text-[var(--foreground)]">{brand.country}</span>
                      </div>
                    )}
                    {brand.sector && (
                      <div>
                        <span className="text-xs text-[var(--foreground)]/50 block">Sector</span>
                        <span className="text-sm text-[var(--foreground)]">{brand.sector}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {foundationProjects.length > 0 && (
                  <Card variant="bordered" padding="md">
                    <h3 className="font-semibold text-[var(--foreground)] mb-3">Foundation Impact</h3>
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {foundationProjects.length}
                      </div>
                      <p className="text-xs text-[var(--foreground)]/50">
                        Related foundation projects
                      </p>
                    </div>
                  </Card>
                )}

                <AgentPanel
                  context="shop"
                  title="Ask BALDUR"
                  description="Get insights about this brand"
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
