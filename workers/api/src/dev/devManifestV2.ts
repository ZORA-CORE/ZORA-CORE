/**
 * ZORA CORE Dev Manifest v2.0
 * 
 * This module provides a comprehensive, machine-readable description of ZORA CORE's
 * architecture including modules, tables with columns, API endpoints, workflows/DAGs,
 * and module dependencies. It serves as the "system map" for Nordic AI agents
 * (ODIN, THOR, FREYA, BALDUR, HEIMDALL, TYR, EIVOR) and the Dev Console UI.
 * 
 * Dev Manifest v2 is the single source of truth for architecture overview.
 */

// ============================================================================
// TYPES
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
  | 'workflows'
  | 'other';

export type NordicAgent = 'ODIN' | 'THOR' | 'FREYA' | 'BALDUR' | 'HEIMDALL' | 'TYR' | 'EIVOR';

export type ColumnType = 
  | 'uuid'
  | 'text'
  | 'varchar'
  | 'integer'
  | 'bigint'
  | 'numeric'
  | 'boolean'
  | 'timestamptz'
  | 'date'
  | 'jsonb'
  | 'text[]'
  | 'vector'
  | 'enum';

export type RelationType = 'belongs_to' | 'has_many' | 'has_one' | 'many_to_many';

export type WorkflowTrigger = 'manual' | 'schedule' | 'event' | 'api_call';

// ============================================================================
// COLUMN & TABLE DEFINITIONS
// ============================================================================

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  description?: string;
  nullable?: boolean;
  default_value?: string;
}

export interface RelationDefinition {
  type: RelationType;
  target_table: string;
  via_column: string;
  notes?: string;
}

export interface TableDefinition {
  name: string;
  module: string;
  description: string;
  primary_key: string;
  columns: ColumnDefinition[];
  relations: RelationDefinition[];
}

// ============================================================================
// API ENDPOINT DEFINITIONS
// ============================================================================

export interface EndpointParam {
  name: string;
  in: 'path' | 'query' | 'body';
  required: boolean;
  description?: string;
  type?: string;
}

export interface ApiEndpointDefinition {
  method: HttpMethod;
  path: string;
  module: string;
  summary: string;
  requires_auth: boolean;
  roles?: string[];
  params?: EndpointParam[];
  tags?: string[];
}

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

export interface WorkflowStep {
  step_name: string;
  agent?: NordicAgent;
  uses_tables?: string[];
  calls_endpoints?: string[];
  description?: string;
}

