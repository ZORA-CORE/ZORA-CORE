'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useFeatureAccess } from '@/lib/BillingContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import { api } from '@/lib/api';
import type {
  AgentPanelSuggestion,
  Brand,
  Product,
  ShopMaterial,
  ZoraShopProjectWithBrands,
  FoundationProject,
} from '@/lib/types';

type TabType = 'overview' | 'brands' | 'products' | 'materials' | 'projects';

function KPICard({
  value,
  label,
  color = 'text-[var(--foreground)]',
  onClick,
}: {
  value: number | string;
  label: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      variant="bordered"
      padding="md"
      className={`text-center ${onClick ? 'cursor-pointer hover:border-amber-500/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--foreground)]/50">{label}</div>
    </Card>
  );
}

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
          <div>
            <h3 className="font-medium text-[var(--foreground)]">{brand.name}</h3>
            {brand.country && (
              <span className="text-xs text-[var(--foreground)]/50">{brand.country}</span>
            )}
          </div>
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
      <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          View Details -&gt;
        </button>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onNavigate,
}: {
  product: Product;
  onNavigate: () => void;
}) {
  const getClimateLabel = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { label: 'climate-positive', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (score >= 50) return { label: 'climate-neutral', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { label: 'low-impact', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const climateInfo = getClimateLabel(product.climate_score);

  return (
    <div
      onClick={onNavigate}
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

function ProjectCard({
  project,
}: {
  project: ZoraShopProjectWithBrands;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idea': return 'bg-gray-500/20 text-gray-400';
      case 'brief': return 'bg-blue-500/20 text-blue-400';
      case 'concept': return 'bg-purple-500/20 text-purple-400';
      case 'review': return 'bg-amber-500/20 text-amber-400';
      case 'launched': return 'bg-emerald-500/20 text-emerald-400';
      case 'archived': return 'bg-gray-500/20 text-gray-500';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-amber-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[var(--foreground)]">{project.title}</h3>
        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
      </div>
      {project.description && (
        <p className="text-sm text-[var(--foreground)]/60 mb-3 line-clamp-2">
          {project.description}
        </p>
      )}
      <div className="flex items-center gap-2 mb-2">
        {project.primary_brand && (
          <div className="flex items-center gap-2">
            {project.primary_brand.logo_url ? (
              <img
                src={project.primary_brand.logo_url}
                alt={project.primary_brand.name}
                className="w-6 h-6 rounded object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 text-xs font-bold">
                  {project.primary_brand.name.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-sm text-[var(--foreground)]">{project.primary_brand.name}</span>
          </div>
        )}
        {project.secondary_brand && (
          <>
            <span className="text-[var(--foreground)]/40">x</span>
            <div className="flex items-center gap-2">
              {project.secondary_brand.logo_url ? (
                <img
                  src={project.secondary_brand.logo_url}
                  alt={project.secondary_brand.name}
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-400 text-xs font-bold">
                    {project.secondary_brand.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-sm text-[var(--foreground)]">{project.secondary_brand.name}</span>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[var(--card-border)]">
        {project.theme && (
          <span className="text-purple-400">Theme: {project.theme}</span>
        )}
        {project.target_launch_date && (
          <span className="text-[var(--foreground)]/50">
            Target: {new Date(project.target_launch_date).toLocaleDateString()}
          </span>
        )}
      </div>
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

function OverviewPanel({
  brands,
  products,
  materials,
  projects,
  foundationProjects,
  onTabChange,
}: {
  brands: Brand[];
  products: Product[];
  materials: ShopMaterial[];
  projects: ZoraShopProjectWithBrands[];
  foundationProjects: FoundationProject[];
  onTabChange: (tab: TabType) => void;
}) {
  const verifiedBrands = brands.filter((b) => b.sector).length;
  const climatePositiveProducts = products.filter(
    (p) => p.climate_score !== null && p.climate_score >= 80
  ).length;
  const renewableMaterials = materials.filter((m) => m.is_renewable).length;
  const activeProjects = projects.filter((p) => !['archived', 'launched'].includes(p.status)).length;
  const launchedProjects = projects.filter((p) => p.status === 'launched').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          value={brands.length}
          label="Total Brands"
          onClick={() => onTabChange('brands')}
        />
        <KPICard
          value={verifiedBrands}
          label="Verified Brands"
          color="text-emerald-400"
          onClick={() => onTabChange('brands')}
        />
        <KPICard
          value={products.length}
          label="Total Products"
          color="text-amber-400"
          onClick={() => onTabChange('products')}
        />
        <KPICard
          value={climatePositiveProducts}
          label="Climate+ Products"
          color="text-green-400"
          onClick={() => onTabChange('products')}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          value={materials.length}
          label="Materials"
          onClick={() => onTabChange('materials')}
        />
        <KPICard
          value={renewableMaterials}
          label="Renewable Materials"
          color="text-green-400"
          onClick={() => onTabChange('materials')}
        />
        <KPICard
          value={activeProjects}
          label="Active Capsules"
          color="text-purple-400"
          onClick={() => onTabChange('projects')}
        />
        <KPICard
          value={launchedProjects}
          label="Launched Drops"
          color="text-emerald-400"
          onClick={() => onTabChange('projects')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="bordered" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Active Capsules</h3>
            <button
              onClick={() => onTabChange('projects')}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              View All -&gt;
            </button>
          </div>
          {projects.filter((p) => !['archived', 'launched'].includes(p.status)).length === 0 ? (
            <div className="text-center py-6 text-[var(--foreground)]/50">
              <p>No active capsules yet.</p>
              <p className="text-sm mt-1">Create a cross-brand project to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects
                .filter((p) => !['archived', 'launched'].includes(p.status))
                .slice(0, 3)
                .map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
            </div>
          )}
        </Card>

        <Card variant="bordered" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Climate & Impact</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--foreground)]">Climate-Positive Products</span>
                <span className="text-lg font-bold text-emerald-400">{climatePositiveProducts}</span>
              </div>
              <div className="w-full bg-[var(--background)] rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${products.length > 0 ? (climatePositiveProducts / products.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-[var(--foreground)]/50 mt-2">
                {products.length > 0
                  ? `${Math.round((climatePositiveProducts / products.length) * 100)}% of products are climate-positive`
                  : 'Add products to track climate impact'}
              </p>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--foreground)]">Renewable Materials</span>
                <span className="text-lg font-bold text-green-400">{renewableMaterials}</span>
              </div>
              <div className="w-full bg-[var(--background)] rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${materials.length > 0 ? (renewableMaterials / materials.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-[var(--foreground)]/50 mt-2">
                {materials.length > 0
                  ? `${Math.round((renewableMaterials / materials.length) * 100)}% of materials are renewable`
                  : 'Add materials to track sustainability'}
              </p>
            </div>

            {foundationProjects.length > 0 && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--foreground)]">Foundation Projects</span>
                  <span className="text-lg font-bold text-purple-400">{foundationProjects.length}</span>
                </div>
                <p className="text-xs text-[var(--foreground)]/50">
                  {foundationProjects.filter((p) => p.status === 'active').length} active projects linked to SHOP brands
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ShopUpgradeBanner({ 
  planName, 
  upgradePath, 
  currentCount, 
  limit 
}: { 
  planName: string; 
  upgradePath: string | null;
  currentCount: number;
  limit: number | null;
}) {
  if (limit === null || limit === -1 || currentCount < limit) return null;
  
  return (
    <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-amber-200">
            <strong>Project Limit Reached:</strong> You&apos;ve used {currentCount} of {limit} SHOP projects on your <strong>{planName}</strong> plan.
          </p>
          {upgradePath && (
            <Link 
              href={`/billing/plans?highlight=${upgradePath}`}
              className="inline-block mt-2 text-sm text-amber-400 hover:text-amber-300 underline"
            >
              Upgrade to create more projects
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ZoraShopPageContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const shopProjectsAccess = useFeatureAccess('max_zora_shop_projects');
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<ShopMaterial[]>([]);
  const [projects, setProjects] = useState<ZoraShopProjectWithBrands[]>([]);
  const [foundationProjects, setFoundationProjects] = useState<FoundationProject[]>([]);
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
      const [brandsRes, productsRes, materialsRes, projectsRes, foundationRes] = await Promise.all([
        api.getBrands(),
        api.getProducts(),
        api.getMaterials(),
        api.getZoraShopProjects(),
        api.getFoundationProjects().catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);
      setBrands(brandsRes.data || []);
      setProducts(productsRes.data || []);
      setMaterials(materialsRes.data || []);
      setProjects(projectsRes.data || []);
      setFoundationProjects(foundationRes.data || []);
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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/zora-shop?tab=${tab}`, { scroll: false });
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

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'brands', label: 'Brands', count: brands.length },
    { id: 'products', label: 'Products', count: products.length },
    { id: 'materials', label: 'Materials', count: materials.length },
    { id: 'projects', label: 'Capsules', count: projects.length },
  ];

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

          <ShopUpgradeBanner
            planName={shopProjectsAccess.planName}
            upgradePath={shopProjectsAccess.upgradePath}
            currentCount={projects.length}
            limit={typeof shopProjectsAccess.limit === 'number' ? shopProjectsAccess.limit : null}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default" padding="md">
                <div className="flex items-center gap-2 mb-4 border-b border-[var(--card-border)] pb-4 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-[var(--background)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]'
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && ` (${tab.count})`}
                    </button>
                  ))}
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    {activeTab === 'overview' && (
                      <OverviewPanel
                        brands={brands}
                        products={products}
                        materials={materials}
                        projects={projects}
                        foundationProjects={foundationProjects}
                        onTabChange={handleTabChange}
                      />
                    )}

                    {activeTab === 'brands' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {brands.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No brands registered yet.</p>
                            <p className="text-sm mt-1">
                              Ask BALDUR for sustainable brand recommendations.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => router.push('/admin/brands')}
                            >
                              + Add Brand
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          {products.length === 0 ? (
                            <div className="text-center py-8 text-[var(--foreground)]/50">
                              <p>No products in the shop yet.</p>
                              <p className="text-sm mt-1">
                                {selectedBrand
                                  ? 'Create a product or ask BALDUR for suggestions.'
                                  : 'Select a brand to view products.'}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => setShowCreateProduct(true)}
                                disabled={!selectedBrand}
                              >
                                + Add Product
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(selectedBrand ? brandProducts : products).map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                  onNavigate={() => router.push(`/zora-shop/products/${product.id}`)}
                                />
                              ))}
                            </div>
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => router.push('/admin/materials')}
                            >
                              + Add Material
                            </Button>
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

                    {activeTab === 'projects' && (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {projects.length === 0 ? (
                          <div className="text-center py-8 text-[var(--foreground)]/50">
                            <p>No capsules or cross-brand projects yet.</p>
                            <p className="text-sm mt-1">
                              Create a capsule to start a climate-focused brand collaboration.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => router.push('/admin/projects')}
                            >
                              + Create Capsule
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {projects.map((project) => (
                              <ProjectCard key={project.id} project={project} />
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground)]/60">Active Capsules</span>
                    <span className="font-medium text-purple-400">
                      {projects.filter((p) => !['archived', 'launched'].includes(p.status)).length}
                    </span>
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

export default function ZoraShopPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </AppShell>
    }>
      <ZoraShopPageContent />
    </Suspense>
  );
}
