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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)] border border-[var(--z-border-default)]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--primary)] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--z-violet)] blur-3xl" />
      </div>
      
      {/* Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--z-emerald)] to-[var(--z-sky)]" />
      
      <div className="relative p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Left: Welcome Content */}
          <div className="flex-1 space-y-4">
            {/* Greeting */}
            <div className="space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--z-text-primary)] tracking-tight">
                  {greeting}, <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--z-emerald)] bg-clip-text text-transparent">{displayName}</span>
                </h1>
              </div>
              <p className="text-lg text-[var(--z-text-tertiary)] max-w-2xl leading-relaxed">
                {t('desk.subtitle', 'Your climate-first command center. Track your climate impact, energy journey, and sustainability progress all in one place.')}
              </p>
            </div>
            
            {/* Quick Stats Row */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--z-emerald)] animate-pulse" />
                <span className="text-sm text-[var(--z-text-secondary)]">System Online</span>
              </div>
              <div className="h-4 w-px bg-[var(--z-border-default)]" />
              <ZTag variant="emerald" size="md" className="font-semibold">Nordic Climate OS</ZTag>
            </div>
          </div>
          
          {/* Right: Role Badge */}
          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="px-5 py-3 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)]">
              <p className="text-[10px] text-[var(--z-text-muted)] uppercase tracking-[0.15em] mb-1.5">Your Role</p>
              <ZTag variant={getRoleVariant(user?.role)} size="md" className="font-bold text-base">
                {formatRole(user?.role)}
              </ZTag>
            </div>
          </div>
        </div>
        
        {/* New User Onboarding */}
        {isNewUser && (
          <div className="mt-8 p-6 rounded-2xl bg-[var(--z-emerald-soft)] border border-[var(--z-emerald-border)]">
            <h3 className="text-base font-bold text-[var(--z-emerald)] mb-2">{t('desk.getStarted', 'Get Started')}</h3>
            <p className="text-sm text-[var(--z-text-secondary)] mb-4">{t('desk.getStartedDesc', 'Set up your climate profile and start making an impact')}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/climate" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--z-emerald)] text-white hover:bg-[var(--z-emerald)]/90 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <GlobeIcon className="w-4 h-4" />
                Climate Profile
              </Link>
              <Link href="/goes-green" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--z-bg-elevated)] text-[var(--z-text-secondary)] border border-[var(--z-border-default)] hover:border-[var(--z-border-strong)] hover:text-[var(--z-text-primary)] transition-all hover:-translate-y-0.5">
                <LeafIcon className="w-4 h-4" />
                GOES GREEN
              </Link>
              <Link href="/zora-shop" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--z-bg-elevated)] text-[var(--z-text-secondary)] border border-[var(--z-border-default)] hover:border-[var(--z-border-strong)] hover:text-[var(--z-text-primary)] transition-all hover:-translate-y-0.5">
                <ShopIcon className="w-4 h-4" />
                ZORA SHOP
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
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