export interface WorkflowDefinition {
  name: string;
  module: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

// ============================================================================
// MODULE DEFINITIONS
// ============================================================================

export interface ModuleDefinition {
  name: string;
  label: string;
  description: string;
  owner_agent?: NordicAgent;
  tags: string[];
}

// ============================================================================
// DEPENDENCY DEFINITIONS
// ============================================================================

export interface DependencyDefinition {
  from: string;
  to: string;
  reason: string;
}

// ============================================================================
// DEV MANIFEST V2
// ============================================================================

export interface DevManifestV2 {
  version: string;
  generated_at: string;
  modules: ModuleDefinition[];
  tables: TableDefinition[];
  api_endpoints: ApiEndpointDefinition[];
  workflows: WorkflowDefinition[];
  dependencies: DependencyDefinition[];
}

export interface DevManifestStats {
  module_count: number;
  table_count: number;
  endpoint_count: number;
  workflow_count: number;
  dependency_count: number;
  domains: string[];
  agents: NordicAgent[];
}

// ============================================================================
// MODULE DEFINITIONS DATA
// ============================================================================

const MODULES: ModuleDefinition[] = [
  {
    name: 'climate_os',
    label: 'Climate OS',
    description: 'Core climate tracking system with profiles, missions, impact estimates, weekly plans, and climate summaries. The heart of ZORA\'s climate intelligence.',
    owner_agent: 'ODIN',
    tags: ['climate', 'profiles', 'missions', 'impact', 'core'],
  },
  {
    name: 'zora_shop',
    label: 'ZORA SHOP',
    description: 'Climate-first product universe with brands, products, materials, climate metadata, and cross-brand collaboration projects.',
    owner_agent: 'THOR',
    tags: ['shop', 'products', 'brands', 'materials', 'commerce'],
  },
  {
    name: 'hemp_materials',
    label: 'Hemp & Climate Materials',
    description: 'Specialized module for hemp-based and sustainable materials with climate benefit tracking and material profiles.',
    owner_agent: 'ODIN',
    tags: ['climate', 'materials', 'hemp', 'sustainability'],
  },
  {
    name: 'goes_green',
    label: 'ZORA GOES GREEN',
    description: 'Energy transition module for households and businesses. Tracks energy profiles, green actions, assets, and transition roadmaps.',
    owner_agent: 'ODIN',
    tags: ['energy', 'transition', 'households', 'green'],
  },
  {
    name: 'quantum_climate_lab',
    label: 'Quantum Climate Lab',
    description: 'Experimental climate research module for running climate experiments, simulations, and scenario modeling using classical and quantum-inspired methods.',
    owner_agent: 'ODIN',
    tags: ['research', 'experiments', 'quantum', 'simulation'],
  },
  {
    name: 'zora_foundation',
    label: 'THE ZORA FOUNDATION',
    description: 'Climate impact projects, contributions tracking, and foundation initiatives for real-world climate action.',
    owner_agent: 'FREYA',
    tags: ['foundation', 'projects', 'contributions', 'impact'],
  },
  {
    name: 'climate_academy',
    label: 'Climate Academy',
    description: 'Educational content system with topics, lessons, modules, learning paths, quizzes, and progress tracking.',
    owner_agent: 'FREYA',
    tags: ['academy', 'education', 'learning', 'content'],
  },
  {
    name: 'organizations_playbooks',
    label: 'Organizations & Playbooks',
    description: 'Multi-tenant organization management with climate playbooks for structured sustainability programs.',
    owner_agent: 'TYR',
    tags: ['organizations', 'playbooks', 'workflows', 'onboarding'],
  },
  {
    name: 'autonomy',
    label: 'Agent Autonomy',
    description: 'Task execution engine for ZORA agents with commands, tasks, safety policies, schedules, and execution tracking.',
    owner_agent: 'TYR',
    tags: ['autonomy', 'tasks', 'safety', 'scheduling'],
  },
  {
    name: 'agents',
    label: 'ZORA Agents',
    description: 'The 7 Nordic agents (ODIN, THOR, FREYA, BALDUR, HEIMDALL, TYR, EIVOR) with insights, suggestions, and memory.',
    owner_agent: 'TYR',
    tags: ['agents', 'insights', 'suggestions', 'memory'],
  },
  {
    name: 'billing',
    label: 'Billing & Subscriptions',
    description: 'Subscription management, billing plans, payment processing (Stripe/PayPal), and commission tracking for ZORA SHOP.',
    owner_agent: 'THOR',
    tags: ['billing', 'subscriptions', 'payments', 'commissions'],
  },
  {
    name: 'auth',
    label: 'Authentication & Users',
    description: 'User authentication, JWT tokens, password management, email verification, and account security.',
    owner_agent: 'HEIMDALL',
    tags: ['auth', 'users', 'security', 'jwt'],
  },
  {
    name: 'seed_onboarding',
    label: 'Seed Data & Onboarding',
    description: 'Tenant onboarding with seed data for climate missions, materials, products, and learning content.',
    owner_agent: 'TYR',
    tags: ['seed', 'onboarding', 'setup'],
  },
  {
    name: 'admin',
    label: 'Admin & System',
    description: 'Administrative endpoints for tenant management, user management, system status, and developer tools.',
    owner_agent: 'HEIMDALL',
    tags: ['admin', 'system', 'tenants', 'dev'],
  },
  {
    name: 'observability',
    label: 'Observability & Metrics',
    description: 'System metrics, autonomy status, impact snapshots, and monitoring endpoints for operational visibility.',
    owner_agent: 'HEIMDALL',
    tags: ['observability', 'metrics', 'monitoring'],
  },
  {
    name: 'journal',
    label: 'Journal & Audit',
    description: 'Human-readable timeline of events, decisions, and system changes for audit and transparency.',
    owner_agent: 'EIVOR',
    tags: ['journal', 'audit', 'timeline', 'transparency'],
  },
  {
    name: 'workflows',
    label: 'Workflow / DAG Engine',
    description: 'Backend orchestration layer for defining and executing multi-step processes as directed acyclic graphs (DAGs).',
    owner_agent: 'TYR',
    tags: ['workflows', 'dag', 'orchestration', 'automation'],
  },
  {
    name: 'outcomes',
    label: 'Outcome Feedback & Learning',
    description: 'Feedback collection and insight generation for continual learning and optimization across all ZORA entities.',
    owner_agent: 'ODIN',
    tags: ['feedback', 'learning', 'insights', 'optimization'],
  },
];

// ============================================================================
// TABLE DEFINITIONS DATA
// ============================================================================

const TABLES: TableDefinition[] = [
  // Core System Tables
  {
    name: 'tenants',
    module: 'auth',
    description: 'Multi-tenant root table. Each tenant represents a separate organization/account in ZORA CORE.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'name', type: 'varchar', description: 'Tenant display name' },
      { name: 'slug', type: 'varchar', description: 'URL-friendly identifier' },
      { name: 'metadata', type: 'jsonb', description: 'Additional tenant configuration' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', description: 'Last update timestamp' },
    ],
    relations: [
      { type: 'has_many', target_table: 'users', via_column: 'tenant_id', notes: 'Users belonging to this tenant' },
      { type: 'has_many', target_table: 'climate_profiles', via_column: 'tenant_id', notes: 'Climate profiles for this tenant' },
    ],
  },
  {
    name: 'users',
    module: 'auth',
    description: 'User accounts with authentication and role information.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'username', type: 'varchar', description: 'Unique username for login' },
      { name: 'email', type: 'varchar', description: 'Email address' },
      { name: 'password_hash', type: 'text', description: 'Bcrypt password hash' },
      { name: 'role', type: 'enum', description: 'User role: founder, brand_admin, member' },
      { name: 'email_verified', type: 'boolean', description: 'Whether email is verified' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', description: 'Last update timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
    ],
  },
  // Climate OS Tables
  {
    name: 'climate_profiles',
    module: 'climate_os',
    description: 'Climate profiles for users, brands, and organizations with scope and impact tracking.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'owner_id', type: 'uuid', description: 'FK to users (owner)' },
      { name: 'name', type: 'varchar', description: 'Profile display name' },
      { name: 'profile_type', type: 'enum', description: 'Type: individual, household, brand, organization' },
      { name: 'scope', type: 'varchar', description: 'Scope: individual, household, organization' },
      { name: 'climate_score', type: 'numeric', description: 'Overall climate score 0-100' },
      { name: 'is_primary', type: 'boolean', description: 'Whether this is the primary profile for the tenant' },
      { name: 'metadata', type: 'jsonb', description: 'Additional profile data' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', description: 'Last update timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'users', via_column: 'owner_id', notes: 'Profile owner' },
      { type: 'has_many', target_table: 'climate_missions', via_column: 'profile_id', notes: 'Missions for this profile' },
      { type: 'has_many', target_table: 'climate_plans', via_column: 'profile_id', notes: 'Weekly/monthly plans' },
    ],
  },
  {
    name: 'climate_missions',
    module: 'climate_os',
    description: 'Climate missions with status tracking, impact estimates, and verification.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'profile_id', type: 'uuid', description: 'FK to climate_profiles' },
      { name: 'title', type: 'varchar', description: 'Mission title' },
      { name: 'description', type: 'text', description: 'Mission description' },
      { name: 'category', type: 'varchar', description: 'Mission category' },
      { name: 'status', type: 'enum', description: 'Status: planned, in_progress, completed, verified' },
      { name: 'estimated_impact_kgco2', type: 'numeric', description: 'Estimated CO2 impact in kg' },
      { name: 'verified', type: 'boolean', description: 'Whether mission is verified' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
      { name: 'completed_at', type: 'timestamptz', description: 'Completion timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'climate_profiles', via_column: 'profile_id', notes: 'Parent profile' },
    ],
  },
  {
    name: 'climate_plans',
    module: 'climate_os',
    description: 'Weekly/monthly climate plans for profiles with period tracking.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'profile_id', type: 'uuid', description: 'FK to climate_profiles' },
      { name: 'plan_type', type: 'varchar', description: 'Plan type: weekly, monthly' },
      { name: 'period_start', type: 'date', description: 'Plan period start date' },
      { name: 'period_end', type: 'date', description: 'Plan period end date' },
      { name: 'status', type: 'varchar', description: 'Status: proposed, active, archived' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'climate_profiles', via_column: 'profile_id', notes: 'Parent profile' },
      { type: 'has_many', target_table: 'climate_plan_items', via_column: 'plan_id', notes: 'Items in this plan' },
    ],
  },
  // ZORA SHOP Tables
  {
    name: 'brands',
    module: 'zora_shop',
    description: 'Brands for the climate-first Mashup Shop - partners in cross-brand collaborations.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'name', type: 'varchar', description: 'Brand name' },
      { name: 'slug', type: 'varchar', description: 'URL-friendly identifier' },
      { name: 'description', type: 'text', description: 'Brand description' },
      { name: 'country', type: 'varchar', description: 'Brand country' },
      { name: 'sector', type: 'varchar', description: 'Industry sector' },
      { name: 'climate_tagline', type: 'text', description: 'Climate-focused tagline' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'has_many', target_table: 'products', via_column: 'brand_id', notes: 'Products from this brand' },
    ],
  },
  {
    name: 'products',
    module: 'zora_shop',
    description: 'Climate-first products with climate scores and impact estimates.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'name', type: 'varchar', description: 'Product name' },
      { name: 'slug', type: 'varchar', description: 'URL-friendly identifier' },
      { name: 'short_description', type: 'text', description: 'Short product description' },
      { name: 'status', type: 'varchar', description: 'Status: draft, active, archived' },
      { name: 'climate_score', type: 'numeric', description: 'Climate score 0-100' },
      { name: 'estimated_impact_kgco2', type: 'numeric', description: 'Estimated CO2 impact' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'many_to_many', target_table: 'brands', via_column: 'product_brands', notes: 'Brands associated with this product' },
      { type: 'many_to_many', target_table: 'materials', via_column: 'product_materials', notes: 'Materials used in this product' },
    ],
  },
  {
    name: 'materials',
    module: 'zora_shop',
    description: 'Base materials for ZORA SHOP products with climate benefit tracking.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'name', type: 'varchar', description: 'Material name' },
      { name: 'description', type: 'text', description: 'Material description' },
      { name: 'category', type: 'varchar', description: 'Material category' },
      { name: 'is_hemp_or_cannabis_material', type: 'boolean', description: 'Whether this is a hemp/cannabis material' },
      { name: 'hemp_category', type: 'text', description: 'Hemp category: fiber, bioplastic, construction, etc.' },
      { name: 'climate_benefit_note', type: 'text', description: 'Climate benefit explanation' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'has_one', target_table: 'climate_material_profiles', via_column: 'material_id', notes: 'Climate impact profile' },
    ],
  },
  {
    name: 'zora_shop_projects',
    module: 'zora_shop',
    description: 'ZORA SHOP Projects - brand collaboration projects/drops/campaigns.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'title', type: 'varchar', description: 'Project title' },
      { name: 'description', type: 'text', description: 'Project description' },
      { name: 'status', type: 'varchar', description: 'Status: idea, brief, concept, review, launched, archived' },
      { name: 'primary_brand_id', type: 'uuid', description: 'FK to primary brand' },
      { name: 'secondary_brand_id', type: 'uuid', description: 'FK to secondary brand (optional)' },
      { name: 'theme', type: 'varchar', description: 'Project theme' },
      { name: 'target_launch_date', type: 'date', description: 'Target launch date' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'brands', via_column: 'primary_brand_id', notes: 'Primary brand' },
      { type: 'belongs_to', target_table: 'brands', via_column: 'secondary_brand_id', notes: 'Secondary brand' },
    ],
  },
  // Agent & Autonomy Tables
  {
    name: 'agent_tasks',
    module: 'autonomy',
    description: 'Agent task queue - stores tasks for the 7 Nordic agents to process.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'agent_id', type: 'varchar', description: 'Agent: ODIN, THOR, FREYA, BALDUR, HEIMDALL, TYR, EIVOR' },
      { name: 'task_type', type: 'varchar', description: 'Task type identifier' },
      { name: 'status', type: 'enum', description: 'Status: pending, in_progress, completed, failed' },
      { name: 'priority', type: 'integer', description: 'Task priority (higher = more urgent)' },
      { name: 'title', type: 'varchar', description: 'Task title' },
      { name: 'payload', type: 'jsonb', description: 'Task input payload' },
      { name: 'result', type: 'jsonb', description: 'Task result data' },
      { name: 'requires_approval', type: 'boolean', description: 'Whether task needs manual approval' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
      { name: 'completed_at', type: 'timestamptz', description: 'Completion timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'agent_commands', via_column: 'command_id', notes: 'Source command' },
    ],
  },
  {
    name: 'agent_commands',
    module: 'autonomy',
    description: 'Agent commands - freeform prompts from Founder that TYR translates into agent_tasks.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'created_by_user_id', type: 'uuid', description: 'FK to users' },
      { name: 'raw_prompt', type: 'text', description: 'Original command text' },
      { name: 'target_agents', type: 'text[]', description: 'Target agent IDs' },
      { name: 'status', type: 'enum', description: 'Status: received, parsed, tasks_created, failed' },
      { name: 'parsed_summary', type: 'text', description: 'Parsed command summary' },
      { name: 'tasks_created_count', type: 'integer', description: 'Number of tasks created' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'users', via_column: 'created_by_user_id', notes: 'Command creator' },
      { type: 'has_many', target_table: 'agent_tasks', via_column: 'command_id', notes: 'Tasks created from this command' },
    ],
  },
  {
    name: 'agent_insights',
    module: 'agents',
    description: 'Agent-generated insights and suggestions tied to Climate OS, ZORA SHOP, and other domains.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'agent_id', type: 'varchar', description: 'Agent: ODIN, THOR, FREYA, BALDUR, HEIMDALL, TYR, EIVOR' },
      { name: 'source_task_id', type: 'uuid', description: 'FK to agent_tasks (optional)' },
      { name: 'category', type: 'varchar', description: 'Insight category' },
      { name: 'title', type: 'varchar', description: 'Insight title' },
      { name: 'body', type: 'text', description: 'Insight body text' },
      { name: 'status', type: 'enum', description: 'Status: proposed, accepted, rejected, implemented' },
      { name: 'impact_estimate_kgco2', type: 'numeric', description: 'Estimated CO2 impact' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'agent_tasks', via_column: 'source_task_id', notes: 'Source task' },
    ],
  },
  {
    name: 'memory_events',
    module: 'agents',
    description: 'Long-term memory storage for EIVOR with vector embeddings for semantic search.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'agent', type: 'varchar', description: 'Agent that created this memory' },
      { name: 'memory_type', type: 'enum', description: 'Type: observation, decision, fact, context' },
      { name: 'content', type: 'text', description: 'Memory content' },
      { name: 'tags', type: 'text[]', description: 'Searchable tags' },
      { name: 'embedding', type: 'vector', description: 'Vector embedding for semantic search' },
      { name: 'metadata', type: 'jsonb', description: 'Additional metadata' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
    ],
  },
  // Workflow Tables
  {
    name: 'workflows',
    module: 'workflows',
    description: 'Workflow definitions (DAG templates) for system orchestration.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants (NULL = global template)' },
      { name: 'key', type: 'text', description: 'Machine-readable key' },
      { name: 'name', type: 'text', description: 'Human-readable name' },
      { name: 'description', type: 'text', description: 'Workflow description' },
      { name: 'category', type: 'text', description: 'Category: climate_os, zora_shop, goes_green, etc.' },
      { name: 'is_active', type: 'boolean', description: 'Whether workflow is active' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant (optional)' },
      { type: 'has_many', target_table: 'workflow_steps', via_column: 'workflow_id', notes: 'Steps in this workflow' },
      { type: 'has_many', target_table: 'workflow_runs', via_column: 'workflow_id', notes: 'Execution instances' },
    ],
  },
  {
    name: 'workflow_runs',
    module: 'workflows',
    description: 'Execution instances of workflows with status and context tracking.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'workflow_id', type: 'uuid', description: 'FK to workflows' },
      { name: 'triggered_by_user_id', type: 'uuid', description: 'FK to users (optional)' },
      { name: 'status', type: 'text', description: 'Status: pending, running, completed, failed, canceled' },
      { name: 'context', type: 'jsonb', description: 'Initial context variables' },
      { name: 'result', type: 'jsonb', description: 'Final result data' },
      { name: 'error_message', type: 'text', description: 'Error message if failed' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
      { name: 'completed_at', type: 'timestamptz', description: 'Completion timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'workflows', via_column: 'workflow_id', notes: 'Parent workflow' },
      { type: 'has_many', target_table: 'workflow_run_steps', via_column: 'run_id', notes: 'Step statuses' },
    ],
  },
  // Billing Tables
  {
    name: 'billing_plans',
    module: 'billing',
    description: 'Subscription plans available to tenants with pricing and features.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'code', type: 'text', description: 'Plan code: FREE, CLIMATE_STARTER, etc.' },
      { name: 'name', type: 'text', description: 'Plan display name' },
      { name: 'description', type: 'text', description: 'Plan description' },
      { name: 'price_amount', type: 'numeric', description: 'Price amount' },
      { name: 'price_currency', type: 'text', description: 'Currency code (DKK)' },
      { name: 'billing_interval', type: 'text', description: 'Interval: month, year' },
      { name: 'is_active', type: 'boolean', description: 'Whether plan is active' },
      { name: 'features', type: 'jsonb', description: 'Plan features and limits' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'has_many', target_table: 'tenant_subscriptions', via_column: 'plan_id', notes: 'Subscriptions using this plan' },
    ],
  },
  {
    name: 'tenant_subscriptions',
    module: 'billing',
    description: 'Tenant subscription records with payment provider info.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'plan_id', type: 'uuid', description: 'FK to billing_plans' },
      { name: 'status', type: 'text', description: 'Status: trial, active, past_due, canceled' },
      { name: 'provider', type: 'text', description: 'Payment provider: stripe, paypal, manual' },
      { name: 'provider_subscription_id', type: 'text', description: 'External subscription ID' },
      { name: 'current_period_start', type: 'timestamptz', description: 'Current billing period start' },
      { name: 'current_period_end', type: 'timestamptz', description: 'Current billing period end' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
      { type: 'belongs_to', target_table: 'billing_plans', via_column: 'plan_id', notes: 'Subscription plan' },
    ],
  },
  // Foundation Tables
  {
    name: 'foundation_projects',
    module: 'zora_foundation',
    description: 'THE ZORA FOUNDATION climate projects - global or tenant-owned.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants (NULL = global project)' },
      { name: 'title', type: 'text', description: 'Project title' },
      { name: 'description', type: 'text', description: 'Project description' },
      { name: 'category', type: 'text', description: 'Category: reforestation, renewable_energy, ocean, etc.' },
      { name: 'status', type: 'text', description: 'Status: planned, active, completed, paused' },
      { name: 'climate_focus_domain', type: 'text', description: 'Focus: energy, materials, transport, food, nature' },
      { name: 'target_impact_kgco2', type: 'numeric', description: 'Target CO2 impact' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant (optional)' },
      { type: 'has_many', target_table: 'foundation_contributions', via_column: 'project_id', notes: 'Contributions to this project' },
    ],
  },
  // Journal Table
  {
    name: 'journal_entries',
    module: 'journal',
    description: 'Human-readable timeline of events, decisions, and system changes.',
    primary_key: 'id',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
      { name: 'author', type: 'varchar', description: 'Author: agent name or user' },
      { name: 'category', type: 'enum', description: 'Category: system, climate, shop, foundation, etc.' },
      { name: 'title', type: 'varchar', description: 'Entry title' },
      { name: 'content', type: 'text', description: 'Entry content' },
      { name: 'metadata', type: 'jsonb', description: 'Additional metadata' },
      { name: 'created_at', type: 'timestamptz', description: 'Creation timestamp' },
    ],
    relations: [
      { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
    ],
  },
];

