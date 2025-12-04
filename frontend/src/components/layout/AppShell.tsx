'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useBilling } from '@/lib/BillingContext';
import { t } from '@/lib/i18n';
import { VersionInfo } from '../VersionInfo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LeafIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const CpuChipIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const mainNavItems: NavItem[] = [
  { label: t.nav.desk, href: '/dashboard', icon: <HomeIcon /> },
  { label: t.nav.climate, href: '/climate', icon: <GlobeIcon /> },
  { label: t.nav.goesGreen, href: '/goes-green', icon: <LeafIcon /> },
  { label: t.nav.zoraShop, href: '/zora-shop', icon: <ShoppingBagIcon /> },
  { label: t.nav.academy, href: '/academy', icon: <AcademicCapIcon /> },
  { label: t.nav.foundation, href: '/foundation', icon: <HeartIcon /> },
  { label: t.nav.agents, href: '/agents', icon: <CpuChipIcon /> },
];

const adminNavItems: NavItem[] = [
  { label: t.nav.adminSetup, href: '/admin/setup', icon: <CogIcon /> },
  { label: t.nav.adminFrontend, href: '/admin/frontend', icon: <CogIcon /> },
  { label: t.nav.adminAutonomy, href: '/admin/frontend/autonomy', icon: <CogIcon /> },
  { label: t.nav.adminConsole, href: '/admin/agents/console', icon: <CogIcon /> },
];

interface AppShellProps {
  children: React.ReactNode;
}

function NavLink({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
          : 'text-[var(--foreground)]/70 hover:bg-[var(--card-bg)] hover:text-[var(--foreground)]'
      }`}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );
}

function NavSection({ 
  title, 
  items, 
  pathname, 
  collapsed,
  defaultOpen = true 
}: { 
  title?: string; 
  items: NavItem[]; 
  pathname: string;
  collapsed?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {title && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-[var(--foreground)]/50 uppercase tracking-wider hover:text-[var(--foreground)]/70"
        >
          {title}
          <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
      )}
      {(isOpen || !title) && (
        <div className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { currentPlan, getPlanDisplayName, getStatusBadge } = useBilling();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close mobile sidebar when clicking a nav link (handled in NavLink onClick)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--card-border)]">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-[var(--foreground)]/70 hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-bg)]"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold text-[var(--primary)]">ZORA</span>
              <span className="text-xl font-light text-[var(--foreground)]">CORE</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--foreground)]/60">
                <span>{user.email}</span>
              </div>
            )}
            
            <div className="relative group">
              <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--card-bg)] text-[var(--foreground)]/70 hover:text-[var(--foreground)]">
                <UserIcon />
              </button>
              
              <div className="absolute right-0 mt-2 w-56 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {user && (
                  <>
                    <div className="px-4 py-2 border-b border-[var(--card-border)]">
                      <p className="text-sm font-medium text-[var(--foreground)]">{user.display_name || user.email}</p>
                      <p className="text-xs text-[var(--foreground)]/60">{user.role}</p>
                    </div>
                    {currentPlan && (
                      <Link
                        href="/billing/plans"
                        className="block px-4 py-2 border-b border-[var(--card-border)] hover:bg-[var(--card-border)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--foreground)]/60">Plan</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadge().color}`}>
                            {getStatusBadge().label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--foreground)] mt-1">{getPlanDisplayName()}</p>
                      </Link>
                    )}
                    <Link
                      href="/billing/plans"
                      className="block px-4 py-2 text-sm text-[var(--foreground)]/70 hover:bg-[var(--card-border)] hover:text-[var(--foreground)]"
                    >
                      Plans & Pricing
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--foreground)]/70 hover:bg-[var(--card-border)] hover:text-[var(--foreground)]"
                    >
                      {t.nav.signOut}
                    </button>
                  </>
                )}
                {!user && (
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-sm text-[var(--foreground)]/70 hover:bg-[var(--card-border)] hover:text-[var(--foreground)]"
                  >
                    {t.nav.signIn}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed lg:sticky top-14 z-40 h-[calc(100vh-3.5rem)] bg-[var(--background)] border-r border-[var(--card-border)] transition-all duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
        >
          <div className="flex flex-col h-full">
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              <NavSection items={mainNavItems} pathname={pathname} collapsed={sidebarCollapsed} />
              
              {isAuthenticated && (
                <NavSection 
                  title={sidebarCollapsed ? undefined : t.nav.admin} 
                  items={adminNavItems} 
                  pathname={pathname}
                  collapsed={sidebarCollapsed}
                  defaultOpen={pathname.startsWith('/admin')}
                />
              )}
            </nav>

            <div className="p-4 border-t border-[var(--card-border)]">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center w-full p-2 text-[var(--foreground)]/50 hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-bg)]"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              
              {!sidebarCollapsed && (
                <div className="mt-4">
                  <VersionInfo />
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
