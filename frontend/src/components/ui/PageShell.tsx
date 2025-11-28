'use client';

import React from 'react';
import Link from 'next/link';
import { VersionInfo } from '../VersionInfo';

interface NavItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

const publicNavItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Mashups', href: '/mashups' },
];

const authNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', requiresAuth: true },
  { label: 'Climate OS', href: '/climate', requiresAuth: true },
  { label: 'Agents', href: '/agents', requiresAuth: true },
  { label: 'Journal', href: '/journal', requiresAuth: true },
];

interface PageShellProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  showNav?: boolean;
  className?: string;
}

export function PageShell({
  children,
  isAuthenticated = false,
  showNav = true,
  className = '',
}: PageShellProps) {
  const navItems = isAuthenticated
    ? [...publicNavItems, ...authNavItems]
    : publicNavItems;

  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {showNav && (
        <header className="sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--card-border)]">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-[var(--primary)]">ZORA</span>
                <span className="text-xl font-light text-[var(--foreground)]">CORE</span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <Link
                    href="/login"
                    className="text-sm px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>

              <div className="md:hidden">
                <button className="p-2 text-[var(--foreground)]/70">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </nav>
        </header>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="text-xl font-bold text-[var(--primary)]">ZORA</span>
                <span className="text-xl font-light text-[var(--foreground)]">CORE</span>
              </Link>
              <p className="text-sm text-[var(--foreground)]/60 max-w-md">
                A multi-agent, climate-first AI Operating System. Building honest, transparent tools for real climate action.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/mashups" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)]">Mashup Shop</Link></li>
                <li><Link href="/climate" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)]">Climate OS</Link></li>
                <li><Link href="/agents" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)]">Agents</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)]">About</Link></li>
                <li><Link href="/login" className="text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)]">Sign In</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[var(--card-border)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[var(--foreground)]/40">
              {new Date().getFullYear()} ZORA CORE. Climate-first, always.
            </p>
            <VersionInfo />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PageShell;
