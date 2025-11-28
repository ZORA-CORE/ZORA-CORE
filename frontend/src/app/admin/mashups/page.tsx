'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  ZoraApiError,
} from '@/lib/api';
import type {
  Brand,
  CreateBrandInput,
  Product,
  CreateProductInput,
  ProductStatus,
  BrandAssociation,
} from '@/lib/types';

type Tab = 'brands' | 'products';

export default function AdminMashupsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState<CreateBrandInput>({
    name: '',
    description: '',
    climate_tagline: '',
    sector: '',
    country: '',
    website_url: '',
    logo_url: '',
  });

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<CreateProductInput>({
    name: '',
    short_description: '',
    long_description: '',
    status: 'draft',
    climate_score: undefined,
    estimated_impact_kgco2: undefined,
    primary_image_url: '',
    brands: [],
  });
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const loadBrands = useCallback(async () => {
    try {
      const response = await getBrands();
      setBrands(response.data);
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(`Failed to load brands: ${err.message}`);
      }
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await getProducts();
      setProducts(response.data);
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(`Failed to load products: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadBrands(), loadProducts()]);
      setIsLoading(false);
    };
    loadData();
  }, [loadBrands, loadProducts]);

  const resetBrandForm = () => {
    setBrandForm({
      name: '',
      description: '',
      climate_tagline: '',
      sector: '',
      country: '',
      website_url: '',
      logo_url: '',
    });
    setEditingBrand(null);
    setShowBrandForm(false);
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      short_description: '',
      long_description: '',
      status: 'draft',
      climate_score: undefined,
      estimated_impact_kgco2: undefined,
      primary_image_url: '',
      brands: [],
    });
    setSelectedBrandIds([]);
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      await createBrand(brandForm);
      setSuccessMessage(`Brand "${brandForm.name}" created successfully.`);
      resetBrandForm();
      await loadBrands();
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to create brand.');
      }
    }
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    clearMessages();
    try {
      await updateBrand(editingBrand.id, brandForm);
      setSuccessMessage(`Brand "${brandForm.name}" updated successfully.`);
      resetBrandForm();
      await loadBrands();
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to update brand.');
      }
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete "${brand.name}"?`)) return;
    clearMessages();
    try {
      await deleteBrand(brand.id);
      setSuccessMessage(`Brand "${brand.name}" deleted successfully.`);
      await loadBrands();
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete brand.');
      }
    }
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      description: brand.description || '',
      climate_tagline: brand.climate_tagline || '',
      sector: brand.sector || '',
      country: brand.country || '',
      website_url: brand.website_url || '',
      logo_url: brand.logo_url || '',
    });
    setShowBrandForm(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const brandAssociations: BrandAssociation[] = selectedBrandIds.map(id => ({
      brand_id: id,
      role: 'collab',
    }));
    try {
      await createProduct({ ...productForm, brands: brandAssociations });
      setSuccessMessage(`Product "${productForm.name}" created successfully.`);
      resetProductForm();
      await loadProducts();
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to create product.');
      }
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    clearMessages();
    const brandAssociations: BrandAssociation[] = selectedBrandIds.map(id => ({
      brand_id: id,
      role: 'collab',
    }));
    try {
      await updateProduct(editingProduct.id, { ...productForm, brands: brandAssociations });
      setSuccessMessage(`Product "${productForm.name}" updated successfully.`);
      resetProductForm();
      await loadProducts();
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to update product.');
      }
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    clearMessages();
    try {
      await deleteProduct(product.id);
      setSuccessMessage(`Product "${product.name}" deleted successfully.`);
      await loadProducts();
    } catch (err) {
      if (err instanceof ZoraApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete product.');
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      short_description: product.short_description || '',
      long_description: product.long_description || '',
      status: product.status as ProductStatus,
      climate_score: product.climate_score || undefined,
      estimated_impact_kgco2: product.estimated_impact_kgco2 || undefined,
      primary_image_url: product.primary_image_url || '',
    });
    setSelectedBrandIds(product.product_brands?.map(pb => pb.brand_id) || []);
    setShowProductForm(true);
  };

  const toggleBrandSelection = (brandId: string) => {
    setSelectedBrandIds(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mashup Shop Admin</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage brands and climate-focused mashup products
            </p>
          </div>
          <Link href="/admin/setup" className="text-sm text-blue-600 hover:text-blue-500">
            Back to Admin Setup
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('brands')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'brands'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Brands ({brands.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products ({products.length})
            </button>
          </nav>
        </div>

        {activeTab === 'brands' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Brands</h2>
              <button
                onClick={() => { resetBrandForm(); setShowBrandForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Add Brand
              </button>
            </div>

            {showBrandForm && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingBrand ? 'Edit Brand' : 'Create New Brand'}
                </h3>
                <form onSubmit={editingBrand ? handleUpdateBrand : handleCreateBrand} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={brandForm.name}
                        onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                      <input
                        type="text"
                        value={brandForm.sector || ''}
                        onChange={(e) => setBrandForm({ ...brandForm, sector: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Fashion, Food, Tech"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={brandForm.country || ''}
                        onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Denmark"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={brandForm.website_url || ''}
                        onChange={(e) => setBrandForm({ ...brandForm, website_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Climate Tagline</label>
                    <input
                      type="text"
                      value={brandForm.climate_tagline || ''}
                      onChange={(e) => setBrandForm({ ...brandForm, climate_tagline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Carbon-neutral since 2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={brandForm.description || ''}
                      onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                      {editingBrand ? 'Update Brand' : 'Create Brand'}
                    </button>
                    <button type="button" onClick={resetBrandForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
              {brands.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No brands yet. Create your first brand to get started.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Climate Tagline</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {brands.map((brand) => (
                      <tr key={brand.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                          {brand.website_url && (
                            <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              {brand.website_url}
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brand.sector || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brand.country || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{brand.climate_tagline || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleEditBrand(brand)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                          <button onClick={() => handleDeleteBrand(brand)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Products</h2>
              <button
                onClick={() => { resetProductForm(); setShowProductForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Add Product
              </button>
            </div>

            {showProductForm && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProduct ? 'Edit Product' : 'Create New Product'}
                </h3>
                <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm({ ...productForm, status: e.target.value as ProductStatus })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Climate Score (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={productForm.climate_score || ''}
                        onChange={(e) => setProductForm({ ...productForm, climate_score: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 85"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Est. Impact (kg CO2)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={productForm.estimated_impact_kgco2 || ''}
                        onChange={(e) => setProductForm({ ...productForm, estimated_impact_kgco2: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., -5.2 (negative = reduction)"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                    <input
                      type="text"
                      value={productForm.short_description || ''}
                      onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Brief product description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Long Description</label>
                    <textarea
                      value={productForm.long_description || ''}
                      onChange={(e) => setProductForm({ ...productForm, long_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Image URL</label>
                    <input
                      type="url"
                      value={productForm.primary_image_url || ''}
                      onChange={(e) => setProductForm({ ...productForm, primary_image_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Associated Brands</label>
                    {brands.length === 0 ? (
                      <p className="text-sm text-gray-500">No brands available. Create brands first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {brands.map((brand) => (
                          <button
                            key={brand.id}
                            type="button"
                            onClick={() => toggleBrandSelection(brand.id)}
                            className={`px-3 py-1 rounded-full text-sm ${
                              selectedBrandIds.includes(brand.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {brand.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                    <button type="button" onClick={resetProductForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
              {products.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No products yet. Create your first mashup product to get started.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brands</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Climate Score</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.short_description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{product.short_description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' :
                            product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {product.product_brands?.map((pb) => (
                              <span key={pb.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                {pb.brand?.name || pb.brand_id}
                              </span>
                            )) || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.climate_score !== null ? `${product.climate_score}/100` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                          <button onClick={() => handleDeleteProduct(product)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/mashups" className="text-blue-600 hover:text-blue-500 text-sm">
            View Public Mashups Page
          </Link>
        </div>
      </div>
    </div>
  );
}
