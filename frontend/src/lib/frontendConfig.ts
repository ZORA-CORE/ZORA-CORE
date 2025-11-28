/**
 * Centralized default configurations for frontend pages.
 * 
 * This file provides canonical defaults for all page configurations.
 * Import these constants instead of defining local defaults to prevent
 * configuration drift between different parts of the application.
 * 
 * When adding new required fields to any PageConfig type in types.ts,
 * update the corresponding default here to maintain type safety.
 */

import type {
  HomePageConfig,
  ClimatePageConfig,
  DashboardPageConfig,
  AgentsPageConfig,
  JournalPageConfig,
  MashupsPageConfig,
  LoginPageConfig,
} from './types';

/**
 * Default configuration for the home page (/).
 * Includes all section toggles added in Iteration 0018 redesign.
 */
export const DEFAULT_HOME_PAGE_CONFIG: HomePageConfig = {
  hero_title: 'ZORA CORE',
  hero_subtitle: 'The AI Operating System for Climate Action',
  primary_cta_label: 'Explore Mashups',
  primary_cta_link: '/mashups',
  secondary_cta_label: 'Sign In',
  secondary_cta_link: '/login',
  show_climate_dashboard: true,
  show_missions_section: true,
  // Iteration 0018 redesign sections
  show_value_strip: true,
  show_for_whom_section: true,
  show_climate_os_section: true,
  show_agents_section: true,
  show_mashup_section: true,
  show_faq_section: true,
  faq_items: [
    {
      question: 'What is ZORA CORE?',
      answer: 'ZORA CORE is a multi-agent, climate-first AI Operating System. It combines 6 specialized AI agents to help individuals and organizations take meaningful climate action.',
    },
    {
      question: 'How does the Mashup Shop work?',
      answer: 'The Mashup Shop features climate-aligned cross-brand collaborations. Every product is climate-neutral or climate-positive, with transparent impact metrics.',
    },
    {
      question: 'What is Climate OS?',
      answer: 'Climate OS is your personal climate dashboard. Track your climate profile, complete missions, and see your real impact over time.',
    },
    {
      question: 'Is ZORA CORE free to use?',
      answer: 'The public Mashup Shop is free to browse. Climate OS and advanced features require an account.',
    },
  ],
};

/**
 * Default configuration for the Climate OS page (/climate).
 */
export const DEFAULT_CLIMATE_PAGE_CONFIG: ClimatePageConfig = {
  hero_title: 'Climate OS',
  hero_subtitle: 'Track your climate impact and complete missions to reduce your footprint. Every action counts in the fight against climate change.',
  show_profile_section: true,
  show_dashboard_section: true,
  show_missions_section: true,
};

/**
 * Default configuration for the Dashboard page (/dashboard).
 */
export const DEFAULT_DASHBOARD_PAGE_CONFIG: DashboardPageConfig = {
  hero_title: 'Dashboard',
  hero_subtitle: 'Your climate command center. Track progress, manage missions, and coordinate with AI agents.',
  primary_cta_label: 'Open Climate OS',
  primary_cta_link: '/climate',
  show_stats_section: true,
  show_agents_section: true,
  show_recent_activity_section: true,
};

/**
 * Default configuration for the Agents page (/agents).
 */
export const DEFAULT_AGENTS_PAGE_CONFIG: AgentsPageConfig = {
  hero_title: 'ZORA Agents',
  hero_subtitle: 'Meet the 6 specialized AI agents that power ZORA CORE. Each agent has unique capabilities and memory.',
  show_memory_search: true,
  show_recent_memories: true,
};

/**
 * Default configuration for the Journal page (/journal).
 */
export const DEFAULT_JOURNAL_PAGE_CONFIG: JournalPageConfig = {
  hero_title: 'System Journal',
  hero_subtitle: 'A transparent log of all system events, decisions, and milestones.',
  entries_per_page: 20,
};

/**
 * Default configuration for the Mashups page (/mashups).
 */
export const DEFAULT_MASHUPS_PAGE_CONFIG: MashupsPageConfig = {
  hero_title: 'Mashup Shop',
  hero_subtitle: 'Climate-aligned cross-brand collaborations. Every product is climate-neutral or climate-positive.',
  show_brand_filter: true,
  show_climate_scores: true,
};

/**
 * Default configuration for the Login page (/login).
 */
export const DEFAULT_LOGIN_PAGE_CONFIG: LoginPageConfig = {
  hero_title: 'Welcome Back',
  hero_subtitle: 'Sign in to access your climate dashboard and personalized features.',
  show_admin_link: true,
  show_public_mashups_link: true,
};
