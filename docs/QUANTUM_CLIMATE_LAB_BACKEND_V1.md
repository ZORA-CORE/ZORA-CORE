# Quantum Climate Lab Backend v1.0

**Iteration 00C2** - Backend-only implementation for tracking and analyzing climate experiments, including quantum and quantum-inspired methods.

## Overview

The Quantum Climate Lab is a research tracking and analysis layer for ZORA CORE. It provides a structured way to record, track, and analyze climate experiments as part of ORACLE's research track. This module is designed to be honest, traceable, and compatible with existing climate and shop modules.

**Important Disclaimer**: This module is a research tracking and analysis layer, NOT a guarantee that quantum methods are better than classical approaches. Results must be interpreted honestly, and claims about quantum advantage should be backed by rigorous comparison with classical baselines.

## Schema

All schema changes are idempotent and encoded in `supabase/SUPABASE_SCHEMA_V1_FULL.sql`.

### Table: climate_experiments

Represents a research experiment in the Quantum Climate Lab.

```sql
CREATE TABLE IF NOT EXISTS climate_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    problem_domain TEXT NOT NULL,
    method_family TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    linked_profile_id UUID REFERENCES climate_profiles(id) ON DELETE SET NULL,
    linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    linked_material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    tags TEXT[],
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: climate_experiment_runs

Represents a single run of a given experiment with concrete parameters and results.

```sql
CREATE TABLE IF NOT EXISTS climate_experiment_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES climate_experiments(id) ON DELETE CASCADE,
    run_label TEXT,
    method_type TEXT NOT NULL,
    backend_provider TEXT,
    input_summary JSONB,
    parameters JSONB,
    metrics JSONB,
    evaluation JSONB,
    status TEXT NOT NULL DEFAULT 'completed',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Allowed/Recommended Values

### Problem Domains (`problem_domain`)

| Value | Description |
|-------|-------------|
| `energy_optimization` | Optimizing energy consumption, grid management, renewable integration |
| `transport_routing` | Vehicle routing, logistics optimization, supply chain transport |
| `material_mix` | Optimizing material compositions for climate impact |
| `supply_chain` | End-to-end supply chain optimization |
| `scenario_modeling` | Climate scenario analysis and pathway modeling |

### Method Families (`method_family`)

| Value | Description |
|-------|-------------|
| `classical` | Standard methods: linear programming, heuristics, ML, etc. |
| `quantum_inspired` | QAOA-style, simulated annealing, tensor networks emulated classically |
| `quantum_hardware` | Experiments run on actual quantum hardware or simulators |

### Method Types (`method_type`)

| Value | Description |
|-------|-------------|
| `linear_programming` | LP/MIP solvers (Gurobi, CPLEX, etc.) |
| `greedy_heuristic` | Greedy or constructive heuristics |
| `quantum_annealing` | D-Wave style quantum annealing |
| `qaoa` | Quantum Approximate Optimization Algorithm |
| `vqe` | Variational Quantum Eigensolver |
| `other_quantum` | Other quantum methods |

### Experiment Status (`status`)

| Value | Description |
|-------|-------------|
| `draft` | Initial creation, not yet designed |
| `design` | Experiment design phase |
| `running` | Actively running experiments |
| `analyzing` | Analyzing results |
| `completed` | Experiment completed |
| `archived` | Archived for reference |

### Run Status

| Value | Description |
|-------|-------------|
| `queued` | Run is queued for execution |
| `running` | Run is currently executing |
| `completed` | Run completed successfully |
| `failed` | Run failed with error |

### Backend Providers (`backend_provider`)

| Value | Description |
|-------|-------------|
| `classical_internal` | Internal classical compute |
| `qiskit` | IBM Qiskit |
| `braket` | Amazon Braket |
| `cirq` | Google Cirq |
| `simulator` | Quantum simulator |

## API Endpoints

All endpoints require JWT authentication and are tenant-scoped.

### Create Experiment

**POST /api/climate/experiments**

```json
{
  "title": "Optimize hemp-based logistics routes",
  "description": "Compare classical routing vs quantum-inspired QAOA for a hemp distribution network.",
  "problem_domain": "transport_routing",
  "method_family": "quantum_inspired",
  "linked_profile_id": "uuid-or-null",
  "linked_product_id": "uuid-or-null",
  "linked_material_id": "uuid-or-null",
  "tags": ["hemp", "routing", "QAOA"]
}
```

Response: Created experiment object with `id`, `status: "design"`, etc.

### List Experiments

**GET /api/climate/experiments**

Query parameters:
- `status` - Filter by status
- `problem_domain` - Filter by problem domain
- `method_family` - Filter by method family
- `tag` - Filter by tag (single tag)
- `linked_profile_id` - Filter by linked profile
- `linked_product_id` - Filter by linked product
- `linked_material_id` - Filter by linked material
- `limit` - Pagination limit (default: 20)
- `offset` - Pagination offset (default: 0)

Response includes `run_count` for each experiment.

### Get Experiment Details

**GET /api/climate/experiments/:id**

Returns full experiment details including `recent_runs` (last 5 runs with basic info).

### Update Experiment

**PATCH /api/climate/experiments/:id**

```json
{
  "status": "running",
  "tags": ["hemp", "routing", "QAOA", "phase2"]
}
```

### Create Experiment Run

**POST /api/climate/experiments/:id/runs**