// ============================================================================
// API ENDPOINTS DATA
// ============================================================================

const API_ENDPOINTS: ApiEndpointDefinition[] = [
  // Climate OS Endpoints
  { method: 'GET', path: '/api/climate/profiles', module: 'climate_os', summary: 'List climate profiles for the current tenant', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'climate_profiles'] },
  { method: 'POST', path: '/api/climate/profiles', module: 'climate_os', summary: 'Create a new climate profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'climate_profiles'] },
  { method: 'GET', path: '/api/climate/profiles/:id', module: 'climate_os', summary: 'Get a specific climate profile by ID', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], params: [{ name: 'id', in: 'path', required: true, description: 'Profile UUID' }], tags: ['read', 'climate_profiles'] },
  { method: 'PUT', path: '/api/climate/profiles/:id', module: 'climate_os', summary: 'Update a climate profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], params: [{ name: 'id', in: 'path', required: true, description: 'Profile UUID' }], tags: ['update', 'climate_profiles'] },
  { method: 'DELETE', path: '/api/climate/profiles/:id', module: 'climate_os', summary: 'Delete a climate profile', requires_auth: true, roles: ['founder', 'brand_admin'], params: [{ name: 'id', in: 'path', required: true, description: 'Profile UUID' }], tags: ['delete', 'climate_profiles'] },
  { method: 'GET', path: '/api/climate/profiles/:id/missions', module: 'climate_os', summary: 'List missions for a specific climate profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'climate_missions'] },
  { method: 'POST', path: '/api/climate/profiles/:id/missions', module: 'climate_os', summary: 'Create a mission for a climate profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'climate_missions'] },
  { method: 'GET', path: '/api/climate/profiles/:id/summary', module: 'climate_os', summary: 'Get climate summary for a profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'climate_summaries'] },
  { method: 'POST', path: '/api/climate/profiles/:id/weekly-plan/suggest', module: 'climate_os', summary: 'Generate AI-suggested weekly climate plan', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['ai', 'climate_plans'] },
  { method: 'POST', path: '/api/climate/profiles/:id/weekly-plan/apply', module: 'climate_os', summary: 'Apply a suggested weekly plan', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'climate_plans'] },
  
  // ZORA SHOP Endpoints
  { method: 'GET', path: '/api/shop/brands', module: 'zora_shop', summary: 'List all brands', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'brands'] },
  { method: 'POST', path: '/api/shop/brands', module: 'zora_shop', summary: 'Create a new brand', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'brands'] },
  { method: 'GET', path: '/api/shop/brands/:id', module: 'zora_shop', summary: 'Get a specific brand', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'brands'] },
  { method: 'PUT', path: '/api/shop/brands/:id', module: 'zora_shop', summary: 'Update a brand', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['update', 'brands'] },
  { method: 'GET', path: '/api/shop/products', module: 'zora_shop', summary: 'List all products', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'products'] },
  { method: 'POST', path: '/api/shop/products', module: 'zora_shop', summary: 'Create a new product', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'products'] },
  { method: 'GET', path: '/api/shop/products/:id', module: 'zora_shop', summary: 'Get a specific product with climate metadata', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'products'] },
  { method: 'GET', path: '/api/shop/materials', module: 'zora_shop', summary: 'List all materials', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'materials'] },
  { method: 'POST', path: '/api/shop/materials', module: 'zora_shop', summary: 'Create a new material', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'materials'] },
  { method: 'GET', path: '/api/shop/projects', module: 'zora_shop', summary: 'List ZORA SHOP projects', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'zora_shop_projects'] },
  { method: 'POST', path: '/api/shop/projects', module: 'zora_shop', summary: 'Create a new ZORA SHOP project', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'zora_shop_projects'] },
  
  // Agent & Autonomy Endpoints
  { method: 'GET', path: '/api/agents', module: 'agents', summary: 'List available agents', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'agents'] },
  { method: 'GET', path: '/api/agents/:name', module: 'agents', summary: 'Get agent details and recent activity', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'agents'] },
  { method: 'GET', path: '/api/agents/:name/insights', module: 'agents', summary: 'Get insights from a specific agent', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'agent_insights'] },
  { method: 'POST', path: '/api/agents/:name/insights', module: 'agents', summary: 'Create an agent insight', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'agent_insights'] },
  { method: 'GET', path: '/api/autonomy/commands', module: 'autonomy', summary: 'List agent commands', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['list', 'agent_commands'] },
  { method: 'POST', path: '/api/autonomy/commands', module: 'autonomy', summary: 'Create an agent command', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'agent_commands'] },
  { method: 'GET', path: '/api/autonomy/tasks', module: 'autonomy', summary: 'List agent tasks', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['list', 'agent_tasks'] },
  { method: 'POST', path: '/api/autonomy/tasks', module: 'autonomy', summary: 'Create an agent task', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'agent_tasks'] },
  { method: 'GET', path: '/api/autonomy/tasks/:id', module: 'autonomy', summary: 'Get a specific task', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['read', 'agent_tasks'] },
  { method: 'POST', path: '/api/autonomy/tasks/:id/approve', module: 'autonomy', summary: 'Approve a pending task', requires_auth: true, roles: ['founder'], tags: ['approve', 'agent_tasks'] },
  { method: 'POST', path: '/api/autonomy/tasks/:id/reject', module: 'autonomy', summary: 'Reject a pending task', requires_auth: true, roles: ['founder'], tags: ['reject', 'agent_tasks'] },
  { method: 'GET', path: '/api/autonomy/schedules', module: 'autonomy', summary: 'List task schedules', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['list', 'autonomy_schedules'] },
  
  // Workflow Endpoints
  { method: 'GET', path: '/api/workflows', module: 'workflows', summary: 'List workflows visible to the current tenant', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], params: [{ name: 'category', in: 'query', required: false, description: 'Filter by category' }], tags: ['list', 'workflows'] },
  { method: 'POST', path: '/api/workflows', module: 'workflows', summary: 'Create a new workflow', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['create', 'workflows'] },
  { method: 'GET', path: '/api/workflows/:id', module: 'workflows', summary: 'Get workflow detail including steps and edges', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'workflows'] },
  { method: 'POST', path: '/api/workflows/:id/run', module: 'workflows', summary: 'Create and start a workflow run', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['execute', 'workflow_runs'] },
  { method: 'GET', path: '/api/workflow-runs', module: 'workflows', summary: 'List workflow runs for the current tenant', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'workflow_runs'] },
  { method: 'GET', path: '/api/workflow-runs/:id', module: 'workflows', summary: 'Get workflow run detail with steps', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'workflow_runs'] },
  { method: 'POST', path: '/api/workflow-runs/:id/advance', module: 'workflows', summary: 'Manually advance a workflow run', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['execute', 'workflow_runs'] },
  
  // Auth Endpoints
  { method: 'POST', path: '/api/auth/register', module: 'auth', summary: 'Register a new user', requires_auth: false, tags: ['create', 'users'] },
  { method: 'POST', path: '/api/auth/login', module: 'auth', summary: 'Login with username/password', requires_auth: false, tags: ['auth', 'login'] },
  { method: 'POST', path: '/api/auth/logout', module: 'auth', summary: 'Logout current session', requires_auth: true, tags: ['auth', 'logout'] },
  { method: 'GET', path: '/api/auth/me', module: 'auth', summary: 'Get current user info', requires_auth: true, tags: ['read', 'users'] },
  { method: 'POST', path: '/api/auth/password/reset-request', module: 'auth', summary: 'Request password reset', requires_auth: false, tags: ['auth', 'password_reset'] },
  { method: 'POST', path: '/api/auth/password/reset', module: 'auth', summary: 'Reset password with token', requires_auth: false, tags: ['auth', 'password_reset'] },
  
  // Billing Endpoints
  { method: 'GET', path: '/api/billing/plans', module: 'billing', summary: 'List available billing plans', requires_auth: false, tags: ['list', 'billing_plans'] },
  { method: 'GET', path: '/api/billing/subscription', module: 'billing', summary: 'Get current tenant subscription', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['read', 'tenant_subscriptions'] },
  { method: 'POST', path: '/api/billing/subscription', module: 'billing', summary: 'Create or update subscription', requires_auth: true, roles: ['founder'], tags: ['create', 'tenant_subscriptions'] },
  { method: 'POST', path: '/api/billing/webhooks/stripe', module: 'billing', summary: 'Stripe webhook handler', requires_auth: false, tags: ['webhook', 'stripe'] },
  { method: 'POST', path: '/api/billing/webhooks/paypal', module: 'billing', summary: 'PayPal webhook handler', requires_auth: false, tags: ['webhook', 'paypal'] },
  
  // Admin & Dev Endpoints
  { method: 'GET', path: '/api/admin/status', module: 'admin', summary: 'Get system status', requires_auth: true, roles: ['founder'], tags: ['admin', 'status'] },
  { method: 'GET', path: '/api/admin/schema-status', module: 'admin', summary: 'Get database schema status', requires_auth: true, roles: ['founder'], tags: ['admin', 'schema'] },
  { method: 'POST', path: '/api/admin/bootstrap', module: 'admin', summary: 'Bootstrap initial tenant and user', requires_auth: true, roles: ['founder'], tags: ['admin', 'bootstrap'] },
  { method: 'GET', path: '/api/admin/tenants', module: 'admin', summary: 'List all tenants', requires_auth: true, roles: ['founder'], tags: ['admin', 'tenants'] },
  { method: 'GET', path: '/api/admin/dev/manifest', module: 'admin', summary: 'Get the full Dev Manifest v2', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['admin', 'dev', 'manifest'] },
  { method: 'GET', path: '/api/admin/dev/dependencies', module: 'admin', summary: 'Get module dependencies', requires_auth: true, roles: ['founder', 'brand_admin'], params: [{ name: 'module', in: 'query', required: false, description: 'Filter by module name' }], tags: ['admin', 'dev', 'dependencies'] },
  { method: 'POST', path: '/api/admin/dev/explain-resource', module: 'admin', summary: 'Explain a specific resource (module, table, endpoint, workflow)', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['admin', 'dev', 'explain'] },
  
  // Journal Endpoints
  { method: 'GET', path: '/api/journal', module: 'journal', summary: 'List journal entries', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'journal_entries'] },
  { method: 'POST', path: '/api/journal', module: 'journal', summary: 'Create a journal entry', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'journal_entries'] },
  { method: 'GET', path: '/api/journal/:id', module: 'journal', summary: 'Get a specific journal entry', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'journal_entries'] },
  
  // Observability Endpoints
  { method: 'GET', path: '/api/system-metrics', module: 'observability', summary: 'Get system metrics', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['read', 'system_metrics'] },
  { method: 'GET', path: '/api/autonomy-status', module: 'observability', summary: 'Get autonomy system status', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['read', 'autonomy_status'] },
  { method: 'GET', path: '/api/admin/impact', module: 'observability', summary: 'Get tenant impact metrics', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['read', 'impact'] },
  
  // Foundation Endpoints
  { method: 'GET', path: '/api/foundation/projects', module: 'zora_foundation', summary: 'List foundation projects', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'foundation_projects'] },
  { method: 'POST', path: '/api/foundation/projects', module: 'zora_foundation', summary: 'Create a foundation project', requires_auth: true, roles: ['founder'], tags: ['create', 'foundation_projects'] },
  { method: 'GET', path: '/api/foundation/projects/:id', module: 'zora_foundation', summary: 'Get a specific foundation project', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'foundation_projects'] },
  { method: 'GET', path: '/api/foundation/projects/:id/contributions', module: 'zora_foundation', summary: 'List contributions to a project', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'foundation_contributions'] },
  { method: 'POST', path: '/api/foundation/projects/:id/contributions', module: 'zora_foundation', summary: 'Record a contribution', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'foundation_contributions'] },
  
  // GOES GREEN Endpoints
  { method: 'GET', path: '/api/goes-green/profiles', module: 'goes_green', summary: 'List GOES GREEN energy profiles', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'goes_green_profiles'] },
  { method: 'POST', path: '/api/goes-green/profiles', module: 'goes_green', summary: 'Create a GOES GREEN profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'goes_green_profiles'] },
  { method: 'GET', path: '/api/goes-green/profiles/:id', module: 'goes_green', summary: 'Get a specific GOES GREEN profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'goes_green_profiles'] },
  { method: 'GET', path: '/api/goes-green/profiles/:id/actions', module: 'goes_green', summary: 'List actions for a GOES GREEN profile', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'goes_green_actions'] },
  
  // Climate Academy Endpoints
  { method: 'GET', path: '/api/academy/topics', module: 'climate_academy', summary: 'List academy topics', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'academy_topics'] },
  { method: 'GET', path: '/api/academy/lessons', module: 'climate_academy', summary: 'List academy lessons', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'academy_lessons'] },
  { method: 'GET', path: '/api/academy/paths', module: 'climate_academy', summary: 'List learning paths', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'academy_learning_paths'] },
  { method: 'GET', path: '/api/academy/paths/:id', module: 'climate_academy', summary: 'Get a specific learning path', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'academy_learning_paths'] },
  { method: 'POST', path: '/api/academy/paths/:id/enroll', module: 'climate_academy', summary: 'Enroll in a learning path', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'academy_enrollments'] },
  { method: 'GET', path: '/api/academy/progress', module: 'climate_academy', summary: 'Get user learning progress', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['read', 'academy_progress'] },
  
  // Outcome Feedback Endpoints
  { method: 'GET', path: '/api/outcomes/feedback', module: 'outcomes', summary: 'List outcome feedback', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['list', 'outcome_feedback'] },
  { method: 'POST', path: '/api/outcomes/feedback', module: 'outcomes', summary: 'Submit outcome feedback', requires_auth: true, roles: ['member', 'founder', 'brand_admin'], tags: ['create', 'outcome_feedback'] },
  { method: 'GET', path: '/api/outcomes/insights', module: 'outcomes', summary: 'Get outcome insights', requires_auth: true, roles: ['founder', 'brand_admin'], tags: ['read', 'outcome_insights'] },
];

