# ZORA Agent Runtime v1

This document describes the Agent Runtime v1 implementation for ZORA CORE, which enables all 6 core agents to process tasks from a shared task queue.

## Overview

The Agent Runtime v1 provides a shared infrastructure for making ZORA CORE's 6 agents operational. It includes a DB-backed task queue, a Python runtime service that dispatches tasks to agents, and minimal task handlers for each agent.

### Key Components

1. **agent_tasks Table** - Database table for storing tasks with status tracking
2. **AgentRuntime** - Python service that fetches, claims, and processes tasks
3. **CLI Wrapper** - Command-line interface for running the runtime
4. **Task Handlers** - Per-agent implementations for handling specific task types
5. **Workers API** - REST endpoints for task CRUD operations

## Database Schema

The `agent_tasks` table stores all tasks in the queue:

```sql
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id VARCHAR(50) NOT NULL CHECK (agent_id IN ('CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM')),
    task_type VARCHAR(100) NOT NULL,
    status agent_task_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    payload JSONB DEFAULT '{}',
    result_summary TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
```

Task statuses: `pending`, `in_progress`, `completed`, `failed`

## Agent Task Types

Each agent supports specific task types:

### LUMINA (Orchestrator & Project Lead)
- `plan_frontend_improvements` - Suggest improvements for frontend pages
- `plan_workflow` - Create a workflow plan for a goal

### SAM (Frontend & Experience Architect)
- `review_climate_page` - Review and suggest UX improvements for climate pages
- `review_accessibility` - Check accessibility compliance

### EIVOR (Memory & Knowledge Keeper)
- `summarize_recent_events` - Summarize recent journal/memory events
- `memory_cleanup` - Clean up and consolidate old memories

### ORACLE (Researcher & Strategy Engine)
- `propose_new_climate_missions` - Suggest new climate missions
- `research_topic` - Research a specific topic

### CONNOR (Systems & Backend Engineer)
- `review_system_health` - Check status endpoints and summarize health
- `analyze_codebase` - Analyze code quality and patterns

### AEGIS (Safety & Ethics Guardian)
- `review_recent_agent_tasks` - Flag risky activities and produce safety review
- `check_climate_claims` - Verify climate claims for greenwashing

## Python Runtime

### Installation

The runtime requires the following environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
export ZORA_TENANT_ID="your-tenant-uuid"
```

### CLI Usage

Process tasks using the CLI:

```bash
# Process up to 5 tasks and exit
python -m zora_core.autonomy.cli run-once --limit=5

# Run continuous loop (for dev/testing)
python -m zora_core.autonomy.cli run-loop --sleep-seconds=10

# Check queue status
python -m zora_core.autonomy.cli status

# Create a new task
python -m zora_core.autonomy.cli create-task \
    --agent=LUMINA \
    --type=plan_frontend_improvements \
    --title="Review dashboard page" \
    --payload='{"page": "dashboard"}'
```

### Programmatic Usage

```python
from zora_core.autonomy.runtime import AgentRuntime, is_runtime_configured

# Check if runtime is configured
if not is_runtime_configured():
    print("Missing required environment variables")
    exit(1)

# Create and run the runtime
runtime = AgentRuntime()

# Process up to 10 tasks
results = await runtime.run_once(limit=10)
print(f"Processed {len(results)} tasks")

# Or run continuous loop
await runtime.run_loop(sleep_seconds=30)
```

## Workers API Endpoints

### List Tasks

```
GET /api/agents/tasks
```

Query parameters:
- `agent_id` - Filter by agent (e.g., `LUMINA`)
- `status` - Filter by status (`pending`, `in_progress`, `completed`, `failed`)
- `task_type` - Filter by task type
- `limit` - Max results (default: 50)
- `offset` - Pagination offset (default: 0)

### Get Task

```
GET /api/agents/tasks/:id
```

### Create Task

```
POST /api/agents/tasks
Content-Type: application/json

{
  "agent_id": "LUMINA",
  "task_type": "plan_frontend_improvements",
  "title": "Review dashboard page",
  "description": "Analyze the dashboard and suggest improvements",
  "payload": {
    "page": "dashboard"
  },
  "priority": 5
}
```

Required fields: `agent_id`, `task_type`, `title`

## Task Lifecycle

1. **Creation** - Task is created via API or CLI with status `pending`
2. **Claiming** - Runtime fetches pending tasks and marks them `in_progress`
3. **Processing** - Agent's `handle_task()` method is called
4. **Completion** - Task is marked `completed` or `failed` with result/error
5. **Logging** - Journal entry and memory event are created for the task run

## Safety Considerations

Agent Runtime v1 is designed with safety in mind:

- **No destructive operations** - Agents only analyze and suggest, they don't auto-modify data
- **Human-in-the-loop** - All suggestions require human approval before being applied
- **Audit trail** - Every task run creates journal entries and memory events
- **AEGIS oversight** - Safety reviews can be scheduled to monitor agent activities
- **Tenant isolation** - All tasks are scoped to a specific tenant

## Future Enhancements

Planned for future iterations:

- Production cron scheduling (currently CLI is for dev/testing)
- More sophisticated task handlers with actual LLM reasoning
- Task dependencies and workflows
- Agent-to-agent task delegation
- Real-time task status updates via WebSocket
- Admin UI for task management at `/admin/agents/tasks`

## Related Documentation

- [AUTONOMY_LAYER_V0.md](./AUTONOMY_LAYER_V0.md) - Agent suggestion system
- [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) - Development environment setup
- [SUPABASE_SETUP_NO_CLI.md](./SUPABASE_SETUP_NO_CLI.md) - Database setup guide
