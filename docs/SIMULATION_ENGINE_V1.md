# ZORA Simulation Engine v1.0

The Simulation Engine is a decision support tool for "what if" climate scenario modeling. It produces consistent, explainable estimations based on existing impact data, world model relations, and aggregated stats.

## Overview

The Simulation Engine enables users to explore different climate strategies and see BEFORE/AFTER impact visualization. It is NOT a physics simulation - it's a tool that helps users understand the potential impact of different climate strategies based on ZORA's impact models.

## API Endpoints

### POST /api/admin/simulation/run

Run a simulation with custom scenario inputs.

**Request Body:**
```json
{
  "tenant_id": "optional-override-for-founder",
  "time_horizon_months": 12,
  "deltas": {
    "missions_delta": {
      "missions_per_month": 10,
      "mission_type": "household_behavior_change"
    },
    "goes_green_delta": {
      "green_energy_share_increase_percent": 20
    },
    "product_material_shift": {
      "shift_percent": 30,
      "target_material": "hemp"
    },
    "foundation_delta": {
      "contribution_increase_percent": 50
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "tenant_id": "uuid",
    "time_horizon_months": 12,
    "computed_at": "2024-01-01T00:00:00Z",
    "baseline": {
      "co2_kgco2_per_year": 1000,
      "energy_green_percent": 20,
      "materials_sustainable_percent": 10,
      "foundation_impact_kgco2": 500,
      "missions_count": 5,
      "goes_green_actions_count": 3,
      "products_count": 10,
      "foundation_contributions_total": 1000
    },
    "scenario": {
      "co2_kgco2_per_year": 5000,
      "energy_green_percent": 40,
      "materials_sustainable_percent": 40,
      "foundation_impact_kgco2": 750,
      "missions_count": 125,
      "goes_green_actions_count": 3,
      "products_count": 10,
      "foundation_contributions_total": 1500
    },
    "deltas": {
      "co2_reduction_kgco2_per_year": 4000,
      "co2_reduction_percent": 400,
      "energy_green_increase_percent": 20,
      "materials_sustainable_increase_percent": 30,
      "foundation_impact_increase_kgco2": 250,
      "foundation_impact_increase_percent": 50
    },
    "explanations": [
      {
        "category": "missions",
        "text": "Adding 10 household_behavior_change missions per month...",
        "impact_kgco2": 3600
      }
    ],
    "confidence": {
      "level": "medium",
      "data_completeness_percent": 60,
      "notes": ["No energy profile data available..."]
    }
  }
}
```

### GET /api/admin/simulation/presets

Get preset scenario templates for quick simulation.

**Response:**
```json
{
  "presets": [
    {
      "id": "double-missions-household",
      "name": "Double Household Behavior Missions",
      "description": "Add 10 household behavior change missions per month for 12 months",
      "time_horizon_months": 12,
      "deltas": { ... },
      "expected_impact": "Estimated 3,600 kgCO2 reduction per year"
    }
  ],
  "count": 5
}
```

### POST /api/admin/simulation/run-preset

Run a simulation using a preset scenario.

**Request Body:**
```json
{
  "preset_id": "blended-strategy",
  "tenant_id": "optional-override-for-founder"
}
```

### GET /api/admin/simulation/info

Get information about the simulation engine.

## Scenario Inputs

The simulation engine supports four types of scenario deltas:

### missions_delta
Add climate missions per month. Each mission type has a different estimated impact:
- `household_behavior_change`: 30 kgCO2 per mission
- `transport_optimization`: 80 kgCO2 per mission
- `energy_efficiency`: 100 kgCO2 per mission
- `diet_change`: 40 kgCO2 per mission
- `waste_reduction`: 25 kgCO2 per mission
- `default`: 50 kgCO2 per mission

### goes_green_delta
Increase green energy share by a percentage. Impact is calculated at 200 kgCO2 per percentage point increase.

### product_material_shift
Shift products to sustainable materials (e.g., hemp). Impact is calculated at 150 kgCO2 per percentage point shift.

### foundation_delta
Increase foundation contributions by a percentage. Impact is calculated at 0.5 kgCO2 per dollar contributed.

## Preset Scenarios

The engine includes 5 preset scenarios:

1. **Double Household Behavior Missions** - Add 10 household missions/month for 12 months
2. **+20% Green Energy Share** - Increase green energy by 20 percentage points
3. **Shift 30% Products to Hemp/Sustainable** - Shift 30% of products to sustainable materials
4. **+50% Foundation Contributions** - Increase foundation contributions by 50%
5. **Blended Climate Strategy** - Combine all four strategies for maximum impact

## Confidence Levels

The simulation engine assesses confidence based on data completeness:
- **High** (80%+ data completeness): Good data coverage, estimates based on actual tenant data
- **Medium** (40-80% data completeness): Some data gaps, estimates may be less accurate
- **Low** (<40% data completeness): Limited data, estimates are theoretical

## Limitations

1. This is a decision support tool, not a physics simulation
2. Estimates are based on typical impact values and may vary in practice
3. Higher data completeness leads to more accurate estimates
4. Impact factors are simplified averages and may not reflect specific circumstances
5. The engine does not account for complex interactions between different strategies

## Rate Limiting

The simulation endpoints are rate-limited to 30 requests per minute per user.

## Authentication

All simulation endpoints require JWT authentication with `founder` or `brand_admin` role.

## Integration with ODIN

The Simulation Studio frontend includes an AgentPanel with ODIN as the primary voice. ODIN can suggest scenarios for maximum CO2 reduction, hemp-focused strategies, or blended approaches.