// ============================================================================
// WORKFLOW DEFINITIONS DATA
// ============================================================================

const WORKFLOWS: WorkflowDefinition[] = [
  {
    name: 'climate_onboarding_v1',
    module: 'climate_os',
    description: 'Onboard new tenant with climate profile and starter missions',
    trigger: 'manual',
    steps: [
      { step_name: 'create_climate_profile', agent: 'ODIN', uses_tables: ['climate_profiles'], calls_endpoints: ['/api/climate/profiles'], description: 'Create initial climate profile for the tenant' },
      { step_name: 'seed_starter_missions', agent: 'TYR', uses_tables: ['climate_missions'], calls_endpoints: ['/api/climate/profiles/:id/missions'], description: 'Seed starter climate missions' },
      { step_name: 'generate_weekly_plan', agent: 'ODIN', uses_tables: ['climate_plans', 'climate_plan_items'], calls_endpoints: ['/api/climate/profiles/:id/weekly-plan/suggest'], description: 'Generate first weekly climate plan' },
    ],
  },
  {
    name: 'zora_shop_capsule_v1',
    module: 'zora_shop',
    description: 'Create a new ZORA SHOP capsule project with climate metadata',
    trigger: 'manual',
    steps: [
      { step_name: 'create_project', agent: 'THOR', uses_tables: ['zora_shop_projects'], calls_endpoints: ['/api/shop/projects'], description: 'Create ZORA SHOP project' },
      { step_name: 'add_climate_meta', agent: 'ODIN', uses_tables: ['product_climate_meta'], description: 'Add climate metadata to products' },
      { step_name: 'notify_stakeholders', agent: 'FREYA', uses_tables: ['journal_entries'], calls_endpoints: ['/api/journal'], description: 'Create journal entry and notify stakeholders' },
    ],
  },
  {
    name: 'goes_green_household_v1',
    module: 'goes_green',
    description: 'Energy transition journey for households',
    trigger: 'manual',
    steps: [
      { step_name: 'create_energy_profile', agent: 'ODIN', uses_tables: ['goes_green_profiles'], calls_endpoints: ['/api/goes-green/profiles'], description: 'Create GOES GREEN energy profile' },
      { step_name: 'assess_current_state', agent: 'HEIMDALL', uses_tables: ['goes_green_profiles'], description: 'Assess current energy state' },
      { step_name: 'suggest_green_actions', agent: 'ODIN', uses_tables: ['goes_green_actions'], calls_endpoints: ['/api/goes-green/profiles/:id/actions'], description: 'Suggest green energy actions' },
    ],
  },
  {
    name: 'foundation_contribution_v1',
    module: 'zora_foundation',
    description: 'Process a contribution to a foundation project',
    trigger: 'event',
    steps: [
      { step_name: 'validate_contribution', agent: 'TYR', uses_tables: ['foundation_contributions'], description: 'Validate contribution data' },
      { step_name: 'record_contribution', agent: 'THOR', uses_tables: ['foundation_contributions'], calls_endpoints: ['/api/foundation/projects/:id/contributions'], description: 'Record the contribution' },
      { step_name: 'update_impact_log', agent: 'ODIN', uses_tables: ['foundation_impact_log'], description: 'Update project impact log' },
      { step_name: 'create_journal_entry', agent: 'EIVOR', uses_tables: ['journal_entries'], calls_endpoints: ['/api/journal'], description: 'Create audit journal entry' },
    ],
  },
  {
    name: 'agent_task_execution_v1',
    module: 'autonomy',
    description: 'Standard agent task execution workflow',
    trigger: 'schedule',
    steps: [
      { step_name: 'claim_pending_task', agent: 'TYR', uses_tables: ['agent_tasks'], description: 'Claim next pending task from queue' },
      { step_name: 'check_safety_policy', agent: 'TYR', uses_tables: ['agent_task_policies'], description: 'Check if task requires approval' },
      { step_name: 'execute_task', uses_tables: ['agent_tasks'], description: 'Execute the task (agent determined by task)' },
      { step_name: 'record_result', agent: 'EIVOR', uses_tables: ['agent_tasks', 'memory_events'], description: 'Record task result and memory' },
    ],
  },
];

