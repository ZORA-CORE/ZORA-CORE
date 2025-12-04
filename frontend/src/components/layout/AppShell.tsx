'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useBilling } from '@/lib/BillingContext';
import { useI18n, LanguageSwitcher } from '@/lib/I18nProvider';
import { t } from '@/lib/i18n';
import { VersionInfo } from '../VersionInfo';
import { ZBadge } from '../z';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  accent?: string;
  section?: string;
}

const DeskIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const ClimateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EnergyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ShopIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const FoundationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const AcademyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const SimulationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const AgentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const BillingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronIcon = ({ direction = 'down' }: { direction?: 'up' | 'down' | 'left' | 'right' }) => {
  const rotations = { up: 'rotate-180', down: '', left: 'rotate-90', right: '-rotate-90' };
  return (
    <svg className={`w-4 h-4 transition-transform ${rotations[direction]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
};

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CommandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const mainNavItems: NavItem[] = [
  { label: t.nav.desk, href: '/dashboard', icon: <DeskIcon />, accent: 'var(--z-emerald)', section: 'main' },
  { label: t.nav.climate, href: '/climate', icon: <ClimateIcon />, accent: 'var(--z-emerald)', section: 'climate' },
  { label: t.nav.goesGreen, href: '/goes-green', icon: <EnergyIcon />, accent: 'var(--z-green)', section: 'climate' },
  { label: t.nav.zoraShop, href: '/zora-shop', icon: <ShopIcon />, accent: 'var(--z-violet)', section: 'brand' },
  { label: t.nav.foundation, href: '/foundation', icon: <FoundationIcon />, accent: 'var(--z-rose)', section: 'brand' },
  { label: t.nav.academy, href: '/academy', icon: <AcademyIcon />, accent: 'var(--z-amber)', section: 'learn' },
  { label: 'Simulation', href: '/simulation', icon: <SimulationIcon />, accent: 'var(--z-sky)', section: 'learn' },
  { label: t.nav.agents, href: '/agents/dev-console', icon: <AgentsIcon />, accent: 'var(--z-violet)', section: 'system' },
];

const systemNavItems: NavItem[] = [
  { label: 'Billing', href: '/billing/plans', icon: <BillingIcon />, accent: 'var(--z-amber)' },
  { label: 'Settings', href: '/admin/setup', icon: <SettingsIcon />, accent: 'var(--z-text-tertiary)' },
];

interface AppShellProps {
  children: React.ReactNode;
}

function NavLink({ 
  item, 
  isActive, 
  collapsed,
  onClick 
}: { 
  item: NavItem; 
  isActive: boolean; 
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-[var(--z-radius-lg)] transition-all duration-200
        ${isActive
          ? 'bg-[var(--z-bg-elevated)] text-[var(--z-text-primary)]'
          : 'text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] hover:bg-[var(--z-bg-surface)]'
        }
      `}
      title={collapsed ? item.label : undefined}
    >
      <span 
        className={`flex-shrink-0 transition-colors ${isActive ? '' : 'group-hover:text-[var(--z-text-secondary)]'}`}
        style={{ color: isActive ? item.accent : undefined }}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <span className="text-[var(--z-text-sm)] font-medium">{item.label}</span>
      )}
      {isActive && !collapsed && (
        <span 
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: item.accent }}
        />
      )}
    </Link>
  );
}

