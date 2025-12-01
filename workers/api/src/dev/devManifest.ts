/**
 * ZORA CORE Dev Knowledge & API Manifest v1.0
 * 
 * This module provides a machine-readable description of ZORA CORE's
 * modules, tables, and API endpoints. It serves as the foundation for
 * future agent-engineer capabilities where ZORA's agents (CONNOR, LUMINA,
 * EIVOR, ORACLE, AEGIS, SAM) can understand and reason about the system.
 * 
 * Iteration 00D3
 */

// ============================================================================
// TYPES
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type DevApiEndpoint = {
  method: HttpMethod;
  path: string;
  description: string;
  authRequired: boolean;
  roles?: string[];
  tags?: string[];
};

export type ModuleDomain = 
  | 'climate'
  | 'shop'
  | 'foundation'
  | 'academy'
  | 'energy'
  | 'autonomy'
  | 'billing'
  | 'organizations'
  | 'auth'
  | 'system'
  | 'other';

export type DevModuleManifest = {
  key: string;
  name: string;
  description: string;
  domain: ModuleDomain;
  coreTables: string[];
  apiEndpoints: DevApiEndpoint[];
};

export type DevManifest = {
  version: string;
  generatedAt: string;
  modules: DevModuleManifest[];
};

// ============================================================================
// MODULE DEFINITIONS
// ============================================================================

const CLIMATE_OS_MODULE: DevModuleManifest = {
  key: 'climate_os',
  name: 'Climate OS',
  description: 'Climate profiles, missions, impact estimates, weekly plans, and climate summaries. The core climate tracking and action system.',
  domain: 'climate',
  coreTables: ['climate_profiles', 'climate_missions', 'climate_plans', 'climate_plan_items', 'climate_summaries', 'climate_timeseries'],
  apiEndpoints: [
    { method: 'GET', path: '/api/climate/profiles', description: 'List climate profiles for the current tenant', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'climate_profiles'] },
    { method: 'POST', path: '/api/climate/profiles', description: 'Create a new climate profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'climate_profiles'] },
    { method: 'GET', path: '/api/climate/profiles/:id', description: 'Get a specific climate profile by ID', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'climate_profiles'] },
    { method: 'PUT', path: '/api/climate/profiles/:id', description: 'Update a climate profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['update', 'climate_profiles'] },
    { method: 'DELETE', path: '/api/climate/profiles/:id', description: 'Delete a climate profile', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['delete', 'climate_profiles'] },
    { method: 'GET', path: '/api/climate/profiles/:id/missions', description: 'List missions for a specific climate profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'climate_missions'] },
    { method: 'POST', path: '/api/climate/profiles/:id/missions', description: 'Create a mission for a climate profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'climate_missions'] },
    { method: 'GET', path: '/api/climate/profiles/:id/summary', description: 'Get climate summary for a profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'climate_summaries'] },
    { method: 'GET', path: '/api/climate/profiles/:id/timeseries', description: 'Get climate timeseries data for a profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'climate_timeseries'] },
    { method: 'POST', path: '/api/climate/profiles/:id/weekly-plan/suggest', description: 'Generate AI-suggested weekly climate plan', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['ai', 'climate_plans'] },
    { method: 'POST', path: '/api/climate/profiles/:id/weekly-plan/apply', description: 'Apply a suggested weekly plan', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'climate_plans'] },
  ],
};

const ZORA_SHOP_MODULE: DevModuleManifest = {
  key: 'zora_shop',
  name: 'ZORA SHOP',
  description: 'Climate-first product universe with brands, products, materials, climate metadata, and cross-brand collaboration projects.',
  domain: 'shop',
  coreTables: ['brands', 'products', 'product_brands', 'materials', 'product_materials', 'product_climate_meta', 'zora_shop_projects'],
  apiEndpoints: [
    { method: 'GET', path: '/api/shop/brands', description: 'List all brands', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'brands'] },
    { method: 'POST', path: '/api/shop/brands', description: 'Create a new brand', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'brands'] },
    { method: 'GET', path: '/api/shop/brands/:id', description: 'Get a specific brand', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'brands'] },
    { method: 'PUT', path: '/api/shop/brands/:id', description: 'Update a brand', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['update', 'brands'] },
    { method: 'GET', path: '/api/shop/products', description: 'List all products', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'products'] },
    { method: 'POST', path: '/api/shop/products', description: 'Create a new product', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'products'] },
    { method: 'GET', path: '/api/shop/products/:id', description: 'Get a specific product with climate metadata', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'products'] },
    { method: 'PUT', path: '/api/shop/products/:id', description: 'Update a product', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['update', 'products'] },
    { method: 'GET', path: '/api/shop/materials', description: 'List all materials', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'materials'] },
    { method: 'POST', path: '/api/shop/materials', description: 'Create a new material', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'materials'] },
    { method: 'GET', path: '/api/shop/projects', description: 'List ZORA SHOP projects', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'zora_shop_projects'] },
    { method: 'POST', path: '/api/shop/projects', description: 'Create a new ZORA SHOP project', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'zora_shop_projects'] },
  ],
};

