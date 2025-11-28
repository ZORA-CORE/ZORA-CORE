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
} from './auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => boolean;
  logout: () => void;
  getRoleDisplay: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Initialize from localStorage on first render (client-side only)
    if (typeof window !== 'undefined') {
      return getCurrentUser();
    }
    return null;
  });
  const [isLoading] = useState(() => {
    // Only show loading on server-side render
    return typeof window === 'undefined';
  });

  // Check token expiration periodically
  useEffect(() => {
    const checkExpiration = () => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        clearToken();
        setUser(null);
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback((token: string): boolean => {
    // Validate token format
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      return false;
    }

    // Store token and update user
    storeToken(token);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      clearToken();
      return false;
    }

    setUser(currentUser);
    return true;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
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
    logout,
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
