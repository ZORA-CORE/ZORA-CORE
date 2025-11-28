# ZORA CORE - Safety + Scheduling v1

**Iteration 00B5** | Schema Version 2.3.0

This document describes the Safety Layer and Scheduling Model for ZORA CORE's autonomy system. The Safety Layer ensures that certain task types require manual approval before execution, while the Scheduling Model enables recurring autonomy routines.

## Overview

The Safety + Scheduling v1 layer adds three key capabilities:

1. **Task Policies**: Define which task types can auto-execute vs require manual approval
2. **Approval Flow**: API endpoints to review, approve, or reject pending tasks
3. **Autonomy Schedules**: Database-backed recurring schedules that generate agent tasks

## Database Schema

### Approval Fields on agent_tasks

The `agent_tasks` table has been extended with approval-related fields:

| Field | Type | Description |
|-------|------|-------------|
| `requires_approval` | BOOLEAN | Whether this task requires manual approval before execution |
| `approved_by_user_id` | UUID | User who approved the task (FK to users) |
| `approved_at` | TIMESTAMPTZ | When the task was approved |
| `rejected_by_user_id` | UUID | User who rejected the task (FK to users) |
| `rejected_at` | TIMESTAMPTZ | When the task was rejected |
| `decision_reason` | TEXT | Reason for approval/rejection |

### agent_task_policies Table

Defines execution policies per task type:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant-specific override (NULL = global policy) |
| `task_type` | TEXT | Task type identifier (e.g., `climate.create_missions_from_plan`) |
| `auto_execute` | BOOLEAN | Whether tasks of this type can auto-execute |
| `max_risk_level` | INTEGER | Maximum risk level for auto-execution (reserved for future use) |
| `description` | TEXT | Human-readable description of the policy |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint**: `(tenant_id, task_type)` - one policy per task type per tenant

### Default Policies (v1)

| Task Type | Auto-Execute | Description |
|-----------|--------------|-------------|
| `climate.create_missions_from_plan` | true | Climate missions from weekly plans |
| `climate.create_single_mission` | true | Individual climate missions |
| `zora_shop.create_project` | false | ZORA SHOP project creation |
| `zora_shop.update_product_climate_meta` | false | Product climate metadata updates |

### autonomy_schedules Table

Defines recurring autonomy routines:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant (required) |
| `profile_id` | UUID | Associated climate profile (optional) |
| `schedule_type` | TEXT | Type of schedule (e.g., `climate.weekly_plan_suggest`) |
| `frequency` | TEXT | Execution frequency: `daily`, `weekly`, `monthly` |
| `cron_hint` | TEXT | Optional cron expression hint for future use |
| `enabled` | BOOLEAN | Whether the schedule is active |
| `next_run_at` | TIMESTAMPTZ | Next scheduled execution time |
| `last_run_at` | TIMESTAMPTZ | Last execution time |
| `config` | JSONB | Schedule-specific configuration |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Supported Schedule Types (v1)**:
- `climate.weekly_plan_suggest` - Weekly climate plan suggestions (ORACLE agent)
- `climate.mission_reminder` - Climate mission reminders (LUMINA agent)
- `zora_shop.project_status_check` - ZORA SHOP project status checks (CONNOR agent)

## Policy Resolution

When executing a task, the system resolves the applicable policy using this logic:

1. Look for a tenant-specific policy matching `(tenant_id, task_type)`
2. If not found, look for a global policy matching `(NULL, task_type)`
3. If no policy exists, default to `auto_execute = true`

### Execution Conditions

A task will execute if:
- `auto_execute = true` for the resolved policy, OR
- The task has been approved (`approved_by_user_id IS NOT NULL`)

A task will NOT execute if:
- `auto_execute = false` AND task is not approved, OR
- The task has been rejected (`rejected_by_user_id IS NOT NULL`)

## Workers API Endpoints

### Pending Approval Tasks

**GET /api/agents/tasks/pending-approval**

Returns tasks that require manual approval.

Query Parameters:
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Pagination offset

Response:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "agent_id": "ORACLE",
      "task_type": "zora_shop.create_project",
      "title": "Create new project",
      "status": "pending",
      "requires_approval": true,
      "approved_by_user_id": null,
      "rejected_by_user_id": null,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Task Decision (Approve/Reject)

**POST /api/agents/tasks/:id/decision**

Approve or reject a pending task.

Request Body:
```json
{
  "decision": "approve",  // or "reject"
  "reason": "Looks good, proceed with execution"
}
```

Response:
```json
{
  "task": {
    "id": "uuid",
    "status": "pending",  // or "failed" if rejected
    "approved_by_user_id": "user-uuid",
    "approved_at": "2025-01-01T00:00:00Z",
    "decision_reason": "Looks good, proceed with execution"
  },
  "journal_entry_id": "uuid"
}
```

### Autonomy Schedules CRUD

**GET /api/autonomy/schedules**

List schedules for the current tenant.

