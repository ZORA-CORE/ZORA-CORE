'use client';

/**
 * useProtectedRoute - Centralized auth guard hook for protected pages
 * 
 * Implements a robust tri-state auth pattern:
 * - loading: Auth state is being determined, show loading UI, do NOT redirect
 * - authenticated: User is logged in, render protected content
 * - unauthenticated: No valid session, redirect to /login
 * 
 * This hook prevents infinite redirect loops by:
 * 1. Never redirecting while auth state is loading
 * 2. Using router.replace instead of router.push to avoid history pollution
 * 3. Providing a single source of truth for auth guards across all protected pages
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export interface ProtectedRouteState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is still being determined */
  isLoading: boolean;
  /** The current user object (null if not authenticated) */
  user: ReturnType<typeof useAuth>['user'];
}

/**
 * Hook for protecting routes that require authentication.
 * 
 * Usage:
 * ```tsx
 * const { isAuthenticated, isLoading, user } = useProtectedRoute();
 * 
 * if (isLoading || !isAuthenticated) {
 *   return <LoadingSpinner />;
 * }
 * 
 * return <ProtectedContent user={user} />;
 * ```
 * 
 * @param redirectTo - The path to redirect to if not authenticated (default: '/login')
 * @returns ProtectedRouteState with auth status and user
 */
export function useProtectedRoute(redirectTo: string = '/login'): ProtectedRouteState {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // CRITICAL: Never redirect while auth state is loading
    // This prevents the redirect loop where we redirect before knowing the true auth state
    if (isLoading) {
      return;
    }

    // Only redirect when we're certain the user is not authenticated
    if (!isAuthenticated) {
      // Use replace instead of push to avoid polluting browser history
      // This prevents the "back button takes me into a loop" issue
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);

  return { isAuthenticated, isLoading, user };
}

/**
 * Hook for pages that should redirect authenticated users away (e.g., /login, /signup)
 * 
 * Usage:
 * ```tsx
 * const { isAuthenticated, isLoading } = usePublicRoute();
 * 
 * if (isLoading) {
 *   return <LoadingSpinner />;
 * }
 * 
 * if (isAuthenticated) {
 *   // Will be redirected, show nothing or a brief loading state
 *   return <LoadingSpinner />;
 * }
 * 
 * return <LoginForm />;
 * ```
 * 
 * @param redirectTo - The path to redirect to if authenticated (default: '/dashboard')
 * @param skipRedirect - If true, don't auto-redirect (useful for success screens)
 * @returns ProtectedRouteState with auth status and user
 */
export function usePublicRoute(
  redirectTo: string = '/dashboard',
  skipRedirect: boolean = false
): ProtectedRouteState {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // CRITICAL: Never redirect while auth state is loading
    if (isLoading) {
      return;
    }

    // Skip redirect if explicitly requested (e.g., showing success screen after login)
    if (skipRedirect) {
      return;
    }

    // Redirect authenticated users away from public pages
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, redirectTo, skipRedirect]);

  return { isAuthenticated, isLoading, user };
}

export default useProtectedRoute;
