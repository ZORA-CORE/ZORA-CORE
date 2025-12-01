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
  schema_version: string | null;
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

// ============================================================================
// Hemp & Climate Materials v1 types (Iteration 00C1)
// ============================================================================

// Hemp material category types
export type HempCategory = 'fiber' | 'bioplastic' | 'construction' | 'paper_packaging' | 'other_industrial';

// Extended Material type with hemp fields
export interface HempMaterial extends Material {
  is_hemp_or_cannabis_material: boolean;
  hemp_category: HempCategory | null;
  climate_benefit_note: string | null;
}

// Climate Material Profile - per-material climate impact data
export interface ClimateMaterialProfile {
  id: string;
  tenant_id: string;
  material_id: string;
  baseline_unit: string;
  baseline_co2_kg_per_unit: number | null;
  reference_material_name: string | null;
  co2_savings_vs_reference_kg_per_unit: number | null;
  water_savings_l_per_unit: number | null;
  land_savings_m2_per_unit: number | null;
  data_source_label: string | null;
  data_source_url: string | null;
  created_at: string;
  updated_at: string | null;
}

// Input for creating/updating climate material profiles
export interface UpsertClimateMaterialProfileInput {
  baseline_unit?: string;
  baseline_co2_kg_per_unit?: number;
  reference_material_name?: string;
  co2_savings_vs_reference_kg_per_unit?: number;
  water_savings_l_per_unit?: number;
  land_savings_m2_per_unit?: number;
  data_source_label?: string;
  data_source_url?: string;
}

// Filters for climate material profiles
export interface ClimateMaterialProfileFilters {
  material_id?: string;
  hemp_only?: boolean;
}

// Hemp material filters
export interface HempMaterialFilters {
  hemp_category?: HempCategory;
}

// Extended ProductClimateMeta with derived material impact
export interface ProductClimateMetaWithDerived extends ProductClimateMeta {
  derived_material_impact_kgco2: number | null;
}

// Material mission types
export type MaterialMissionType = 'switch_material' | 'increase_hemp_share' | 'pilot_hemp_product';

// Extended ClimateMission with material-switch fields
export interface MaterialSwitchMission extends ClimateMission {
  material_mission_type: MaterialMissionType | null;
  from_material_id: string | null;
  to_material_id: string | null;
  material_quantity: number | null;
  material_quantity_unit: string | null;
  estimated_savings_kgco2: number | null;
}

// Input for creating material-switch missions
export interface CreateMaterialSwitchMissionInput extends CreateMissionInput {
  material_mission_type?: MaterialMissionType;
  from_material_id?: string;
  to_material_id?: string;
  material_quantity?: number;
  material_quantity_unit?: string;
  estimated_savings_kgco2?: number;
}

// Input for updating material-switch missions
export interface UpdateMaterialSwitchMissionInput extends UpdateMissionInput {
  material_mission_type?: MaterialMissionType;
  from_material_id?: string;
  to_material_id?: string;
  material_quantity?: number;
  material_quantity_unit?: string;
  estimated_savings_kgco2?: number;
}

// Material impact estimation response
export interface MaterialImpactEstimate {
  material_id?: string;
  product_id?: string;
  total_co2_kg: number | null;
  breakdown: MaterialImpactBreakdown[];
  data_completeness: 'full' | 'partial' | 'none';
}

export interface MaterialImpactBreakdown {
  material_id: string;
  material_name: string;
  percentage: number | null;
  co2_kg_per_unit: number | null;
  contribution_kg: number | null;
}

// Climate material profile with material details
export interface ClimateMaterialProfileWithMaterial extends ClimateMaterialProfile {
  material?: HempMaterial;
}

// ============================================================================
// Quantum Climate Lab v1 types (Iteration 00C2)
// ============================================================================

// Problem domains for climate experiments
export type ExperimentProblemDomain = 
  | 'energy_optimization' 
  | 'transport_routing' 
  | 'material_mix' 
  | 'supply_chain' 
  | 'scenario_modeling';

// Method families for climate experiments
export type ExperimentMethodFamily = 
  | 'classical' 
  | 'quantum_inspired' 
  | 'quantum_hardware';