function NavSection({ 
  title, 
  items, 
  pathname, 
  collapsed,
  onNavClick,
  defaultOpen = true 
}: { 
  title?: string; 
  items: NavItem[]; 
  pathname: string;
  collapsed?: boolean;
  onNavClick?: () => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <div className="space-y-1 px-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed}
            onClick={onNavClick}
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
          className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold text-[var(--z-text-muted)] uppercase tracking-wider hover:text-[var(--z-text-tertiary)] transition-colors"
        >
          {title}
          <span className={`transform transition-transform ${isOpen ? '' : '-rotate-90'}`}>
            <ChevronIcon />
          </span>
        </button>
      )}
      {(isOpen || !title) && (
        <div className="space-y-0.5 px-2">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
              onClick={onNavClick}
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuOpen && !(e.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  const closeMobileSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--zora-bg)]">
      <header className="sticky top-0 z-50 bg-[var(--zora-bg)]/95 backdrop-blur-md border-b border-[var(--z-border-default)]">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] rounded-[var(--z-radius-md)] hover:bg-[var(--z-bg-surface)] transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--z-emerald)' }}>ZORA</span>
              <span className="text-xl font-light text-[var(--z-text-primary)] tracking-tight">CORE</span>
            </Link>

            <div className="hidden md:flex items-center ml-4">
              <button 
                className="flex items-center gap-2 px-3 py-1.5 text-[var(--z-text-muted)] text-[var(--z-text-sm)] bg-[var(--z-bg-surface)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] hover:border-[var(--z-border-strong)] hover:text-[var(--z-text-tertiary)] transition-all"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                  document.dispatchEvent(event);
                }}
              >
                <CommandIcon />
                <span>Search...</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--z-bg-elevated)] rounded border border-[var(--z-border-subtle)]">
                  Cmd+K
                </kbd>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:flex" />
            
            <div className="user-menu-container relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-[var(--z-radius-md)] hover:bg-[var(--z-bg-surface)] text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--z-bg-elevated)] border border-[var(--z-border-default)] flex items-center justify-center">
                  <UserIcon />
                </div>
                <ChevronIcon direction={userMenuOpen ? 'up' : 'down'} />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 py-2 bg-[var(--z-bg-card)] border border-[var(--z-border-default)] rounded-[var(--z-radius-lg)] shadow-[var(--z-shadow-lg)] z-50">
                  {user && (
                    <>
                      <div className="px-4 py-3 border-b border-[var(--z-border-subtle)]">
                        <p className="text-[var(--z-text-sm)] font-medium text-[var(--z-text-primary)]">
                          {user.display_name || user.email}
                        </p>
                        <p className="text-[var(--z-text-xs)] text-[var(--z-text-muted)] mt-0.5">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <ZBadge variant="emerald" size="xs">{user.role}</ZBadge>
                        </div>
                      </div>
                      {currentPlan && (
                        <Link
                          href="/billing/plans"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-3 border-b border-[var(--z-border-subtle)] hover:bg-[var(--z-bg-surface)] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--z-text-xs)] text-[var(--z-text-muted)]">Current Plan</span>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusBadge().color}`}>
                              {getStatusBadge().label}
                            </span>
                          </div>
                          <p className="text-[var(--z-text-sm)] font-medium text-[var(--z-text-primary)] mt-1">
                            {getPlanDisplayName()}
                          </p>
                        </Link>
                      )}
                      <div className="py-1">
                        <Link
                          href="/billing/plans"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-[var(--z-text-sm)] text-[var(--z-text-secondary)] hover:bg-[var(--z-bg-surface)] hover:text-[var(--z-text-primary)] transition-colors"
                        >
                          Plans & Pricing
                        </Link>
                        <Link
                          href="/admin/setup"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-[var(--z-text-sm)] text-[var(--z-text-secondary)] hover:bg-[var(--z-bg-surface)] hover:text-[var(--z-text-primary)] transition-colors"
                        >
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-[var(--z-border-subtle)] pt-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 text-[var(--z-text-sm)] text-[var(--z-rose)] hover:bg-[var(--z-rose-soft)] transition-colors"
                        >
                          {t.nav.signOut}
                        </button>
                      </div>
                    </>
                  )}
                  {!user && (
                    <Link
                      href="/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-[var(--z-text-sm)] text-[var(--z-text-secondary)] hover:bg-[var(--z-bg-surface)] hover:text-[var(--z-text-primary)] transition-colors"
                    >
                      {t.nav.signIn}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
            fixed lg:sticky top-14 z-40 h-[calc(100vh-3.5rem)] 
            bg-[var(--zora-bg)] border-r border-[var(--z-border-default)]
            transition-all duration-300 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
          `}
        >
          <div className="flex flex-col h-full">
            <nav className="flex-1 overflow-y-auto py-4 space-y-6">
              <NavSection 
                items={mainNavItems.filter(i => i.section === 'main' || i.section === 'climate')} 
                pathname={pathname} 
                collapsed={sidebarCollapsed}
                onNavClick={closeMobileSidebar}
              />
              
              <div className="px-4">
                <div className="h-px bg-[var(--z-border-subtle)]" />
              </div>
              
              <NavSection 
                title={sidebarCollapsed ? undefined : "Brands & Impact"}
                items={mainNavItems.filter(i => i.section === 'brand')} 
                pathname={pathname}
                collapsed={sidebarCollapsed}
                onNavClick={closeMobileSidebar}
              />
              
              <NavSection 
                title={sidebarCollapsed ? undefined : "Learn & Explore"}
                items={mainNavItems.filter(i => i.section === 'learn')} 
                pathname={pathname}
                collapsed={sidebarCollapsed}
                onNavClick={closeMobileSidebar}
              />
              
              <NavSection 
                title={sidebarCollapsed ? undefined : "System"}
                items={[...mainNavItems.filter(i => i.section === 'system'), ...systemNavItems]} 
                pathname={pathname}
                collapsed={sidebarCollapsed}
                onNavClick={closeMobileSidebar}
                defaultOpen={pathname.startsWith('/admin') || pathname.startsWith('/agents') || pathname.startsWith('/billing')}
              />
            </nav>

            <div className="p-4 border-t border-[var(--z-border-subtle)]">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center w-full p-2 text-[var(--z-text-muted)] hover:text-[var(--z-text-tertiary)] rounded-[var(--z-radius-md)] hover:bg-[var(--z-bg-surface)] transition-colors"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              
              {!sidebarCollapsed && (
                <div className="mt-3">
                  <VersionInfo />
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