const HEMP_MATERIALS_MODULE: DevModuleManifest = {
  key: 'hemp_materials',
  name: 'Hemp & Climate Materials',
  description: 'Specialized module for hemp-based and sustainable materials with climate benefit tracking.',
  domain: 'climate',
  coreTables: ['materials', 'climate_material_profiles'],
  apiEndpoints: [
    { method: 'GET', path: '/api/climate-materials', description: 'List climate materials with hemp/cannabis filtering', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'materials'] },
    { method: 'POST', path: '/api/climate-materials', description: 'Create a climate material entry', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'materials'] },
    { method: 'GET', path: '/api/climate-materials/:id', description: 'Get a specific climate material', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'materials'] },
    { method: 'PUT', path: '/api/climate-materials/:id', description: 'Update a climate material', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['update', 'materials'] },
    { method: 'GET', path: '/api/climate-materials/hemp', description: 'List hemp-specific materials', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'hemp'] },
  ],
};

const GOES_GREEN_MODULE: DevModuleManifest = {
  key: 'goes_green',
  name: 'ZORA GOES GREEN',
  description: 'Energy transition module for households and businesses. Tracks energy profiles, green actions, and transition roadmaps.',
  domain: 'energy',
  coreTables: ['goes_green_profiles', 'goes_green_actions', 'goes_green_roadmaps'],
  apiEndpoints: [
    { method: 'GET', path: '/api/goes-green/profiles', description: 'List GOES GREEN energy profiles', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'goes_green_profiles'] },
    { method: 'POST', path: '/api/goes-green/profiles', description: 'Create a GOES GREEN profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'goes_green_profiles'] },
    { method: 'GET', path: '/api/goes-green/profiles/:id', description: 'Get a specific GOES GREEN profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'goes_green_profiles'] },
    { method: 'PUT', path: '/api/goes-green/profiles/:id', description: 'Update a GOES GREEN profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['update', 'goes_green_profiles'] },
    { method: 'GET', path: '/api/goes-green/profiles/:id/actions', description: 'List actions for a GOES GREEN profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'goes_green_actions'] },
    { method: 'POST', path: '/api/goes-green/profiles/:id/actions', description: 'Create an action for a GOES GREEN profile', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'goes_green_actions'] },
    { method: 'GET', path: '/api/goes-green/profiles/:id/roadmap', description: 'Get energy transition roadmap', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'goes_green_roadmaps'] },
  ],
};

const QUANTUM_CLIMATE_LAB_MODULE: DevModuleManifest = {
  key: 'quantum_climate_lab',
  name: 'Quantum Climate Lab',
  description: 'Experimental climate research module for running climate experiments, simulations, and scenario modeling.',
  domain: 'climate',
  coreTables: ['climate_experiments', 'climate_experiment_results', 'climate_scenarios'],
  apiEndpoints: [
    { method: 'GET', path: '/api/climate-experiments', description: 'List climate experiments', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'climate_experiments'] },
    { method: 'POST', path: '/api/climate-experiments', description: 'Create a climate experiment', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'climate_experiments'] },
    { method: 'GET', path: '/api/climate-experiments/:id', description: 'Get a specific climate experiment', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'climate_experiments'] },
    { method: 'POST', path: '/api/climate-experiments/:id/run', description: 'Run a climate experiment', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['execute', 'climate_experiments'] },
    { method: 'GET', path: '/api/climate-experiments/:id/results', description: 'Get experiment results', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'climate_experiment_results'] },
  ],
};

