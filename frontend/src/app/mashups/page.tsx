'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProducts, ZoraApiError } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function MashupsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await getProducts({ status: 'active' });
        setProducts(response.data);
      } catch (err) {
        if (err instanceof ZoraApiError) {
          if (err.status === 401) {
            setError('Please log in to view mashup products.');
          } else {
            setError(`Failed to load products: ${err.message}`);
          }
        } else {
          setError('Failed to load products. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Climate-First Mashup Shop
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover unique cross-brand collaborations that are climate-neutral or climate-positive.
            Every product tells a story of sustainable innovation.
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto bg-red-900/50 border border-red-500 rounded-lg p-6 text-center">
            <p className="text-red-200">{error}</p>
            <Link href="/login" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
              Go to Login
            </Link>
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-800/50 rounded-lg p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
              <p className="text-gray-400">
                Our first climate-focused mashup products are being crafted.
                Check back soon for unique cross-brand collaborations.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                {product.primary_image_url ? (
                  <div className="aspect-square bg-gray-700">
                    <img
                      src={product.primary_image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-blue-600 to-green-500 flex items-center justify-center">
                    <span className="text-6xl">🌱</span>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                    {product.climate_score !== null && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.climate_score >= 80 ? 'bg-green-500/20 text-green-400' :
                        product.climate_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        Score: {product.climate_score}
                      </span>
                    )}
                  </div>

                  {product.short_description && (
                    <p className="text-gray-400 text-sm mb-4">{product.short_description}</p>
                  )}

                  {product.product_brands && product.product_brands.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Collaboration by:</p>
                      <div className="flex flex-wrap gap-2">
                        {product.product_brands.map((pb) => (
                          <span
                            key={pb.id}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full"
                          >
                            {pb.brand?.name || 'Partner Brand'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.estimated_impact_kgco2 !== null && (
                    <div className="flex items-center text-sm text-gray-400">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>
                        {product.estimated_impact_kgco2 < 0
                          ? `Saves ${Math.abs(product.estimated_impact_kgco2)} kg CO2`
                          : `${product.estimated_impact_kgco2} kg CO2 footprint`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="bg-gray-800/50 rounded-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">
              What Makes Our Products Different
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-green-400 text-2xl mb-2">🌍</div>
                <h3 className="text-white font-medium mb-1">Climate-First</h3>
                <p className="text-gray-400 text-sm">
                  Every product is designed with climate impact as the primary consideration.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">🤝</div>
                <h3 className="text-white font-medium mb-1">Cross-Brand</h3>
                <p className="text-gray-400 text-sm">
                  Unique collaborations between brands committed to sustainability.
                </p>
              </div>
              <div>
                <div className="text-purple-400 text-2xl mb-2">📊</div>
                <h3 className="text-white font-medium mb-1">Transparent</h3>
                <p className="text-gray-400 text-sm">
                  Clear climate scores and impact estimates for every product.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