// ============================================================================
// DEPENDENCY DEFINITIONS DATA
// ============================================================================

const DEPENDENCIES: DependencyDefinition[] = [
  { from: 'climate_os', to: 'auth', reason: 'Climate profiles belong to tenants and users' },
  { from: 'climate_os', to: 'agents', reason: 'ODIN generates climate insights and mission suggestions' },
  { from: 'zora_shop', to: 'auth', reason: 'Brands and products belong to tenants' },
  { from: 'zora_shop', to: 'climate_os', reason: 'Products have climate metadata and impact scores' },
  { from: 'zora_shop', to: 'hemp_materials', reason: 'Products can use hemp/climate materials' },
  { from: 'zora_shop', to: 'billing', reason: 'Shop orders generate commissions' },
  { from: 'hemp_materials', to: 'zora_shop', reason: 'Materials are used in products' },
  { from: 'goes_green', to: 'climate_os', reason: 'Energy profiles link to climate profiles' },
  { from: 'goes_green', to: 'organizations_playbooks', reason: 'Energy profiles can belong to organizations' },
  { from: 'quantum_climate_lab', to: 'climate_os', reason: 'Experiments can link to climate profiles' },
  { from: 'quantum_climate_lab', to: 'zora_shop', reason: 'Experiments can link to products and materials' },
  { from: 'zora_foundation', to: 'auth', reason: 'Projects can be tenant-owned or global' },
  { from: 'zora_foundation', to: 'billing', reason: 'Contributions can come from subscriptions' },
  { from: 'zora_foundation', to: 'zora_shop', reason: 'Shop commissions can fund foundation projects' },
  { from: 'climate_academy', to: 'auth', reason: 'Progress tracking requires user authentication' },
  { from: 'climate_academy', to: 'climate_os', reason: 'Learning paths can be recommended based on profile type' },
  { from: 'organizations_playbooks', to: 'auth', reason: 'Organizations belong to tenants' },
  { from: 'organizations_playbooks', to: 'zora_shop', reason: 'Organizations can link to shop brands' },
  { from: 'organizations_playbooks', to: 'autonomy', reason: 'Playbook steps can create agent tasks' },
  { from: 'autonomy', to: 'auth', reason: 'Tasks belong to tenants and can be created by users' },
  { from: 'autonomy', to: 'agents', reason: 'Tasks are executed by agents' },
  { from: 'agents', to: 'auth', reason: 'Agent insights belong to tenants' },
  { from: 'agents', to: 'autonomy', reason: 'Insights can be generated from task execution' },
  { from: 'billing', to: 'auth', reason: 'Subscriptions belong to tenants' },
  { from: 'billing', to: 'zora_foundation', reason: 'Subscription fees can fund foundation' },
  { from: 'seed_onboarding', to: 'climate_os', reason: 'Seeds climate missions and profiles' },
  { from: 'seed_onboarding', to: 'zora_shop', reason: 'Seeds materials and products' },
  { from: 'seed_onboarding', to: 'climate_academy', reason: 'Seeds learning content' },
  { from: 'admin', to: 'auth', reason: 'Admin manages tenants and users' },
  { from: 'observability', to: 'autonomy', reason: 'Monitors agent task execution' },
  { from: 'observability', to: 'climate_os', reason: 'Tracks climate impact metrics' },
  { from: 'journal', to: 'auth', reason: 'Journal entries belong to tenants' },
  { from: 'journal', to: 'agents', reason: 'Agents create journal entries' },
  { from: 'workflows', to: 'autonomy', reason: 'Workflow steps create agent tasks' },
  { from: 'workflows', to: 'agents', reason: 'Steps are assigned to specific agents' },
  { from: 'outcomes', to: 'climate_os', reason: 'Feedback on climate missions' },
  { from: 'outcomes', to: 'workflows', reason: 'Feedback on workflow runs' },
  { from: 'outcomes', to: 'zora_shop', reason: 'Feedback on shop projects' },
];