const ZORA_FOUNDATION_MODULE: DevModuleManifest = {
  key: 'zora_foundation',
  name: 'THE ZORA FOUNDATION',
  description: 'Climate impact projects, contributions tracking, and foundation initiatives for real-world climate action.',
  domain: 'foundation',
  coreTables: ['foundation_projects', 'foundation_contributions', 'foundation_impact_reports'],
  apiEndpoints: [
    { method: 'GET', path: '/api/foundation/projects', description: 'List foundation projects', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'foundation_projects'] },
    { method: 'POST', path: '/api/foundation/projects', description: 'Create a foundation project', authRequired: true, roles: ['founder'], tags: ['create', 'foundation_projects'] },
    { method: 'GET', path: '/api/foundation/projects/:id', description: 'Get a specific foundation project', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'foundation_projects'] },
    { method: 'PUT', path: '/api/foundation/projects/:id', description: 'Update a foundation project', authRequired: true, roles: ['founder'], tags: ['update', 'foundation_projects'] },
    { method: 'GET', path: '/api/foundation/projects/:id/contributions', description: 'List contributions to a project', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'foundation_contributions'] },
    { method: 'POST', path: '/api/foundation/projects/:id/contributions', description: 'Record a contribution', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'foundation_contributions'] },
  ],
};

const CLIMATE_ACADEMY_MODULE: DevModuleManifest = {
  key: 'climate_academy',
  name: 'Climate Academy',
  description: 'Educational content system with topics, lessons, modules, learning paths, and progress tracking.',
  domain: 'academy',
  coreTables: ['academy_topics', 'academy_lessons', 'academy_modules', 'academy_learning_paths', 'academy_enrollments', 'academy_progress'],
  apiEndpoints: [
    { method: 'GET', path: '/api/academy/topics', description: 'List academy topics', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'academy_topics'] },
    { method: 'POST', path: '/api/academy/topics', description: 'Create an academy topic', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'academy_topics'] },
    { method: 'GET', path: '/api/academy/lessons', description: 'List academy lessons', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'academy_lessons'] },
    { method: 'POST', path: '/api/academy/lessons', description: 'Create an academy lesson', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'academy_lessons'] },
    { method: 'GET', path: '/api/academy/paths', description: 'List learning paths', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'academy_learning_paths'] },
    { method: 'POST', path: '/api/academy/paths', description: 'Create a learning path', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'academy_learning_paths'] },
    { method: 'GET', path: '/api/academy/paths/:id', description: 'Get a specific learning path', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'academy_learning_paths'] },
    { method: 'POST', path: '/api/academy/paths/:id/enroll', description: 'Enroll in a learning path', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'academy_enrollments'] },
    { method: 'GET', path: '/api/academy/progress', description: 'Get user learning progress', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'academy_progress'] },
  ],
};

const ORGANIZATIONS_PLAYBOOKS_MODULE: DevModuleManifest = {
  key: 'organizations_playbooks',
  name: 'Organizations & Playbooks',
  description: 'Multi-tenant organization management with climate playbooks for structured sustainability programs.',
  domain: 'organizations',
  coreTables: ['organizations', 'organization_members', 'playbooks', 'playbook_steps', 'playbook_executions'],
  apiEndpoints: [
    { method: 'GET', path: '/api/organizations', description: 'List organizations for the tenant', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'organizations'] },
    { method: 'POST', path: '/api/organizations', description: 'Create an organization', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'organizations'] },
    { method: 'GET', path: '/api/organizations/:id', description: 'Get a specific organization', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'organizations'] },
    { method: 'PUT', path: '/api/organizations/:id', description: 'Update an organization', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['update', 'organizations'] },
    { method: 'GET', path: '/api/playbooks', description: 'List playbooks', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'playbooks'] },
    { method: 'POST', path: '/api/playbooks', description: 'Create a playbook', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'playbooks'] },
    { method: 'GET', path: '/api/playbooks/:id', description: 'Get a specific playbook', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'playbooks'] },
    { method: 'POST', path: '/api/playbooks/:id/execute', description: 'Start playbook execution', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['execute', 'playbook_executions'] },
  ],
};

