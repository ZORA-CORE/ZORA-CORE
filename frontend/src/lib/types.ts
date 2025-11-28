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
