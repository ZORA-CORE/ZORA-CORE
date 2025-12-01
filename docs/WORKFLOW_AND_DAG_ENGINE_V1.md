# Workflow / DAG Engine v1.0

**Iteration**: 00D5  
**Schema Version**: 3.5.0  
**Status**: Implemented

## Overview

The Workflow / DAG Engine v1.0 provides a backend orchestration layer for ZORA CORE that can define and execute multi-step processes as directed acyclic graphs (DAGs). This is a core piece of the "Intelligence Spine" for Backend v4.

Key capabilities:
- Define reusable workflows as DAGs of steps
- Run workflows per tenant with context variables
- Integrate with the existing agent_tasks execution engine
- Track step status and workflow progress

Example use cases:
- New tenant climate onboarding
- Starter ZORA SHOP capsule project
- GOES GREEN household journey
- Foundation project + contribution flow

## Architecture

### Difference from Playbooks

| Aspect | Playbooks | Workflow / DAG Engine |
|--------|-----------|----------------------|
| Purpose | Business workflows / templates | System orchestration |
| Users | Human-driven | Agent-driven, automation |
| Steps | Manual human actions | Agent tasks, API calls |
| Execution | User-initiated step completion | Automatic advancement |

The two systems are complementary and can be wired together in future iterations.

### Components

1. **Schema Tables** (Supabase)
   - `workflows` - Workflow definitions
   - `workflow_steps` - Steps (nodes) in the DAG
   - `workflow_step_edges` - Edges between steps
   - `workflow_runs` - Execution instances
   - `workflow_run_steps` - Step status within runs

2. **Python Engine** (`zora_core/workflows/engine.py`)
   - Core workflow execution logic
   - DAG traversal and step scheduling
   - Agent task integration

3. **Workers API** (`/api/workflows`, `/api/workflow-runs`)
   - REST endpoints for workflow management
   - Run creation and advancement

## Data Model

### workflows

Workflow definitions (DAG templates).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL = global template |
| key | TEXT | Machine-readable key (e.g., `climate_onboarding_v1`) |
| name | TEXT | Human-readable name |
| description | TEXT | Optional description |
| category | TEXT | Category: `climate_os`, `zora_shop`, `goes_green`, `foundation`, `academy`, `autonomy`, `billing` |
| is_active | BOOLEAN | Whether workflow is active |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### workflow_steps

Steps (nodes) in the workflow DAG.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workflow_id | UUID | FK to workflows |
| key | TEXT | Step key (e.g., `create_climate_profile`) |
| name | TEXT | Human-readable name |
| description | TEXT | Optional description |
| step_type | TEXT | `agent_task`, `api_call`, `noop`, `wait_for_approval` |
| agent_id | TEXT | Agent ID for agent_task steps (e.g., `LUMINA`, `CONNOR`) |
| task_type | TEXT | Task type for agent_task steps |
| config | JSONB | Step-specific configuration |
| order_index | INTEGER | Optional linear ordering |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### workflow_step_edges

Edges between steps for DAG semantics.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workflow_id | UUID | FK to workflows |
| from_step_id | UUID | FK to workflow_steps |
| to_step_id | UUID | FK to workflow_steps |
| condition | TEXT | Edge condition: `on_success`, `on_failure`, `always` |

### workflow_runs

Execution instances of workflows.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| workflow_id | UUID | FK to workflows |
| triggered_by_user_id | UUID | FK to users (optional) |
| status | TEXT | `pending`, `running`, `completed`, `failed`, `canceled`, `paused` |
| context | JSONB | Initial context variables |
| result | JSONB | Final result data |
| error_message | TEXT | Error message if failed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| started_at | TIMESTAMPTZ | When run started |
| completed_at | TIMESTAMPTZ | When run completed |

### workflow_run_steps

