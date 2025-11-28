# Agent Command Console v1

**Iteration 0023** - Natural Language Command Interface for ZORA Agents

## Overview

The Agent Command Console provides a natural language interface where the Founder can write freeform prompts that LUMINA translates into structured agent tasks. This enables intuitive interaction with the ZORA agent system without needing to manually create individual tasks.

## Architecture

### Data Flow

```
Founder types prompt → POST /api/agents/commands → LUMINA plans tasks → agent_tasks created → Agent Runtime processes
```

### Components

1. **Database**: `agent_commands` table stores command history and status
2. **Workers API**: Endpoints for creating and listing commands
3. **Python Planner**: LUMINA-based command planning (for Python runtime)
4. **Frontend UI**: `/admin/agents/console` page for command input and history

## Database Schema

The `agent_commands` table stores all commands with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference (required) |
| created_at | TIMESTAMPTZ | When the command was created |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by_user_id | UUID | User who created the command (nullable) |
| raw_prompt | TEXT | The freeform command text |
| target_agents | TEXT[] | Optional list of specific agents to target |
| status | agent_command_status | received, parsing, tasks_created, failed |
| parsed_summary | TEXT | LUMINA's summary of the planned tasks |
| tasks_created_count | INTEGER | Number of tasks created |
| error_message | TEXT | Error details if status is 'failed' |
| metadata | JSONB | Additional structured data |

## API Endpoints

### POST /api/agents/commands

Create a new command and execute planning.

**Request Body:**
```json
{
  "raw_prompt": "Analyze our climate page and suggest 3 new missions for reducing household energy consumption",
  "target_agents": ["ORACLE", "SAM"]  // Optional - omit for auto-targeting
}
```

**Response:**
```json
{
  "data": {
    "command": {
      "id": "uuid",
      "raw_prompt": "...",
      "status": "tasks_created",
      "parsed_summary": "LUMINA's plan summary...",
      "tasks_created_count": 2
    },
    "tasks_created": [
      {
        "id": "uuid",
        "agent_id": "ORACLE",
        "task_type": "propose_new_climate_missions",
        "title": "Propose energy reduction missions"
      }
    ],
    "summary": "Created 2 tasks for ORACLE and SAM"
  }
}
```

**Authorization:** Requires `founder` or `brand_admin` role.

### GET /api/agents/commands

List commands for the current tenant.

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "raw_prompt": "...",
      "target_agents": ["ORACLE"],
      "status": "tasks_created",
      "parsed_summary": "...",
      "tasks_created_count": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1,
    "has_more": false
  }
}
```

### GET /api/agents/commands/:id

Get a single command with its associated tasks.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "raw_prompt": "...",
    "status": "tasks_created",
    "parsed_summary": "...",
    "tasks_created_count": 2
  },
  "tasks": [
    {
      "id": "uuid",
      "agent_id": "ORACLE",
      "title": "..."
    }
  ]
}
```

## Frontend UI

### Location

`/admin/agents/console`

### Features

1. **Command Input Area**
   - Large textarea for natural language prompts
   - Example placeholder text to guide users
   - Auto-targeting toggle (let LUMINA choose agents)
   - Optional manual agent selection with checkboxes

2. **Command Result Panel**
   - Shows LUMINA's plan summary after sending
   - Lists all created tasks with agent assignments
   - Hint about automatic processing by Agent Runtime

3. **Command History**
   - Table of recent commands
   - Status badges (received, parsing, tasks_created, failed)
   - Click to view full details and associated tasks
   - Filter by status

### Navigation

Links to the Command Console are available from:
- `/admin/setup` - Admin Setup page
- `/admin/agents/tasks` - Agent Control Center

## LUMINA Planning

When a command is received, LUMINA analyzes the prompt and creates appropriate tasks:

### Agent Capabilities

| Agent | Task Types |
|-------|------------|
| ORACLE | propose_new_climate_missions, research_topic |
| SAM | review_climate_page, review_accessibility |
| LUMINA | plan_frontend_improvements, plan_workflow |
| EIVOR | summarize_recent_events, memory_cleanup |
| CONNOR | review_system_health, analyze_codebase |
| AEGIS | review_recent_agent_tasks, check_climate_claims |

### Planning Process

1. Command received with status `received`
2. Status updated to `parsing`
3. LUMINA analyzes prompt and agent capabilities
4. Tasks created with `source_command_id` in payload for traceability
5. Status updated to `tasks_created` (or `failed` if error)
6. Journal entry created for audit trail

### Fallback Planning

If the OpenAI API is unavailable, keyword-based routing is used:
- "climate" or "mission" keywords → ORACLE
- "frontend" or "page" or "UI" keywords → SAM
- "memory" or "summarize" keywords → EIVOR
- "system" or "health" keywords → CONNOR
- "safety" or "review" keywords → AEGIS
- Default → LUMINA for general planning

## Data Traceability

Commands create a traceable chain:

```
agent_commands → agent_tasks → agent_insights → journal_entries
                     ↓
              EIVOR memories
```

Each task created from a command includes `source_command_id` in its payload, enabling:
- Tracking which tasks came from which commands
- Analyzing command effectiveness
- Debugging failed commands

## Usage Examples

### Example 1: Climate Mission Suggestions

**Prompt:**
```
Suggest 5 new climate missions focused on reducing water consumption in households
```

**Result:**
- ORACLE task: `propose_new_climate_missions` with water focus
- Creates insights that can be accepted to generate real missions

### Example 2: Frontend Review

**Prompt:**
```
Review the dashboard page for accessibility issues and suggest improvements
```

**Result:**
- SAM task: `review_accessibility` for dashboard
- SAM task: `review_climate_page` for UX improvements

### Example 3: System Health Check

**Prompt:**
```
Check the overall system health and summarize any issues
```

**Result:**
- CONNOR task: `review_system_health`
- AEGIS task: `review_recent_agent_tasks` for safety review

## Configuration

No additional configuration is required. The Command Console uses:
- Existing JWT authentication
- Existing tenant scoping
- OpenAI API key (if available) for LUMINA planning
- Fallback keyword routing if OpenAI unavailable

## Integration with Agent Runtime

Tasks created by the Command Console are processed by the existing Agent Runtime:
- GitHub Actions cron job runs every 15 minutes
- Tasks are picked up in priority order
- Results appear in Agent Control Center and Agent Insights

## Security

- All endpoints require authentication
- Only `founder` and `brand_admin` roles can create commands
- All data is tenant-scoped
- Commands are non-destructive (only create tasks, don't modify data directly)

## Future Enhancements

Potential improvements for future iterations:
- Real-time task status updates via WebSocket
- Command templates for common operations
- Batch command execution
- Command scheduling (run at specific times)
- Command approval workflow for sensitive operations
