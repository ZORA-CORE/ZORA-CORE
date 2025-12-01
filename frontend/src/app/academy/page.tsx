'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

export default function AcademyPage() {
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
              {t.cards.academy.title}
            </h1>
            <p className="text-[var(--foreground)]/60">
              {t.cards.academy.description}
            </p>
          </div>

          <Card variant="default" padding="lg" className="text-center">
            <div className="py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                {t.placeholder.comingSoon}
              </h2>
              
              <p className="text-[var(--foreground)]/60 mb-2 max-w-md mx-auto">
                {t.placeholder.underConstruction}
              </p>
              
              <p className="text-[var(--foreground)]/40 text-sm mb-8 max-w-md mx-auto">
                Climate Academy provides structured learning paths, lessons, and topics to help you 
                understand climate science, sustainable practices, and how to take meaningful action. 
                Track your progress and earn certifications.
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
