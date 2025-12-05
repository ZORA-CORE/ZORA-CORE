'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useBilling } from '@/lib/BillingContext';
import { AppShell } from '@/components/layout';
import { api } from '@/lib/api';
import {
  ZCard,
  ZButton,
  ZPageHeader,
  ZSectionHeader,
  ZBadge,
  ZEmptyState,
  ZLoadingState,
  ZErrorState,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';
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
    if (features.can_access_simulation_studio === true) list.push('Simulation Studio access');
    if (features.can_access_brand_mashups === true) list.push('Brand mashups access');
    if (features.can_access_quantum_climate_lab === true) list.push('Quantum Climate Lab');
    if (features.foundation_partner === true) list.push('Foundation partner status');
    if (features.priority_support === true) list.push('Priority support');
    if (features.max_autonomy_tasks_per_day !== null && features.max_autonomy_tasks_per_day !== undefined) {
      const tasks = features.max_autonomy_tasks_per_day === -1 ? 'Unlimited' : features.max_autonomy_tasks_per_day;
      list.push(`${tasks} autonomy tasks/day`);
    }
    return list;
  };

  const featureList = getFeatureList();

  return (
    <ZCard
      className={`p-6 flex flex-col h-full transition-all ${
        highlighted ? 'ring-2 ring-[var(--z-violet)] shadow-lg' : ''
      } ${isCurrentPlan ? 'border-emerald-500 border-2' : ''}`}
    >
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">{plan.name}</h3>
            <p className="text-sm text-[var(--z-text-muted)] mt-1">{plan.description}</p>
          </div>
          {isCurrentPlan && <ZBadge variant="success" size="sm">Current</ZBadge>}
        </div>

        <div className="mb-6">
          <span className="text-3xl font-bold text-[var(--z-text-primary)]">
            {formatPrice(plan.price_amount, plan.price_currency, plan.billing_interval)}
          </span>
        </div>

        <ul className="space-y-2 mb-6">
          {featureList.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-[var(--z-text-secondary)]">
              <svg className="w-4 h-4 mr-2 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <ZButton
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || isLoading}
        variant={isCurrentPlan ? 'secondary' : highlighted ? 'primary' : 'secondary'}
        className="w-full"
      >
        {isLoading ? 'Processing...' : isCurrentPlan ? 'Current Plan' : 'Select Plan'}
      </ZButton>
    </ZCard>
  );
}

