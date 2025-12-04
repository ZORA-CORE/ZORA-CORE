'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AuthUser,
  getToken,
  setToken as storeToken,
  clearToken,
  getCurrentUser,
  isTokenExpired,
  getRoleDisplayName,
  fetchCurrentUser,
  loginWithEmail,
  registerWithEmail,
  logoutSession,
  refreshAccessToken,
  LoginInput,
  RegisterInput,
  AuthResponse,
  AuthError,
} from './auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => boolean;
  loginEmail: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getRoleDisplay: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth System v2: Fetch user from /api/auth/me on mount
  // This works with both cookie-based auth and localStorage token
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // First try cookie-based auth (Auth System v2)
        const cookieUser = await fetchCurrentUser();
        if (cookieUser) {
          setUser(cookieUser);
          setIsLoading(false);
          return;
        }

        // Fall back to localStorage token (backward compatibility)
        const localUser = getCurrentUser();
        if (localUser) {
          setUser(localUser);
        }
      } catch {
        // If fetch fails, try localStorage
        const localUser = getCurrentUser();
        if (localUser) {
          setUser(localUser);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Periodically refresh access token and check session validity
  useEffect(() => {
    const checkSession = async () => {
      if (!user) return;

      // Try to refresh the access token
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // If refresh fails, check if we still have a valid localStorage token
        const token = getToken();
        if (token && isTokenExpired(token)) {
          clearToken();
          setUser(null);
        } else if (!token) {
          // No localStorage token and cookie refresh failed - session expired
          setUser(null);
        }
      }
    };

    // Check every 10 minutes (access token expires in 15 minutes)
    const interval = setInterval(checkSession, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Legacy login with JWT token (backward compatibility)
  const login = useCallback((token: string): boolean => {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return false;
    }

    if (isTokenExpired(token)) {
      return false;
    }

    storeToken(token);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      clearToken();
      return false;
    }

    setUser(currentUser);
    return true;
  }, []);

  // Auth System v2: Login with email and password
  const loginEmail = useCallback(async (input: LoginInput): Promise<AuthResponse> => {
    const response = await loginWithEmail(input);
    
    // Update user state from response
    setUser({
      tenantId: response.user.tenant_id,
      userId: response.user.id,
      role: response.user.role,
      display_name: response.user.display_name,
      email: response.user.email,
    });

    return response;
  }, []);

  // Auth System v2: Register with email and password
  const register = useCallback(async (input: RegisterInput): Promise<AuthResponse> => {
    const response = await registerWithEmail(input);
    
    // Update user state from response
    setUser({
      tenantId: response.user.tenant_id,
      userId: response.user.id,
      role: response.user.role,
      display_name: response.user.display_name,
      email: response.user.email,
    });

    return response;
  }, []);

  // Auth System v2: Logout (clears cookies and localStorage)
  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }, []);

  const getRoleDisplay = useCallback(() => {
    if (!user) {
      return 'Not logged in';
    }
    return getRoleDisplayName(user.role);
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginEmail,
    register,
    logout,
    refreshUser,
    getRoleDisplay,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
