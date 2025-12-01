'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

export default function FoundationPage() {
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
              {t.cards.foundation.title}
            </h1>
            <p className="text-[var(--foreground)]/60">
              {t.cards.foundation.description}
            </p>
          </div>

          <Card variant="default" padding="lg" className="text-center">
            <div className="py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                {t.placeholder.comingSoon}
              </h2>
              
              <p className="text-[var(--foreground)]/60 mb-2 max-w-md mx-auto">
                {t.placeholder.underConstruction}
              </p>
              
              <p className="text-[var(--foreground)]/40 text-sm mb-8 max-w-md mx-auto">
                THE ZORA FOUNDATION supports climate projects and initiatives around the world. 
                Track contributions, monitor project impact, and see how your support translates 
                into real environmental outcomes like CO2 reduction, trees planted, and clean energy generated.
              </p>

              <Button href="/dashboard" variant="outline">
                Back to Desk
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