const AUTONOMY_MODULE: DevModuleManifest = {
  key: 'autonomy',
  name: 'Agent Autonomy',
  description: 'Task execution engine for ZORA agents with commands, tasks, safety policies, schedules, and execution tracking.',
  domain: 'autonomy',
  coreTables: ['agent_commands', 'agent_tasks', 'agent_task_logs', 'safety_policies', 'task_schedules'],
  apiEndpoints: [
    { method: 'GET', path: '/api/autonomy/commands', description: 'List agent commands', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['list', 'agent_commands'] },
    { method: 'POST', path: '/api/autonomy/commands', description: 'Create an agent command', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'agent_commands'] },
    { method: 'GET', path: '/api/autonomy/tasks', description: 'List agent tasks', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['list', 'agent_tasks'] },
    { method: 'POST', path: '/api/autonomy/tasks', description: 'Create an agent task', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'agent_tasks'] },
    { method: 'GET', path: '/api/autonomy/tasks/:id', description: 'Get a specific task', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['read', 'agent_tasks'] },
    { method: 'POST', path: '/api/autonomy/tasks/:id/approve', description: 'Approve a pending task', authRequired: true, roles: ['founder'], tags: ['approve', 'agent_tasks'] },
    { method: 'POST', path: '/api/autonomy/tasks/:id/reject', description: 'Reject a pending task', authRequired: true, roles: ['founder'], tags: ['reject', 'agent_tasks'] },
    { method: 'GET', path: '/api/autonomy/schedules', description: 'List task schedules', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['list', 'task_schedules'] },
    { method: 'POST', path: '/api/autonomy/schedules', description: 'Create a task schedule', authRequired: true, roles: ['founder'], tags: ['create', 'task_schedules'] },
    { method: 'GET', path: '/api/autonomy/safety-policies', description: 'List safety policies', authRequired: true, roles: ['founder'], tags: ['list', 'safety_policies'] },
  ],
};

const AGENTS_MODULE: DevModuleManifest = {
  key: 'agents',
  name: 'ZORA Agents',
  description: 'The 6 core ZORA agents (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM) with insights and suggestions.',
  domain: 'autonomy',
  coreTables: ['agent_insights', 'agent_suggestions', 'memory_events'],
  apiEndpoints: [
    { method: 'GET', path: '/api/agents', description: 'List available agents', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'agents'] },
    { method: 'GET', path: '/api/agents/:name', description: 'Get agent details and recent activity', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'agents'] },
    { method: 'GET', path: '/api/agents/:name/insights', description: 'Get insights from a specific agent', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'agent_insights'] },
    { method: 'POST', path: '/api/agents/:name/insights', description: 'Create an agent insight', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['create', 'agent_insights'] },
    { method: 'GET', path: '/api/agents/suggestions', description: 'List agent suggestions', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['list', 'agent_suggestions'] },
    { method: 'POST', path: '/api/agents/suggestions/:id/apply', description: 'Apply an agent suggestion', authRequired: true, roles: ['founder'], tags: ['apply', 'agent_suggestions'] },
    { method: 'POST', path: '/api/agents/suggestions/:id/reject', description: 'Reject an agent suggestion', authRequired: true, roles: ['founder'], tags: ['reject', 'agent_suggestions'] },
  ],
};

