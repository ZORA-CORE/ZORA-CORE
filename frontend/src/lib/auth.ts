/**
 * ZORA CORE Authentication Utilities
 * 
 * Client-side JWT token management for the frontend.
 */

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
