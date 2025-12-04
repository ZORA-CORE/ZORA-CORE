"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { HeroSection } from "@/components/ui/HeroSection";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthContext";
import { AgentPanel } from "@/components/cockpit/AgentPanel";
import { getToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface ScenarioDeltas {
  missions_delta?: {
    missions_per_month: number;
    mission_type?: string;
  };
  goes_green_delta?: {
    green_energy_share_increase_percent: number;
  };
  product_material_shift?: {
    shift_percent: number;
    target_material?: string;
  };
  foundation_delta?: {
    contribution_increase_percent: number;
  };
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
  level: "high" | "medium" | "low";
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

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const colors = {
    high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs border ${colors[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Confidence
    </span>
  );
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
  const deltaColor = delta > 0 ? (isPositive ? "text-emerald-400" : "text-red-400") : "text-gray-400";
  const deltaSign = delta > 0 ? "+" : "";

  return (
    <div className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
      <div className="text-sm text-[var(--foreground)]/60 mb-2">{label}</div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-[var(--foreground)]">
          {scenario.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </span>
        <span className="text-sm text-[var(--foreground)]/60">{unit}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--foreground)]/40">
          Baseline: {baseline.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
        </span>
        <span className={deltaColor}>
          {deltaSign}{delta.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
        </span>
      </div>
    </div>
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
    <div
      className="p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-indigo-500/50 transition-colors cursor-pointer"
      onClick={() => !isLoading && onSelect(preset)}
    >
      <h4 className="font-medium text-[var(--foreground)] mb-1">{preset.name}</h4>
      <p className="text-sm text-[var(--foreground)]/60 mb-2">{preset.description}</p>
      <div className="text-xs text-indigo-400">{preset.expected_impact}</div>
    </div>
  );
}

export default function SimulationPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [timeHorizon, setTimeHorizon] = useState(12);
  const [missionsPerMonth, setMissionsPerMonth] = useState(0);
  const [missionType, setMissionType] = useState("household_behavior_change");
  const [greenEnergyIncrease, setGreenEnergyIncrease] = useState(0);
  const [materialShiftPercent, setMaterialShiftPercent] = useState(0);
  const [foundationIncrease, setFoundationIncrease] = useState(0);
  
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(true);

  useEffect(() => {
    async function loadPresets() {
      const token = getToken();
      if (!token) {
        setPresetsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/simulation/presets`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPresets(data.presets || []);
        }
      } catch (err) {
        console.warn("Failed to load presets:", err);
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
      setError("Authentication required");
      return;
    }

    const deltas: ScenarioDeltas = {};
    
    if (missionsPerMonth > 0) {
      deltas.missions_delta = {
        missions_per_month: missionsPerMonth,
        mission_type: missionType,
      };
    }
    
    if (greenEnergyIncrease > 0) {
      deltas.goes_green_delta = {
        green_energy_share_increase_percent: greenEnergyIncrease,
      };
    }
    
    if (materialShiftPercent > 0) {
      deltas.product_material_shift = {
        shift_percent: materialShiftPercent,
        target_material: "hemp",
      };
    }
    
    if (foundationIncrease > 0) {
      deltas.foundation_delta = {
        contribution_increase_percent: foundationIncrease,
      };
    }

    if (Object.keys(deltas).length === 0) {
      setError("Please configure at least one scenario parameter");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/simulation/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time_horizon_months: timeHorizon,
          deltas,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to run simulation");
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run simulation");
    } finally {
      setLoading(false);
    }
  };

  const runPreset = async (preset: ScenarioPreset) => {
    const token = getToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/simulation/run-preset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preset_id: preset.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to run simulation");
      }

      const data = await response.json();
      setResult(data.data);
      
      setTimeHorizon(preset.time_horizon_months);
      if (preset.deltas.missions_delta) {
        setMissionsPerMonth(preset.deltas.missions_delta.missions_per_month);
        setMissionType(preset.deltas.missions_delta.mission_type || "household_behavior_change");
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
      setError(err instanceof Error ? err.message : "Failed to run simulation");
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

  if (authLoading) {
    return (
      <PageShell>
        <LoadingSpinner />
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-[var(--foreground)]/60">Please sign in to access the Simulation Studio.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
            <HeroSection
              headline="Simulation Studio"
              subheadline="Run 'what if' climate scenarios to see BEFORE/AFTER impact. Explore different strategies and find the optimal path to your climate goals."
              size="sm"
            />

      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-800/50 rounded-lg">
            <p className="text-sm text-indigo-300">
              <strong>Note:</strong> This is a simulation/estimation tool based on ZORA&apos;s impact models. 
              Results are estimates and may vary based on actual implementation. Use this to explore strategies, 
              not as guaranteed outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold mb-4">Scenario Builder</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-[var(--foreground)]/60 mb-2">
                      Time Horizon
                    </label>
                    <select
                      value={timeHorizon}
                      onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded focus:border-indigo-500 focus:outline-none"
                    >
                      <option value={3}>3 months</option>
                      <option value={6}>6 months</option>
                      <option value={12}>12 months</option>
                      <option value={24}>24 months</option>
                    </select>
                  </div>

                  <div className="border-t border-[var(--card-border)] pt-4">
                    <h4 className="text-sm font-medium mb-3">Climate Missions</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--foreground)]/60 mb-1">
                          Missions per month
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={missionsPerMonth}
                          onChange={(e) => setMissionsPerMonth(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--foreground)]/60 mb-1">
                          Mission type
                        </label>
                        <select
                          value={missionType}
                          onChange={(e) => setMissionType(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="household_behavior_change">Household Behavior</option>
                          <option value="transport_optimization">Transport</option>
                          <option value="energy_efficiency">Energy Efficiency</option>
                          <option value="diet_change">Diet Change</option>
                          <option value="waste_reduction">Waste Reduction</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--card-border)] pt-4">
                    <h4 className="text-sm font-medium mb-3">GOES GREEN Energy</h4>
                    <div>
                      <label className="block text-xs text-[var(--foreground)]/60 mb-1">
                        Green energy share increase: {greenEnergyIncrease}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={greenEnergyIncrease}
                        onChange={(e) => setGreenEnergyIncrease(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-[var(--foreground)]/40">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--card-border)] pt-4">
                    <h4 className="text-sm font-medium mb-3">Product Materials</h4>
                    <div>
                      <label className="block text-xs text-[var(--foreground)]/60 mb-1">
                        Shift to sustainable materials: {materialShiftPercent}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={materialShiftPercent}
                        onChange={(e) => setMaterialShiftPercent(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-[var(--foreground)]/40">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--card-border)] pt-4">
                    <h4 className="text-sm font-medium mb-3">Foundation Contributions</h4>
                    <div>
                      <label className="block text-xs text-[var(--foreground)]/60 mb-1">
                        Contribution increase: {foundationIncrease}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={foundationIncrease}
                        onChange={(e) => setFoundationIncrease(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-[var(--foreground)]/40">
                        <span>0%</span>
                        <span>200%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={runSimulation}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
                    >
                      {loading ? "Running Simulation..." : "Run Simulation"}
                    </button>
                    <button
                      onClick={resetForm}
                      disabled={loading}
                      className="px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-indigo-500/50 disabled:opacity-50 rounded text-[var(--foreground)] transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </Card>

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              {result && (
                <Card variant="bordered" padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Simulation Results</h3>
                    <ConfidenceBadge level={result.confidence.level} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                      label="CO2 Reduction"
                      baseline={result.baseline.co2_kgco2_per_year}
                      scenario={result.scenario.co2_kgco2_per_year}
                      delta={result.deltas.co2_reduction_kgco2_per_year}
                      unit="kg/year"
                      isPositive={true}
                    />
                    <MetricCard
                      label="Green Energy"
                      baseline={result.baseline.energy_green_percent}
                      scenario={result.scenario.energy_green_percent}
                      delta={result.deltas.energy_green_increase_percent}
                      unit="%"
                      isPositive={true}
                    />
                    <MetricCard
                      label="Sustainable Materials"
                      baseline={result.baseline.materials_sustainable_percent}
                      scenario={result.scenario.materials_sustainable_percent}
                      delta={result.deltas.materials_sustainable_increase_percent}
                      unit="%"
                      isPositive={true}
                    />
                    <MetricCard
                      label="Foundation Impact"
                      baseline={result.baseline.foundation_impact_kgco2}
                      scenario={result.scenario.foundation_impact_kgco2}
                      delta={result.deltas.foundation_impact_increase_kgco2}
                      unit="kg CO2"
                      isPositive={true}
                    />
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Total Impact Summary</h4>
                    <div className="p-4 bg-indigo-900/20 border border-indigo-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-indigo-400 mb-1">
                        {(result.deltas.co2_reduction_kgco2_per_year + result.deltas.foundation_impact_increase_kgco2).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO2/year
                      </div>
                      <div className="text-sm text-[var(--foreground)]/60">
                        Combined direct reductions and foundation offsets over {result.time_horizon_months} months
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Explanations</h4>
                    <div className="space-y-3">
                      {result.explanations.map((explanation, index) => (
                        <div
                          key={index}
                          className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">
                              {explanation.category}
                            </span>
                            {explanation.impact_kgco2 && (
                              <span className="text-xs text-emerald-400">
                                {explanation.impact_kgco2.toLocaleString()} kg CO2
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--foreground)]/80">{explanation.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.confidence.notes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Data Quality Notes</h4>
                      <ul className="text-sm text-[var(--foreground)]/60 space-y-1">
                        {result.confidence.notes.map((note, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-[var(--foreground)]/40">•</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card variant="bordered" padding="md">
                <h3 className="text-lg font-semibold mb-4">Quick Presets</h3>
                {presetsLoading ? (
                  <LoadingSpinner />
                ) : presets.length > 0 ? (
                  <div className="space-y-3">
                    {presets.map((preset) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        onSelect={runPreset}
                        isLoading={loading}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--foreground)]/60">
                    No presets available. Configure your own scenario above.
                  </p>
                )}
              </Card>

              <AgentPanel
                context="simulation"
                title="Ask ODIN"
                description="Get scenario recommendations from the Chief Strategist"
              />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
