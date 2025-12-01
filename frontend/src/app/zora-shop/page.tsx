'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

export default function ZoraShopPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
              {t.cards.zoraShop.title}
            </h1>
            <p className="text-[var(--foreground)]/60">
              {t.cards.zoraShop.description}
            </p>
          </div>

          <Card variant="default" padding="lg" className="text-center">
            <div className="py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                {t.placeholder.comingSoon}
              </h2>
              
              <p className="text-[var(--foreground)]/60 mb-2 max-w-md mx-auto">
                {t.placeholder.underConstruction}
              </p>
              
              <p className="text-[var(--foreground)]/40 text-sm mb-8 max-w-md mx-auto">
                ZORA SHOP is a climate-first marketplace for sustainable products and brand mashups. 
                Discover climate-positive products, track their environmental impact, and support 
                brands committed to real climate action.
              </p>

              <div className="flex gap-4 justify-center">
                <Button href="/dashboard" variant="outline">
                  Back to Desk
                </Button>
                <Button href="/mashups" variant="primary">
                  View Public Mashups
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
