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
