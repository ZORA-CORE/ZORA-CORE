'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShoppingBagIcon } from './icons';

interface ShopStats {
  brands_count: number;
  products_count: number;
  active_projects_count: number;
  total_gmv: number;
}

interface ZoraShopCardProps {
  stats: ShopStats;
}

export function ZoraShopCard({ stats }: ZoraShopCardProps) {
  const hasActivity = stats.products_count > 0 || stats.brands_count > 0;

  return (
    <Card variant="default" padding="md" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500/10">
          <span className="text-indigo-500"><ShoppingBagIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Your Projects</h3>
          <p className="text-sm text-[var(--foreground)]/60">ZORA SHOP</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--foreground)]/50 mb-1">Brands</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{stats.brands_count}</p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-3">
            <p className="text-xs text-[var(--foreground)]/50 mb-1">Products</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{stats.products_count}</p>
          </div>
        </div>

        <div className="bg-[var(--background)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[var(--foreground)]/60">Active Projects</span>
            <span className="text-xl font-bold text-[var(--foreground)]">{stats.active_projects_count}</span>
          </div>
          {stats.total_gmv > 0 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--card-border)]">
              <span className="text-sm text-[var(--foreground)]/60">Total GMV</span>
              <span className="font-medium text-[var(--foreground)]">${formatNumber(stats.total_gmv)}</span>
            </div>
          )}
        </div>

        {!hasActivity && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
            <p className="text-sm text-[var(--foreground)]/70">
              Create climate-positive products and brand mashups. Start by adding your first brand.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex gap-2">
        <Button href="/zora-shop" variant="primary" size="sm" className="flex-1">
          View Shop
        </Button>
        <Button href="/mashups" variant="outline" size="sm">
          Mashups
        </Button>
      </div>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}

export default ZoraShopCard;
