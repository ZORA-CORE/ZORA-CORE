'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CommandPalette, Command, CommandCategory } from './CommandPalette';
import { useAuth } from '@/lib/AuthContext';

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPaletteContext() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPaletteContext must be used within CommandPaletteProvider');
  }
  return context;
}

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LeafIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const CpuChipIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const TerminalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const commands: Command[] = useMemo(() => {
    const navCommands: Command[] = [
      {
        id: 'nav-desk',
        label: 'Go to Desk',
        category: 'navigation',
        description: 'Your climate-first command center',
        icon: <HomeIcon />,
        action: () => navigateTo('/dashboard'),
      },
      {
        id: 'nav-climate',
        label: 'Go to Climate OS',
        category: 'navigation',
        description: 'Track your climate impact and missions',
        icon: <GlobeIcon />,
        action: () => navigateTo('/climate'),
      },
      {
        id: 'nav-goes-green',
        label: 'Go to GOES GREEN',
        category: 'navigation',
        description: 'Sustainable energy and green initiatives',
        icon: <LeafIcon />,
        action: () => navigateTo('/goes-green'),
      },
      {
        id: 'nav-shop',
        label: 'Go to ZORA SHOP',
        category: 'navigation',
        description: 'Climate-positive products and mashups',
        icon: <ShoppingBagIcon />,
        action: () => navigateTo('/zora-shop'),
      },
      {
        id: 'nav-foundation',
        label: 'Go to Foundation',
        category: 'navigation',
        description: 'Climate projects and contributions',
        icon: <HeartIcon />,
        action: () => navigateTo('/foundation'),
      },
      {
        id: 'nav-academy',
        label: 'Go to Academy',
        category: 'navigation',
        description: 'Learn about climate action',
        icon: <AcademicCapIcon />,
        action: () => navigateTo('/academy'),
      },
      {
        id: 'nav-agents',
        label: 'Go to Agents',
        category: 'navigation',
        description: 'View Nordic AI agents',
        icon: <CpuChipIcon />,
        action: () => navigateTo('/agents'),
      },
      {
        id: 'nav-dev-console',
        label: 'Open Dev/Agent Console',
        category: 'navigation',
        description: 'System stats, agent activity, and knowledge overview',
        icon: <TerminalIcon />,
        action: () => navigateTo('/agents/dev-console'),
      },
    ];

    const actionCommands: Command[] = [
      {
        id: 'action-create-mission',
        label: 'Create climate mission',
        category: 'action',
        description: 'Add a new climate mission to your profile',
        icon: <PlusIcon />,
        action: () => navigateTo('/climate?action=create-mission'),
      },
      {
        id: 'action-create-goes-green',
        label: 'Create GOES GREEN action',
        category: 'action',
        description: 'Add a new green energy action',
        icon: <LeafIcon />,
        action: () => navigateTo('/goes-green?action=create'),
      },
      {
        id: 'action-create-foundation',
        label: 'Create foundation project',
        category: 'action',
        description: 'Start a new foundation project',
        icon: <HeartIcon />,
        action: () => navigateTo('/foundation?action=create'),
      },
      {
        id: 'action-create-product',
        label: 'Create product (ZORA SHOP)',
        category: 'action',
        description: 'Add a new climate-positive product',
        icon: <ShoppingBagIcon />,
        action: () => navigateTo('/zora-shop?action=create'),
      },
      {
        id: 'action-weekly-plan',
        label: 'Open my weekly climate plan',
        category: 'action',
        description: 'View and manage your weekly climate goals',
        icon: <CalendarIcon />,
        action: () => navigateTo('/climate?view=weekly-plan'),
      },
    ];

    const agentCommands: Command[] = [
      {
        id: 'agent-odin',
        label: 'Ask ODIN about my climate strategy',
        category: 'agent',
        description: 'Get strategic climate insights from ODIN',
        icon: <SparklesIcon />,
        action: () => navigateTo('/academy?agent=odin&prompt=climate-strategy'),
      },
      {
        id: 'agent-freya',
        label: 'Ask FREYA for sustainable campaign ideas',
        category: 'agent',
        description: 'Get storytelling and growth suggestions',
        icon: <SparklesIcon />,
        action: () => navigateTo('/goes-green?agent=freya&prompt=campaign-ideas'),
      },
      {
        id: 'agent-thor',
        label: 'Ask THOR for technical/system status',
        category: 'agent',
        description: 'Get backend and infrastructure insights',
        icon: <CpuChipIcon />,
        action: () => navigateTo('/agents/dev-console?agent=thor'),
      },
      {
        id: 'agent-heimdall',
        label: 'Ask HEIMDALL for system health overview',
        category: 'agent',
        description: 'Get observability and monitoring insights',
        icon: <CpuChipIcon />,
        action: () => navigateTo('/agents/dev-console?agent=heimdall'),
      },
      {
        id: 'agent-baldur',
        label: 'Ask BALDUR for product design ideas',
        category: 'agent',
        description: 'Get UX and product suggestions',
        icon: <SparklesIcon />,
        action: () => navigateTo('/zora-shop?agent=baldur&prompt=product-ideas'),
      },
      {
        id: 'agent-tyr',
        label: 'Ask TYR for climate integrity check',
        category: 'agent',
        description: 'Verify climate claims and ethics',
        icon: <SparklesIcon />,
        action: () => navigateTo('/foundation?agent=tyr&prompt=integrity-check'),
      },
      {
        id: 'agent-eivor',
        label: 'Ask EIVOR about knowledge history',
        category: 'agent',
        description: 'Search memory and knowledge base',
        icon: <BookOpenIcon />,
        action: () => navigateTo('/agents/dev-console?agent=eivor'),
      },
    ];

    const adminCommands: Command[] = isAuthenticated ? [
      {
        id: 'nav-climate-cockpit',
        label: 'Open Climate Cockpit',
        category: 'navigation',
        description: 'Climate OS management dashboard',
        icon: <GlobeIcon />,
        action: () => navigateTo('/climate'),
      },
      {
        id: 'nav-goes-green-cockpit',
        label: 'Open GOES GREEN Cockpit',
        category: 'navigation',
        description: 'Green energy management dashboard',
        icon: <LeafIcon />,
        action: () => navigateTo('/goes-green'),
      },
      {
        id: 'nav-shop-cockpit',
        label: 'Open ZORA SHOP Cockpit',
        category: 'navigation',
        description: 'Shop management dashboard',
        icon: <ShoppingBagIcon />,
        action: () => navigateTo('/zora-shop'),
      },
      {
        id: 'nav-foundation-cockpit',
        label: 'Open Foundation Cockpit',
        category: 'navigation',
        description: 'Foundation management dashboard',
        icon: <HeartIcon />,
        action: () => navigateTo('/foundation'),
      },
      {
        id: 'nav-academy-cockpit',
        label: 'Open Academy Cockpit',
        category: 'navigation',
        description: 'Academy management dashboard',
        icon: <AcademicCapIcon />,
        action: () => navigateTo('/academy'),
      },
      {
        id: 'nav-odin-admin',
        label: 'Open ODIN / Knowledge Admin',
        category: 'navigation',
        description: 'Manage knowledge documents and web domains',
        icon: <BookOpenIcon />,
        action: () => navigateTo('/admin/odin'),
      },
    ] : [];

    return [...navCommands, ...actionCommands, ...agentCommands, ...adminCommands];
  }, [navigateTo, isAuthenticated]);

  const contextValue = useMemo(() => ({
    isOpen,
    open,
    close,
    toggle,
  }), [isOpen, open, close, toggle]);

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        commands={commands}
        isOpen={isOpen}
        onClose={close}
      />
    </CommandPaletteContext.Provider>
  );
}

export default CommandPaletteProvider;
