'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useBilling } from '@/lib/BillingContext';
import { AppShell } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { BillingPlan, PlanType } from '@/lib/types';

function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
  isLoading,
  highlighted,
}: {
  plan: BillingPlan;
  isCurrentPlan: boolean;
  onSelect: (plan: BillingPlan) => void;
  isLoading: boolean;
  highlighted: boolean;
}) {
  const features = plan.features as Record<string, unknown>;
  
  const formatPrice = (amount: number, currency: string, interval: string) => {
    if (amount === 0) return 'Free';
    const formatted = new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
    return `${formatted}/${interval === 'month' ? 'mo' : 'yr'}`;
  };

  const getFeatureList = (): string[] => {
    const list: string[] = [];
    
    if (features.max_users !== null && features.max_users !== undefined) {
      const users = features.max_users === -1 ? 'Unlimited' : features.max_users;
      list.push(`${users} user${features.max_users !== 1 ? 's' : ''}`);
    }
    if (features.max_climate_profiles !== null && features.max_climate_profiles !== undefined) {
      const profiles = features.max_climate_profiles === -1 ? 'Unlimited' : features.max_climate_profiles;
      list.push(`${profiles} climate profile${features.max_climate_profiles !== 1 ? 's' : ''}`);
    }
    if (features.max_zora_shop_projects !== null && features.max_zora_shop_projects !== undefined) {
      const projects = features.max_zora_shop_projects === -1 ? 'Unlimited' : features.max_zora_shop_projects;
      if (Number(features.max_zora_shop_projects) > 0 || features.max_zora_shop_projects === -1) {
        list.push(`${projects} SHOP project${features.max_zora_shop_projects !== 1 ? 's' : ''}`);
      }
    }
    if (features.can_access_simulation_studio === true) {
      list.push('Simulation Studio access');
    }
    if (features.can_access_brand_mashups === true) {
      list.push('Brand mashups access');
    }
    if (features.can_access_quantum_climate_lab === true) {
      list.push('Quantum Climate Lab');
    }
    if (features.foundation_partner === true) {
      list.push('Foundation partner status');
    }
    if (features.priority_support === true) {
      list.push('Priority support');
    }
    if (features.max_autonomy_tasks_per_day !== null && features.max_autonomy_tasks_per_day !== undefined) {
      const tasks = features.max_autonomy_tasks_per_day === -1 ? 'Unlimited' : features.max_autonomy_tasks_per_day;
      list.push(`${tasks} autonomy tasks/day`);
    }
    
    return list;
  };

  const featureList = getFeatureList();

  return (
    <Card 
      className={`p-6 flex flex-col h-full transition-all ${
        highlighted ? 'ring-2 ring-blue-500 shadow-lg' : ''
      } ${isCurrentPlan ? 'border-green-500 border-2' : ''}`}
    >
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
          </div>
          {isCurrentPlan && (
            <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
              Current
            </span>
          )}
        </div>

        <div className="mb-6">
          <span className="text-3xl font-bold text-white">
            {formatPrice(plan.price_amount, plan.price_currency, plan.billing_interval)}
          </span>
        </div>

        <ul className="space-y-2 mb-6">
          {featureList.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-300">
              <svg className="w-4 h-4 mr-2 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || isLoading}
        variant={isCurrentPlan ? 'secondary' : highlighted ? 'primary' : 'secondary'}
        className="w-full"
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : (
          'Select Plan'
        )}
      </Button>
    </Card>
  );
}

function PlansPageContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentPlan, refreshPlan } = useBilling();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
  
  const highlightedPlan = searchParams.get('highlight');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getBillingPlans({ is_active: true });
        setPlans(response.data || []);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPlans();
    }
  }, [isAuthenticated]);

  const handleSelectPlan = async (plan: BillingPlan) => {
    try {
      setSelectingPlanId(plan.id);
      await api.upsertSubscription({
        plan_id: plan.id,
        status: 'active',
        provider: 'manual',
      });
      await refreshPlan();
      setSelectingPlanId(null);
    } catch (err) {
      console.error('Failed to select plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
      setSelectingPlanId(null);
    }
  };

  const groupPlansByType = (plans: BillingPlan[]): Record<PlanType, BillingPlan[]> => {
    const grouped: Record<PlanType, BillingPlan[]> = {
      citizen: [],
      brand: [],
      foundation: [],
    };
    
    plans.forEach(plan => {
      const type = plan.plan_type || 'brand';
      if (grouped[type]) {
        grouped[type].push(plan);
      }
    });
    
    Object.keys(grouped).forEach(key => {
      grouped[key as PlanType].sort((a, b) => a.price_amount - b.price_amount);
    });
    
    return grouped;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <AppShell>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </AppShell>
    );
  }

  const groupedPlans = groupPlansByType(plans);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Plans & Pricing</h1>
          <p className="text-gray-400">
            Choose the plan that best fits your climate journey. All plans include access to ZORA CORE.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {currentPlan && (
          <Card className="mb-8 p-4 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Your current plan</p>
                <p className="text-lg font-semibold text-white">{currentPlan.name}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 text-sm font-medium rounded ${
                  currentPlan.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' :
                  currentPlan.subscription_status === 'trial' ? 'bg-blue-500/20 text-blue-400' :
                  currentPlan.subscription_status === 'past_due' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {currentPlan.subscription_status === 'trial' ? 'Trial' :
                   currentPlan.subscription_status === 'active' ? 'Active' :
                   currentPlan.subscription_status === 'past_due' ? 'Past Due' : 'Canceled'}
                </span>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-400 mb-4">No billing plans configured yet.</p>
            <p className="text-sm text-gray-500">
              Please seed billing_plans in Supabase to enable subscription management.
            </p>
          </Card>
        ) : (
          <div className="space-y-12">
            {groupedPlans.citizen.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </span>
                  For Individuals
                </h2>
                <p className="text-gray-400 mb-6 ml-11">
                  Personal climate OS for individuals who want to track and improve their climate impact.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedPlans.citizen.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrentPlan={currentPlan?.plan_code === plan.code}
                      onSelect={handleSelectPlan}
                      isLoading={selectingPlanId === plan.id}
                      highlighted={highlightedPlan === plan.code}
                    />
                  ))}
                </div>
              </section>
            )}

            {groupedPlans.brand.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  For Brands & Organizations
                </h2>
                <p className="text-gray-400 mb-6 ml-11">
                  Climate-first tools for brands and organizations building sustainable products and experiences.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedPlans.brand.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrentPlan={currentPlan?.plan_code === plan.code}
                      onSelect={handleSelectPlan}
                      isLoading={selectingPlanId === plan.id}
                      highlighted={highlightedPlan === plan.code}
                    />
                  ))}
                </div>
              </section>
            )}

            {groupedPlans.foundation.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </span>
                  For Foundations & Partners
                </h2>
                <p className="text-gray-400 mb-6 ml-11">
                  Special plans for NGOs, foundations, and climate partners working on global impact.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedPlans.foundation.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrentPlan={currentPlan?.plan_code === plan.code}
                      onSelect={handleSelectPlan}
                      isLoading={selectingPlanId === plan.id}
                      highlighted={highlightedPlan === plan.code}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Need a custom plan? <a href="mailto:contact@zora.earth" className="text-blue-400 hover:underline">Contact us</a> for enterprise pricing.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </AppShell>
    }>
      <PlansPageContent />
    </Suspense>
  );
}