Step status within a workflow run.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| run_id | UUID | FK to workflow_runs |
| step_id | UUID | FK to workflow_steps |
| status | TEXT | `pending`, `waiting_for_task`, `running`, `completed`, `failed`, `skipped` |
| agent_task_id | UUID | FK to agent_tasks (for agent_task steps) |
| input_context | JSONB | Input context for this step |
| output_context | JSONB | Output context after completion |
| error_message | TEXT | Error message if failed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| started_at | TIMESTAMPTZ | When step started |
| completed_at | TIMESTAMPTZ | When step completed |

## Execution Model

### Creating a Run

1. Find workflow by `tenant_id` + `key` (or global workflow)
2. Create `workflow_runs` row with `status='pending'`
3. Initialize `workflow_run_steps` entries for all steps with `status='pending'`

### Determining Runnable Steps

A step is runnable if:
1. `status='pending'`
2. All predecessor steps (via edges) have `status` in `{completed, skipped}`

For simple linear flows (no edges), uses `order_index` ordering.

### Starting a Step

For `step_type='agent_task'`:
1. Create `agent_tasks` row with payload from step config + run context
2. Save `agent_task_id` in `workflow_run_steps`
3. Mark step `status='waiting_for_task'`

For `step_type='noop'`:
1. Mark step `status='completed'` immediately

### Updating from Tasks

When an agent_task completes or fails:
1. Find linked `workflow_run_steps` by `agent_task_id`
2. Update step status to `completed` or `failed`
3. Optionally advance the workflow

### Workflow Completion

When all steps are in terminal states (`completed`, `failed`, `skipped`):
- If any step failed: `workflow_runs.status='failed'`
- Otherwise: `workflow_runs.status='completed'`

## API Reference

### Workflow Definitions

#### GET /api/workflows

List workflows visible to the current tenant (global + tenant-specific).

**Query Parameters:**
- `category` (optional): Filter by category
- `active` (optional): Filter by is_active

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": null,
      "key": "climate_onboarding_v1",
      "name": "Climate Onboarding",
      "category": "climate_os",
      "is_active": true
    }
  ],
  "error": null
}
```

#### GET /api/workflows/:id

Get workflow detail including steps and edges.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "key": "climate_onboarding_v1",
    "name": "Climate Onboarding",
    "steps": [...],
    "edges": [...]
  },
  "error": null
}
```

#### POST /api/workflows

Create a new workflow (founder/brand_admin only).

**Request Body:**
```json
{
  "key": "climate_onboarding_v1",
  "name": "Climate Onboarding",
  "description": "Onboard new tenant with climate profile and missions",
  "category": "climate_os",
  "steps": [
    {
      "key": "create_profile",
      "name": "Create Climate Profile",
      "step_type": "agent_task",
      "agent_id": "CONNOR",
      "task_type": "climate.create_profile",
      "order_index": 0
    },
    {
      "key": "seed_missions",
      "name": "Seed Starter Missions",
      "step_type": "agent_task",
      "agent_id": "LUMINA",
      "task_type": "climate.seed_missions",
      "order_index": 1
    }
  ],
  "edges": [
    {
      "from_step_key": "create_profile",
      "to_step_key": "seed_missions",
      "condition": "on_success"
    }
  ]
}
```

#### PATCH /api/workflows/:id

Update a workflow (founder/brand_admin only).

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "is_active": false
}
```

### Workflow Runs

#### POST /api/workflows/:id/run

Create and start a workflow run.

**Request Body:**
```json
{
  "context": {
    "profile_id": "uuid",
    "org_id": "uuid"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "workflow_id": "uuid",
    "status": "pending",
    "context": {...},
    "steps": [...]
  },
  "error": null
}
```

#### GET /api/workflow-runs

List workflow runs for the current tenant.

**Query Parameters:**
- `workflow_id` (optional): Filter by workflow
- `status` (optional): Filter by status
- `limit` (optional): Limit results (default: 50)

#### GET /api/workflow-runs/:id

Get workflow run detail with steps.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "workflow_id": "uuid",
    "status": "running",
    "workflow": {...},
    "steps": [
      {
        "id": "uuid",
        "status": "completed",
        "step": {...},
        "agent_task_id": "uuid"
      }
    ]
  },
  "error": null
}
```

#### POST /api/workflow-runs/:id/advance

