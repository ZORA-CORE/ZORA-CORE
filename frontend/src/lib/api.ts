import type {
  ClimateProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ClimateMission,
  CreateMissionInput,
  UpdateMissionInput,
  BootstrapMissionsResponse,
  JournalEntry,
  PaginatedResponse,
  StatusResponse,
  ApiError,
  Agent,
  AgentsResponse,
  MemoryEvent,
  SemanticSearchResponse,
  FrontendConfigResponse,
  UpdateFrontendConfigInput,
  AgentSuggestion,
  AgentSuggestionListItem,
  AgentSuggestionsListResponse,
  CreateSuggestionInput,
  SuggestionDecisionInput,
  SuggestionDecisionResponse,
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
  BrandsListResponse,
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductsListResponse,
  ProductStatus,
} from './types';
import { getToken, clearToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_ZORA_API_BASE_URL || 'http://localhost:8787';
const IS_DEV = process.env.NODE_ENV === 'development';

function log(...args: unknown[]) {
  if (IS_DEV) {
    console.log('[ZORA API]', ...args);
  }
}

/**
 * Get authorization headers if token is available
 */
function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export class ZoraApiError extends Error {
  public status: number;
  public code: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ZoraApiError';
    this.status = error.status;
    this.code = error.error;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  log(`${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      log('Error response:', data);
      
      // Handle authentication errors
      if (response.status === 401) {
        clearToken();
        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      
      throw new ZoraApiError(data as ApiError);
    }

    log('Response:', data);
    return data as T;
  } catch (error) {
    if (error instanceof ZoraApiError) {
      throw error;
    }
    log('Network error:', error);
    throw new ZoraApiError({
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network request failed',
      status: 0,
    });
  }
}

export async function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>('/api/status');
}

export async function getClimateProfiles(params?: {
  limit?: number;
  offset?: number;
  type?: string;
  scope?: string;
}): Promise<PaginatedResponse<ClimateProfile>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.type) searchParams.set('type', params.type);
  if (params?.scope) searchParams.set('scope', params.scope);

  const query = searchParams.toString();
  return request<PaginatedResponse<ClimateProfile>>(
    `/api/climate/profiles${query ? `?${query}` : ''}`
  );
}

export async function getClimateProfile(id: string): Promise<ClimateProfile> {
  return request<ClimateProfile>(`/api/climate/profiles/${id}`);
}

export async function createClimateProfile(
  input: CreateProfileInput
): Promise<ClimateProfile> {
  return request<ClimateProfile>('/api/climate/profiles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateClimateProfile(
  id: string,
  input: UpdateProfileInput
): Promise<ClimateProfile> {
  return request<ClimateProfile>(`/api/climate/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function getClimateMissions(
  profileId: string,
  params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<PaginatedResponse<ClimateMission>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return request<PaginatedResponse<ClimateMission>>(
    `/api/climate/profiles/${profileId}/missions${query ? `?${query}` : ''}`
  );
}

export async function createClimateMission(
  profileId: string,
  input: CreateMissionInput
): Promise<ClimateMission> {
  return request<ClimateMission>(`/api/climate/profiles/${profileId}/missions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateMissionStatus(
  missionId: string,
  input: UpdateMissionInput
): Promise<ClimateMission> {
  return request<ClimateMission>(`/api/missions/${missionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function bootstrapMissions(profileId?: string): Promise<BootstrapMissionsResponse> {
  return request<BootstrapMissionsResponse>('/api/climate/missions/bootstrap', {
    method: 'POST',
    body: profileId ? JSON.stringify({ profile_id: profileId }) : undefined,
  });
}

export async function setProfileAsPrimary(profileId: string): Promise<ClimateProfile> {
  return request<ClimateProfile>(`/api/climate/profiles/${profileId}/set-primary`, {
    method: 'POST',
  });
}

export async function getJournalEntries(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  author?: string;
}): Promise<PaginatedResponse<JournalEntry>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.category) searchParams.set('category', params.category);
  if (params?.author) searchParams.set('author', params.author);

  const query = searchParams.toString();
  return request<PaginatedResponse<JournalEntry>>(
    `/api/journal${query ? `?${query}` : ''}`
  );
}

export async function getAgents(): Promise<AgentsResponse> {
  return request<AgentsResponse>('/api/agents');
}

export async function getAgent(agentId: string): Promise<Agent> {
  return request<Agent>(`/api/agents/${agentId}`);
}

export async function getAgentMemory(
  agentId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<PaginatedResponse<MemoryEvent>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return request<PaginatedResponse<MemoryEvent>>(
    `/api/agents/${agentId}/memory${query ? `?${query}` : ''}`
  );
}

export async function semanticSearchAgentMemory(
  agentId: string,
  query: string,
  limit?: number
): Promise<SemanticSearchResponse> {
  return request<SemanticSearchResponse>(
    `/api/agents/${agentId}/memory/semantic-search`,
    {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    }
  );
}

export async function getFrontendConfig(page: string): Promise<FrontendConfigResponse> {
  return request<FrontendConfigResponse>(`/api/frontend/config/${page}`);
}

export async function updateFrontendConfig(
  page: string,
  input: UpdateFrontendConfigInput
): Promise<FrontendConfigResponse> {
  return request<FrontendConfigResponse>(`/api/frontend/config/${page}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

// Agent Autonomy Layer API functions
export async function createSuggestion(
  input: CreateSuggestionInput
): Promise<AgentSuggestion> {
  return request<AgentSuggestion>('/api/autonomy/frontend/suggest', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getSuggestions(params?: {
  status?: string;
  page?: string;
}): Promise<AgentSuggestionsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', params.page);

  const query = searchParams.toString();
  return request<AgentSuggestionsListResponse>(
    `/api/autonomy/frontend/suggestions${query ? `?${query}` : ''}`
  );
}

export async function getSuggestion(id: string): Promise<AgentSuggestion> {
  return request<AgentSuggestion>(`/api/autonomy/frontend/suggestions/${id}`);
}

export async function decideSuggestion(
  id: string,
  input: SuggestionDecisionInput
): Promise<SuggestionDecisionResponse> {
  return request<SuggestionDecisionResponse>(
    `/api/autonomy/frontend/suggestions/${id}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

// Mashup Shop API functions (v0.17)
export async function getBrands(): Promise<BrandsListResponse> {
  return request<BrandsListResponse>('/api/mashups/brands');
}

export async function getBrand(id: string): Promise<Brand> {
  return request<Brand>(`/api/mashups/brands/${id}`);
}

export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  return request<Brand>('/api/mashups/brands', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateBrand(id: string, input: UpdateBrandInput): Promise<Brand> {
  return request<Brand>(`/api/mashups/brands/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteBrand(id: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/mashups/brands/${id}`, {
    method: 'DELETE',
  });
}

export async function getProducts(params?: {
  status?: ProductStatus;
  brand_id?: string;
}): Promise<ProductsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.brand_id) searchParams.set('brand_id', params.brand_id);

  const query = searchParams.toString();
  return request<ProductsListResponse>(
    `/api/mashups/products${query ? `?${query}` : ''}`
  );
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/mashups/products/${id}`);
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return request<Product>('/api/mashups/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  return request<Product>(`/api/mashups/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/api/mashups/products/${id}`, {
    method: 'DELETE',
  });
}

export const api = {
  getStatus,
  getClimateProfiles,
  getClimateProfile,
  createClimateProfile,
  updateClimateProfile,
  setProfileAsPrimary,
  getClimateMissions,
  createClimateMission,
  updateMissionStatus,
  bootstrapMissions,
  getJournalEntries,
  getAgents,
  getAgent,
  getAgentMemory,
  semanticSearchAgentMemory,
  getFrontendConfig,
  updateFrontendConfig,
  createSuggestion,
  getSuggestions,
  getSuggestion,
  decideSuggestion,
  // Mashup Shop
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};

export default api;
