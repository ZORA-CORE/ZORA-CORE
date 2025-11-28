import type {
  ClimateProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ClimateMission,
  CreateMissionInput,
  UpdateMissionInput,
  JournalEntry,
  PaginatedResponse,
  StatusResponse,
  ApiError,
  Agent,
  AgentsResponse,
  MemoryEvent,
  SemanticSearchResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_ZORA_API_BASE_URL || 'http://localhost:8787';
const IS_DEV = process.env.NODE_ENV === 'development';

function log(...args: unknown[]) {
  if (IS_DEV) {
    console.log('[ZORA API]', ...args);
  }
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
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      log('Error response:', data);
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
}): Promise<PaginatedResponse<ClimateProfile>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.type) searchParams.set('type', params.type);

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

export const api = {
  getStatus,
  getClimateProfiles,
  getClimateProfile,
  createClimateProfile,
  updateClimateProfile,
  getClimateMissions,
  createClimateMission,
  updateMissionStatus,
  getJournalEntries,
  getAgents,
  getAgent,
  getAgentMemory,
  semanticSearchAgentMemory,
};

export default api;