// ============================================================================
// MANIFEST GENERATOR FUNCTIONS
// ============================================================================

const MANIFEST_VERSION = '2.0.0';

export function getDevManifestV2(): DevManifestV2 {
  return {
    version: MANIFEST_VERSION,
    generated_at: new Date().toISOString(),
    modules: MODULES,
    tables: TABLES,
    api_endpoints: API_ENDPOINTS,
    workflows: WORKFLOWS,
    dependencies: DEPENDENCIES,
  };
}

export function getManifestStatsV2(): DevManifestStats {
  const domains = [...new Set(MODULES.map(m => m.tags.find(t => ['climate', 'shop', 'foundation', 'academy', 'energy', 'autonomy', 'billing', 'organizations', 'auth', 'system', 'workflows'].includes(t)) || 'other'))];
  const agents: NordicAgent[] = ['ODIN', 'THOR', 'FREYA', 'BALDUR', 'HEIMDALL', 'TYR', 'EIVOR'];
  
  return {
    module_count: MODULES.length,
    table_count: TABLES.length,
    endpoint_count: API_ENDPOINTS.length,
    workflow_count: WORKFLOWS.length,
    dependency_count: DEPENDENCIES.length,
    domains,
    agents,
  };
}

export function getModuleByNameV2(name: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.name === name);
}

