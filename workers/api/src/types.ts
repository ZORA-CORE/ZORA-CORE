export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY?: string;
  ZORA_JWT_SECRET?: string;
  ZORA_BOOTSTRAP_SECRET?: string;
  ENVIRONMENT: string;
  // Version info bindings (v0.16) - optional, can be set in Cloudflare dashboard
  ZORA_API_GIT_COMMIT?: string;
  ZORA_API_BUILD_TIME?: string;
  // Public mashup mode (v0.18) - slug of tenant to expose publicly
  PUBLIC_TENANT_SLUG?: string;
};

export type UserRole = 'founder' | 'brand_admin' | 'member' | 'viewer';
export type AccountType = 'private' | 'company';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tenant_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  account_type: string | null;
  password_hash?: string;
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

export type AppEnv = {
  Bindings: Bindings;
};

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

export interface ClimateMission {
  id: string;
  tenant_id: string;
  profile_id: string;
  title: string;
  description: string | null;
  category: string | null;
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
  category?: string;
  status?: MissionStatus;
  impact_estimate?: Record<string, unknown>;
  estimated_impact_kgco2?: number;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMissionInput {
  title?: string;
  description?: string;
  category?: string;
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

export interface PaginationParams {
  limit: number;
  offset: number;
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

export interface ApiError {
  error: string;
  message: string;
  status: number;
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

export type AgentId = 'connor' | 'lumina' | 'eivor' | 'oracle' | 'aegis' | 'sam';

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

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
}

export interface SemanticSearchResponse {
  data: MemoryEventWithSimilarity[];
  query: string;
  model: string;
}

export interface HomePageConfig {
  hero_title: string;
  hero_subtitle: string;
  primary_cta_label: string;
  primary_cta_link: string;
  show_climate_dashboard: boolean;
  show_missions_section: boolean;
}

export interface ClimatePageConfig {
  hero_title: string;
  hero_subtitle: string;
  show_profile_section: boolean;
  show_dashboard_section: boolean;
  show_missions_section: boolean;
}

export type FrontendPageConfig = HomePageConfig | ClimatePageConfig;

export interface FrontendConfig {
  id: string;
  tenant_id: string;
  page: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface FrontendConfigResponse {
  page: string;
  config: Record<string, unknown>;
  id?: string;
  tenant_id?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface UpdateFrontendConfigInput {
  config: Record<string, unknown>;
}

// Agent Autonomy Layer types
export type SuggestionStatus = 'proposed' | 'applied' | 'rejected';
export type SuggestionType = 'frontend_config_change';

export interface AgentSuggestion {
  id: string;
  tenant_id: string;
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

export interface CreateSuggestionInput {
  page: string;
  agent_id?: string;
}

export interface SuggestionDecisionInput {
  decision: 'apply' | 'reject';
  reason?: string;
}

export interface AgentSuggestionResponse {
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

export interface ClimateContext {
  profile_name: string | null;
  total_missions: number;
  completed_missions: number;
  total_impact_kgco2: number;
  categories: string[];
}

// Schema health check types
export interface SchemaStatusResponse {
  schema_ok: boolean;
  missing_tables: string[];
  missing_columns: string[];
  checked_at: string;
}

// Agent Runtime v1 types
export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface AgentTask {
  id: string;
  tenant_id: string;
  command_id: string | null;  // FK to agent_commands.id (Task Execution Engine v1.0)
  agent_id: string;
  task_type: string;
  status: AgentTaskStatus;
  priority: number;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;  // Structured execution result (Task Execution Engine v1.0)
  result_summary: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  // Safety Layer v1 fields (Iteration 00B5)
  requires_approval: boolean;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  decision_reason: string | null;
}

export interface CreateAgentTaskInput {
  agent_id: string;
  task_type: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
  priority?: number;
}

export interface AgentTaskListItem {
  id: string;
  agent_id: string;
  task_type: string;
  status: AgentTaskStatus;
  priority: number;
  title: string;
  command_id: string | null;  // FK to agent_commands.id (Task Execution Engine v1.0)
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AgentTaskFilters {
  agent_id?: string;
  status?: AgentTaskStatus;
  task_type?: string;
}

// Agent Insights v1 types (Iteration 0022)
export type AgentInsightStatus = 'proposed' | 'accepted' | 'rejected' | 'implemented';

export interface AgentInsight {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string | null;
  agent_id: string;
  source_task_id: string | null;
  category: string;
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
  category: string;
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

export interface AgentInsightFilters {
  agent_id?: string;
  status?: AgentInsightStatus;
  category?: string;
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

export interface AgentCommandResponse {
  command: AgentCommand;
  tasks_created: AgentTaskListItem[];
  summary: string;
}

export interface AgentCommandFilters {
  status?: AgentCommandStatus;
}

// Climate OS Backend v1.0 types (Iteration 00B2)
export type ClimatePlanStatus = 'proposed' | 'active' | 'archived';
export type ClimatePlanItemStatus = 'planned' | 'completed' | 'skipped';
export type ClimatePlanType = 'weekly' | 'monthly';

export interface ClimatePlan {
  id: string;
  tenant_id: string;
  profile_id: string;
  plan_type: ClimatePlanType;
  period_start: string;
  period_end: string;
  status: ClimatePlanStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface ClimatePlanItem {
  id: string;
  plan_id: string;
  mission_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  estimated_impact_kgco2: number | null;
  status: ClimatePlanItemStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface ClimatePlanWithItems extends ClimatePlan {
  items: ClimatePlanItem[];
}

export interface ProfileSummary {
  profile_id: string;
  total_missions: number;
  missions_completed: number;
  missions_in_progress: number;
  missions_planned: number;
  missions_cancelled: number;
  missions_failed: number;
  total_estimated_impact_kgco2: number;
}

export interface TimeseriesPoint {
  period_start: string;
  missions_completed: number;
  estimated_impact_kgco2_completed: number;
}

export interface ProfileTimeseries {
  profile_id: string;
  granularity: 'day' | 'week' | 'month';
  points: TimeseriesPoint[];
}

export interface SuggestWeeklyPlanInput {
  period_start?: string;
  period_end?: string;
}

export interface ApplyPlanInput {
  create_missions?: boolean;
}

export interface ClimatePlanFilters {
  status?: ClimatePlanStatus;
  plan_type?: ClimatePlanType;
}

// ============================================================================
// ZORA SHOP Backend v1.0 types (Iteration 00B3)
// ============================================================================

// Brand types
export interface Brand {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  country: string | null;
  sector: string | null;
  climate_tagline: string | null;
  website_url: string | null;
  logo_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBrandInput {
  name: string;
  slug?: string;
  description?: string;
  country?: string;
  sector?: string;
  climate_tagline?: string;
  website_url?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBrandInput {
  name?: string;
  slug?: string;
  description?: string;
  country?: string;
  sector?: string;
  climate_tagline?: string;
  website_url?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
}

export interface BrandFilters {
  sector?: string;
  country?: string;
}

// Material types
export interface Material {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateMaterialInput {
  name: string;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMaterialInput {
  name?: string;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface MaterialFilters {
  category?: string;
}

// Product types
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  id: string;
  tenant_id: string;
  brand_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  long_description: string | null;
  price_currency: string;
  price_amount: number | null;
  primary_image_url: string | null;
  status: string;
  climate_score: number | null;
  estimated_impact_kgco2: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface ProductMaterial {
  id: string;
  tenant_id: string;
  product_id: string;
  material_id: string;
  percentage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ProductClimateMeta {
  id: string;
  tenant_id: string;
  product_id: string;
  climate_label: string | null;
  estimated_impact_kgco2: number | null;
  certifications: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface ProductMaterialInput {
  material_id: string;
  percentage?: number;
  notes?: string;
}

export interface ProductClimateMetaInput {
  climate_label?: string;
  estimated_impact_kgco2?: number;
  certifications?: string;
  notes?: string;
}

export interface CreateProductInput {
  brand_id: string;
  name: string;
  slug?: string;
  description?: string;
  price_currency?: string;
  price_amount?: number;
  primary_image_url?: string;
  status?: ProductStatus;
  materials?: ProductMaterialInput[];
  climate_meta?: ProductClimateMetaInput;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductInput {
  brand_id?: string;
  name?: string;
  slug?: string;
  description?: string;
  price_currency?: string;
  price_amount?: number;
  primary_image_url?: string;
  status?: ProductStatus;
  materials?: ProductMaterialInput[];
  climate_meta?: ProductClimateMetaInput;
  metadata?: Record<string, unknown>;
}

export interface ProductFilters {
  brand_id?: string;
  status?: ProductStatus;
}

export interface ProductWithDetails extends Product {
  brand?: Brand | null;
  materials?: (ProductMaterial & { material: Material })[];
  climate_meta?: ProductClimateMeta | null;
}

// ZORA SHOP Project types
export type ZoraShopProjectStatus = 'idea' | 'brief' | 'concept' | 'review' | 'launched' | 'archived';

export interface ZoraShopProject {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  primary_brand_id: string;
  secondary_brand_id: string | null;
  theme: string | null;
  target_launch_date: string | null;
  launched_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateZoraShopProjectInput {
  title: string;
  description?: string;
  status?: ZoraShopProjectStatus;
  primary_brand_id: string;
  secondary_brand_id?: string;
  theme?: string;
  target_launch_date?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateZoraShopProjectInput {
  title?: string;
  description?: string;
  status?: ZoraShopProjectStatus;
  primary_brand_id?: string;
  secondary_brand_id?: string;
  theme?: string;
  target_launch_date?: string;
  launched_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ZoraShopProjectFilters {
  status?: ZoraShopProjectStatus;
  primary_brand_id?: string;
}

export interface ZoraShopProjectWithBrands extends ZoraShopProject {
  primary_brand?: Brand | null;
  secondary_brand?: Brand | null;
}

export interface UpdateProjectStatusInput {
  status: ZoraShopProjectStatus;
}

// ============================================================================
// Safety + Scheduling v1 types (Iteration 00B5)
// ============================================================================

// Task Policy types
export interface AgentTaskPolicy {
  id: string;
  tenant_id: string | null;  // null = global policy
  task_type: string;
  auto_execute: boolean;
  max_risk_level: number | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

// Autonomy Schedule types
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface AutonomySchedule {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  schedule_type: string;
  frequency: ScheduleFrequency;
  cron_hint: string | null;
  enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface CreateAutonomyScheduleInput {
  profile_id?: string;
  schedule_type: string;
  frequency: ScheduleFrequency;
  cron_hint?: string;
  enabled?: boolean;
  next_run_at: string;
  config?: Record<string, unknown>;
}

export interface UpdateAutonomyScheduleInput {
  profile_id?: string;
  schedule_type?: string;
  frequency?: ScheduleFrequency;
  cron_hint?: string;
  enabled?: boolean;
  next_run_at?: string;
  config?: Record<string, unknown>;
}

export interface AutonomyScheduleFilters {
  schedule_type?: string;
  enabled?: boolean;
}

export interface AutonomyScheduleListItem {
  id: string;
  profile_id: string | null;
  schedule_type: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  created_at: string;
}

// Task Decision types
export interface TaskDecisionInput {
  decision: 'approve' | 'reject';
  reason?: string;
}

export interface TaskDecisionResponse {
  data: AgentTask;
  decision: {
    action: 'approved' | 'rejected';
    message: string;
  };
}
