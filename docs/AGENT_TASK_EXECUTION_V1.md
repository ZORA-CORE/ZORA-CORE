# Agent Task Execution Engine v1.0

This document describes the Agent Task Execution Engine v1.0, which provides a real execution layer for agent tasks in ZORA CORE. The engine enables structured task execution with domain-specific handlers for Climate OS and ZORA SHOP operations.

## Overview

The Task Execution Engine v1.0 introduces:

1. **Enhanced `agent_tasks` table** with `command_id` FK linking tasks to their originating commands, and a `result` JSONB column for structured execution results.

2. **Python Task Executor** (`zora_core/autonomy/executor.py`) with domain-specific handlers for v1 task types.

3. **CLI commands** for running pending tasks and executing specific tasks by ID.

4. **Workers API endpoints** for task inspection and manual execution triggering.

5. **Integration with Agent Commands** - LUMINA's command planner now creates `agent_tasks` rows with proper FK linking.

## Database Schema

### agent_tasks Table

The `agent_tasks` table stores tasks for the 6 core agents to process:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants.id (required) |
| `command_id` | UUID | FK to agent_commands.id (nullable) - links to originating command |
| `agent_id` | VARCHAR(50) | Agent identifier (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM) |
| `task_type` | VARCHAR(100) | Machine-readable task type string |
| `status` | ENUM | Task status: pending, in_progress, completed, failed |
| `priority` | INTEGER | Task priority (higher = more urgent, default: 0) |
| `title` | VARCHAR(500) | Human-readable task title |
| `description` | TEXT | Detailed task description |
| `payload` | JSONB | Structured input for the task type |
| `result` | JSONB | Structured execution result |
| `result_summary` | TEXT | Human-readable result summary |
| `error_message` | TEXT | Error description if failed |
| `started_at` | TIMESTAMPTZ | When execution started |
| `completed_at` | TIMESTAMPTZ | When execution completed |
| `created_by_user_id` | UUID | FK to users.id (nullable) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Indexes

- `idx_agent_tasks_tenant` - Tenant filtering
- `idx_agent_tasks_agent` - Agent filtering
- `idx_agent_tasks_status` - Status filtering
- `idx_agent_tasks_task_type` - Task type filtering
- `idx_agent_tasks_tenant_status` - Combined tenant + status
- `idx_agent_tasks_command_id` - Command linking (partial index where command_id IS NOT NULL)
- `idx_agent_tasks_pending_priority` - Optimized for task claiming (pending tasks by priority)

## Supported v1 Task Types

The Task Execution Engine v1.0 supports the following task types:

### Climate OS Task Types

#### `climate.create_missions_from_plan`

Create missions from a previously suggested weekly plan.

**Payload:**
```json
{
  "profile_id": "uuid",
  "plan_id": "uuid"
}
```

**Behavior:**
- Validates that the plan exists and belongs to the same tenant/profile
- Creates mission rows for each plan item
- Updates plan status to "applied"
- Creates journal entry for the action

#### `climate.create_single_mission`

Create a single mission for a given profile.

**Payload:**
```json
{
  "profile_id": "uuid",
  "title": "Replace 5 bulbs with LED",
  "category": "energy",
  "estimated_impact_kgco2": 20,
  "due_date": "2025-12-31",
  "notes": "Focus on living room and kitchen."
}
```

**Behavior:**
- Validates that the profile exists and belongs to the tenant
- Creates a new mission row in `climate_missions`
- Creates journal entry for mission creation

### ZORA SHOP Task Types

#### `zora_shop.create_project`

Create a new ZORA SHOP Project from a structured brief.

**Payload:**
```json
{
  "title": "ZORA x Green Fiber Hemp Capsule",
  "description": "Hemp-based collection focused on low-impact hoodies.",
  "primary_brand_id": "uuid",
  "secondary_brand_id": "uuid",
  "status": "idea",
  "theme": "hemp_collection",
  "target_launch_date": "2026-03-01"
}
```

**Behavior:**
- Validates that primary (and secondary if provided) brands exist
- Creates a new `zora_shop_projects` entry
- Creates journal entry for project creation

#### `zora_shop.update_product_climate_meta`

Update the climate metadata for a given product.

**Payload:**
```json
{
  "product_id": "uuid",
  "climate_label": "low_impact",
  "estimated_impact_kgco2": 12.5,
  "certifications": "EU Ecolabel",
  "notes": "Compared to standard cotton hoodie."
}
```

**Behavior:**
- Validates that the product exists and belongs to the tenant
- Validates climate_label (must be: low_impact, climate_neutral, climate_positive)
- Upserts into `product_climate_meta`
- Creates journal entry for the update

## How It Works

### Flow: Agent Commands to Task Execution

