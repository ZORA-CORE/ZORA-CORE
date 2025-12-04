# ZORA Simulation Studio v1.0 (Frontend)

The Simulation Studio is a frontend page that enables "what if" climate scenario modeling with BEFORE/AFTER impact visualization. It transforms ZORA from a reporting dashboard into a "Nordic Climate Lab" for decision support.

## Overview

The Simulation Studio provides an interactive interface for users to explore different climate strategies and see their potential impact. It integrates with the Simulation Engine backend and includes ODIN as an AI assistant for scenario recommendations.

## Page Location

- **Route**: `/simulation`
- **Navigation**: Accessible via sidebar and Command Palette ("Go to Simulation Studio")

## Layout

The page is divided into two main panels:

### Scenario Builder (Left Panel)

The Scenario Builder provides controls for defining simulation parameters:

**Time Horizon Select**
- Options: 3, 6, 12, or 24 months
- Default: 12 months
- Affects how long-term impacts are calculated

**Missions Delta**
- Input: Number of missions per month (0-100)
- Dropdown: Mission type selection
  - household_behavior_change
  - transport_optimization
  - energy_efficiency
  - diet_change
  - waste_reduction
- Impact: Each mission type has different CO2 reduction potential

**GOES GREEN Delta**
- Slider: 0-100% green energy share increase
- Impact: 200 kgCO2 per percentage point

**Product Material Shift**
- Slider: 0-100% shift to sustainable materials
- Target: Hemp/sustainable materials
- Impact: 150 kgCO2 per percentage point

**Foundation Delta**
- Slider: 0-100% contribution increase
- Impact: 0.5 kgCO2 per dollar contributed

**Preset Scenarios**
- Quick-select buttons for common scenarios
- Loads preset values into all controls
- Available presets:
  - Double Household Behavior Missions
  - +20% Green Energy Share
  - Shift 30% Products to Hemp/Sustainable
  - +50% Foundation Contributions
  - Blended Climate Strategy

**Run Simulation Button**
- Triggers POST /api/admin/simulation/run
- Shows loading state during API call
- Displays error messages if simulation fails

### Results & Visualizations (Right Panel)

The Results panel displays simulation outcomes:

**Confidence Badge**
- Shows confidence level (High/Medium/Low)
- Color-coded: green (high), yellow (medium), red (low)
- Based on data completeness percentage

**BEFORE vs AFTER Metrics**
- Side-by-side comparison cards
- Metrics displayed:
  - CO2 per year (kgCO2)
  - Green energy share (%)
  - Sustainable materials (%)
  - Foundation impact (kgCO2)
  - Total missions count
  - GOES GREEN actions count
  - Products count
  - Foundation contributions ($)

**Delta Cards**
- Highlight key changes
- Show absolute and percentage changes
- Color-coded for positive/negative impact

**Explanations**
- Detailed breakdown of impact calculations
- Category-specific explanations
- Impact values for each strategy component

**Data Quality Notes**
- Warnings about data gaps
- Suggestions for improving estimates
- Transparency about limitations

## AgentPanel Integration

The Simulation Studio includes an AgentPanel with ODIN as the primary voice:

**Context**: `simulation`
**Agent**: ODIN
**Placeholder**: "Ask ODIN for scenario recommendations..."
**Default Prompt**: "Suggest a scenario for maximum CO2 reduction in 12 months"

**ODIN Capabilities**:
- Suggest scenarios for maximum CO2 reduction
- Recommend hemp-focused product/material strategies
- Propose blended strategies combining multiple approaches
- Provide commentary on simulation results

## Command Palette Integration

The Simulation Studio is accessible via Command Palette:

**Command**: "Go to Simulation Studio"
**Category**: Navigation
**Description**: "Run what-if climate scenarios and see BEFORE/AFTER impact"
**Icon**: Beaker icon

## Design

The Simulation Studio follows ZORA's Nordic design language:

- Clean, minimal interface
- Dark theme with accent colors
- Consistent with Desk and Cockpit pages
- Clear labels and tooltips
- Responsive layout

## States

**Loading State**
- Spinner shown during API calls
- Skeleton placeholders for content

**Empty State**
- Shown before first simulation
- Prompts user to configure and run a scenario

**Error State**
- Clear error messages
- Retry button
- Guidance for resolving issues

**Results State**
- Full visualization of simulation results
- Interactive elements for exploring data

## API Integration

The frontend integrates with these backend endpoints:

1. **GET /api/admin/simulation/presets** - Load preset scenarios on page mount
2. **POST /api/admin/simulation/run** - Run simulation with user-defined parameters
3. **POST /api/admin/simulation/run-preset** - Run simulation with preset scenario
4. **POST /api/agent-panel/ask** - ODIN suggestions (via AgentPanel)

## Authentication

The page requires authentication with `founder` or `brand_admin` role. Unauthenticated users are redirected to login.

## Disclaimer

The page includes a clear disclaimer: "This is a simulation/estimation based on ZORA data, not a guarantee. Results are for decision support only."

## Future Enhancements

Potential improvements for future versions:
- Charts for CO2 over time (line/bar)
- Energy mix visualization (stacked bar)
- Save/load custom scenarios
- Share scenarios with team members
- Historical simulation comparison
- Export results to PDF/CSV