const BILLING_MODULE: DevModuleManifest = {
  key: 'billing',
  name: 'Billing & Subscriptions',
  description: 'Subscription management, billing plans, payment processing, and commission tracking for ZORA SHOP.',
  domain: 'billing',
  coreTables: ['billing_plans', 'tenant_subscriptions', 'billing_invoices', 'shop_commissions', 'shop_payouts'],
  apiEndpoints: [
    { method: 'GET', path: '/api/billing/plans', description: 'List available billing plans', authRequired: false, tags: ['list', 'billing_plans'] },
    { method: 'GET', path: '/api/billing/subscription', description: 'Get current tenant subscription', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['read', 'tenant_subscriptions'] },
    { method: 'POST', path: '/api/billing/subscription', description: 'Create or update subscription', authRequired: true, roles: ['founder'], tags: ['create', 'tenant_subscriptions'] },
    { method: 'GET', path: '/api/billing/invoices', description: 'List billing invoices', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['list', 'billing_invoices'] },
    { method: 'POST', path: '/api/billing/webhooks/stripe', description: 'Stripe webhook handler', authRequired: false, tags: ['webhook', 'stripe'] },
    { method: 'POST', path: '/api/billing/webhooks/paypal', description: 'PayPal webhook handler', authRequired: false, tags: ['webhook', 'paypal'] },
    { method: 'GET', path: '/api/billing/commissions', description: 'List shop commissions', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['list', 'shop_commissions'] },
  ],
};

const AUTH_MODULE: DevModuleManifest = {
  key: 'auth',
  name: 'Authentication & Users',
  description: 'User authentication, JWT tokens, password management, email verification, and account security.',
  domain: 'auth',
  coreTables: ['tenants', 'users', 'password_reset_tokens', 'email_verification_tokens', 'account_lockouts'],
  apiEndpoints: [
    { method: 'POST', path: '/api/auth/register', description: 'Register a new user', authRequired: false, tags: ['create', 'users'] },
    { method: 'POST', path: '/api/auth/login', description: 'Login with username/password', authRequired: false, tags: ['auth', 'login'] },
    { method: 'POST', path: '/api/auth/logout', description: 'Logout current session', authRequired: true, tags: ['auth', 'logout'] },
    { method: 'GET', path: '/api/auth/me', description: 'Get current user info', authRequired: true, tags: ['read', 'users'] },
    { method: 'POST', path: '/api/auth/password/reset-request', description: 'Request password reset', authRequired: false, tags: ['auth', 'password_reset'] },
    { method: 'POST', path: '/api/auth/password/reset', description: 'Reset password with token', authRequired: false, tags: ['auth', 'password_reset'] },
    { method: 'POST', path: '/api/auth/email/verify', description: 'Verify email address', authRequired: false, tags: ['auth', 'email_verification'] },
    { method: 'POST', path: '/api/auth/email/resend', description: 'Resend verification email', authRequired: true, tags: ['auth', 'email_verification'] },
  ],
};

const SEED_ONBOARDING_MODULE: DevModuleManifest = {
  key: 'seed_onboarding',
  name: 'Seed Data & Onboarding',
  description: 'Tenant onboarding with seed data for climate missions, materials, products, and learning content.',
  domain: 'system',
  coreTables: ['seed_runs'],
  apiEndpoints: [
    { method: 'POST', path: '/api/admin/tenants/:id/seed', description: 'Run seed data for a tenant', authRequired: true, roles: ['founder'], tags: ['admin', 'seed'] },
  ],
};

const ADMIN_MODULE: DevModuleManifest = {
  key: 'admin',
  name: 'Admin & System',
  description: 'Administrative endpoints for tenant management, user management, system status, and developer tools.',
  domain: 'system',
  coreTables: ['tenants', 'users', 'schema_metadata'],
  apiEndpoints: [
    { method: 'GET', path: '/api/admin/status', description: 'Get system status', authRequired: true, roles: ['founder'], tags: ['admin', 'status'] },
    { method: 'GET', path: '/api/admin/schema-status', description: 'Get database schema status', authRequired: true, roles: ['founder'], tags: ['admin', 'schema'] },
    { method: 'POST', path: '/api/admin/bootstrap', description: 'Bootstrap initial tenant and user', authRequired: true, roles: ['founder'], tags: ['admin', 'bootstrap'] },
    { method: 'GET', path: '/api/admin/tenants', description: 'List all tenants', authRequired: true, roles: ['founder'], tags: ['admin', 'tenants'] },
    { method: 'POST', path: '/api/admin/tenants/:id/users', description: 'Create a user for a tenant', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['admin', 'users'] },
    { method: 'POST', path: '/api/admin/token', description: 'Generate JWT token for a user', authRequired: true, roles: ['founder'], tags: ['admin', 'token'] },
    { method: 'GET', path: '/api/admin/dev/manifest', description: 'Get the dev knowledge manifest', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['admin', 'dev'] },
  ],
};