1. **Command Creation**: User submits a freeform command via `/admin/agents/console` or API
2. **LUMINA Planning**: The CommandPlanner uses LUMINA to analyze the command and create a plan
3. **Task Creation**: For each planned task, an `agent_tasks` row is created with:
   - `command_id` linking back to the originating command
   - `task_type` matching one of the supported v1 types
   - `payload` containing the structured input
   - `status` set to "pending"
4. **Task Execution**: The Task Executor fetches pending tasks and executes them:
   - Claims the task (pending → in_progress)
   - Dispatches to the appropriate handler based on `task_type`
   - Updates status, result, and error fields
   - Creates journal entries for lifecycle events
5. **Completion**: Task status is updated to "completed" or "failed"

### Status Transitions

```
pending → in_progress → completed
                     → failed
```

Failed tasks can be reset to pending for retry via the API.

## Running Tasks

### Via CLI

The CLI provides several commands for task execution:

```bash
# Execute pending tasks (up to 10)
python -m zora_core.autonomy.cli run-pending-tasks --limit=10

# Execute pending tasks of a specific type
python -m zora_core.autonomy.cli run-pending-tasks --task-type=climate.create_single_mission

# Execute a specific task by ID
python -m zora_core.autonomy.cli run-task <task-uuid>

# List supported task types
python -m zora_core.autonomy.cli task-types

# Show queue status
python -m zora_core.autonomy.cli status
```

### Via Workers API

#### List Tasks

```bash
GET /api/agents/tasks?status=pending&limit=10
```

Query parameters:
- `status` - Filter by status (pending, in_progress, completed, failed)
- `agent_id` - Filter by agent
- `task_type` - Filter by task type
- `limit` - Maximum results (default: 50)
- `offset` - Pagination offset

#### Get Task Detail

```bash
GET /api/agents/tasks/:id
```

Returns full task info including payload, result, and error_message.

#### Manual Execution Trigger

```bash
POST /api/agents/tasks/:id/run
```

Marks the task as queued for execution. For v1, actual execution happens via CLI.

Response includes:
- Task data
- Execution status (queued, reset_to_pending)
- Whether the task type is supported by v1 executor
- CLI command to run the task

#### List Supported Task Types

```bash
GET /api/agents/tasks/types
```

Returns all supported v1 task types with descriptions and payload schemas.

## Environment Variables

The Task Executor requires the following environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ZORA_TENANT_ID=your-tenant-uuid  # Optional, defaults to test tenant
```

## Integration with Schedulers

The Task Execution Engine v1.0 is designed to work with external schedulers:

### GitHub Actions (Recommended)

The existing `.github/workflows/agent-runtime.yml` workflow can be extended to run the Task Executor:

```yaml
- name: Run Task Executor
  run: |
    python -m zora_core.autonomy.cli run-pending-tasks --limit=10
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### Manual Execution

For testing or manual recovery:

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
export ZORA_TENANT_ID="your-tenant-uuid"

# Run pending tasks
python -m zora_core.autonomy.cli run-pending-tasks --limit=10 --verbose
```

## Journal Event Types

The Task Execution Engine creates the following journal entries:

| Event Type | Description |
|------------|-------------|
| `agent_task_created` | Task was created |
| `agent_task_run_requested` | Manual execution was requested via API |
| `agent_task_retry_requested` | Failed task was reset for retry |
| `climate_missions_created_from_plan` | Missions created from weekly plan |
| `climate_mission_created` | Single mission created |
| `zora_shop_project_created` | ZORA SHOP project created |
| `shop_product_climate_meta_updated` | Product climate metadata updated |

## Error Handling

### Unsupported Task Types

If a task has a `task_type` not supported by the v1 executor:
- The task is skipped during batch execution
- The API returns `is_v1_supported: false` with guidance
- The task can still be processed by the legacy Agent Runtime

### Validation Errors

Each handler validates its payload and returns clear error messages:
- Missing required fields
- Invalid UUIDs or references
- Invalid enum values (e.g., climate_label)

### Execution Failures

If a handler throws an exception:
- Task status is set to "failed"
- `error_message` contains the exception message
- Task can be retried via `POST /api/agents/tasks/:id/run`

## Future Iterations

The Task Execution Engine v1.0 is designed for extensibility:

1. **More Task Types**: Add handlers for additional domain operations
2. **Synchronous Execution**: API endpoint could trigger immediate execution
3. **Background Workers**: Integration with Cloudflare Queues or similar
4. **Retry Policies**: Automatic retry with backoff for transient failures
5. **Task Dependencies**: Support for task chains and dependencies

## Related Documentation

- [Agent Runtime v1](./AGENT_RUNTIME_V1.md) - Legacy agent task processing
- [Agent Command Console v1](./AGENT_COMMAND_CONSOLE_V1.md) - Natural language command interface
- [Climate OS Backend v1](./CLIMATE_OS_BACKEND_V1.md) - Climate profiles and missions
- [ZORA SHOP Backend v1](./ZORA_SHOP_BACKEND_V1.md) - Brands, products, and projects
