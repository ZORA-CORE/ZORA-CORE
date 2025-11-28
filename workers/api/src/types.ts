export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY?: string;
  ENVIRONMENT: string;
};

export type AppEnv = {
  Bindings: Bindings;
};

export type ProfileType = 'person' | 'brand' | 'organization';
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
  | 'system_event';

export interface ClimateProfile {
  id: string;
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
  metadata?: Record<string, unknown>;
}

export interface ClimateMission {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: MissionStatus;
  started_at: string | null;
  completed_at: string | null;
  impact_estimate: Record<string, unknown>;
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