```json
{
  "run_label": "baseline_LP",
  "method_type": "linear_programming",
  "backend_provider": "classical_internal",
  "input_summary": {
    "nodes": 120,
    "edges": 480,
    "demand_scenarios": 3
  },
  "parameters": {
    "solver": "gurobi",
    "time_limit_seconds": 300
  },
  "metrics": {
    "objective_value": 12345.67,
    "runtime_seconds": 42.3
  },
  "evaluation": {
    "better_than_baseline": true,
    "notes": "Improved 5% vs previous heuristic."
  },
  "status": "completed"
}
```

### List Experiment Runs

**GET /api/climate/experiments/:id/runs**

Query parameters:
- `status` - Filter by run status
- `method_type` - Filter by method type
- `sort_by` - Sort field: `created_at`, `completed_at`, `started_at` (default: `created_at`)
- `sort_order` - `asc` or `desc` (default: `desc`)
- `limit` - Pagination limit
- `offset` - Pagination offset

### Get Single Run

**GET /api/climate/experiments/runs/:runId**

Returns full run details including all metrics and evaluation data.

### Get Experiment Summary

**GET /api/climate/experiments/:id/summary**

Returns an analysis summary:

```json
{
  "experiment_id": "...",
  "total_runs": 12,
  "runs_by_status": {
    "completed": 10,
    "failed": 2
  },
  "methods_used": {
    "linear_programming": 3,
    "qaoa": 5,
    "quantum_annealing": 2
  },
  "best_objective_run": {
    "run_id": "...",
    "method_type": "qaoa",
    "backend_provider": "simulator",
    "metrics": {
      "objective_value": 11890.12,
      "runtime_seconds": 60.5
    }
  }
}
```

The `best_objective_run` is determined by the lowest `metrics.objective_value` across all completed runs.

## Journal Integration

The following journal entries are created automatically:

| Event Type | Category | When |
|------------|----------|------|
| `experiment_created` | `quantum_climate_lab` | New experiment created |
| `experiment_status_changed` | `quantum_climate_lab` | Experiment status updated |
| `experiment_run_recorded` | `quantum_climate_lab` | New run recorded |

Example journal entry:
```
Quantum Climate Lab experiment created: Optimize hemp-based logistics routes (transport_routing, quantum_inspired)
```

## Usage Examples

### Creating an Experiment

```bash
curl -X POST https://api.zoracore.dk/api/climate/experiments \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hemp supply chain optimization",
    "description": "Compare classical vs quantum methods for hemp supply chain routing",
    "problem_domain": "supply_chain",
    "method_family": "quantum_inspired",
    "tags": ["hemp", "supply_chain", "optimization"]
  }'
```

### Recording a Classical Baseline Run

```bash
curl -X POST https://api.zoracore.dk/api/climate/experiments/EXPERIMENT_ID/runs \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "run_label": "classical_baseline",
    "method_type": "linear_programming",
    "backend_provider": "classical_internal",
    "parameters": {
      "solver": "gurobi",
      "time_limit_seconds": 600
    },
    "metrics": {
      "objective_value": 15000.00,
      "runtime_seconds": 120.5,
      "gap_percent": 0.01
    },
    "status": "completed"
  }'
```

### Recording a Quantum-Inspired Run

```bash
curl -X POST https://api.zoracore.dk/api/climate/experiments/EXPERIMENT_ID/runs \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "run_label": "qaoa_depth_3",
    "method_type": "qaoa",
    "backend_provider": "simulator",
    "parameters": {
      "depth": 3,
      "shots": 1000,
      "optimizer": "COBYLA"
    },
    "metrics": {
      "objective_value": 14200.00,
      "runtime_seconds": 300.0,
      "approximation_ratio": 0.95
    },
    "evaluation": {
      "better_than_baseline": true,
      "improvement_percent": 5.3,
      "notes": "QAOA found 5.3% better solution than LP baseline"
    },
    "status": "completed"
  }'
```

### Getting Experiment Summary

```bash
curl https://api.zoracore.dk/api/climate/experiments/EXPERIMENT_ID/summary \
  -H "Authorization: Bearer YOUR_JWT"
```

## Integration Points

### ORACLE Agent

ORACLE can use these APIs to:
- Create experiments for climate research questions
- Record runs with different methods
- Analyze summaries to determine which methods work best
- Generate insights based on experiment results

### EIVOR Memory

Experiment and run data can be referenced in EIVOR's memory through journal entries, allowing the system to learn from past experiments.

### Climate OS

Experiments can be linked to:
- Climate profiles (for profile-specific optimization)
- Products (for product-related research)
- Materials (for material optimization studies)

## Security & Tenant Isolation

All endpoints enforce tenant scoping via RLS and JWT authentication. Experiments and runs are scoped to the authenticated tenant, preventing cross-tenant data access.

## Future Enhancements

Potential future iterations could include:

1. **Actual Quantum Hardware Integration**: Connect to real quantum backends (IBM, Amazon Braket, etc.)
2. **Automated Benchmarking**: Automatically run classical baselines for comparison
3. **Visualization Dashboard**: Frontend for experiment analysis and comparison
4. **Agent Task Integration**: New task types for ORACLE to run experiments automatically
5. **Result Caching**: Cache expensive computation results for reuse

## Related Documentation

- [Hemp & Climate Materials Backend v1.0](./HEMP_AND_CLIMATE_MATERIALS_BACKEND_V1.md)
- [Climate OS Backend v1.0](./CLIMATE_OS_BACKEND_V1.md)
- [ZORA SHOP Backend v1.0](./ZORA_SHOP_BACKEND_V1.md)
