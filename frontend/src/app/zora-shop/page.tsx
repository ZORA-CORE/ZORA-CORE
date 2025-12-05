'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useBilling } from '@/lib/BillingContext';
import { AppShell } from '@/components/layout';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import {
  ZCard,
  ZButton,
  ZMetricTile,
  ZPageHeader,
  ZSectionHeader,
  ZBadge,
  ZStatusBadge,
  ZInput,
  ZSelect,
  ZTextarea,
  ZEmptyState,
  ZLoadingState,
  ZErrorState,
  ZTabs,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';
import {
  getBrands,
  getProducts,
  getMaterials,
  getZoraShopProjects,
  getFoundationProjects,
  createProduct,
} from '@/lib/api';
import type {
  AgentPanelSuggestion,
  Brand,
  Product,
  ShopMaterial,
  ZoraShopProjectWithBrands,
  FoundationProject,
} from '@/lib/types';

type TabType = 'overview' | 'brands' | 'products' | 'materials' | 'projects';

function BrandCard({
  brand,
  isSelected,
  onSelect,
  onNavigate,
}: {
  brand: Brand;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}) {
  return (
    <ZCard
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-all ${
        isSelected ? 'border-[var(--z-accent)]' : 'hover:border-[var(--z-accent)]/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[var(--z-accent)]/20 flex items-center justify-center">
              <span className="text-[var(--z-accent)] font-bold">{brand.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <h3 className="font-medium text-[var(--z-text-primary)]">{brand.name}</h3>
            {brand.country && <span className="text-xs text-[var(--z-text-muted)]">{brand.country}</span>}
          </div>
        </div>
        {brand.sector && <ZBadge variant="success" size="sm">{brand.sector}</ZBadge>}
      </div>
      {brand.description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2 line-clamp-2">{brand.description}</p>
      )}
      {brand.climate_tagline && <p className="text-xs text-emerald-400 mt-2">{brand.climate_tagline}</p>}
      <div className="mt-3 pt-3 border-t border-[var(--z-border)]">
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          className="text-xs text-[var(--z-accent)] hover:text-[var(--z-accent-hover)] transition-colors"
        >
          View Details &rarr;
        </button>
      </div>
    </ZCard>
  );
}

function ProductCard({ product, onNavigate }: { product: Product; onNavigate: () => void }) {
  const getClimateLabel = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { label: 'climate-positive', variant: 'success' as const };
    if (score >= 50) return { label: 'climate-neutral', variant: 'info' as const };
    return { label: 'low-impact', variant: 'success' as const };
  };

  const climateInfo = getClimateLabel(product.climate_score);

  return (
    <ZCard onClick={onNavigate} className="p-4 cursor-pointer hover:border-[var(--z-accent)]/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--z-text-primary)]">{product.name}</h3>
        {climateInfo && <ZBadge variant={climateInfo.variant} size="sm">{climateInfo.label}</ZBadge>}
      </div>
      {product.short_description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2 line-clamp-2">{product.short_description}</p>
      )}
      <div className="flex items-center justify-between text-xs mt-3">
        <ZStatusBadge status={product.status} size="sm" />
        <div className="flex items-center gap-3">
          {product.estimated_impact_kgco2 !== null && (
            <span className="text-emerald-400">{product.estimated_impact_kgco2.toFixed(1)} kg CO2</span>
          )}
          {product.climate_score !== null && (
            <span className="text-[var(--z-text-secondary)]">Score: {product.climate_score}</span>
          )}
        </div>
      </div>
    </ZCard>
  );
}

function MaterialCard({ material }: { material: ShopMaterial }) {
  return (
    <ZCard className="p-4 hover:border-[var(--z-accent)]/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--z-text-primary)]">{material.name}</h3>
        <ZBadge variant="warning" size="sm">{material.category}</ZBadge>
      </div>
      {material.description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-2 line-clamp-2">{material.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {material.is_renewable && <ZBadge variant="success" size="sm">Renewable</ZBadge>}
        {material.is_recyclable && <ZBadge variant="info" size="sm">Recyclable</ZBadge>}
        {material.sustainability_score !== null && (
          <ZBadge variant="success" size="sm">Score: {material.sustainability_score}/100</ZBadge>
        )}
      </div>
      {material.carbon_footprint_per_kg !== null && (
        <div className="text-xs text-[var(--z-text-muted)] mt-2">
          {material.carbon_footprint_per_kg.toFixed(2)} kg CO2/kg
        </div>
      )}
      {material.certifications && material.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {material.certifications.slice(0, 3).map((cert) => (
            <ZBadge key={cert} variant="odin" size="sm">{cert}</ZBadge>
          ))}
        </div>
      )}
    </ZCard>
  );
}

