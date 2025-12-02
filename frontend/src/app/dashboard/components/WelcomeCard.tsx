'use client';

import { Card } from '@/components/ui/Card';
import type { AuthUser } from '@/lib/auth';

interface WelcomeCardProps {
  user: AuthUser | null;
}

export function WelcomeCard({ user }: WelcomeCardProps) {
  const greeting = getGreeting();
  const displayName = user?.display_name || 'Climate Champion';

  return (
    <Card variant="default" padding="lg" className="col-span-full bg-gradient-to-r from-[var(--card-bg)] to-[var(--background)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            {greeting}, {displayName}
          </h1>
          <p className="mt-2 text-[var(--foreground)]/60 max-w-2xl">
            Your Nordic Climate OS overview. Track your climate impact, energy journey, and sustainability progress all in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-[var(--foreground)]/50 uppercase tracking-wider">Role</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {formatRole(user?.role)}
            </p>
          </div>
        </div>
      </div>
    </Card>
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

export default WelcomeCard;
