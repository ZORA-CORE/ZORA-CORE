export type ProfileType = 'person' | 'brand' | 'organization';
export type ProfileScope = 'individual' | 'household' | 'organization' | 'brand';
export type MissionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export type JournalCategory =
  | 'release'
  | 'decision'
  | 'model_update'
  | 'experiment'
  | 'milestone'
  | 'incident'
  | 'config_change'
  | 'agent_action'
  | 'user_feedback'
  | 'system_event'
  | 'autonomy';

export interface ClimateProfile {
  id: string;
  tenant_id: string;
  owner_id: string | null;
  profile_type: ProfileType;
  name: string;
  description: string | null;
  energy_source: string | null;
  transport_mode: string | null;
  diet_type: string | null;
  location_type: string | null;
  climate_score: number | null;
  estimated_footprint_kg: number | null;
  country: string | null;
  city_or_region: string | null;
  household_size: number | null;
  primary_energy_source: string | null;
  notes: string | null;
  // Multi-profile fields (v0.3)
  scope: ProfileScope;
  is_primary: boolean;
  organization_name: string | null;
  sector: string | null;
  website_url: string | null;
  logo_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateProfileInput {
  owner_id?: string;
  profile_type?: ProfileType;
  name: string;
  description?: string;
  energy_source?: string;
  transport_mode?: string;
  diet_type?: string;
  location_type?: string;
  climate_score?: number;
  estimated_footprint_kg?: number;
  country?: string;
  city_or_region?: string;
  household_size?: number;
  primary_energy_source?: string;
  notes?: string;
  // Multi-profile fields (v0.3)
  scope?: ProfileScope;
  is_primary?: boolean;
  organization_name?: string;
  sector?: string;
  website_url?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateProfileInput {
  owner_id?: string;
  profile_type?: ProfileType;
  name?: string;
  description?: string;
  energy_source?: string;
  transport_mode?: string;
  diet_type?: string;
  location_type?: string;
  climate_score?: number;
  estimated_footprint_kg?: number;
  country?: string;
  city_or_region?: string;
  household_size?: number;
  primary_energy_source?: string;
  notes?: string;
  // Multi-profile fields (v0.3)
  scope?: ProfileScope;
  is_primary?: boolean;
  organization_name?: string;
  sector?: string;
  website_url?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
}

export type MissionCategory = 'energy' | 'transport' | 'food' | 'products' | 'other';

export interface ClimateMission {
  id: string;
  tenant_id: string;
  profile_id: string;
  title: string;
  description: string | null;
  category: MissionCategory | string | null;
  status: MissionStatus;
  started_at: string | null;
  completed_at: string | null;
  impact_estimate: Record<string, unknown>;
  estimated_impact_kgco2: number | null;
  due_date: string | null;
  verified: boolean;
  verified_by: string | null;
  verification_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateMissionInput {
  title: string;
  description?: string;
  category?: MissionCategory | string;
  status?: MissionStatus;
  impact_estimate?: Record<string, unknown>;
  estimated_impact_kgco2?: number;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMissionInput {
  title?: string;
  description?: string;
  category?: MissionCategory | string;
  status?: MissionStatus;
  started_at?: string;
  completed_at?: string;
  impact_estimate?: Record<string, unknown>;
  estimated_impact_kgco2?: number;
  due_date?: string;
  verified?: boolean;
  verified_by?: string;
  verification_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface BootstrapMissionsResponse {
  created: boolean;
  reason?: string;
  existing_count?: number;
  profile_id?: string;
  profile_name?: string;
  missions?: ClimateMission[];
}

export interface DashboardSummary {
  total_missions: number;
  completed_count: number;
  in_progress_count: number;
  total_impact_kgco2: number;
}

export interface JournalEntry {
  id: string;
  category: JournalCategory;
  title: string;
  body: string | null;
  details: Record<string, unknown>;
  related_memory_ids: string[];
  related_entity_ids: string[];
  author: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface StatusResponse {
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  supabase: {
    connected: boolean;
    url: string;
  };
  // Version info for deployment verification (v0.16)
  api_version: string;
  git_commit: string;
  build_time: string;
  iteration: string;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export type AgentId = 'odin' | 'thor' | 'freya' | 'baldur' | 'heimdall' | 'tyr' | 'eivor';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  pronouns: string;
  color: string;
}

export type MemoryType =
  | 'decision'
  | 'reflection'
  | 'artifact'
  | 'conversation'
  | 'plan'
  | 'result'
  | 'research'
  | 'design'
  | 'safety_review'
  | 'climate_data'
  | 'brand_data';

export interface MemoryEvent {
  id: string;
  agent: string;
  memory_type: MemoryType;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface MemoryEventWithSimilarity extends MemoryEvent {
  similarity: number;
}

export interface SemanticSearchResponse {
  data: MemoryEventWithSimilarity[];
  query: string;
  model: string;
}

export interface AgentsResponse {
  data: Agent[];
}

export type UserRole = 'founder' | 'brand_admin' | 'viewer';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
  user_count?: number;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  metadata: Record<string, unknown>;
  last_login_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AdminStatusResponse {
  jwt_secret_configured: boolean;
  bootstrap_secret_configured: boolean;
  supabase_connected: boolean;
  tenants_exist: boolean;
  founder_exists: boolean;
  tenant_count: number;
  user_count: number;
}

export interface BootstrapTenantInput {
  tenant_name: string;
  founder_email: string;
}

export interface BootstrapResponse {
  message: string;
  tenant: Tenant;
  user: User;
}

export interface CreateUserInput {
  tenant_id: string;
  email: string;
  display_name?: string;
  role: UserRole;
}

export interface TokenResponse {
  token: string;
  user: User;
  tenant: Tenant;
  expires_at: string;
}

export interface HomePageConfig {
  hero_title: string;
  hero_subtitle: string;
  primary_cta_label: string;
  primary_cta_link: string;
  secondary_cta_label?: string;
  secondary_cta_link?: string;
  show_climate_dashboard: boolean;
  show_missions_section: boolean;
  // New sections for Iteration 0018 redesign
  show_value_strip: boolean;
  show_for_whom_section: boolean;
  show_climate_os_section: boolean;
  show_agents_section: boolean;
  show_mashup_section: boolean;
  show_faq_section: boolean;
  faq_items?: Array<{ question: string; answer: string }>;
}

export interface ClimatePageConfig {
  hero_title: string;
  hero_subtitle: string;
  show_profile_section: boolean;
  show_dashboard_section: boolean;
  show_missions_section: boolean;
}

export interface DashboardPageConfig {
  hero_title: string;
  hero_subtitle: string;
  primary_cta_label: string;
  primary_cta_link: string;
  show_stats_section: boolean;
  show_agents_section: boolean;
  show_recent_activity_section: boolean;
}

export interface AgentsPageConfig {
  hero_title: string;
  hero_subtitle: string;
  show_memory_search: boolean;
  show_recent_memories: boolean;
}

export interface JournalPageConfig {
  hero_title: string;
  hero_subtitle: string;
  entries_per_page: number;
}

export interface MashupsPageConfig {
  hero_title: string;
  hero_subtitle: string;
  show_brand_filter: boolean;
  show_climate_scores: boolean;
}

export interface LoginPageConfig {
  hero_title: string;
  hero_subtitle: string;
  show_admin_link: boolean;
  show_public_mashups_link: boolean;
}

export interface FrontendConfigResponse {
  page: string;
  config: HomePageConfig | ClimatePageConfig | Record<string, unknown>;
  id?: string;
  tenant_id?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface UpdateFrontendConfigInput {
  config: HomePageConfig | ClimatePageConfig | Record<string, unknown>;
}

// Agent Autonomy Layer types
export type SuggestionStatus = 'proposed' | 'applied' | 'rejected';
export type SuggestionType = 'frontend_config_change';

export interface AgentSuggestion {
  id: string;
  agent_id: string;
  suggestion_type: SuggestionType;
  target_page: string | null;
  current_config: Record<string, unknown> | null;
  suggested_config: Record<string, unknown>;
  diff_summary: string | null;
  status: SuggestionStatus;
  decision_by_user_id: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AgentSuggestionListItem {
  id: string;
  agent_id: string;
  suggestion_type: SuggestionType;
  target_page: string | null;
  diff_summary: string | null;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string | null;
}

export interface CreateSuggestionInput {
  page: string;
  agent_id?: string;
}

export interface SuggestionDecisionInput {
  decision: 'apply' | 'reject';
  reason?: string;
}

export interface SuggestionDecisionResponse {
  success: boolean;
  message: string;
  suggestion_id: string;
  status: SuggestionStatus;
}

export interface AgentSuggestionsListResponse {
  data: AgentSuggestionListItem[];
}

// Schema health check types
export interface SchemaStatusResponse {
  schema_ok: boolean;
  missing_tables: string[];
  missing_columns: string[];
  checked_at: string;
}

// Mashup Shop types (v0.17)
export type ProductStatus = 'draft' | 'active' | 'archived';

export interface Brand {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  climate_tagline: string | null;
  sector: string | null;
  country: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBrandInput {
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  climate_tagline?: string;
  sector?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBrandInput {
  name?: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  climate_tagline?: string;
  sector?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductBrand {
  id: string;
  product_id: string;
  brand_id: string;
  role: string;
  created_at: string;
  brand?: Brand;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  primary_image_url: string | null;
  status: ProductStatus;
  climate_score: number | null;
  estimated_impact_kgco2: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
  product_brands?: ProductBrand[];
}

export interface BrandAssociation {
  brand_id: string;
  role?: string;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  short_description?: string;
  long_description?: string;
  primary_image_url?: string;
  status?: ProductStatus;
  climate_score?: number;
  estimated_impact_kgco2?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  brands?: BrandAssociation[];
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  short_description?: string;
  long_description?: string;
  primary_image_url?: string;
  status?: ProductStatus;
  climate_score?: number;
  estimated_impact_kgco2?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  brands?: BrandAssociation[];
}

export interface BrandsListResponse {
  data: Brand[];
  count: number;
}

export interface ProductsListResponse {
  data: Product[];
  count: number;
}

// Shop Materials types (Cockpit v1)
export interface ShopMaterial {
  id: string;
  name: string;
  category: string;
  description: string | null;
  sustainability_score: number | null;
  carbon_footprint_per_kg: number | null;
  is_renewable: boolean;
  is_recyclable: boolean;
  certifications: string[] | null;
  created_at: string;
}

export interface ShopMaterialsResponse {
  data: ShopMaterial[];
  count: number;
}

// Public Mashup API types (v0.18)
export interface PublicBrandInfo {
  id: string;
  name: string;
  slug: string | null;
  sector: string | null;
  country: string | null;
  climate_tagline: string | null;
  logo_url?: string | null;
  website_url?: string | null;
}

export interface PublicProductBrand {
  id: string;
  role: string;
  brand: PublicBrandInfo | PublicBrandInfo[] | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  primary_image_url: string | null;
  climate_score: number | null;
  estimated_impact_kgco2: number | null;
  created_at: string;
  product_brands: PublicProductBrand[];
}

export interface PublicBrand {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  climate_tagline: string | null;
  sector: string | null;
  country: string | null;
}

export interface PublicProductsResponse {
  data: PublicProduct[];
  count: number;
}

export interface PublicBrandsResponse {
  data: PublicBrand[];
  count: number;
}

export interface PublicMashupStats {
  products_count: number;
  brands_count: number;
  sectors: string[];
  countries: string[];
}

// Agent Runtime v1 types (Iteration 0019/0020)
export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface AgentTask {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_type: string;
  status: AgentTaskStatus;
  priority: number;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  result_summary: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AgentTaskListItem {
  id: string;
  agent_id: string;
  task_type: string;
  status: AgentTaskStatus;
  priority: number;
  title: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateAgentTaskInput {
  agent_id: string;
  task_type: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
  priority?: number;
}

export interface AgentTasksListResponse {
  data: AgentTaskListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface AgentTaskResponse {
  data: AgentTask;
}

export interface AgentTaskStatusCounts {
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  total: number;
}

// Agent Insights v1 types (Iteration 0022)
export type AgentInsightStatus = 'proposed' | 'accepted' | 'rejected' | 'implemented';
export type AgentInsightCategory = 'climate_mission_suggestion' | 'frontend_improvement' | 'plan' | 'summary' | 'system_health' | 'safety_warning';

export interface AgentInsight {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string | null;
  agent_id: string;
  source_task_id: string | null;
  category: AgentInsightCategory;
  title: string;
  body: string | null;
  status: AgentInsightStatus;
  related_entity_type: string | null;
  related_entity_ref: string | null;
  impact_estimate_kgco2: number | null;
  metadata: Record<string, unknown>;
}

export interface AgentInsightListItem {
  id: string;
  agent_id: string;
  category: AgentInsightCategory;
  title: string;
  status: AgentInsightStatus;
  related_entity_type: string | null;
  impact_estimate_kgco2: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface AgentInsightDecisionInput {
  decision: 'accept' | 'reject';
  reason?: string;
}

export interface AgentInsightsListResponse {
  data: AgentInsightListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface AgentInsightResponse {
  data: AgentInsight;
  created_mission_id?: string | null;
}

export interface AgentInsightStatusCounts {
  proposed: number;
  accepted: number;
  rejected: number;
  implemented: number;
  total: number;
}

// Agent Command Console v1 types (Iteration 0023)
export type AgentCommandStatus = 'received' | 'parsing' | 'tasks_created' | 'failed';

export interface AgentCommand {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string | null;
  created_by_user_id: string | null;
  raw_prompt: string;
  target_agents: string[] | null;
  status: AgentCommandStatus;
  parsed_summary: string | null;
  tasks_created_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface AgentCommandListItem {
  id: string;
  raw_prompt: string;
  target_agents: string[] | null;
  status: AgentCommandStatus;
  parsed_summary: string | null;
  tasks_created_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface CreateAgentCommandInput {
  raw_prompt: string;
  target_agents?: string[];
}

export interface AgentCommandsListResponse {
  data: AgentCommandListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface AgentCommandResponse {
  data: {
    command: AgentCommand;
    tasks_created: AgentTaskListItem[];
    summary: string;
  };
}

export interface AgentCommandDetailResponse {
  data: AgentCommand;
  tasks: AgentTaskListItem[];
}

// Admin Impact & System Metrics types (Iteration 00F1 - ZORA Desk)
export interface ImpactSummary {
  climate_os: {
    profiles_count: number;
    missions_count: number;
    missions_completed: number;
    missions_in_progress: number;
    total_impact_kgco2: number;
  };
  goes_green: {
    profiles_count: number;
    actions_count: number;
    estimated_energy_savings_kwh: number;
    green_share_percent: number;
  };
  zora_shop: {
    brands_count: number;
    products_count: number;
    active_projects_count: number;
    total_gmv: number;
  };
  foundation: {
    projects_count: number;
    contributions_count: number;
    total_contributions_amount: number;
    total_impact_kgco2: number;
  };
  academy: {
    topics_count: number;
    lessons_count: number;
    learning_paths_count: number;
    enrollments_count: number;
  };
  computed_at: string;
}

export interface SystemMetrics {
  agent_commands: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  agent_tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
  schedules: {
    total: number;
    active: number;
    due_now: number;
  };
  safety_policies: {
    total: number;
    active: number;
  };
  pending_approvals: number;
  computed_at: string;
}

export interface AutonomyStatus {
  schedules: {
    total: number;
    active: number;
    due_now: number;
  };
  safety_policies: {
    total: number;
    active: number;
  };
  agent_tasks: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
  pending_approvals: number;
}

// Agent Panel types (Cockpit v1)
export type AgentPanelContext = 'climate' | 'goes_green' | 'shop' | 'foundation' | 'academy' | 'simulation';

export type AgentPanelStrategyType = 'mission' | 'goes_green_action' | 'material_change' | 'foundation_project' | 'learning_path';

export interface AgentPanelSuggestion {
  id: string;
  type: AgentPanelStrategyType;
  title: string;
  summary: string;
  category: string | null;
  score: number;
  impact_kgco2: number | null;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentPanelSuggestInput {
  context: AgentPanelContext;
  prompt: string;
  profile_id?: string;
  tags?: string[];
}

export interface AgentPanelSuggestResponse {
  suggestions: AgentPanelSuggestion[];
  context: AgentPanelContext;
  similar_tenants_used: number;
  algorithm: string;
}

// GOES GREEN types (Cockpit v1)
export type GoesGreenProfileType = 'household' | 'organization';
export type GoesGreenAssetStatus = 'existing' | 'planned' | 'under_evaluation' | 'retired';
export type GoesGreenActionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface GoesGreenProfile {
  id: string;
  tenant_id: string;
  profile_type: GoesGreenProfileType;
  name: string;
  organization_id: string | null;
  climate_profile_id: string | null;
  country: string | null;
  city_or_region: string | null;
  annual_energy_kwh: number | null;
  primary_energy_source: string | null;
  grid_renewable_share_percent: number | null;
  target_green_share_percent: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateGoesGreenProfileInput {
  profile_type: GoesGreenProfileType;
  name: string;
  organization_id?: string;
  climate_profile_id?: string;
  country?: string;
  city_or_region?: string;
  annual_energy_kwh?: number;
  primary_energy_source?: string;
  grid_renewable_share_percent?: number;
  target_green_share_percent?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface GoesGreenAction {
  id: string;
  tenant_id: string;
  goes_green_profile_id: string;
  action_type: string;
  title: string;
  description: string | null;
  status: GoesGreenActionStatus;
  estimated_impact_kgco2: number | null;
  target_date: string | null;
  completed_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateGoesGreenActionInput {
  action_type: string;
  title: string;
  description?: string;
  status?: GoesGreenActionStatus;
  estimated_impact_kgco2?: number;
  target_date?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface GoesGreenProfilesResponse {
  data: GoesGreenProfile[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface GoesGreenActionsResponse {
  data: GoesGreenAction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

// Foundation types (Cockpit v1)
export type FoundationProjectStatus = 'planned' | 'active' | 'completed' | 'paused' | 'cancelled';

export interface FoundationProject {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: FoundationProjectStatus;
  climate_focus_domain: string | null;
  location_country: string | null;
  location_region: string | null;
  sdg_tags: string[] | null;
  estimated_impact_kgco2: number | null;
  verified_impact_kgco2: number | null;
  impact_methodology: string | null;
  external_url: string | null;
  image_url: string | null;
  min_contribution_amount_cents: number;
  currency: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
  contribution_count?: number;
  total_contributions_cents?: number;
}

export interface CreateFoundationProjectInput {
  title: string;
  description?: string;
  category: string;
  climate_focus_domain?: string;
  location_country?: string;
  location_region?: string;
  sdg_tags?: string[];
  estimated_impact_kgco2?: number;
  impact_methodology?: string;
  external_url?: string;
  image_url?: string;
  min_contribution_amount_cents?: number;
  currency?: string;
  tags?: string[];
}

export interface FoundationContribution {
  id: string;
  tenant_id: string;
  project_id: string;
  amount_cents: number;
  currency: string;
  source_type: string;
  source_reference: string | null;
  contributor_label: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  contributed_at: string;
  created_at: string;
}

export interface CreateFoundationContributionInput {
  amount_cents: number;
  currency?: string;
  source_type: string;
  source_reference?: string;
  contributor_label?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface FoundationProjectsResponse {
  data: FoundationProject[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

// Academy types (Cockpit v1)
export type AcademyContentType = 'video' | 'article' | 'quiz' | 'interactive' | 'podcast';
export type AcademyDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AcademyLesson {
  id: string;
  tenant_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  content_type: AcademyContentType;
  source_type: string;
  source_url: string | null;
  duration_minutes_estimated: number | null;
  language_code: string | null;
  difficulty_level: AcademyDifficultyLevel | null;
  primary_topic_code: string | null;
  tags: string[] | null;
  is_active: boolean;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface AcademyModule {
  id: string;
  tenant_id: string | null;
  code: string;
  title: string;
  description: string | null;
  primary_topic_code: string | null;
  target_audience: string | null;
  estimated_duration_minutes: number | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface AcademyLearningPath {
  id: string;
  tenant_id: string | null;
  code: string;
  title: string;
  description: string | null;
  target_audience: string | null;
  estimated_duration_minutes: number | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface AcademyUserProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  entity_type: 'lesson' | 'module' | 'learning_path';
  entity_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface AcademyLessonsResponse {
  data: AcademyLesson[];
}

export interface AcademyModulesResponse {
  data: AcademyModule[];
}

export interface AcademyLearningPathsResponse {
  data: AcademyLearningPath[];
}

export interface AcademyProgressResponse {
  data: AcademyUserProgress[];
}
