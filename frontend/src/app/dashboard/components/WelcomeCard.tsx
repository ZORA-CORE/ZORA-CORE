'use client';

import Link from 'next/link';
import { ZCard } from '@/components/z';
import { ZTag } from '@/components/z';
import type { AuthUser } from '@/lib/auth';
import { useI18n } from '@/lib/I18nProvider';

interface WelcomeCardProps {
  user: AuthUser | null;
  isNewUser?: boolean;
}

export function WelcomeCard({ user, isNewUser = false }: WelcomeCardProps) {
  const { t } = useI18n();
  const greeting = getGreeting();
  const displayName = user?.display_name || 'Climate Champion';

  return (
    <ZCard variant="elevated" padding="lg" className="col-span-full bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--z-text-primary)]">
              {greeting}, {displayName}
            </h1>
            <ZTag variant="emerald" size="sm">Nordic Climate OS</ZTag>
          </div>
          <p className="text-[var(--z-text-tertiary)] max-w-2xl">
            {t('desk.subtitle', 'Your climate-first command center. Track your climate impact, energy journey, and sustainability progress all in one place.')}
          </p>
          
          {isNewUser && (
            <div className="mt-6 p-4 rounded-[var(--z-radius-lg)] bg-[var(--z-emerald-soft)] border border-[var(--z-emerald-border)]">
              <h3 className="text-sm font-semibold text-[var(--z-emerald)] mb-2">{t('desk.getStarted', 'Get Started')}</h3>
              <p className="text-xs text-[var(--z-text-secondary)] mb-3">{t('desk.getStartedDesc', 'Set up your climate profile and start making an impact')}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/climate" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--z-radius-md)] bg-[var(--z-emerald)] text-white hover:bg-[var(--z-emerald)]/90 transition-colors">
                  <GlobeIcon className="w-3.5 h-3.5" />
                  Climate Profile
                </Link>
                <Link href="/goes-green" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--z-radius-md)] bg-[var(--z-bg-elevated)] text-[var(--z-text-secondary)] border border-[var(--z-border-default)] hover:border-[var(--z-border-strong)] transition-colors">
                  <LeafIcon className="w-3.5 h-3.5" />
                  GOES GREEN
                </Link>
                <Link href="/zora-shop" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--z-radius-md)] bg-[var(--z-bg-elevated)] text-[var(--z-text-secondary)] border border-[var(--z-border-default)] hover:border-[var(--z-border-strong)] transition-colors">
                  <ShopIcon className="w-3.5 h-3.5" />
                  ZORA SHOP
                </Link>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-[var(--z-text-muted)] uppercase tracking-wider mb-1">Role</p>
            <ZTag variant={getRoleVariant(user?.role)} size="md">
              {formatRole(user?.role)}
            </ZTag>
          </div>
        </div>
      </div>
    </ZCard>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function ShopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRole(role?: string): string {
  if (!role) return 'Guest';
  switch (role) {
    case 'founder':
      return 'Founder';
    case 'brand_admin':
      return 'Brand Admin';
    case 'viewer':
      return 'Viewer';
    default:
      return role;
  }
}

function getRoleVariant(role?: string): 'violet' | 'emerald' | 'default' {
  switch (role) {
    case 'founder':
      return 'violet';
    case 'brand_admin':
      return 'emerald';
    default:
      return 'default';
  }
}

export default WelcomeCard;
