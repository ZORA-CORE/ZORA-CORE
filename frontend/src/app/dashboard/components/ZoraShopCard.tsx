'use client';

import { ZCard, ZButton } from '@/components/z';
import { ShoppingBagIcon } from './icons';
import { useI18n } from '@/lib/I18nProvider';

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
  const { t } = useI18n();
  const hasActivity = stats.products_count > 0 || stats.brands_count > 0;

  return (
    <ZCard variant="default" padding="md" accent="violet" className="flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--z-violet-soft)]">
          <span className="text-[var(--z-violet)]"><ShoppingBagIcon /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{t('shop.title', 'ZORA SHOP')}</h3>
          <p className="text-sm text-[var(--z-text-tertiary)]">{t('shop.subtitle', 'Climate-positive products and mashups')}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
            <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('shop.brands', 'Brands')}</p>
            <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.brands_count}</p>
          </div>
          <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-md)] p-3 border border-[var(--z-border-subtle)]">
            <p className="text-xs text-[var(--z-text-muted)] mb-1">{t('shop.products', 'Products')}</p>
            <p className="text-xl font-bold text-[var(--z-text-primary)]">{stats.products_count}</p>
          </div>
        </div>

        <div className="bg-[var(--z-bg-base)] rounded-[var(--z-radius-lg)] p-4 border border-[var(--z-border-subtle)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[var(--z-text-tertiary)]">{t('shop.activeProjects', 'Active Projects')}</span>
            <span className="text-xl font-bold text-[var(--z-text-primary)]">{stats.active_projects_count}</span>
          </div>
          {stats.total_gmv > 0 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--z-border-subtle)]">
              <span className="text-sm text-[var(--z-text-tertiary)]">Total GMV</span>
              <span className="font-medium text-[var(--z-text-primary)]">${formatNumber(stats.total_gmv)}</span>
            </div>
          )}
        </div>

        {!hasActivity && (
          <div className="bg-[var(--z-violet-soft)] border border-[var(--z-violet-border)] rounded-[var(--z-radius-md)] p-3">
            <p className="text-sm text-[var(--z-text-secondary)]">
              Create climate-positive products and brand mashups. Start by adding your first brand.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--z-border-subtle)] flex gap-2">
        <ZButton href="/zora-shop" variant="primary" size="sm" className="flex-1">
          View Shop
        </ZButton>
        <ZButton href="/mashups" variant="outline" size="sm">
          Mashups
        </ZButton>
      </div>
    </ZCard>
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
