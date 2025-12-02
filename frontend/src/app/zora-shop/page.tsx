'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import { api } from '@/lib/api';
import type { AgentPanelSuggestion, Brand, Product, ShopMaterial } from '@/lib/types';

type TabType = 'brands' | 'products' | 'materials';

function BrandCard({
  brand,
  isSelected,
  onSelect,
}: {
  brand: Brand;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-amber-500/10 border-amber-500/50'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-amber-500/30'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
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
          <h3 className="font-medium text-[var(--foreground)]">{brand.name}</h3>
        </div>
        {brand.sector && (
          <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
            {brand.sector}
          </span>
        )}
      </div>
      {brand.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2 line-clamp-2">
          {brand.description}
        </p>
      )}
      {brand.climate_tagline && (
        <p className="text-xs text-emerald-400 mt-2">{brand.climate_tagline}</p>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const getClimateLabel = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { label: 'climate-positive', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (score >= 50) return { label: 'climate-neutral', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { label: 'low-impact', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const climateInfo = getClimateLabel(product.climate_score);

  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-amber-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{product.name}</h3>
        {climateInfo && (
          <span className={`text-xs px-2 py-1 rounded border ${climateInfo.color}`}>
            {climateInfo.label}
          </span>
        )}
      </div>
      {product.short_description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2 line-clamp-2">
          {product.short_description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <span className="text-[var(--foreground)]/40">{product.status}</span>
        <div className="flex items-center gap-3">
          {product.estimated_impact_kgco2 !== null && (
            <span className="text-emerald-400">
              {product.estimated_impact_kgco2.toFixed(1)} kg CO2
            </span>
          )}
          {product.climate_score !== null && (
            <span className="text-[var(--foreground)]">
              Score: {product.climate_score}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MaterialCard({ material }: { material: ShopMaterial }) {
  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-amber-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{material.name}</h3>
        <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
          {material.category}
        </span>
      </div>
      {material.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-2 line-clamp-2">
          {material.description}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {material.is_renewable && (
          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
            Renewable
          </span>
        )}
        {material.is_recyclable && (
          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
            Recyclable
          </span>
        )}
        {material.sustainability_score !== null && (
          <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
            Score: {material.sustainability_score}/100
          </span>
        )}
      </div>
      {material.carbon_footprint_per_kg !== null && (
        <div className="text-xs text-[var(--foreground)]/50 mt-2">
          {material.carbon_footprint_per_kg.toFixed(2)} kg CO2/kg
        </div>
      )}
      {material.certifications && material.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {material.certifications.slice(0, 3).map((cert) => (
            <span
              key={cert}
              className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded"
            >
              {cert}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateProductForm({
  brandId,
  onSubmit,
  onCancel,
}: {
  brandId: string;
  onSubmit: (data: { name: string; short_description?: string; climate_score?: number; estimated_impact_kgco2?: number; brands?: { brand_id: string; role?: string }[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [climateScore, setClimateScore] = useState('');
  const [carbonFootprint, setCarbonFootprint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        short_description: description.trim() || undefined,
        climate_score: climateScore ? Number(climateScore) : undefined,
        estimated_impact_kgco2: carbonFootprint ? Number(carbonFootprint) : undefined,
        brands: [{ brand_id: brandId, role: 'owner' }],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Product Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hemp T-Shirt"
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-amber-500/50"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)]/70 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the product..."
          rows={2}
          className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-amber-500/50 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--foreground)]/70 mb-1">Climate Score (0-100)</label>
          <input
            type="number"
            value={climateScore}
            onChange={(e) => setClimateScore(e.target.value)}
            placeholder="80"
            min="0"
            max="100"
            className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--foreground)]/70 mb-1">
            Carbon Footprint (kg CO2)
          </label>
          <input
            type="number"
            value={carbonFootprint}
            onChange={(e) => setCarbonFootprint(e.target.value)}
            placeholder="2.5"
            step="0.1"
            className="w-full p-2 bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]/50 rounded text-[var(--foreground)] text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ZoraShopPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<ShopMaterial[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [brandsRes, productsRes, materialsRes] = await Promise.all([
        api.getBrands(),
        api.getProducts(),
        api.getMaterials(),
      ]);
      setBrands(brandsRes.data || []);
      setProducts(productsRes.data || []);
      setMaterials(materialsRes.data || []);
      if (brandsRes.data && brandsRes.data.length > 0 && !selectedBrand) {
        setSelectedBrand(brandsRes.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shop data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleCreateProduct = async (data: { name: string; short_description?: string; climate_score?: number; estimated_impact_kgco2?: number; brands?: { brand_id: string; role?: string }[] }) => {
    try {
      const newProduct = await api.createProduct(data);
      setProducts((prev) => [...prev, newProduct]);
      setShowCreateProduct(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'material_change') {
      setActiveTab('materials');
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const brandProducts = selectedBrand
    ? products.filter((p) => p.product_brands?.some((pb) => pb.brand_id === selectedBrand.id))
    : [];
  const verifiedBrands = brands.filter((b) => b.sector).length;
  const climatePositiveProducts = products.filter(
    (p) => p.climate_score !== null && p.climate_score >= 80
  ).length;
  const renewableMaterials = materials.filter((m) => m.is_renewable).length;

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">ZORA SHOP</h1>
            <p className="text-[var(--foreground)]/60">
              Climate-first marketplace for sustainable products and brand mashups
            </p>
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

          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">{brands.length}</div>
              <div className="text-xs text-[var(--foreground)]/50">Brands</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{verifiedBrands}</div>
              <div className="text-xs text-[var(--foreground)]/50">Verified</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-amber-400">{products.length}</div>
              <div className="text-xs text-[var(--foreground)]/50">Products</div>
            </Card>
            <Card variant="bordered" padding="md" className="text-center">
              <div className="text-2xl font-bold text-green-400">{climatePositiveProducts}</div>
              <div className="text-xs text-[var(--foreground)]/50">Climate+</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="md">
                <div className="flex items-center gap-4 mb-4 border-b border-[var(--card-border)] pb-4">
                  <button
                    onClick={() => setActiveTab('brands')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'brands'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                    }`}
                  >
                    Brands ({brands.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'products'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                    }`}
                  >
                    Products ({products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'materials'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                    }`}
                  >
                    Materials ({materials.length})
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    {activeTab === 'brands' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {brands.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No brands registered yet.</p>
                            <p className="text-sm mt-1">
                              Ask BALDUR for sustainable brand recommendations.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {brands.map((brand) => (
                              <BrandCard
                                key={brand.id}
                                brand={brand}
                                isSelected={selectedBrand?.id === brand.id}
                                onSelect={() => setSelectedBrand(brand)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'products' && (
                      <>
                        {selectedBrand && (
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-[var(--foreground)]/60">
                              Showing products for {selectedBrand.name}
                            </p>
                            <Button
                              onClick={() => setShowCreateProduct(!showCreateProduct)}
                              variant="outline"
                              size="sm"
                            >
                              {showCreateProduct ? 'Cancel' : '+ New Product'}
                            </Button>
                          </div>
                        )}

                        {showCreateProduct && selectedBrand && (
                          <div className="mb-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--card-border)]">
                            <CreateProductForm
                              brandId={selectedBrand.id}
                              onSubmit={handleCreateProduct}
                              onCancel={() => setShowCreateProduct(false)}
                            />
                          </div>
                        )}

                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {brandProducts.length === 0 ? (
                            <div className="text-center py-8 text-[var(--foreground)]/50">
                              <p>No products for this brand yet.</p>
                              <p className="text-sm mt-1">
                                {selectedBrand
                                  ? 'Create a product or ask BALDUR for suggestions.'
                                  : 'Select a brand to view products.'}
                              </p>
                            </div>
                          ) : (
                            brandProducts.map((product) => (
                              <ProductCard key={product.id} product={product} />
                            ))
                          )}
                        </div>
                      </>
                    )}

                    {activeTab === 'materials' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {materials.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No materials in the database yet.</p>
                            <p className="text-sm mt-1">
                              Ask BALDUR for sustainable material recommendations.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {materials.map((material) => (
                              <MaterialCard key={material.id} material={material} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card variant="bordered" padding="md">
                <h3 className="font-semibold text-[var(--foreground)] mb-3">Shop Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Total Brands</span>
                    <span className="font-medium text-[var(--foreground)]">{brands.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Verified Brands</span>
                    <span className="font-medium text-emerald-400">{verifiedBrands}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Total Products</span>
                    <span className="font-medium text-[var(--foreground)]">{products.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Climate+ Products</span>
                    <span className="font-medium text-green-400">{climatePositiveProducts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Materials</span>
                    <span className="font-medium text-[var(--foreground)]">{materials.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Renewable Materials</span>
                    <span className="font-medium text-green-400">{renewableMaterials}</span>
                  </div>
                </div>
              </Card>

              <AgentPanel
                context="shop"
                title="Ask BALDUR"
                description="Nordic agent for sustainable product intelligence"
                onSuggestionSelect={handleSuggestionSelect}
              />

              <div className="flex gap-2">
                <Button href="/dashboard" variant="outline" className="flex-1">
                  Back to Desk
                </Button>
                <Button href="/mashups" variant="primary" className="flex-1">
                  Public Mashups
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