function PlansPageContent() {
  const { t } = useI18n();
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
      router.replace('/login');
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
      await api.upsertSubscription({ plan_id: plan.id, status: 'active', provider: 'manual' });
      await refreshPlan();
      setSelectingPlanId(null);
    } catch (err) {
      console.error('Failed to select plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
      setSelectingPlanId(null);
    }
  };

  const groupPlansByType = (plans: BillingPlan[]): Record<PlanType, BillingPlan[]> => {
    const grouped: Record<PlanType, BillingPlan[]> = { citizen: [], brand: [], foundation: [] };
    plans.forEach((plan) => {
      const type = plan.plan_type || 'brand';
      if (grouped[type]) grouped[type].push(plan);
    });
    Object.keys(grouped).forEach((key) => {
      grouped[key as PlanType].sort((a, b) => a.price_amount - b.price_amount);
    });
    return grouped;
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const groupedPlans = groupPlansByType(plans);

  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'error' => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'info';
      case 'past_due': return 'warning';
      default: return 'error';
    }
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-8">
        <div className="max-w-7xl mx-auto">
          {/* ===== HERO SECTION ===== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--z-bg-elevated)] via-[var(--z-bg-surface)] to-[var(--z-bg-base)] border border-[var(--z-border-default)] mb-8">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[var(--z-violet)] blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[var(--z-emerald)] blur-3xl" />
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--z-violet)] via-[var(--primary)] to-[var(--z-emerald)]" />
            
            <div className="relative p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--z-violet)]/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--z-violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <ZBadge variant="odin" size="md">Billing</ZBadge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--z-text-primary)] tracking-tight mb-2">
                    {t('billing.title', 'Plans & Pricing')}
                  </h1>
                  <p className="text-lg text-[var(--z-text-tertiary)] max-w-2xl">
                    {t('billing.subtitle', 'Choose the plan that best fits your climate journey and unlock powerful features.')}
                  </p>
                </div>
                
                {/* Current Plan */}
                {currentPlan && (
                  <div className="flex flex-col items-start lg:items-end gap-3">
                    <div className="px-5 py-4 rounded-2xl bg-[var(--z-bg-card)] border border-[var(--z-border-default)]">
                      <p className="text-[10px] text-[var(--z-text-muted)] uppercase tracking-[0.15em] mb-2">Current Plan</p>
                      <div className="text-xl font-bold text-[var(--z-text-primary)]">{currentPlan.name}</div>
                      <ZBadge variant={getStatusVariant(currentPlan.subscription_status)} size="sm" className="mt-1">
                        {currentPlan.subscription_status === 'trial' ? 'Trial' :
                         currentPlan.subscription_status === 'active' ? 'Active' :
                         currentPlan.subscription_status === 'past_due' ? 'Past Due' : 'Canceled'}
                      </ZBadge>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--z-violet)] animate-pulse" />
                  <span className="text-sm text-[var(--z-text-secondary)]">{plans.length} plans available</span>
                </div>
                <div className="h-4 w-px bg-[var(--z-border-default)]" />
                <span className="text-sm text-[var(--z-text-muted)]">Climate-first pricing</span>
              </div>
            </div>
          </div>

          {error && <ZErrorState message={error} onRetry={() => setError(null)} className="mb-6" />}

          {currentPlan && (
            <ZCard className="mb-8 p-4 bg-[var(--z-surface)] hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--z-text-muted)]">Your current plan</p>
                  <p className="text-lg font-semibold text-[var(--z-text-primary)]">{currentPlan.name}</p>
                </div>
                <ZBadge variant={getStatusVariant(currentPlan.subscription_status)} size="md">
                  {currentPlan.subscription_status === 'trial' ? 'Trial' :
                   currentPlan.subscription_status === 'active' ? 'Active' :
                   currentPlan.subscription_status === 'past_due' ? 'Past Due' : 'Canceled'}
                </ZBadge>
              </div>
            </ZCard>
          )}

          {isLoading ? (
            <ZLoadingState message="Loading plans..." />
          ) : plans.length === 0 ? (
            <ZEmptyState
              title="No plans available"
              description="Please seed billing_plans in Supabase to enable subscription management."
            />
          ) : (
            <div className="space-y-12">
              {groupedPlans.citizen.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-full bg-[var(--z-sky-soft)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--z-sky)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <ZSectionHeader title="For Individuals" />
                  </div>
                  <p className="text-[var(--z-text-muted)] mb-6 ml-11">
                    Personal climate OS for individuals who want to track and improve their climate impact.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedPlans.citizen.map((plan) => (
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
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-full bg-[var(--z-violet-soft)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--z-violet)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <ZSectionHeader title="For Brands & Organizations" />
                  </div>
                  <p className="text-[var(--z-text-muted)] mb-6 ml-11">
                    Climate-first tools for brands and organizations building sustainable products and experiences.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedPlans.brand.map((plan) => (
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
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-full bg-[var(--z-emerald-soft)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <ZSectionHeader title="For Foundations & Partners" />
                  </div>
                  <p className="text-[var(--z-text-muted)] mb-6 ml-11">
                    Special plans for NGOs, foundations, and climate partners working on global impact.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedPlans.foundation.map((plan) => (
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
            <p className="text-sm text-[var(--z-text-muted)]">
              Need a custom plan? <a href="mailto:contact@zora.earth" className="text-[var(--z-violet)] hover:underline">Contact us</a> for enterprise pricing.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <ZButton variant="ghost" href="/dashboard">Back to Desk</ZButton>
          </div>
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
          <ZLoadingState message="Loading..." />
        </div>
      </AppShell>
    }>
      <PlansPageContent />
    </Suspense>
  );
}