export function getTablesByModule(moduleName: string): TableDefinition[] {
  return TABLES.filter(t => t.module === moduleName);
}

export function getEndpointsByModule(moduleName: string): ApiEndpointDefinition[] {
  return API_ENDPOINTS.filter(e => e.module === moduleName);
}

export function getWorkflowsByModule(moduleName: string): WorkflowDefinition[] {
  return WORKFLOWS.filter(w => w.module === moduleName);
}

export function getModuleDependencies(moduleName: string): { dependencies: DependencyDefinition[]; dependants: DependencyDefinition[] } {
  return {
    dependencies: DEPENDENCIES.filter(d => d.from === moduleName),
    dependants: DEPENDENCIES.filter(d => d.to === moduleName),
  };
}

export function searchEndpointsV2(query: string): ApiEndpointDefinition[] {
  const lowerQuery = query.toLowerCase();
  return API_ENDPOINTS.filter(e =>
    e.path.toLowerCase().includes(lowerQuery) ||
    e.summary.toLowerCase().includes(lowerQuery) ||
    e.module.toLowerCase().includes(lowerQuery) ||
    e.tags?.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

export function searchTablesV2(query: string): TableDefinition[] {
  const lowerQuery = query.toLowerCase();
  return TABLES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.module.toLowerCase().includes(lowerQuery)
  );
}

export interface ExplainResourceInput {
  type: 'module' | 'table' | 'endpoint' | 'workflow';
  identifier: string;
}

export interface ExplainResourceOutput {
  title: string;
  summary: string;
  module?: string;
  relevant_tables?: string[];
  relevant_endpoints?: string[];
  relevant_workflows?: string[];
  dependencies?: DependencyDefinition[];
}

export function explainResource(input: ExplainResourceInput): ExplainResourceOutput | null {
  switch (input.type) {
    case 'module': {
      const module = MODULES.find(m => m.name === input.identifier);
      if (!module) return null;
      const tables = TABLES.filter(t => t.module === input.identifier).map(t => t.name);
      const endpoints = API_ENDPOINTS.filter(e => e.module === input.identifier).map(e => `${e.method} ${e.path}`);
      const workflows = WORKFLOWS.filter(w => w.module === input.identifier).map(w => w.name);
      const deps = getModuleDependencies(input.identifier);
      return {
        title: module.label,
        summary: module.description,
        module: module.name,
        relevant_tables: tables,
        relevant_endpoints: endpoints,
        relevant_workflows: workflows,
        dependencies: [...deps.dependencies, ...deps.dependants],
      };
    }
    case 'table': {
      const table = TABLES.find(t => t.name === input.identifier);
      if (!table) return null;
      const module = MODULES.find(m => m.name === table.module);
      const relatedEndpoints = API_ENDPOINTS.filter(e => 
        e.tags?.includes(input.identifier) || e.path.includes(input.identifier.replace(/_/g, '-'))
      ).map(e => `${e.method} ${e.path}`);
      return {
        title: table.name,
        summary: table.description,
        module: table.module,
        relevant_tables: table.relations.map(r => r.target_table),
        relevant_endpoints: relatedEndpoints,
      };
    }
    case 'endpoint': {
      const endpoint = API_ENDPOINTS.find(e => e.path === input.identifier);
      if (!endpoint) return null;
      const module = MODULES.find(m => m.name === endpoint.module);
      const relatedTables = endpoint.tags?.filter(t => TABLES.some(tb => tb.name === t)) || [];
      return {
        title: `${endpoint.method} ${endpoint.path}`,
        summary: endpoint.summary,
        module: endpoint.module,
        relevant_tables: relatedTables,
      };
    }
    case 'workflow': {
      const workflow = WORKFLOWS.find(w => w.name === input.identifier);
      if (!workflow) return null;
      const tables = [...new Set(workflow.steps.flatMap(s => s.uses_tables || []))];
      const endpoints = [...new Set(workflow.steps.flatMap(s => s.calls_endpoints || []))];
      return {
        title: workflow.name,
        summary: workflow.description,
        module: workflow.module,
        relevant_tables: tables,
        relevant_endpoints: endpoints,
      };
    }
    default:
      return null;
  }
}
