'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/AuthContext';
import { useFeatureAccess } from '@/lib/BillingContext';
import { AgentPanel } from '@/components/cockpit/AgentPanel';
import { getToken } from '@/lib/auth';
import {
  ZCard,
  ZButton,
  ZMetricTile,
  ZPageHeader,
  ZSectionHeader,
  ZBadge,
  ZInput,
  ZSelect,
  ZEmptyState,
  ZLoadingState,
  ZErrorState,
  ZProgress,
} from '@/components/z';
import { useI18n } from '@/lib/I18nProvider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface ScenarioDeltas {
  missions_delta?: { missions_per_month: number; mission_type?: string };
  goes_green_delta?: { green_energy_share_increase_percent: number };
  product_material_shift?: { shift_percent: number; target_material?: string };
  foundation_delta?: { contribution_increase_percent: number };
}

interface ImpactMetrics {
  co2_kgco2_per_year: number;
  energy_green_percent: number;
  materials_sustainable_percent: number;
  foundation_impact_kgco2: number;
  missions_count: number;
  goes_green_actions_count: number;
  products_count: number;
  foundation_contributions_total: number;
}

interface ImpactDeltas {
  co2_reduction_kgco2_per_year: number;
  co2_reduction_percent: number;
  energy_green_increase_percent: number;
  materials_sustainable_increase_percent: number;
  foundation_impact_increase_kgco2: number;
  foundation_impact_increase_percent: number;
}

interface SimulationExplanation {
  category: string;
  text: string;
  impact_kgco2?: number;
}

interface SimulationConfidence {
  level: 'high' | 'medium' | 'low';
  data_completeness_percent: number;
  notes: string[];
}

interface SimulationResult {
  tenant_id: string;
  time_horizon_months: number;
  computed_at: string;
  baseline: ImpactMetrics;
  scenario: ImpactMetrics;
  deltas: ImpactDeltas;
  explanations: SimulationExplanation[];
  confidence: SimulationConfidence;
}

interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  time_horizon_months: number;
  deltas: ScenarioDeltas;
  expected_impact: string;
}

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const variants: Record<string, 'success' | 'warning' | 'error'> = {
    high: 'success',
    medium: 'warning',
    low: 'error',
  };
  return <ZBadge variant={variants[level]} size="sm">{level.charAt(0).toUpperCase() + level.slice(1)} Confidence</ZBadge>;
}

