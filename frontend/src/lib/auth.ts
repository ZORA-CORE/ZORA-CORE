/**
 * ZORA CORE Authentication Utilities
 * 
 * Auth System v2: Cookie-based authentication with email+password
 * 
 * Client-side auth management for the frontend.
 * - Cookies are managed by the browser (httpOnly, secure)
 * - User info is fetched from /api/auth/me endpoint
 * - localStorage token support retained for backward compatibility
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_ZORA_API_BASE_URL || 'http://localhost:8787';

export interface AuthUser {
  tenantId: string;
  userId: string;
  role: 'founder' | 'brand_admin' | 'viewer';
  display_name?: string | null;
  email?: string | null;
}

export interface DecodedToken {
  tenant_id: string;
  user_id: string;
  role: 'founder' | 'brand_admin' | 'viewer';
  iat: number;
  exp: number;
}

const TOKEN_KEY = 'zora_jwt_token';

/**
 * Store JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Remove JWT token from localStorage
 */
export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Decode JWT token payload (without verification)
 * Note: This is for display purposes only. The server verifies the token.
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) {
    return true;
  }
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get current authenticated user from stored token
 */
export function getCurrentUser(): AuthUser | null {
  const token = getToken();
  if (!token) {
    return null;
  }
  
  if (isTokenExpired(token)) {
    clearToken();
    return null;
  }
  
  const decoded = decodeToken(token);
  if (!decoded) {
    return null;
  }
  
  return {
    tenantId: decoded.tenant_id,
    userId: decoded.user_id,
    role: decoded.role,
  };
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, ...roles: AuthUser['role'][]): boolean {
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

/**
 * Check if user can write (founder or brand_admin)
 */
export function canWrite(user: AuthUser | null): boolean {
  return hasRole(user, 'founder', 'brand_admin');
}

/**
 * Check if user is founder
 */
export function isFounder(user: AuthUser | null): boolean {
  return hasRole(user, 'founder');
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: AuthUser['role']): string {
  switch (role) {
    case 'founder':
      return 'Founder';
    case 'brand_admin':
      return 'Brand Admin';
    case 'viewer':
      return 'Viewer';
    default:
      return role;
  }
}

// ============================================================================
// Auth System v2: Cookie-based authentication API functions
// ============================================================================

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  display_name?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    display_name: string;
    account_type: string;
    role: AuthUser['role'];
    tenant_id: string;
  };
}

export interface AuthError {
  error: string;
  message: string;
  status: number;
}

/**
 * Login with email and password (Auth System v2)
 * Sets httpOnly cookies for session management
 */
export async function loginWithEmail(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data as AuthError;
  }

  return data as AuthResponse;
}

/**
 * Register with email and password (Auth System v2)
 * Sets httpOnly cookies for session management
 */
export async function registerWithEmail(input: RegisterInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data as AuthError;
  }

  return data as AuthResponse;
}

/**
 * Fetch current user from /api/auth/me (Auth System v2)
 * Uses cookies for authentication
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      return null;
    }

    const data = await response.json();
    
    return {
      tenantId: data.user.tenant_id,
      userId: data.user.id,
      role: data.user.role,
      display_name: data.user.display_name,
      email: data.user.email,
    };
  } catch {
    return null;
  }
}

/**
 * Refresh access token using refresh token cookie (Auth System v2)
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Logout and clear session cookies (Auth System v2)
 */
export async function logoutSession(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch {
    // Ignore errors - we're logging out anyway
  }
  
  // Also clear localStorage token for backward compatibility
  clearToken();
}
