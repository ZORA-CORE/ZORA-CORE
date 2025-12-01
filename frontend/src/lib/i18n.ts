/**
 * ZORA CORE i18n - Centralized user-facing copy
 * 
 * This module centralizes all user-facing strings to make future
 * internationalization easier. For now, all strings are in English.
 * 
 * Usage:
 *   import { t } from '@/lib/i18n';
 *   <h1>{t.nav.desk}</h1>
 */

export const translations = {
  // Brand
  brand: {
    name: 'ZORA CORE',
    tagline: 'Climate-first AI Operating System',
    description: 'A multi-agent, climate-first AI Operating System. Building honest, transparent tools for real climate action.',
  },

  // Navigation
  nav: {
    desk: 'Desk',
    climate: 'Climate OS',
    goesGreen: 'GOES GREEN',
    zoraShop: 'ZORA SHOP',
    academy: 'Academy',
    foundation: 'Foundation',
    agents: 'Agents',
    journal: 'Journal',
    mashups: 'Mashups',
    admin: 'Admin',
    adminSetup: 'Setup',
    adminFrontend: 'Frontend Config',
    adminAutonomy: 'Autonomy',
    adminConsole: 'Agent Console',
    signIn: 'Sign In',
    signOut: 'Sign Out',
  },

  // Desk (Dashboard)
  desk: {
    title: 'ZORA Desk',
    subtitle: 'Your climate-first command center',
    welcomeBack: 'Welcome back',
    overview: 'Overview',
    quickActions: 'Quick Actions',
  },

  // Module Cards
  cards: {
    climate: {
      title: 'Climate OS',
      description: 'Track your climate impact and missions',
      profiles: 'Profiles',
      missions: 'Missions',
      inProgress: 'In Progress',
      completed: 'Completed',
      co2Impact: 'CO2 Impact',
      viewClimate: 'View Climate OS',
    },
    goesGreen: {
      title: 'GOES GREEN',
      description: 'Sustainable energy and green initiatives',
      profiles: 'Green Profiles',
      energySavings: 'Energy Savings',
      greenShare: 'Green Share',
      viewGoesGreen: 'View GOES GREEN',
    },
    zoraShop: {
      title: 'ZORA SHOP',
      description: 'Climate-positive products and mashups',
      brands: 'Brands',
      products: 'Products',
      activeProjects: 'Active Projects',
      viewShop: 'View ZORA SHOP',
    },
    foundation: {
      title: 'THE ZORA FOUNDATION',
      description: 'Climate projects and contributions',
      projects: 'Projects',
      contributions: 'Contributions',
      impact: 'Total Impact',
      viewFoundation: 'View Foundation',
    },
    academy: {
      title: 'Climate Academy',
      description: 'Learn about climate action',
      topics: 'Topics',
      lessons: 'Lessons',
      learningPaths: 'Learning Paths',
      viewAcademy: 'View Academy',
    },
    agents: {
      title: 'Agents & Autonomy',
      description: 'AI agents working for climate',
      commands: 'Commands',
      pendingTasks: 'Pending Tasks',
      completedTasks: 'Completed',
      failedTasks: 'Failed',
      activeSchedules: 'Active Schedules',
      pendingApproval: 'Pending Approval',
      viewAgents: 'View Agents',
      openConsole: 'Agent Console',
    },
  },

  // Placeholder pages
  placeholder: {
    comingSoon: 'Coming Soon',
    underConstruction: 'This module is under construction.',
    checkBackLater: 'Check back later for updates.',
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    search: 'Search',
    filter: 'Filter',
    noData: 'No data available',
    total: 'Total',
    kg: 'kg',
    kgCO2: 'kg CO2',
  },

  // Footer
  footer: {
    product: 'Product',
    company: 'Company',
    about: 'About',
    copyright: 'ZORA CORE. Climate-first, always.',
  },
} as const;

export type Translations = typeof translations;

export const t = translations;

export default translations;
