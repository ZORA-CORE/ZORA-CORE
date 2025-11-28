/**
 * Admin API client for ZORA CORE
 * 
 * These functions call the admin endpoints which require the X-ZORA-ADMIN-SECRET header.
 * The admin secret is passed as a parameter and is NOT stored in localStorage.
 */

import type {
  AdminStatusResponse,
  BootstrapTenantInput,
  BootstrapResponse,
  CreateUserInput,
  Tenant,
  User,
  TokenResponse,
  ApiError,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_ZORA_API_BASE_URL || 'http://localhost:8787';
const IS_DEV = process.env.NODE_ENV === 'development';

function log(...args: unknown[]) {
  if (IS_DEV) {
    console.log('[ZORA Admin API]', ...args);
  }
}

export class AdminApiError extends Error {
  public status: number;
  public code: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'AdminApiError';
    this.status = error.status;
    this.code = error.error;
  }
}

async function adminRequest<T>(
  endpoint: string,
  adminSecret: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  log(`${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-ZORA-ADMIN-SECRET': adminSecret,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      log('Error response:', data);
      throw new AdminApiError(data as ApiError);
    }

    log('Response:', data);
    return data as T;
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }
    log('Network error:', error);
    throw new AdminApiError({
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network request failed',
      status: 0,
    });
  }
}

export async function getAdminStatus(adminSecret: string): Promise<AdminStatusResponse> {
  return adminRequest<AdminStatusResponse>('/api/admin/status', adminSecret);
}

export async function bootstrapTenant(
  adminSecret: string,
  input: BootstrapTenantInput
): Promise<BootstrapResponse> {
  return adminRequest<BootstrapResponse>('/api/admin/bootstrap-tenant', adminSecret, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getTenants(adminSecret: string): Promise<{ data: Tenant[] }> {
  return adminRequest<{ data: Tenant[] }>('/api/admin/tenants', adminSecret);
}

export async function getUsers(
  adminSecret: string,
  tenantId?: string
): Promise<{ data: User[] }> {
  const query = tenantId ? `?tenant_id=${tenantId}` : '';
  return adminRequest<{ data: User[] }>(`/api/admin/users${query}`, adminSecret);
}

export async function createUser(
  adminSecret: string,
  input: CreateUserInput
): Promise<{ data: User }> {
  return adminRequest<{ data: User }>('/api/admin/users', adminSecret, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function issueToken(
  adminSecret: string,
  userId: string,
  expiresIn?: number
): Promise<TokenResponse> {
  return adminRequest<TokenResponse>(`/api/admin/users/${userId}/token`, adminSecret, {
    method: 'POST',
    body: expiresIn ? JSON.stringify({ expires_in: expiresIn }) : '{}',
  });
}

export const adminApi = {
  getAdminStatus,
  bootstrapTenant,
  getTenants,
  getUsers,
  createUser,
  issueToken,
};

export default adminApi;
