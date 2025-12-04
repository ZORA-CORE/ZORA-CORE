/**
 * ZORA Simulation Engine v1.0
 * 
 * A minimal but solid simulation engine for "what if" climate scenarios.
 * Produces consistent, explainable estimations based on:
 * - Existing impact data from /api/admin/impact/summary
 * - World model relations (missions, GOES GREEN actions, products, foundation projects)
 * - Aggregated stats and typical impact values
 * 
 * This is NOT a physics simulation - it's a decision support tool that helps
 * users understand the potential impact of different climate strategies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

export interface ScenarioInput {
  tenant_id?: string;
  time_horizon_months: number;
  deltas: ScenarioDeltas;
}

export interface ScenarioDeltas {
  missions_delta?: MissionsDelta;
  goes_green_delta?: GoesGreenDelta;
  product_material_shift?: ProductMaterialShift;
  foundation_delta?: FoundationDelta;
}

export interface MissionsDelta {
  missions_per_month: number;
  mission_type?: string;
}

export interface GoesGreenDelta {
  green_energy_share_increase_percent: number;
}

export interface ProductMaterialShift {
  shift_percent: number;
  target_material?: string;
}

export interface FoundationDelta {
  contribution_increase_percent: number;
}

export interface ImpactMetrics {
  co2_kgco2_per_year: number;
  energy_green_percent: number;
  materials_sustainable_percent: number;
  foundation_impact_kgco2: number;
  missions_count: number;
  goes_green_actions_count: number;
  products_count: number;
  foundation_contributions_total: number;
}

export interface SimulationResult {
  tenant_id: string;
  time_horizon_months: number;
  computed_at: string;
  baseline: ImpactMetrics;
  scenario: ImpactMetrics;
  deltas: ImpactDeltas;
  explanations: SimulationExplanation[];
  confidence: SimulationConfidence;
}

export interface ImpactDeltas {
  co2_reduction_kgco2_per_year: number;
  co2_reduction_percent: number;
  energy_green_increase_percent: number;
  materials_sustainable_increase_percent: number;
  foundation_impact_increase_kgco2: number;
  foundation_impact_increase_percent: number;
}

export interface SimulationExplanation {
  category: 'missions' | 'goes_green' | 'materials' | 'foundation' | 'overall';
  text: string;
  impact_kgco2?: number;
}

export interface SimulationConfidence {
  level: 'high' | 'medium' | 'low';
  data_completeness_percent: number;
  notes: string[];
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  time_horizon_months: number;
  deltas: ScenarioDeltas;
  expected_impact: string;
}

// =============================================================================
// Constants - Impact Factors
// =============================================================================

const IMPACT_FACTORS = {
  mission_avg_kgco2: 50,
  mission_types: {
    household_behavior_change: 30,
    transport_optimization: 80,
    energy_efficiency: 100,
    diet_change: 40,
    waste_reduction: 25,
    default: 50,
  } as Record<string, number>,
  goes_green_energy_kgco2_per_percent: 200,
  sustainable_material_kgco2_per_percent: 150,
  foundation_contribution_kgco2_per_dollar: 0.5,
};

// =============================================================================
// Preset Scenarios
// =============================================================================

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'double-missions-household',
    name: 'Double Household Behavior Missions',
    description: 'Add 10 household behavior change missions per month for 12 months',
    time_horizon_months: 12,
    deltas: {
      missions_delta: {
        missions_per_month: 10,
        mission_type: 'household_behavior_change',
      },
    },
    expected_impact: 'Estimated 3,600 kgCO2 reduction per year',
  },
  {
    id: 'green-energy-20',
    name: '+20% Green Energy Share',
    description: 'Increase green energy share by 20 percentage points',
    time_horizon_months: 12,
    deltas: {
      goes_green_delta: {
        green_energy_share_increase_percent: 20,
      },
    },
    expected_impact: 'Estimated 4,000 kgCO2 reduction per year',
  },
  {
    id: 'hemp-shift-30',
    name: 'Shift 30% Products to Hemp/Sustainable',
    description: 'Shift 30% of textile products to hemp or other sustainable materials',
    time_horizon_months: 12,
    deltas: {
      product_material_shift: {
        shift_percent: 30,
        target_material: 'hemp',
      },
    },
    expected_impact: 'Estimated 4,500 kgCO2 reduction per year',
  },
  {
    id: 'foundation-50',
    name: '+50% Foundation Contributions',
    description: 'Increase foundation contributions by 50%',
    time_horizon_months: 12,
    deltas: {
      foundation_delta: {
        contribution_increase_percent: 50,
      },
    },
    expected_impact: 'Estimated 2,500 kgCO2 offset increase per year',
  },
  {
    id: 'blended-strategy',
    name: 'Blended Climate Strategy',
    description: 'Combine missions, green energy, materials, and foundation for maximum impact',
    time_horizon_months: 12,
    deltas: {
      missions_delta: {
        missions_per_month: 5,
        mission_type: 'energy_efficiency',
      },
      goes_green_delta: {
        green_energy_share_increase_percent: 15,
      },
      product_material_shift: {
        shift_percent: 20,
        target_material: 'hemp',
      },
      foundation_delta: {
        contribution_increase_percent: 25,
      },
    },
    expected_impact: 'Estimated 12,000+ kgCO2 total impact per year',
  },
];

// =============================================================================
// Simulation Engine
// =============================================================================

export async function runSimulation(
  supabase: SupabaseClient,
  input: ScenarioInput,
  tenantId: string
): Promise<SimulationResult> {
  const effectiveTenantId = input.tenant_id || tenantId;
  const baseline = await computeBaseline(supabase, effectiveTenantId);
  const scenario = computeScenario(baseline, input);
  const deltas = computeDeltas(baseline, scenario);
  const explanations = generateExplanations(input, baseline, scenario, deltas);
  const confidence = assessConfidence(baseline);

  return {
    tenant_id: effectiveTenantId,
    time_horizon_months: input.time_horizon_months,
    computed_at: new Date().toISOString(),
    baseline,
    scenario,
    deltas,
    explanations,
    confidence,
  };
}

async function computeBaseline(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ImpactMetrics> {
  const metrics: ImpactMetrics = {
    co2_kgco2_per_year: 0,
    energy_green_percent: 0,
    materials_sustainable_percent: 0,
    foundation_impact_kgco2: 0,
    missions_count: 0,
    goes_green_actions_count: 0,
    products_count: 0,
    foundation_contributions_total: 0,
  };

  try {
    const { data: missions } = await supabase
      .from('climate_missions')
      .select('status, estimated_impact_kgco2')
      .eq('tenant_id', tenantId);

    if (missions) {
      metrics.missions_count = missions.length;
      for (const mission of missions) {
        if (mission.status === 'completed') {
          metrics.co2_kgco2_per_year += mission.estimated_impact_kgco2 || IMPACT_FACTORS.mission_avg_kgco2;
        }
      }
    }
  } catch (e) {
    console.warn('Error fetching climate_missions for simulation:', e);
  }

  try {
    const { data: goesGreenProfiles } = await supabase
      .from('goes_green_profiles')
      .select('energy_profile')
      .eq('tenant_id', tenantId);

    if (goesGreenProfiles && goesGreenProfiles.length > 0) {
      let totalGreenPercent = 0;
      let profilesWithEnergy = 0;
      for (const profile of goesGreenProfiles) {
        if (profile.energy_profile && typeof profile.energy_profile === 'object') {
          const energyProfile = profile.energy_profile as Record<string, number>;
          const greenPercent = energyProfile.green_percent || energyProfile.renewable_percent || 0;
          if (greenPercent > 0) {
            totalGreenPercent += greenPercent;
            profilesWithEnergy++;
          }
        }
      }
      if (profilesWithEnergy > 0) {
        metrics.energy_green_percent = totalGreenPercent / profilesWithEnergy;
      }
    }
  } catch (e) {
    console.warn('Error fetching goes_green_profiles for simulation:', e);
  }

  try {
    const { data: goesGreenActions } = await supabase
      .from('goes_green_actions')
      .select('status, estimated_savings_kgco2')
      .eq('tenant_id', tenantId);

    if (goesGreenActions) {
      metrics.goes_green_actions_count = goesGreenActions.length;
      for (const action of goesGreenActions) {
        if (action.status === 'completed') {
          metrics.co2_kgco2_per_year += action.estimated_savings_kgco2 || 0;
        }
      }
    }
  } catch (e) {
    console.warn('Error fetching goes_green_actions for simulation:', e);
  }

  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, climate_metadata')
      .eq('tenant_id', tenantId);

    if (products) {
      metrics.products_count = products.length;
      let sustainableCount = 0;
      for (const product of products) {
        if (product.climate_metadata && typeof product.climate_metadata === 'object') {
          const climateMeta = product.climate_metadata as Record<string, unknown>;
          if (climateMeta.is_sustainable || climateMeta.sustainable_materials) {
            sustainableCount++;
          }
        }
      }
      if (products.length > 0) {
        metrics.materials_sustainable_percent = (sustainableCount / products.length) * 100;
      }
    }
  } catch (e) {
    console.warn('Error fetching products for simulation:', e);
  }

  try {
    const { data: contributions } = await supabase
      .from('foundation_contributions')
      .select('amount_cents')
      .eq('tenant_id', tenantId);

    if (contributions) {
      for (const contribution of contributions) {
        metrics.foundation_contributions_total += (contribution.amount_cents || 0) / 100;
      }
      metrics.foundation_impact_kgco2 = metrics.foundation_contributions_total * IMPACT_FACTORS.foundation_contribution_kgco2_per_dollar;
    }
  } catch (e) {
    console.warn('Error fetching foundation_contributions for simulation:', e);
  }

  try {
    const { data: impactLogs } = await supabase
      .from('foundation_impact_log')
      .select('impact_kgco2')
      .eq('tenant_id', tenantId);

    if (impactLogs) {
      let totalImpact = 0;
      for (const log of impactLogs) {
        totalImpact += log.impact_kgco2 || 0;
      }
      if (totalImpact > 0) {
        metrics.foundation_impact_kgco2 = totalImpact;
      }
    }
  } catch (e) {
    console.warn('Error fetching foundation_impact_log for simulation:', e);
  }

  return metrics;
}

function computeScenario(
  baseline: ImpactMetrics,
  input: ScenarioInput
): ImpactMetrics {
  const scenario = { ...baseline };
  const { deltas, time_horizon_months } = input;

  if (deltas.missions_delta) {
    const { missions_per_month, mission_type } = deltas.missions_delta;
    const impactPerMission = mission_type 
      ? (IMPACT_FACTORS.mission_types[mission_type] || IMPACT_FACTORS.mission_types.default)
      : IMPACT_FACTORS.mission_avg_kgco2;
    
    const totalNewMissions = missions_per_month * time_horizon_months;
    const annualizedImpact = (totalNewMissions * impactPerMission * 12) / time_horizon_months;
    
    scenario.missions_count += totalNewMissions;
    scenario.co2_kgco2_per_year += annualizedImpact;
  }

  if (deltas.goes_green_delta) {
    const { green_energy_share_increase_percent } = deltas.goes_green_delta;
    const newGreenPercent = Math.min(100, baseline.energy_green_percent + green_energy_share_increase_percent);
    const actualIncrease = newGreenPercent - baseline.energy_green_percent;
    
    scenario.energy_green_percent = newGreenPercent;
    scenario.co2_kgco2_per_year += actualIncrease * IMPACT_FACTORS.goes_green_energy_kgco2_per_percent;
  }

  if (deltas.product_material_shift) {
    const { shift_percent } = deltas.product_material_shift;
    const newSustainablePercent = Math.min(100, baseline.materials_sustainable_percent + shift_percent);
    const actualIncrease = newSustainablePercent - baseline.materials_sustainable_percent;
    
    scenario.materials_sustainable_percent = newSustainablePercent;
    scenario.co2_kgco2_per_year += actualIncrease * IMPACT_FACTORS.sustainable_material_kgco2_per_percent;
  }

  if (deltas.foundation_delta) {
    const { contribution_increase_percent } = deltas.foundation_delta;
    const additionalContribution = baseline.foundation_contributions_total * (contribution_increase_percent / 100);
    const additionalImpact = additionalContribution * IMPACT_FACTORS.foundation_contribution_kgco2_per_dollar;
    
    scenario.foundation_contributions_total += additionalContribution;
    scenario.foundation_impact_kgco2 += additionalImpact;
  }

  return scenario;
}

function computeDeltas(
  baseline: ImpactMetrics,
  scenario: ImpactMetrics
): ImpactDeltas {
  const co2Reduction = scenario.co2_kgco2_per_year - baseline.co2_kgco2_per_year;
  const foundationIncrease = scenario.foundation_impact_kgco2 - baseline.foundation_impact_kgco2;

  return {
    co2_reduction_kgco2_per_year: co2Reduction,
    co2_reduction_percent: baseline.co2_kgco2_per_year > 0 
      ? (co2Reduction / baseline.co2_kgco2_per_year) * 100 
      : (co2Reduction > 0 ? 100 : 0),
    energy_green_increase_percent: scenario.energy_green_percent - baseline.energy_green_percent,
    materials_sustainable_increase_percent: scenario.materials_sustainable_percent - baseline.materials_sustainable_percent,
    foundation_impact_increase_kgco2: foundationIncrease,
    foundation_impact_increase_percent: baseline.foundation_impact_kgco2 > 0
      ? (foundationIncrease / baseline.foundation_impact_kgco2) * 100
      : (foundationIncrease > 0 ? 100 : 0),
  };
}

function generateExplanations(
  input: ScenarioInput,
  baseline: ImpactMetrics,
  scenario: ImpactMetrics,
  deltas: ImpactDeltas
): SimulationExplanation[] {
  const explanations: SimulationExplanation[] = [];
  const { deltas: scenarioDeltas, time_horizon_months } = input;

  if (scenarioDeltas.missions_delta) {
    const { missions_per_month, mission_type } = scenarioDeltas.missions_delta;
    const totalMissions = missions_per_month * time_horizon_months;
    const impactPerMission = mission_type 
      ? (IMPACT_FACTORS.mission_types[mission_type] || IMPACT_FACTORS.mission_types.default)
      : IMPACT_FACTORS.mission_avg_kgco2;
    const totalImpact = totalMissions * impactPerMission;

    explanations.push({
      category: 'missions',
      text: `Adding ${missions_per_month} ${mission_type || 'climate'} missions per month over ${time_horizon_months} months (${totalMissions} total) is estimated to reduce ${totalImpact.toLocaleString()} kgCO2 per year. This assumes an average impact of ${impactPerMission} kgCO2 per completed mission.`,
      impact_kgco2: totalImpact,
    });
  }

  if (scenarioDeltas.goes_green_delta) {
    const { green_energy_share_increase_percent } = scenarioDeltas.goes_green_delta;
    const actualIncrease = scenario.energy_green_percent - baseline.energy_green_percent;
    const impact = actualIncrease * IMPACT_FACTORS.goes_green_energy_kgco2_per_percent;

    explanations.push({
      category: 'goes_green',
      text: `Increasing green energy share by ${green_energy_share_increase_percent}% (from ${baseline.energy_green_percent.toFixed(1)}% to ${scenario.energy_green_percent.toFixed(1)}%) is estimated to reduce ${impact.toLocaleString()} kgCO2 per year. This is based on typical energy consumption patterns and grid emission factors.`,
      impact_kgco2: impact,
    });
  }

  if (scenarioDeltas.product_material_shift) {
    const { shift_percent, target_material } = scenarioDeltas.product_material_shift;
    const actualIncrease = scenario.materials_sustainable_percent - baseline.materials_sustainable_percent;
    const impact = actualIncrease * IMPACT_FACTORS.sustainable_material_kgco2_per_percent;

    explanations.push({
      category: 'materials',
      text: `Shifting ${shift_percent}% of products to ${target_material || 'sustainable'} materials (from ${baseline.materials_sustainable_percent.toFixed(1)}% to ${scenario.materials_sustainable_percent.toFixed(1)}% sustainable) is estimated to reduce ${impact.toLocaleString()} kgCO2 per year. This accounts for lower lifecycle emissions of sustainable materials.`,
      impact_kgco2: impact,
    });
  }

  if (scenarioDeltas.foundation_delta) {
    const { contribution_increase_percent } = scenarioDeltas.foundation_delta;
    const additionalContribution = baseline.foundation_contributions_total * (contribution_increase_percent / 100);
    const impact = additionalContribution * IMPACT_FACTORS.foundation_contribution_kgco2_per_dollar;

    explanations.push({
      category: 'foundation',
      text: `Increasing foundation contributions by ${contribution_increase_percent}% (+$${additionalContribution.toLocaleString()}) is estimated to offset an additional ${impact.toLocaleString()} kgCO2 per year through climate projects. This assumes an average offset rate of ${IMPACT_FACTORS.foundation_contribution_kgco2_per_dollar} kgCO2 per dollar contributed.`,
      impact_kgco2: impact,
    });
  }

  const totalImpact = deltas.co2_reduction_kgco2_per_year + deltas.foundation_impact_increase_kgco2;
  explanations.push({
    category: 'overall',
    text: `Total estimated climate impact: ${totalImpact.toLocaleString()} kgCO2 per year (${deltas.co2_reduction_kgco2_per_year.toLocaleString()} from direct reductions + ${deltas.foundation_impact_increase_kgco2.toLocaleString()} from foundation offsets). These are estimates based on ZORA's impact models and may vary based on actual implementation.`,
    impact_kgco2: totalImpact,
  });

  return explanations;
}

function assessConfidence(baseline: ImpactMetrics): SimulationConfidence {
  const notes: string[] = [];
  let dataPoints = 0;
  let maxDataPoints = 5;

  if (baseline.missions_count > 0) {
    dataPoints++;
  } else {
    notes.push('No mission data available - using default impact estimates');
  }

  if (baseline.energy_green_percent > 0) {
    dataPoints++;
  } else {
    notes.push('No energy profile data available - baseline energy impact may be underestimated');
  }

  if (baseline.products_count > 0) {
    dataPoints++;
  } else {
    notes.push('No product data available - material shift estimates are theoretical');
  }

  if (baseline.foundation_contributions_total > 0) {
    dataPoints++;
  } else {
    notes.push('No foundation contribution data - foundation impact estimates are theoretical');
  }

  if (baseline.goes_green_actions_count > 0) {
    dataPoints++;
  } else {
    notes.push('No GOES GREEN actions data - energy transition estimates may be less accurate');
  }

  const completeness = (dataPoints / maxDataPoints) * 100;
  let level: 'high' | 'medium' | 'low';

  if (completeness >= 80) {
    level = 'high';
  } else if (completeness >= 40) {
    level = 'medium';
  } else {
    level = 'low';
  }

  if (notes.length === 0) {
    notes.push('Good data coverage - estimates are based on actual tenant data');
  }

  return {
    level,
    data_completeness_percent: completeness,
    notes,
  };
}

export function getSimulationInfo() {
  return {
    version: '1.0.0',
    description: 'ZORA Simulation Engine v1 - Climate scenario modeling',
    supported_deltas: [
      'missions_delta: Add climate missions per month',
      'goes_green_delta: Increase green energy share',
      'product_material_shift: Shift products to sustainable materials',
      'foundation_delta: Increase foundation contributions',
    ],
    impact_factors: IMPACT_FACTORS,
    presets_count: SCENARIO_PRESETS.length,
    notes: [
      'This is a decision support tool, not a physics simulation',
      'Estimates are based on typical impact values and may vary',
      'Higher data completeness leads to more accurate estimates',
    ],
  };
}
