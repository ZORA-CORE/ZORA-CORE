'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';
import type { CurrentPlan, CurrentPlanFeatures } from './types';

interface BillingContextType {
  currentPlan: CurrentPlan | null;
  isLoading: boolean;
  error: string | null;
  refreshPlan: () => Promise<void>;
  canAccessFeature: (feature: keyof CurrentPlanFeatures) => boolean;
  getFeatureLimit: (feature: keyof CurrentPlanFeatures) => number | null | boolean;
  isSubscriptionActive: () => boolean;
  getPlanDisplayName: () => string;
  getStatusBadge: () => { label: string; color: string };
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

interface BillingProviderProps {
  children: ReactNode;
}

const DEFAULT_PLAN: CurrentPlan = {
  plan_code: 'CLIMATE_ASPECT',
  name: 'Climate Aspect',
  plan_type: 'citizen',
  description: 'ZORA for everyone - basic personal climate OS for individuals',
  currency: 'DKK',
  billing_interval: 'month',
  base_price_monthly: 0,
  effective_price_monthly: 0,
  effective_price_currency: null,
  subscription_status: 'trial',
  subscription_id: null,
  trial_ends_at: null,
  current_period_start: null,
  current_period_end: null,
  features: {
    max_users: 1,
    max_organizations: 1,
    max_climate_profiles: 1,
    max_zora_shop_projects: 0,
    max_goes_green_profiles: 1,
    max_goes_green_assets: 3,
    max_shop_products_live: 0,
    max_academy_paths: 1,
    max_autonomy_tasks_per_day: 10,
    academy_level: 1,
    can_access_simulation_studio: false,
    can_access_quantum_climate_lab: false,
    can_access_brand_mashups: false,
    foundation_partner: false,
    priority_support: false,
  },
};

export function BillingProvider({ children }: BillingProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPlan = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentPlan(DEFAULT_PLAN);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const plan = await api.getCurrentPlan();
      setCurrentPlan(plan);
    } catch (err) {
      console.error('Failed to fetch current plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing information');
      setCurrentPlan(DEFAULT_PLAN);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchCurrentPlan();
    }
  }, [authLoading, fetchCurrentPlan]);

  const refreshPlan = useCallback(async () => {
    await fetchCurrentPlan();
  }, [fetchCurrentPlan]);

  const canAccessFeature = useCallback((feature: keyof CurrentPlanFeatures): boolean => {
    if (!currentPlan) return false;
    const value = currentPlan.features[feature];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value > 0 || value === -1;
    }
    return value !== null;
  }, [currentPlan]);

  const getFeatureLimit = useCallback((feature: keyof CurrentPlanFeatures): number | null | boolean => {
    if (!currentPlan) return null;
    return currentPlan.features[feature];
  }, [currentPlan]);

  const isSubscriptionActive = useCallback((): boolean => {
    if (!currentPlan) return false;
    return currentPlan.subscription_status === 'trial' || currentPlan.subscription_status === 'active';
  }, [currentPlan]);

  const getPlanDisplayName = useCallback((): string => {
    if (!currentPlan) return 'Unknown Plan';
    return currentPlan.name;
  }, [currentPlan]);

  const getStatusBadge = useCallback((): { label: string; color: string } => {
    if (!currentPlan) {
      return { label: 'Unknown', color: 'bg-gray-500' };
    }

    switch (currentPlan.subscription_status) {
      case 'trial':
        return { label: 'Trial', color: 'bg-blue-500' };
      case 'active':
        return { label: 'Active', color: 'bg-green-500' };
      case 'past_due':
        return { label: 'Past Due', color: 'bg-yellow-500' };
      case 'canceled':
        return { label: 'Canceled', color: 'bg-red-500' };
      default:
        return { label: 'Unknown', color: 'bg-gray-500' };
    }
  }, [currentPlan]);

  const value: BillingContextType = {
    currentPlan,
    isLoading,
    error,
    refreshPlan,
    canAccessFeature,
    getFeatureLimit,
    isSubscriptionActive,
    getPlanDisplayName,
    getStatusBadge,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling(): BillingContextType {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}

export function useCurrentPlan(): CurrentPlan | null {
  const { currentPlan } = useBilling();
  return currentPlan;
}

export function useFeatureAccess(feature: keyof CurrentPlanFeatures): {
  hasAccess: boolean;
  limit: number | null | boolean;
  planName: string;
  upgradePath: string;
} {
  const { currentPlan, canAccessFeature, getFeatureLimit, getPlanDisplayName } = useBilling();
  
  const hasAccess = canAccessFeature(feature);
  const limit = getFeatureLimit(feature);
  const planName = getPlanDisplayName();
  
  const getUpgradePlan = (): string => {
    if (!currentPlan) return 'BRAND_STARTER';
    
    switch (currentPlan.plan_code) {
      case 'CLIMATE_ASPECT':
        return 'CLIMATE_HERO';
      case 'CLIMATE_HERO':
        return 'BRAND_STARTER';
      case 'BRAND_STARTER':
        return 'BRAND_PRO';
      case 'BRAND_PRO':
        return 'BRAND_INFINITY';
      default:
        return 'BRAND_PRO';
    }
  };

  return {
    hasAccess,
    limit,
    planName,
    upgradePath: `/billing/plans?highlight=${getUpgradePlan()}`,
  };
}

export default BillingContext;