const OBSERVABILITY_MODULE: DevModuleManifest = {
  key: 'observability',
  name: 'Observability & Metrics',
  description: 'System metrics, autonomy status, and monitoring endpoints for operational visibility.',
  domain: 'system',
  coreTables: ['system_metrics', 'system_alerts'],
  apiEndpoints: [
    { method: 'GET', path: '/api/system-metrics', description: 'Get system metrics', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['read', 'system_metrics'] },
    { method: 'GET', path: '/api/autonomy-status', description: 'Get autonomy system status', authRequired: true, roles: ['founder', 'brand_admin'], tags: ['read', 'autonomy_status'] },
  ],
};

const JOURNAL_MODULE: DevModuleManifest = {
  key: 'journal',
  name: 'Journal & Audit',
  description: 'Human-readable timeline of events, decisions, and system changes for audit and transparency.',
  domain: 'system',
  coreTables: ['journal_entries'],
  apiEndpoints: [
    { method: 'GET', path: '/api/journal', description: 'List journal entries', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'journal_entries'] },
    { method: 'POST', path: '/api/journal', description: 'Create a journal entry', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'journal_entries'] },
    { method: 'GET', path: '/api/journal/:id', description: 'Get a specific journal entry', authRequired: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'journal_entries'] },
  ],
};

// ============================================================================
// MANIFEST GENERATOR
// ============================================================================

const ALL_MODULES: DevModuleManifest[] = [
  CLIMATE_OS_MODULE,
  ZORA_SHOP_MODULE,
  HEMP_MATERIALS_MODULE,
  GOES_GREEN_MODULE,
  QUANTUM_CLIMATE_LAB_MODULE,
  ZORA_FOUNDATION_MODULE,
  CLIMATE_ACADEMY_MODULE,
  ORGANIZATIONS_PLAYBOOKS_MODULE,
  AUTONOMY_MODULE,
  AGENTS_MODULE,
  BILLING_MODULE,
  AUTH_MODULE,
  SEED_ONBOARDING_MODULE,
  ADMIN_MODULE,
  OBSERVABILITY_MODULE,
  JOURNAL_MODULE,
];

const MANIFEST_VERSION = '1.0.0';

/**
 * Get the complete Dev Knowledge & API Manifest for ZORA CORE.
 * This manifest describes all modules, tables, and API endpoints.
 */
export function getDevManifest(): DevManifest {
  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    modules: ALL_MODULES,
  };
}

/**
 * Get a specific module by key.
 */
export function getModuleByKey(key: string): DevModuleManifest | undefined {
  return ALL_MODULES.find(m => m.key === key);
}

/**
 * Get all modules for a specific domain.
 */
export function getModulesByDomain(domain: ModuleDomain): DevModuleManifest[] {
  return ALL_MODULES.filter(m => m.domain === domain);
}

/**
 * Search endpoints across all modules.
 */
export function searchEndpoints(query: string): DevApiEndpoint[] {
  const lowerQuery = query.toLowerCase();
  const results: DevApiEndpoint[] = [];
  
  for (const module of ALL_MODULES) {
    for (const endpoint of module.apiEndpoints) {
      if (
        endpoint.path.toLowerCase().includes(lowerQuery) ||
        endpoint.description.toLowerCase().includes(lowerQuery) ||
        endpoint.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      ) {
        results.push(endpoint);
      }
    }
  }
  
  return results;
}

/**
 * Get statistics about the manifest.
 */
export function getManifestStats(): {
  moduleCount: number;
  endpointCount: number;
  tableCount: number;
  domains: string[];
} {
  const endpointCount = ALL_MODULES.reduce((sum, m) => sum + m.apiEndpoints.length, 0);
  const allTables = new Set<string>();
  ALL_MODULES.forEach(m => m.coreTables.forEach(t => allTables.add(t)));
  const domains = [...new Set(ALL_MODULES.map(m => m.domain))];
  
  return {
    moduleCount: ALL_MODULES.length,
    endpointCount,
    tableCount: allTables.size,
    domains,
  };
}