function MetricCard({
  label,
  baseline,
  scenario,
  delta,
  unit,
  isPositive = true,
}: {
  label: string;
  baseline: number;
  scenario: number;
  delta: number;
  unit: string;
  isPositive?: boolean;
}) {
  const deltaColor = delta > 0 ? (isPositive ? 'text-emerald-400' : 'text-[var(--z-rose)]') : 'text-[var(--z-text-muted)]';
  const deltaSign = delta > 0 ? '+' : '';

  return (
    <ZCard className="p-4">
      <div className="text-sm text-[var(--z-text-muted)] mb-2">{label}</div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-[var(--z-text-primary)]">
          {scenario.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </span>
        <span className="text-sm text-[var(--z-text-muted)]">{unit}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--z-text-muted)]">
          Baseline: {baseline.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
        </span>
        <span className={deltaColor}>
          {deltaSign}{delta.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
        </span>
      </div>
    </ZCard>
  );
}

function PresetCard({
  preset,
  onSelect,
  isLoading,
}: {
  preset: ScenarioPreset;
  onSelect: (preset: ScenarioPreset) => void;
  isLoading: boolean;
}) {
  return (
    <ZCard
      className="p-4 cursor-pointer hover:border-[var(--z-violet)]/50 transition-colors"
      onClick={() => !isLoading && onSelect(preset)}
    >
      <h4 className="font-medium text-[var(--z-text-primary)] mb-1">{preset.name}</h4>
      <p className="text-sm text-[var(--z-text-muted)] mb-2">{preset.description}</p>
      <div className="text-xs text-[var(--z-violet)]">{preset.expected_impact}</div>
    </ZCard>
  );
}

function UpgradeBanner({ planName, upgradePath }: { planName: string; upgradePath: string | null }) {
  return (
    <ZCard className="mb-6 p-4 bg-[var(--z-amber-soft)] border-[var(--z-amber-border)]">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-[var(--z-amber)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-[var(--z-text-secondary)]">
            <strong>Premium Feature:</strong> Simulation Studio is available on higher-tier plans. 
            You&apos;re currently on <strong>{planName}</strong>.
          </p>
          {upgradePath && (
            <Link href={upgradePath} className="inline-block mt-2 text-sm text-[var(--z-amber)] hover:text-[var(--z-amber)]/80 underline">
              Upgrade to unlock full access
            </Link>
          )}
        </div>
      </div>
    </ZCard>
  );
}

export default function SimulationPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const simulationAccess = useFeatureAccess('can_access_simulation_studio');

  const [timeHorizon, setTimeHorizon] = useState(12);
  const [missionsPerMonth, setMissionsPerMonth] = useState(0);
  const [missionType, setMissionType] = useState('household_behavior_change');
  const [greenEnergyIncrease, setGreenEnergyIncrease] = useState(0);
  const [materialShiftPercent, setMaterialShiftPercent] = useState(0);
  const [foundationIncrease, setFoundationIncrease] = useState(0);

  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function loadPresets() {
      const token = getToken();
      if (!token) {
        setPresetsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/simulation/presets`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          setPresets(data.presets || []);
        }
      } catch (err) {
        console.warn('Failed to load presets:', err);
      } finally {
        setPresetsLoading(false);
      }
    }
    if (isAuthenticated) {
      loadPresets();
    }
  }, [isAuthenticated]);

  const runSimulation = async () => {
    const token = getToken();
    if (!token) {
      setError('Authentication required');
      return;
    }

    const deltas: ScenarioDeltas = {};
    if (missionsPerMonth > 0) {
      deltas.missions_delta = { missions_per_month: missionsPerMonth, mission_type: missionType };
    }
    if (greenEnergyIncrease > 0) {
      deltas.goes_green_delta = { green_energy_share_increase_percent: greenEnergyIncrease };
    }
    if (materialShiftPercent > 0) {
      deltas.product_material_shift = { shift_percent: materialShiftPercent, target_material: 'hemp' };
    }
    if (foundationIncrease > 0) {
      deltas.foundation_delta = { contribution_increase_percent: foundationIncrease };
    }

    if (Object.keys(deltas).length === 0) {
      setError('Please configure at least one scenario parameter');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/simulation/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_horizon_months: timeHorizon, deltas }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to run simulation');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  const runPreset = async (preset: ScenarioPreset) => {
    const token = getToken();
    if (!token) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/simulation/run-preset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_id: preset.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to run simulation');
      }

      const data = await response.json();
      setResult(data.data);

      setTimeHorizon(preset.time_horizon_months);
      if (preset.deltas.missions_delta) {
        setMissionsPerMonth(preset.deltas.missions_delta.missions_per_month);
        setMissionType(preset.deltas.missions_delta.mission_type || 'household_behavior_change');
      }
      if (preset.deltas.goes_green_delta) {
        setGreenEnergyIncrease(preset.deltas.goes_green_delta.green_energy_share_increase_percent);
      }
      if (preset.deltas.product_material_shift) {
        setMaterialShiftPercent(preset.deltas.product_material_shift.shift_percent);
      }
      if (preset.deltas.foundation_delta) {
        setFoundationIncrease(preset.deltas.foundation_delta.contribution_increase_percent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMissionsPerMonth(0);
    setGreenEnergyIncrease(0);
    setMaterialShiftPercent(0);
    setFoundationIncrease(0);
    setResult(null);
    setError(null);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const timeHorizonOptions = [
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
    { value: '12', label: '12 months' },
    { value: '24', label: '24 months' },
  ];

  const missionTypeOptions = [
    { value: 'household_behavior_change', label: 'Household Behavior' },
    { value: 'transport_optimization', label: 'Transport' },
    { value: 'energy_efficiency', label: 'Energy Efficiency' },
    { value: 'diet_change', label: 'Diet Change' },
    { value: 'waste_reduction', label: 'Waste Reduction' },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ZPageHeader
            title={t('simulation.title', 'Simulation Studio')}
            subtitle={t('simulation.subtitle', "Run 'what if' climate scenarios to see BEFORE/AFTER impact")}
            className="mb-6"
          />

          <ZCard className="mb-6 p-4 bg-[var(--z-violet-soft)] border-[var(--z-violet-border)]">
            <p className="text-sm text-[var(--z-text-secondary)]">
              <strong>Note:</strong> This is a simulation/estimation tool based on ZORA&apos;s impact models. 
              Results are estimates and may vary based on actual implementation.
            </p>
          </ZCard>

          {!simulationAccess.hasAccess && (
            <UpgradeBanner planName={simulationAccess.planName} upgradePath={simulationAccess.upgradePath} />
          )}

          {error && <ZErrorState message={error} onRetry={() => setError(null)} className="mb-6" />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ZCard className="p-4">
                <ZSectionHeader title="Scenario Builder" className="mb-4" />

                <div className="space-y-6">
                  <ZSelect
                    label="Time Horizon"
                    value={String(timeHorizon)}
                    onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
                    options={timeHorizonOptions}
                  />

                  <div className="border-t border-[var(--z-border)] pt-4">
                    <h4 className="text-sm font-medium text-[var(--z-text-primary)] mb-3">Climate Missions</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <ZInput
                        label="Missions per month"
                        type="number"
                        value={String(missionsPerMonth)}
                        onChange={(e) => setMissionsPerMonth(parseInt(e.target.value) || 0)}
                      />
                      <ZSelect
                        label="Mission type"
                        value={missionType}
                        onChange={(e) => setMissionType(e.target.value)}
                        options={missionTypeOptions}
                      />
                    </div>
                  </div>

                  <div className="border-t border-[var(--z-border)] pt-4">
                    <h4 className="text-sm font-medium text-[var(--z-text-primary)] mb-3">GOES GREEN Energy</h4>
                    <div>
                      <label className="block text-xs text-[var(--z-text-muted)] mb-1">
                        Green energy share increase: {greenEnergyIncrease}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={greenEnergyIncrease}
                        onChange={(e) => setGreenEnergyIncrease(parseInt(e.target.value))}
                        className="w-full accent-[var(--z-violet)]"
                      />
                      <div className="flex justify-between text-xs text-[var(--z-text-muted)]">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--z-border)] pt-4">
                    <h4 className="text-sm font-medium text-[var(--z-text-primary)] mb-3">Product Materials</h4>
                    <div>
                      <label className="block text-xs text-[var(--z-text-muted)] mb-1">
                        Shift to sustainable materials: {materialShiftPercent}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={materialShiftPercent}
                        onChange={(e) => setMaterialShiftPercent(parseInt(e.target.value))}
                        className="w-full accent-[var(--z-violet)]"
                      />
                      <div className="flex justify-between text-xs text-[var(--z-text-muted)]">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--z-border)] pt-4">
                    <h4 className="text-sm font-medium text-[var(--z-text-primary)] mb-3">Foundation Contributions</h4>
                    <div>
                      <label className="block text-xs text-[var(--z-text-muted)] mb-1">
                        Contribution increase: {foundationIncrease}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={foundationIncrease}
                        onChange={(e) => setFoundationIncrease(parseInt(e.target.value))}
                        className="w-full accent-[var(--z-violet)]"
                      />
                      <div className="flex justify-between text-xs text-[var(--z-text-muted)]">
                        <span>0%</span>
                        <span>200%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <ZButton variant="primary" onClick={runSimulation} disabled={loading}>
                      {loading ? 'Running...' : 'Run Simulation'}
                    </ZButton>
                    <ZButton variant="ghost" onClick={resetForm}>Reset</ZButton>
                  </div>
                </div>
              </ZCard>

              {result && (
                <ZCard className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <ZSectionHeader title="Simulation Results" />
                    <ConfidenceBadge level={result.confidence.level} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                      label="CO2 Reduction"
                      baseline={result.baseline.co2_kgco2_per_year}
                      scenario={result.scenario.co2_kgco2_per_year}
                      delta={-result.deltas.co2_reduction_kgco2_per_year}
                      unit="kg/year"
                      isPositive={false}
                    />
                    <MetricCard
                      label="Green Energy"
                      baseline={result.baseline.energy_green_percent}
                      scenario={result.scenario.energy_green_percent}
                      delta={result.deltas.energy_green_increase_percent}
                      unit="%"
                    />
                    <MetricCard
                      label="Sustainable Materials"
                      baseline={result.baseline.materials_sustainable_percent}
                      scenario={result.scenario.materials_sustainable_percent}
                      delta={result.deltas.materials_sustainable_increase_percent}
                      unit="%"
                    />
                    <MetricCard
                      label="Foundation Impact"
                      baseline={result.baseline.foundation_impact_kgco2}
                      scenario={result.scenario.foundation_impact_kgco2}
                      delta={result.deltas.foundation_impact_increase_kgco2}
                      unit="kg CO2"
                    />
                  </div>

                  {result.explanations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[var(--z-text-primary)] mb-2">Impact Breakdown</h4>
                      <div className="space-y-2">
                        {result.explanations.map((exp, idx) => (
                          <div key={idx} className="p-3 bg-[var(--z-surface)] rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[var(--z-text-secondary)]">{exp.text}</span>
                              {exp.impact_kgco2 && (
                                <span className="text-xs text-emerald-400">{exp.impact_kgco2} kg CO2</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.confidence.notes.length > 0 && (
                    <div className="p-3 bg-[var(--z-surface)] rounded-lg">
                      <h4 className="text-xs font-medium text-[var(--z-text-muted)] mb-1">Confidence Notes</h4>
                      <ul className="text-xs text-[var(--z-text-muted)] space-y-1">
                        {result.confidence.notes.map((note, idx) => (
                          <li key={idx}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ZCard>
              )}
            </div>

            <div className="space-y-6">
              <AgentPanel
                context="simulation"
                title="Ask FREYA"
                description="Nordic agent for scenario planning"
              />

              <ZCard className="p-4">
                <ZSectionHeader title="Quick Presets" className="mb-3" />
                {presetsLoading ? (
                  <ZLoadingState message="Loading presets..." size="sm" />
                ) : presets.length === 0 ? (
                  <ZEmptyState title="No presets" description="Configure your own scenario above." size="sm" />
                ) : (
                  <div className="space-y-3">
                    {presets.map((preset) => (
                      <PresetCard key={preset.id} preset={preset} onSelect={runPreset} isLoading={loading} />
                    ))}
                  </div>
                )}
              </ZCard>

              <ZCard className="p-4">
                <ZSectionHeader title="Quick Actions" className="mb-3" />
                <div className="space-y-2">
                  <ZButton variant="secondary" className="w-full justify-start" href="/climate">Climate OS</ZButton>
                  <ZButton variant="secondary" className="w-full justify-start" href="/goes-green">GOES GREEN</ZButton>
                  <ZButton variant="secondary" className="w-full justify-start" href="/foundation">Impact OS</ZButton>
                  <ZButton variant="secondary" className="w-full justify-start" href="/dashboard">Back to Desk</ZButton>
                </div>
              </ZCard>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
