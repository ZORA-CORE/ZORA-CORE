'use client';

import { useState, useEffect } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import { HeroSection } from '@/components/ui/HeroSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ValueCard } from '@/components/ui/ValueCard';
import { getPublicProducts, getPublicBrands, getPublicMashupStats } from '@/lib/api';
import type { PublicProduct, PublicBrand, PublicMashupStats } from '@/lib/types';
import { getToken } from '@/lib/auth';

export default function MashupsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [stats, setStats] = useState<PublicMashupStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);

    const loadData = async () => {
      try {
        const [productsRes, brandsRes, statsRes] = await Promise.all([
          getPublicProducts(),
          getPublicBrands(),
          getPublicMashupStats(),
        ]);
        setProducts(productsRes.data);
        setBrands(brandsRes.data);
        setStats(statsRes);
      } catch (err) {
        console.error('Failed to load public data:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts = products.filter((product) => {
    if (!selectedSector && !selectedCountry) return true;

    const productBrands = product.product_brands
      ?.map((pb) => (Array.isArray(pb.brand) ? pb.brand[0] : pb.brand))
      .filter((b): b is NonNullable<typeof b> => b !== null) || [];

    if (selectedSector) {
      const hasSector = productBrands.some((b) => b.sector === selectedSector);
      if (!hasSector) return false;
    }

    if (selectedCountry) {
      const hasCountry = productBrands.some((b) => b.country === selectedCountry);
      if (!hasCountry) return false;
    }

    return true;
  });

  return (
    <PageShell isAuthenticated={isAuthenticated}>
      <HeroSection
        badge="Climate-Aligned Products"
        headline="The Mashup Shop"
        subheadline="Discover unique cross-brand collaborations that are climate-neutral or climate-positive. Every product tells a story of sustainable innovation."
        size="md"
      />

      {stats && (
        <section className="py-8 border-b border-[var(--card-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8 text-center">
              <div>
                <span className="text-2xl font-bold text-[var(--primary)]">{stats.products_count}</span>
                <span className="ml-2 text-sm text-[var(--foreground)]/60">Products</span>
              </div>
              <div className="w-px h-8 bg-[var(--card-border)]" />
              <div>
                <span className="text-2xl font-bold text-[var(--secondary)]">{stats.brands_count}</span>
                <span className="ml-2 text-sm text-[var(--foreground)]/60">Brands</span>
              </div>
              <div className="w-px h-8 bg-[var(--card-border)]" />
              <div>
                <span className="text-2xl font-bold text-[var(--accent)]">{stats.sectors.length}</span>
                <span className="ml-2 text-sm text-[var(--foreground)]/60">Sectors</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {stats && (stats.sectors.length > 0 || stats.countries.length > 0) && (
            <div className="mb-8 flex flex-wrap gap-4 items-center">
              <span className="text-sm text-[var(--foreground)]/60">Filter by:</span>

              {stats.sectors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSector(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      !selectedSector
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    All Sectors
                  </button>
                  {stats.sectors.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => setSelectedSector(sector)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedSector === sector
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              )}

              {stats.countries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      !selectedCountry
                        ? 'bg-[var(--secondary)] text-white'
                        : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    All Countries
                  </button>
                  {stats.countries.map((country) => (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedCountry === country
                          ? 'bg-[var(--secondary)] text-white'
                          : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="py-20">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto py-12">
              <Card variant="default" padding="lg" className="text-center border-[var(--danger)]/30">
                <p className="text-[var(--danger)] mb-4">{error}</p>
              </Card>
            </div>
          )}

          {!isLoading && !error && filteredProducts.length === 0 && (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              title="No products found"
              description={selectedSector || selectedCountry ? "Try adjusting your filters to see more products." : "Our first climate-focused mashup products are being crafted. Check back soon!"}
              action={selectedSector || selectedCountry ? { label: 'Clear Filters', onClick: () => { setSelectedSector(null); setSelectedCountry(null); } } : undefined}
            />
          )}

          {!isLoading && !error && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const productBrands = product.product_brands
                  ?.map((pb) => (Array.isArray(pb.brand) ? pb.brand[0] : pb.brand))
                  .filter((b): b is NonNullable<typeof b> => b !== null) || [];

                return (
                  <Card key={product.id} variant="default" padding="none" hoverable>
                    <div className="aspect-[4/3] bg-[var(--card-border)] overflow-hidden">
                      {product.primary_image_url ? (
                        <img
                          src={product.primary_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20">
                          <svg className="w-16 h-16 text-[var(--foreground)]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {productBrands.slice(0, 3).map((brand) => (
                          <Badge key={brand.id} variant="secondary" size="sm">
                            {brand.name}
                          </Badge>
                        ))}
                        {productBrands.length > 3 && (
                          <Badge variant="default" size="sm">
                            +{productBrands.length - 3}
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                        {product.name}
                      </h3>

                      {product.short_description && (
                        <p className="text-sm text-[var(--foreground)]/60 mb-4 line-clamp-2">
                          {product.short_description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 pt-4 border-t border-[var(--card-border)]">
                        {product.climate_score !== null && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[var(--foreground)]/40">Score</span>
                            <span className={`text-sm font-semibold ${
                              product.climate_score >= 70 ? 'text-[var(--primary)]' :
                              product.climate_score >= 40 ? 'text-[var(--accent)]' :
                              'text-[var(--danger)]'
                            }`}>
                              {product.climate_score}
                            </span>
                          </div>
                        )}
                        {product.estimated_impact_kgco2 !== null && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[var(--foreground)]/40">Impact</span>
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {product.estimated_impact_kgco2 < 0
                                ? `Saves ${Math.abs(product.estimated_impact_kgco2)} kg`
                                : `${product.estimated_impact_kgco2} kg CO2`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {brands.length > 0 && (
        <section className="py-16 bg-[var(--card-bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="Our Partners"
              title="Featured Brands"
              subtitle="Climate-committed brands collaborating on sustainable products."
            />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.slice(0, 12).map((brand) => (
                <Card key={brand.id} variant="bordered" padding="md" className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--secondary)]/10 flex items-center justify-center">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-[var(--secondary)]">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-[var(--foreground)] text-sm truncate">{brand.name}</h4>
                  {brand.sector && (
                    <p className="text-xs text-[var(--foreground)]/40 truncate">{brand.sector}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="What Makes Our Products Different"
            subtitle="Every product in the Mashup Shop meets our strict climate standards."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Climate-First Design"
              description="Every product is designed with climate impact as the primary consideration, not an afterthought."
              variant="primary"
            />
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Cross-Brand Collaboration"
              description="Unique partnerships between brands committed to sustainability, creating products neither could make alone."
              variant="secondary"
            />
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Transparent Impact"
              description="Clear climate scores and impact estimates for every product. No greenwashing, just honest data."
              variant="accent"
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