Query Parameters:
- `enabled` (optional): Filter by enabled status
- `schedule_type` (optional): Filter by schedule type
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Pagination offset

**GET /api/autonomy/schedules/:id**

Get a single schedule by ID.

**POST /api/autonomy/schedules**

Create a new schedule. Requires `founder` or `brand_admin` role.

Request Body:
```json
{
  "profile_id": "uuid",  // optional
  "schedule_type": "climate.weekly_plan_suggest",
  "frequency": "weekly",
  "cron_hint": "0 9 * * 1",  // optional
  "enabled": true,
  "next_run_at": "2025-01-06T09:00:00Z",
  "config": {}
}
```

**PATCH /api/autonomy/schedules/:id**

Update an existing schedule. Requires `founder` or `brand_admin` role.

**DELETE /api/autonomy/schedules/:id**

Delete a schedule. Requires `founder` or `brand_admin` role.

**GET /api/autonomy/schedules/types**

List supported schedule types.

## CLI Commands

### run-due-schedules

Find and execute due autonomy schedules.

```bash
python -m zora_core.autonomy.cli run-due-schedules [options]
```

Options:
- `--limit N`: Maximum schedules to process (default: 10)
- `--schedule-type TYPE`: Filter by schedule type
- `--dry-run`: Show what would be done without creating tasks
- `--tenant-id UUID`: Filter by tenant
- `--verbose`: Enable verbose output

Example:
```bash
# Process all due schedules
python -m zora_core.autonomy.cli run-due-schedules

# Dry run for climate schedules only
python -m zora_core.autonomy.cli run-due-schedules --schedule-type climate.weekly_plan_suggest --dry-run

# Process up to 5 schedules with verbose output
python -m zora_core.autonomy.cli run-due-schedules --limit 5 --verbose
```

### Schedule Type to Task Mapping

When a schedule is due, the CLI creates appropriate agent tasks:

| Schedule Type | Agent | Task Type |
|---------------|-------|-----------|
| `climate.weekly_plan_suggest` | ORACLE | `climate.create_missions_from_plan` |
| `climate.mission_reminder` | LUMINA | `climate.create_single_mission` |
| `zora_shop.project_status_check` | CONNOR | `zora_shop.create_project` |

## Python Executor Integration

The task executor (`zora_core/autonomy/executor.py`) has been updated to:

1. **Check Policy Before Execution**: Before executing a task, resolve the applicable policy
2. **Set requires_approval Flag**: If `auto_execute = false` and task not approved, set `requires_approval = true` and skip execution
3. **Respect Approval Status**: Execute approved tasks even if `auto_execute = false`
4. **Skip Rejected Tasks**: Never execute tasks with `rejected_by_user_id` set

### Policy Resolution Helper

```python
async def get_task_policy(task_type: str, tenant_id: str) -> dict:
    """
    Resolve the applicable policy for a task type.
    
    Returns:
        dict with keys: auto_execute, max_risk_level, description
    """
```

## Workflow Examples

### Example 1: Auto-Executing Climate Task

1. User creates a climate mission task via Agent Control Center
2. Executor picks up the task
3. Policy resolution finds `climate.create_single_mission` has `auto_execute = true`
4. Task executes immediately

### Example 2: Manual Approval for ZORA SHOP Task

1. Agent creates a ZORA SHOP project task
2. Executor picks up the task
3. Policy resolution finds `zora_shop.create_project` has `auto_execute = false`
4. Executor sets `requires_approval = true` and skips execution
5. Admin reviews task at `/api/agents/tasks/pending-approval`
6. Admin approves task via `POST /api/agents/tasks/:id/decision`
7. Next executor run picks up the approved task and executes it

### Example 3: Recurring Schedule Execution

1. Admin creates a weekly climate plan schedule via API
2. GitHub Actions cron runs `python -m zora_core.autonomy.cli run-due-schedules`
3. CLI finds the schedule is due (`next_run_at <= now`)
4. CLI creates an ORACLE task for `climate.create_missions_from_plan`
5. CLI updates `next_run_at` to next week and sets `last_run_at`
6. Task executor processes the created task

## Journal Integration

All approval decisions and schedule executions create journal entries:

- **Task Approved**: `agent_task_approved` event with task details and reason
- **Task Rejected**: `agent_task_rejected` event with task details and reason
- **Schedule Executed**: `autonomy_schedule_executed` event with schedule and task details
- **Schedule Created/Updated/Deleted**: Corresponding journal events

## Security Considerations

1. **Role-Based Access**: Schedule management requires `founder` or `brand_admin` role
2. **Tenant Isolation**: Schedules and policies are tenant-scoped
3. **Audit Trail**: All decisions are logged with user ID and timestamp
4. **No Auto-Delete**: Rejected tasks remain in the database for audit purposes

## Future Enhancements

- Complex cron expressions for fine-grained scheduling
- Risk level assessment for tasks
- Approval workflows with multiple approvers
- Schedule templates and presets
- Notification system for pending approvals