function ProjectCard({ project }: { project: ZoraShopProjectWithBrands }) {
  return (
    <ZCard className="p-4 hover:border-[var(--z-accent)]/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--z-text-primary)]">{project.title}</h3>
        <ZStatusBadge status={project.status} size="sm" />
      </div>
      {project.description && (
        <p className="text-sm text-[var(--z-text-muted)] mb-3 line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center gap-2 mb-2">
        {project.primary_brand && (
          <div className="flex items-center gap-2">
            {project.primary_brand.logo_url ? (
              <img src={project.primary_brand.logo_url} alt={project.primary_brand.name} className="w-6 h-6 rounded object-cover" />
            ) : (
              <div className="w-6 h-6 rounded bg-[var(--z-accent)]/20 flex items-center justify-center">
                <span className="text-[var(--z-accent)] text-xs font-bold">{project.primary_brand.name.charAt(0)}</span>
              </div>
            )}
            <span className="text-sm text-[var(--z-text-primary)]">{project.primary_brand.name}</span>
          </div>
        )}
        {project.secondary_brand && (
          <>
            <span className="text-[var(--z-text-muted)]">x</span>
            <div className="flex items-center gap-2">
              {project.secondary_brand.logo_url ? (
                <img src={project.secondary_brand.logo_url} alt={project.secondary_brand.name} className="w-6 h-6 rounded object-cover" />
              ) : (
                <div className="w-6 h-6 rounded bg-[var(--z-accent)]/20 flex items-center justify-center">
                  <span className="text-[var(--z-accent)] text-xs font-bold">{project.secondary_brand.name.charAt(0)}</span>
                </div>
              )}
              <span className="text-sm text-[var(--z-text-primary)]">{project.secondary_brand.name}</span>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[var(--z-border)]">
        {project.theme && <span className="text-violet-400">Theme: {project.theme}</span>}
        {project.target_launch_date && (
          <span className="text-[var(--z-text-muted)]">Target: {new Date(project.target_launch_date).toLocaleDateString()}</span>
        )}
      </div>
    </ZCard>
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
    <ZCard className="p-4">
      <h3 className="text-lg font-semibold text-[var(--z-text-primary)] mb-4">Create Product</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ZInput label="Product Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hemp T-Shirt" required />
        <ZTextarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the product..." rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <ZInput label="Climate Score (0-100)" type="number" value={climateScore} onChange={(e) => setClimateScore(e.target.value)} placeholder="80" min="0" max="100" />
          <ZInput label="Carbon Footprint (kg CO2)" type="number" value={carbonFootprint} onChange={(e) => setCarbonFootprint(e.target.value)} placeholder="2.5" step="0.1" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <ZButton variant="ghost" onClick={onCancel}>Cancel</ZButton>
          <ZButton variant="primary" type="submit" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </ZButton>
        </div>
      </form>
    </ZCard>
  );
}

function ShopUpgradeBanner() {
  return (
    <ZCard className="p-6 border-[var(--z-accent)]/30 bg-gradient-to-r from-[var(--z-accent)]/5 to-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)] mb-1">Unlock Full Shop OS</h3>
          <p className="text-sm text-[var(--z-text-muted)]">
            Upgrade to create unlimited brands, products, and mashup projects.
          </p>
        </div>
        <ZButton variant="primary" href="/billing/plans">Upgrade Plan</ZButton>
      </div>
    </ZCard>
  );
}

function ZoraShopPageContent() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canAccessFeature } = useBilling();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'overview');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<ShopMaterial[]>([]);
  const [projects, setProjects] = useState<ZoraShopProjectWithBrands[]>([]);
  const [foundationProjects, setFoundationProjects] = useState<FoundationProject[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  const hasShopAccess = canAccessFeature('max_zora_shop_projects');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [brandsRes, productsRes, materialsRes, projectsRes, foundationRes] = await Promise.all([
        getBrands(),
        getProducts(),
        getMaterials(),
        getZoraShopProjects(),
        getFoundationProjects(),
      ]);
      setBrands(brandsRes.data);
      setProducts(productsRes.data);
      setMaterials(materialsRes.data);
      setProjects(projectsRes.data);
      setFoundationProjects(foundationRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shop data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleCreateProduct = async (data: { name: string; short_description?: string; climate_score?: number; estimated_impact_kgco2?: number; brands?: { brand_id: string; role?: string }[] }) => {
    try {
      const newProduct = await createProduct(data);
      setProducts((prev) => [...prev, newProduct]);
      setShowCreateProduct(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const handleSuggestionSelect = (suggestion: AgentPanelSuggestion) => {
    if (suggestion.type === 'material_change' && selectedBrand) {
      setShowCreateProduct(true);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    router.push(`/zora-shop?tab=${tab}`, { scroll: false });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const brandProducts = selectedBrand ? products.filter((p) => p.product_brands?.some((b) => b.brand_id === selectedBrand.id)) : products;
  const climatePositiveProducts = products.filter((p) => p.climate_score !== null && p.climate_score >= 80).length;
  const renewableMaterials = materials.filter((m) => m.is_renewable).length;
  const activeProjects = projects.filter((p) => !['archived', 'launched'].includes(p.status)).length;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'brands', label: `Brands (${brands.length})` },
    { id: 'products', label: `Products (${products.length})` },
    { id: 'materials', label: `Materials (${materials.length})` },
    { id: 'projects', label: `Projects (${projects.length})` },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-8">
        <div className="max-w-7xl mx-auto">
          {/* ===== HERO SECTION ===== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)] border border-[var(--z-border-default)] mb-8">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--z-amber)] blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--primary)] blur-3xl" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--z-amber)] via-[var(--primary)] to-[var(--z-emerald)]" />
            
            <div className="relative p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--z-amber)]/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--z-amber)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <ZBadge variant="baldur" size="md">SHOP OS</ZBadge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--z-text-primary)] tracking-tight mb-2">
                    {t('shop.title', 'ZORA SHOP')}
                  </h1>
                  <p className="text-lg text-[var(--z-text-tertiary)] max-w-2xl">
                    {t('shop.subtitle', 'Climate-first brand mashups and sustainable products for a better planet.')}
                  </p>
                </div>
                
                {/* Shop Stats */}
                <div className="flex flex-col items-start lg:items-end gap-3">
                  <div className="px-5 py-4 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)]">
                    <p className="text-[10px] text-[var(--z-text-muted)] uppercase tracking-[0.15em] mb-2">Climate+ Products</p>
                    <div className="text-2xl font-bold text-[var(--z-emerald)]">
                      {climatePositiveProducts}
                    </div>
                    <p className="text-xs text-[var(--z-text-muted)]">climate-positive items</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--z-amber)] animate-pulse" />
                  <span className="text-sm text-[var(--z-text-secondary)]">{brands.length} brands</span>
                </div>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">{products.length} products</span>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">{renewableMaterials} renewable materials</span>
              </div>
            </div>
          </div>

          {!hasShopAccess && <ShopUpgradeBanner />}

          <ZTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} className="mb-6" />

          {isLoading ? (
            <ZLoadingState message="Loading shop data..." />
          ) : error ? (
            <ZErrorState message={error} onRetry={loadData} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {activeTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ZMetricTile label="Total Brands" value={brands.length} sublabel="registered" onClick={() => handleTabChange('brands')} />
                      <ZMetricTile label="Products" value={products.length} sublabel="in catalog" variant="amber" onClick={() => handleTabChange('products')} />
                      <ZMetricTile label="Climate+" value={climatePositiveProducts} sublabel="products" variant="emerald" onClick={() => handleTabChange('products')} />
                      <ZMetricTile label="Active Projects" value={activeProjects} sublabel="in progress" variant="violet" onClick={() => handleTabChange('projects')} />
                    </div>

                    <ZCard className="p-4">
                      <ZSectionHeader title="Recent Products" className="mb-4" />
                      {products.length === 0 ? (
                        <ZEmptyState title="No products yet" description="Create your first climate-positive product." size="sm" />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {products.slice(0, 4).map((product) => (
                            <ProductCard key={product.id} product={product} onNavigate={() => router.push(`/zora-shop/products/${product.id}`)} />
                          ))}
                        </div>
                      )}
                    </ZCard>

                    <ZCard className="p-4">
                      <ZSectionHeader title="Active Projects" className="mb-4" />
                      {projects.length === 0 ? (
                        <ZEmptyState title="No projects yet" description="Start a brand mashup project." size="sm" />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.filter((p) => !['archived', 'launched'].includes(p.status)).slice(0, 4).map((project) => (
                            <ProjectCard key={project.id} project={project} />
                          ))}
                        </div>
                      )}
                    </ZCard>
                  </>
                )}

                {activeTab === 'brands' && (
                  <ZCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <ZSectionHeader title="Brands" />
                      {hasShopAccess && <ZButton variant="primary" size="sm">+ New Brand</ZButton>}
                    </div>
                    {brands.length === 0 ? (
                      <ZEmptyState title="No brands yet" description="Register your first climate-aligned brand." action={hasShopAccess ? { label: 'Add Brand', onClick: () => {} } : undefined} />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brands.map((brand) => (
                          <BrandCard
                            key={brand.id}
                            brand={brand}
                            isSelected={selectedBrand?.id === brand.id}
                            onSelect={() => setSelectedBrand(brand)}
                            onNavigate={() => router.push(`/zora-shop/brands/${brand.id}`)}
                          />
                        ))}
                      </div>
                    )}
                  </ZCard>
                )}

                {activeTab === 'products' && (
                  <ZCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <ZSectionHeader title={selectedBrand ? `${selectedBrand.name} Products` : 'All Products'} />
                      {hasShopAccess && selectedBrand && (
                        <ZButton variant="primary" size="sm" onClick={() => setShowCreateProduct(true)}>+ New Product</ZButton>
                      )}
                    </div>
                    {showCreateProduct && selectedBrand && (
                      <div className="mb-4">
                        <CreateProductForm brandId={selectedBrand.id} onSubmit={handleCreateProduct} onCancel={() => setShowCreateProduct(false)} />
                      </div>
                    )}
                    {brandProducts.length === 0 ? (
                      <ZEmptyState
                        title="No products yet"
                        description={selectedBrand ? `No products for ${selectedBrand.name}.` : 'Create your first product.'}
                        action={hasShopAccess && selectedBrand ? { label: 'Create Product', onClick: () => setShowCreateProduct(true) } : undefined}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brandProducts.map((product) => (
                          <ProductCard key={product.id} product={product} onNavigate={() => router.push(`/zora-shop/products/${product.id}`)} />
                        ))}
                      </div>
                    )}
                  </ZCard>
                )}

                {activeTab === 'materials' && (
                  <ZCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <ZSectionHeader title="Sustainable Materials" />
                      <div className="flex items-center gap-2">
                        <ZBadge variant="success" size="sm">{renewableMaterials} renewable</ZBadge>
                      </div>
                    </div>
                    {materials.length === 0 ? (
                      <ZEmptyState title="No materials yet" description="Add sustainable materials to your catalog." />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {materials.map((material) => (
                          <MaterialCard key={material.id} material={material} />
                        ))}
                      </div>
                    )}
                  </ZCard>
                )}

                {activeTab === 'projects' && (
                  <ZCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <ZSectionHeader title="Mashup Projects" />
                      {hasShopAccess && <ZButton variant="primary" size="sm">+ New Project</ZButton>}
                    </div>
                    {projects.length === 0 ? (
                      <ZEmptyState title="No projects yet" description="Start a brand mashup collaboration." action={hasShopAccess ? { label: 'Create Project', onClick: () => {} } : undefined} />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projects.map((project) => (
                          <ProjectCard key={project.id} project={project} />
                        ))}
                      </div>
                    )}
                  </ZCard>
                )}
              </div>

              <div className="space-y-6">
                <AgentPanel
                  context="shop"
                  profileId={selectedBrand?.id}
                  title="Ask FREYA"
                  description="Nordic agent for brands and products"
                  onSuggestionSelect={handleSuggestionSelect}
                />

                <ZCard className="p-4">
                  <ZSectionHeader title="Quick Actions" className="mb-3" />
                  <div className="space-y-2">
                    <ZButton variant="secondary" className="w-full justify-start" href="/climate">Climate OS</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/foundation">Support Projects</ZButton>
                    <ZButton variant="secondary" className="w-full justify-start" href="/simulation">Run Simulation</ZButton>
                  </div>
                </ZCard>

                {selectedBrand && (
                  <ZCard className="p-4">
                    <ZSectionHeader title="Selected Brand" className="mb-3" />
                    <div className="flex items-center gap-3 mb-3">
                      {selectedBrand.logo_url ? (
                        <img src={selectedBrand.logo_url} alt={selectedBrand.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[var(--z-accent)]/20 flex items-center justify-center">
                          <span className="text-[var(--z-accent)] font-bold text-lg">{selectedBrand.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-[var(--z-text-primary)]">{selectedBrand.name}</h3>
                        {selectedBrand.sector && <ZBadge variant="success" size="sm">{selectedBrand.sector}</ZBadge>}
                      </div>
                    </div>
                    <ZButton variant="primary" size="sm" className="w-full" onClick={() => router.push(`/zora-shop/brands/${selectedBrand.id}`)}>
                      View Brand Details
                    </ZButton>
                  </ZCard>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function ZoraShopPage() {
  return (
    <Suspense fallback={<ZLoadingState message="Loading Shop OS..." />}>
      <ZoraShopPageContent />
    </Suspense>
  );
}
