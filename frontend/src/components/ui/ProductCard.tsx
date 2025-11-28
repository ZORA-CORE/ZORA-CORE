'use client';

import React from 'react';
import Link from 'next/link';

interface ProductBrand {
  id: string;
  role: string;
  brand: {
    id: string;
    name: string;
    slug: string | null;
    sector: string | null;
    country: string | null;
    climate_tagline: string | null;
  } | null;
}

interface ProductCardContentProps {
  name: string;
  shortDescription: string | null;
  primaryImageUrl: string | null;
  climateScore: number | null;
  estimatedImpactKgCo2: number | null;
  brands: Array<{
    id: string;
    name: string;
    slug: string | null;
    sector: string | null;
    country: string | null;
    climate_tagline: string | null;
  }>;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProductCardContent({
  name,
  shortDescription,
  primaryImageUrl,
  climateScore,
  estimatedImpactKgCo2,
  brands,
  showActions = false,
  onEdit,
  onDelete,
}: ProductCardContentProps) {
  return (
    <>
      <div className="aspect-[4/3] bg-[var(--card-border)] rounded-lg mb-4 overflow-hidden">
        {primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--foreground)]/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {brands.map((brand) => (
          <span
            key={brand.id}
            className="text-xs px-2 py-1 rounded-full bg-[var(--secondary)]/10 text-[var(--secondary)]"
          >
            {brand.name}
          </span>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 line-clamp-2">
        {name}
      </h3>

      {shortDescription && (
        <p className="text-sm text-[var(--foreground)]/60 mb-4 line-clamp-2">
          {shortDescription}
        </p>
      )}

      <div className="flex items-center gap-4 mt-auto pt-4 border-t border-[var(--card-border)]">
        {climateScore !== null && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--foreground)]/40">Score</span>
            <span className={`text-sm font-medium ${climateScore >= 70 ? 'text-[var(--primary)]' : climateScore >= 40 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
              {climateScore}
            </span>
          </div>
        )}
        {estimatedImpactKgCo2 !== null && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--foreground)]/40">Impact</span>
            <span className="text-sm font-medium text-[var(--foreground)]">
              {estimatedImpactKgCo2 > 0 ? '+' : ''}{estimatedImpactKgCo2} kg CO2
            </span>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4">
          {onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--card-bg)] transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </>
  );
}

interface ProductCardProps {
  name: string;
  shortDescription: string | null;
  primaryImageUrl: string | null;
  climateScore: number | null;
  estimatedImpactKgCo2: number | null;
  productBrands: ProductBrand[];
  href?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProductCard({
  name,
  shortDescription,
  primaryImageUrl,
  climateScore,
  estimatedImpactKgCo2,
  productBrands,
  href,
  showActions = false,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const brands = productBrands
    .map((pb) => pb.brand)
    .filter((b): b is NonNullable<typeof b> => b !== null);

  if (href) {
    return (
      <Link
        href={href}
        className="block p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]/50 transition-all hover:-translate-y-1"
      >
        <ProductCardContent
          name={name}
          shortDescription={shortDescription}
          primaryImageUrl={primaryImageUrl}
          climateScore={climateScore}
          estimatedImpactKgCo2={estimatedImpactKgCo2}
          brands={brands}
          showActions={showActions}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Link>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
      <ProductCardContent
        name={name}
        shortDescription={shortDescription}
        primaryImageUrl={primaryImageUrl}
        climateScore={climateScore}
        estimatedImpactKgCo2={estimatedImpactKgCo2}
        brands={brands}
        showActions={showActions}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export default ProductCard;