// Experiment status
export type ExperimentStatus = 
  | 'draft' 
  | 'design' 
  | 'running' 
  | 'analyzing' 
  | 'completed' 
  | 'archived';

// Method types for experiment runs
export type ExperimentMethodType = 
  | 'linear_programming' 
  | 'greedy_heuristic' 
  | 'quantum_annealing' 
  | 'qaoa' 
  | 'vqe' 
  | 'other_quantum';

// Run status
export type ExperimentRunStatus = 
  | 'queued' 
  | 'running' 
  | 'completed' 
  | 'failed';

// Climate experiment
export interface ClimateExperiment {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  problem_domain: ExperimentProblemDomain;
  method_family: ExperimentMethodFamily;
  status: ExperimentStatus;
  linked_profile_id: string | null;
  linked_product_id: string | null;
  linked_material_id: string | null;
  tags: string[] | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Climate experiment with run count
export interface ClimateExperimentWithRunCount extends ClimateExperiment {
  run_count?: number;
}

// Climate experiment run
export interface ClimateExperimentRun {
  id: string;
  tenant_id: string;
  experiment_id: string;
  run_label: string | null;
  method_type: ExperimentMethodType | string;
  backend_provider: string | null;
  input_summary: Record<string, unknown> | null;
  parameters: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  evaluation: Record<string, unknown> | null;
  status: ExperimentRunStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Input for creating a climate experiment
export interface CreateClimateExperimentInput {
  title: string;
  description?: string;
  problem_domain: ExperimentProblemDomain;
  method_family: ExperimentMethodFamily;
  status?: ExperimentStatus;
  linked_profile_id?: string;
  linked_product_id?: string;
  linked_material_id?: string;
  tags?: string[];
}

// Input for updating a climate experiment
export interface UpdateClimateExperimentInput {
  title?: string;
  description?: string;
  problem_domain?: ExperimentProblemDomain;
  method_family?: ExperimentMethodFamily;
  status?: ExperimentStatus;
  linked_profile_id?: string | null;
  linked_product_id?: string | null;
  linked_material_id?: string | null;
  tags?: string[];
}

// Input for creating a climate experiment run
export interface CreateClimateExperimentRunInput {
  run_label?: string;
  method_type: string;
  backend_provider?: string;
  input_summary?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  status?: ExperimentRunStatus;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

// Filters for listing climate experiments
export interface ClimateExperimentFilters {
  status?: ExperimentStatus;
  problem_domain?: ExperimentProblemDomain;
  method_family?: ExperimentMethodFamily;
  tag?: string;
  linked_profile_id?: string;
  linked_product_id?: string;
  linked_material_id?: string;
}

// Filters for listing climate experiment runs
export interface ClimateExperimentRunFilters {
  status?: ExperimentRunStatus;
  method_type?: string;
}

// Experiment summary response
export interface ClimateExperimentSummary {
  experiment_id: string;
  total_runs: number;
  runs_by_status: Record<string, number>;
  methods_used: Record<string, number>;
  best_objective_run: BestObjectiveRun | null;
}

// Best objective run in summary
export interface BestObjectiveRun {
  run_id: string;
  method_type: string;
  backend_provider: string | null;
  metrics: Record<string, unknown> | null;
}

// Experiment detail with recent runs
export interface ClimateExperimentDetail extends ClimateExperiment {
  recent_runs?: ClimateExperimentRunListItem[];
}

// Run list item (lighter version for lists)
export interface ClimateExperimentRunListItem {
  id: string;
  run_label: string | null;
  method_type: string;
  status: ExperimentRunStatus;
  created_at: string;
}

// ============================================================================
// THE ZORA FOUNDATION TYPES
// ============================================================================

// Foundation project categories
export type FoundationProjectCategory =
  | 'reforestation'
  | 'renewable_energy'
  | 'ocean'
  | 'hemp_materials'
  | 'community'
  | 'adaptation';

// Foundation project status
export type FoundationProjectStatus =
  | 'planned'
  | 'active'
  | 'completed'
  | 'paused'
  | 'archived';

// Climate focus domains for foundation projects
export type FoundationClimateFocusDomain =
  | 'energy'
  | 'materials'
  | 'transport'
  | 'food'
  | 'nature'
  | 'adaptation';

// Contribution source types
export type ContributionSourceType =
  | 'manual'
  | 'subscription'
  | 'zora_shop_commission'
  | 'external';

// Foundation project
export interface FoundationProject {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  category: FoundationProjectCategory | string;
  status: FoundationProjectStatus;
  climate_focus_domain: FoundationClimateFocusDomain | string | null;
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
  updated_at: string;
}

// Foundation contribution
export interface FoundationContribution {
  id: string;
  tenant_id: string;
  project_id: string;
  source_type: ContributionSourceType | string;
  source_reference: string | null;
  amount_cents: number;
  currency: string;
  contributed_at: string;
  contributor_label: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Foundation impact log entry
export interface FoundationImpactLog {
  id: string;
  tenant_id: string | null;
  project_id: string;
  period_start: string;
  period_end: string;
  impact_kgco2: number;
  impact_units: string | null;
  impact_units_value: number | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Input for creating a foundation project
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

// Input for updating a foundation project
export interface UpdateFoundationProjectInput {
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  climate_focus_domain?: string;
  location_country?: string;
  location_region?: string;
  sdg_tags?: string[];
  estimated_impact_kgco2?: number;
  verified_impact_kgco2?: number;
  impact_methodology?: string;
  external_url?: string;
  image_url?: string;
  min_contribution_amount_cents?: number;
  currency?: string;
  tags?: string[];
}

// Input for creating a contribution
export interface CreateFoundationContributionInput {
  amount_cents: number;
  currency?: string;
  source_type: string;
  source_reference?: string;
  contributor_label?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Filters for listing foundation projects
export interface FoundationProjectFilters {
  status?: string;
  category?: string;
  climate_focus_domain?: string;
  tenant_scope?: 'global' | 'tenant' | 'all';
}

// Filters for listing contributions
export interface FoundationContributionFilters {
  from?: string;
  to?: string;
}

// Foundation project impact summary
export interface FoundationProjectImpactSummary {
  project_id: string;
  title: string;
  status: string;
  total_contributions_cents: number;
  currency: string;
  total_impact_kgco2: number | null;
  impact_units: string | null;
  impact_units_value: number | null;
  last_update: string | null;
}

// Foundation project list item with contribution count
export interface FoundationProjectListItem extends FoundationProject {
  contribution_count?: number;
  total_contributions_cents?: number;
}

// ============================================================================
// ORGANIZATIONS & PLAYBOOKS TYPES
// ============================================================================

// Organization types
export type OrganizationType =
  | 'brand'
  | 'ngo'
  | 'city'
  | 'startup'
  | 'energy_utility'
  | 'enterprise'
  | 'government';

// Organization
export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  organization_type: OrganizationType | string;
  description: string | null;
  homepage_url: string | null;
  country: string | null;
  city_or_region: string | null;
  industry: string | null;
  tags: string[] | null;
  linked_shop_brand_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Input for creating an organization
export interface CreateOrganizationInput {
  name: string;
  organization_type: string;
  description?: string;
  homepage_url?: string;
  country?: string;
  city_or_region?: string;
  industry?: string;
  tags?: string[];
  linked_shop_brand_id?: string;
  metadata?: Record<string, unknown>;
}

// Input for updating an organization
export interface UpdateOrganizationInput {
  name?: string;
  organization_type?: string;
  description?: string;
  homepage_url?: string;
  country?: string;
  city_or_region?: string;
  industry?: string;
  tags?: string[];
  linked_shop_brand_id?: string;
  metadata?: Record<string, unknown>;
}

// Filters for listing organizations
export interface OrganizationFilters {
  organization_type?: string;
  search?: string;
}

// Playbook categories
export type PlaybookCategory =
  | 'onboarding'
  | 'climate'
  | 'zora_shop'
  | 'foundation'
  | 'goes_green';

// Playbook target entity types
export type PlaybookTargetEntityType =
  | 'tenant'
  | 'organization'
  | 'climate_profile'
  | 'zora_shop_project';

// Playbook
export interface Playbook {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  description: string | null;
  category: PlaybookCategory | string;
  target_entity_type: PlaybookTargetEntityType | string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Playbook step
export interface PlaybookStep {
  id: string;
  playbook_id: string;
  step_order: number;
  code: string;
  name: string;
  description: string | null;
  agent_suggestion: string | null;
  task_type: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Playbook with steps
export interface PlaybookWithSteps extends Playbook {
  steps: PlaybookStep[];
}

// Input for creating a playbook
export interface CreatePlaybookInput {
  code: string;
  name: string;
  description?: string;
  category: string;
  target_entity_type: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  steps?: CreatePlaybookStepInput[];
}

// Input for creating a playbook step
export interface CreatePlaybookStepInput {
  step_order: number;
  code: string;
  name: string;
  description?: string;
  agent_suggestion?: string;
  task_type?: string;
  config?: Record<string, unknown>;
}

// Input for updating a playbook
export interface UpdatePlaybookInput {
  name?: string;
  description?: string;
  category?: string;
  target_entity_type?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// Filters for listing playbooks
export interface PlaybookFilters {
  category?: string;
  target_entity_type?: string;
  is_active?: boolean;
}

// Playbook run status
export type PlaybookRunStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'paused';

// Playbook run
export interface PlaybookRun {
  id: string;
  tenant_id: string;
  playbook_id: string;
  target_entity_type: string;
  target_entity_id: string | null;
  status: PlaybookRunStatus | string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Playbook run step status
export type PlaybookRunStepStatus =
  | 'not_started'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

// Playbook run step
export interface PlaybookRunStep {
  id: string;
  tenant_id: string;
  playbook_run_id: string;
  playbook_step_id: string;
  step_order: number;
  status: PlaybookRunStepStatus | string;
  agent_id: string | null;
  agent_task_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Playbook run with steps
export interface PlaybookRunWithSteps extends PlaybookRun {
  steps: PlaybookRunStep[];
  playbook?: Playbook;
}

// Input for starting a playbook run
export interface StartPlaybookRunInput {
  target_entity_type: string;
  target_entity_id?: string;
  metadata?: Record<string, unknown>;
}

// Input for updating a playbook run step
export interface UpdatePlaybookRunStepInput {
  status: string;
  notes?: string;
  failure_reason?: string;
  agent_id?: string;
  agent_task_id?: string;
}

// Filters for listing playbook runs
export interface PlaybookRunFilters {
  playbook_id?: string;
  status?: string;
  target_entity_type?: string;
  target_entity_id?: string;
}

// ============================================================================
// ZORA GOES GREEN TYPES
// ============================================================================

// GOES GREEN profile types
export type GoesGreenProfileType = 'household' | 'organization';

// GOES GREEN energy asset types
export type GoesGreenAssetType =
  | 'solar_pv_rooftop'
  | 'solar_thermal'
  | 'heat_pump_air_to_water'
  | 'heat_pump_ground_source'
  | 'ev_vehicle'
  | 'battery_storage'
  | 'green_power_contract';

// GOES GREEN asset status
export type GoesGreenAssetStatus = 'existing' | 'planned' | 'under_evaluation' | 'retired';

// GOES GREEN action types
export type GoesGreenActionType =
  | 'switch_to_green_tariff'
  | 'install_solar_pv'
  | 'install_heat_pump'
  | 'improve_insulation'
  | 'replace_appliances';

// GOES GREEN action status
export type GoesGreenActionStatus = 'planned' | 'in_progress' | 'completed' | 'canceled';

// GOES GREEN Profile
export interface GoesGreenProfile {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  climate_profile_id: string | null;
  profile_type: GoesGreenProfileType | string;
  name: string;
  country: string | null;
  city_or_region: string | null;
  annual_energy_kwh: number | null;
  primary_energy_source: string | null;
  grid_renewable_share_percent: number | null;
  target_green_share_percent: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Input for creating a GOES GREEN profile
export interface CreateGoesGreenProfileInput {
  profile_type: string;
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

// Input for updating a GOES GREEN profile
export interface UpdateGoesGreenProfileInput {
  name?: string;
  country?: string;
  city_or_region?: string;
  annual_energy_kwh?: number;
  primary_energy_source?: string;
  grid_renewable_share_percent?: number;
  target_green_share_percent?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Filters for listing GOES GREEN profiles
export interface GoesGreenProfileFilters {
  profile_type?: string;
  organization_id?: string;
  search?: string;
}

// GOES GREEN Energy Asset
export interface GoesGreenEnergyAsset {
  id: string;
  tenant_id: string;
  goes_green_profile_id: string;
  asset_type: GoesGreenAssetType | string;
  status: GoesGreenAssetStatus | string;
  capacity_kw: number | null;
  annual_production_kwh_estimated: number | null;
  annual_savings_kgco2_estimated: number | null;
  installed_at: string | null;
  retired_at: string | null;
  vendor_name: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Input for creating a GOES GREEN energy asset
export interface CreateGoesGreenEnergyAssetInput {
  asset_type: string;
  status: string;
  capacity_kw?: number;
  annual_production_kwh_estimated?: number;
  annual_savings_kgco2_estimated?: number;
  installed_at?: string;
  retired_at?: string;
  vendor_name?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// GOES GREEN Action
export interface GoesGreenAction {
  id: string;
  tenant_id: string;
  goes_green_profile_id: string;
  climate_mission_id: string | null;
  action_type: GoesGreenActionType | string;
  title: string;
  description: string | null;
  status: GoesGreenActionStatus | string;
  estimated_impact_kgco2: number | null;
  estimated_annual_kwh_savings: number | null;
  payback_period_years_estimated: number | null;
  cost_estimate_cents: number | null;
  currency: string;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Input for creating a GOES GREEN action
export interface CreateGoesGreenActionInput {
  action_type: string;
  title: string;
  description?: string;
  climate_mission_id?: string;
  estimated_impact_kgco2?: number;
  estimated_annual_kwh_savings?: number;
  payback_period_years_estimated?: number;
  cost_estimate_cents?: number;
  currency?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Input for updating a GOES GREEN action
export interface UpdateGoesGreenActionInput {
  title?: string;
  description?: string;
  status?: string;
  estimated_impact_kgco2?: number;
  estimated_annual_kwh_savings?: number;
  payback_period_years_estimated?: number;
  cost_estimate_cents?: number;
  currency?: string;
  started_at?: string;
  completed_at?: string;
  canceled_at?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Filters for listing GOES GREEN actions
export interface GoesGreenActionFilters {
  status?: string;
  action_type?: string;
}

// GOES GREEN Snapshot
export interface GoesGreenSnapshot {
  id: string;
  tenant_id: string;
  goes_green_profile_id: string;
  snapshot_date: string;
  total_energy_kwh: number | null;
  green_energy_kwh: number | null;
  grid_renewable_share_percent: number | null;
  computed_green_share_percent: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// GOES GREEN Profile Summary
export interface GoesGreenProfileSummary {
  profile_id: string;
  profile_type: string;
  name: string;
  annual_energy_kwh: number | null;
  green_share_percent_estimated: number | null;
  target_green_share_percent: number | null;
  assets: {
    count: number;
    by_type: Record<string, number>;
    total_annual_production_kwh_estimated: number;
    total_annual_savings_kgco2_estimated: number;
  };
  actions: {
    total: number;
    completed: number;
    in_progress: number;
    planned: number;
    estimated_total_impact_kgco2: number;
  };
}

// ============================================================================
// Climate Academy Backend v1.0 Types
// ============================================================================

// Content type for lessons
export type AcademyContentType = 'video' | 'article' | 'interactive' | 'quiz' | 'mixed';

// Source type for lessons
export type AcademySourceType = 'youtube' | 'web_article' | 'pdf' | 'zora_internal' | 'other';

// Difficulty level for lessons
export type AcademyDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Progress status
export type AcademyProgressStatus = 'not_started' | 'in_progress' | 'completed';

// Quiz attempt status
export type AcademyQuizAttemptStatus = 'started' | 'submitted' | 'passed' | 'failed';

// Academy Topic
export interface AcademyTopic {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Academy Lesson
export interface AcademyLesson {
  id: string;
  tenant_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  content_type: string;
  source_type: string;
  source_url: string | null;
  duration_minutes_estimated: number | null;
  language_code: string | null;
  difficulty_level: string | null;
  primary_topic_code: string | null;
  tags: string[] | null;
  is_active: boolean;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Create Lesson Input
export interface CreateAcademyLessonInput {
  title: string;
  subtitle?: string;
  description?: string;
  content_type: string;
  source_type: string;
  source_url?: string;
  duration_minutes_estimated?: number;
  language_code?: string;
  difficulty_level?: string;
  primary_topic_code?: string;
  tags?: string[];
  is_active?: boolean;
  thumbnail_url?: string;
  metadata?: Record<string, unknown>;
}

// Update Lesson Input
export interface UpdateAcademyLessonInput {
  title?: string;
  subtitle?: string;
  description?: string;
  content_type?: string;
  source_type?: string;
  source_url?: string;
  duration_minutes_estimated?: number;
  language_code?: string;
  difficulty_level?: string;
  primary_topic_code?: string;
  tags?: string[];
  is_active?: boolean;
  thumbnail_url?: string;
  metadata?: Record<string, unknown>;
}

// Lesson Filters
export interface AcademyLessonFilters {
  topic?: string;
  content_type?: string;
  language?: string;
  difficulty_level?: string;
  is_active?: boolean;
}

// Academy Module
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
  updated_at: string;
}

// Module Lesson Link
export interface AcademyModuleLesson {
  id: string;
  module_id: string;
  lesson_id: string;
  lesson_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

// Module with Lessons
export interface AcademyModuleWithLessons extends AcademyModule {
  lessons: (AcademyLesson & { lesson_order: number; is_required: boolean })[];
}

// Create Module Input
export interface CreateAcademyModuleInput {
  code: string;
  title: string;
  description?: string;
  primary_topic_code?: string;
  target_audience?: string;
  estimated_duration_minutes?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  lessons?: { lesson_id: string; lesson_order: number; is_required?: boolean }[];
}

// Update Module Input
export interface UpdateAcademyModuleInput {
  code?: string;
  title?: string;
  description?: string;
  primary_topic_code?: string;
  target_audience?: string;
  estimated_duration_minutes?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// Module Filters
export interface AcademyModuleFilters {
  topic?: string;
  target_audience?: string;
  is_active?: boolean;
}

// Academy Learning Path
export interface AcademyLearningPath {
  id: string;
  tenant_id: string | null;
  code: string;
  title: string;
  description: string | null;
  target_audience: string | null;
  recommended_for_profile_type: string | null;
  primary_topic_code: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Learning Path Module Link
export interface AcademyLearningPathModule {
  id: string;
  learning_path_id: string;
  module_id: string;
  module_order: number;
  created_at: string;
  updated_at: string;
}

// Learning Path with Modules
export interface AcademyLearningPathWithModules extends AcademyLearningPath {
  modules: (AcademyModule & { module_order: number })[];
}

// Create Learning Path Input
export interface CreateAcademyLearningPathInput {
  code: string;
  title: string;
  description?: string;
  target_audience?: string;
  recommended_for_profile_type?: string;
  primary_topic_code?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  modules?: { module_id: string; module_order: number }[];
}

// Update Learning Path Input
export interface UpdateAcademyLearningPathInput {
  code?: string;
  title?: string;
  description?: string;
  target_audience?: string;
  recommended_for_profile_type?: string;
  primary_topic_code?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// Learning Path Filters
export interface AcademyLearningPathFilters {
  target_audience?: string;
  primary_topic_code?: string;
  is_active?: boolean;
}

// Academy User Progress
export interface AcademyUserProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  lesson_id: string | null;
  module_id: string | null;
  learning_path_id: string | null;
  status: string;
  progress_percent: number | null;
  last_accessed_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Update Progress Input
export interface UpdateAcademyProgressInput {
  status: string;
  progress_percent?: number;
}

// Progress Filters
export interface AcademyProgressFilters {
  learning_path_id?: string;
  module_id?: string;
  lesson_id?: string;
  status?: string;
}

// Academy Quiz
export interface AcademyQuiz {
  id: string;
  tenant_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  passing_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Academy Quiz Attempt
export interface AcademyQuizAttempt {
  id: string;
  tenant_id: string;
  user_id: string;
  quiz_id: string;
  score: number | null;
  status: string;
  answers: Record<string, unknown>;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Billing & Commission Types (Iteration 00C8)
// ============================================================================

// Billing Plan
export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_amount: number;
  price_currency: string;
  billing_interval: 'month' | 'year';
  is_active: boolean;
  features: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Create Billing Plan Input
export interface CreateBillingPlanInput {
  code: string;
  name: string;
  description?: string;
  price_amount: number;
  price_currency?: string;
  billing_interval: 'month' | 'year';
  is_active?: boolean;
  features?: Record<string, unknown>;
}

// Update Billing Plan Input
export interface UpdateBillingPlanInput {
  code?: string;
  name?: string;
  description?: string;
  price_amount?: number;
  price_currency?: string;
  billing_interval?: 'month' | 'year';
  is_active?: boolean;
  features?: Record<string, unknown>;
}

// Billing Plan Filters
export interface BillingPlanFilters {
  is_active?: boolean;
  billing_interval?: 'month' | 'year';
}

// Tenant Subscription
export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled';
  current_period_start: string | null;
  current_period_end: string | null;
  provider: 'stripe' | 'paypal' | 'manual';
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// Tenant Subscription with Plan
export interface TenantSubscriptionWithPlan extends TenantSubscription {
  plan: BillingPlan;
}

// Create/Update Tenant Subscription Input
export interface UpsertTenantSubscriptionInput {
  plan_id: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled';
  current_period_start?: string;
  current_period_end?: string;
  provider: 'stripe' | 'paypal' | 'manual';
  provider_customer_id?: string;
  provider_subscription_id?: string;
  trial_ends_at?: string;
}

// Billing Event
export interface BillingEvent {
  id: string;
  tenant_id: string | null;
  subscription_id: string | null;
  provider: 'stripe' | 'paypal' | 'manual';
  event_type: string;
  event_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

// Create Billing Event Input (for webhook handlers)
export interface CreateBillingEventInput {
  tenant_id?: string;
  subscription_id?: string;
  provider: 'stripe' | 'paypal' | 'manual';
  event_type: string;
  event_id?: string;
  payload: Record<string, unknown>;
}

// ZORA SHOP Commission Settings
export interface ZoraShopCommissionSettings {
  id: string;
  tenant_id: string;
  commission_rate: number;
  foundation_share_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Update Commission Settings Input
export interface UpdateCommissionSettingsInput {
  commission_rate?: number;
  foundation_share_rate?: number;
  is_active?: boolean;
}

// ZORA SHOP Order
export interface ZoraShopOrder {
  id: string;
  tenant_id: string;
  project_id: string | null;
  buyer_org_id: string | null;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded' | 'canceled';
  commission_rate: number;
  commission_amount: number;
  foundation_share_rate: number;
  foundation_contribution_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ZORA SHOP Order Item
export interface ZoraShopOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

// Order with Items
export interface ZoraShopOrderWithItems extends ZoraShopOrder {
  items: ZoraShopOrderItem[];
}

// Create Order Item Input
export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

// Create Order Input
export interface CreateZoraShopOrderInput {
  project_id?: string;
  buyer_org_id?: string;
  currency?: string;
  items: CreateOrderItemInput[];
  metadata?: Record<string, unknown>;
}

// Update Order Status Input
export interface UpdateOrderStatusInput {
  status: 'pending' | 'paid' | 'refunded' | 'canceled';
}

// Order Filters
export interface ZoraShopOrderFilters {
  project_id?: string;
  buyer_org_id?: string;
  status?: 'pending' | 'paid' | 'refunded' | 'canceled';
  from_date?: string;
  to_date?: string;
}

// Stripe Webhook Payload (simplified)
export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// PayPal Webhook Payload (simplified)
export interface PayPalWebhookPayload {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}