Manually advance a workflow run (founder/brand_admin only).

**Response:**
```json
{
  "data": {
    "run": {...},
    "steps": [...],
    "steps_started": 2
  },
  "error": null
}
```

#### POST /api/workflow-runs/:id/cancel

Cancel a workflow run (founder/brand_admin only).

#### POST /api/workflow-runs/sync-from-tasks

Sync workflow step statuses from agent tasks (founder/brand_admin only).

## Python CLI Usage

### Create a Workflow Run

```bash
PYTHONPATH=. python -m zora_core.workflows.cli create-run \
  --tenant <uuid> \
  --workflow climate_onboarding_v1 \
  --context '{"profile_type": "individual"}'
```

### Advance a Run

```bash
PYTHONPATH=. python -m zora_core.workflows.cli advance --run <uuid>
```

### Check Run Status

```bash
PYTHONPATH=. python -m zora_core.workflows.cli status --run <uuid>
```

### Sync from Agent Tasks

```bash
PYTHONPATH=. python -m zora_core.workflows.cli sync-from-tasks --tenant <uuid>
```

### List Workflows

```bash
PYTHONPATH=. python -m zora_core.workflows.cli list-workflows --tenant <uuid>
```

### List Runs

```bash
PYTHONPATH=. python -m zora_core.workflows.cli list-runs --tenant <uuid> --status running
```

## Example Workflows

### Climate Onboarding v1

```json
{
  "key": "climate_onboarding_v1",
  "name": "Climate Onboarding",
  "category": "climate_os",
  "steps": [
    {
      "key": "create_climate_profile",
      "name": "Create Climate Profile",
      "step_type": "agent_task",
      "agent_id": "CONNOR",
      "task_type": "climate.create_profile",
      "order_index": 0
    },
    {
      "key": "seed_starter_missions",
      "name": "Seed Starter Missions",
      "step_type": "agent_task",
      "agent_id": "LUMINA",
      "task_type": "climate.seed_missions",
      "order_index": 1
    }
  ],
  "edges": [
    {
      "from_step_key": "create_climate_profile",
      "to_step_key": "seed_starter_missions",
      "condition": "on_success"
    }
  ]
}
```

### ZORA SHOP Capsule v1

```json
{
  "key": "zora_shop_capsule_v1",
  "name": "ZORA SHOP Capsule Project",
  "category": "zora_shop",
  "steps": [
    {
      "key": "create_project",
      "name": "Create ZORA SHOP Project",
      "step_type": "agent_task",
      "agent_id": "CONNOR",
      "task_type": "zora_shop.create_project",
      "order_index": 0
    },
    {
      "key": "add_climate_meta",
      "name": "Add Climate Metadata",
      "step_type": "agent_task",
      "agent_id": "ORACLE",
      "task_type": "zora_shop.add_climate_meta",
      "order_index": 1
    }
  ]
}
```

## Future Evolution

### Autonomy Schedules Integration

Workflows can be triggered by autonomy schedules:
```json
{
  "schedule_type": "workflow_trigger",
  "config": {
    "workflow_key": "climate_onboarding_v1",
    "context_template": {...}
  }
}
```

### Continual Learning

ORACLE can analyze workflow outcomes to:
- Prioritize workflows that generate impact
- Suggest workflow optimizations
- Identify bottlenecks

### Agents as Engineers

CONNOR and LUMINA can use workflows as building blocks:
- Create new workflows programmatically
- Compose workflows from existing steps
- Adapt workflows based on context

### Event-Driven Execution

Future versions may support:
- Webhook triggers
- Database event triggers
- Real-time task completion callbacks

## Related Documentation

- [Agent Task Execution Engine v1](./AGENT_TASK_EXECUTION_ENGINE_V1.md)
- [Safety + Scheduling v1](./SAFETY_AND_SCHEDULING_V1.md)
- [Observability & System Metrics v1](./OBSERVABILITY_AND_METRICS_V1.md)
- [Global Impact & Data Aggregates v1](./GLOBAL_IMPACT_AND_AGGREGATES_V1.md)
