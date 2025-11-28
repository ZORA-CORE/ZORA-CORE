# Agent Insights v1 (Iteration 0022)

This document describes the Agent Insights layer, which enables ZORA agents to produce structured, actionable suggestions that can be reviewed, approved, and auto-converted into real climate missions.

## Overview

Agent Insights is a human-in-the-loop system where agents create structured suggestions (insights) that the Founder can review and approve. When climate mission suggestions are accepted, they automatically create real `climate_missions` rows in the database.

## Architecture

### Database Schema

The `agent_insights` table stores all insights created by agents:

```sql
CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  agent_id TEXT NOT NULL,
  source_task_id UUID REFERENCES agent_tasks(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status insight_status NOT NULL DEFAULT 'proposed',
  related_entity_type TEXT,
  related_entity_ref TEXT,
  impact_estimate_kgco2 NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Insight Categories

Each agent creates insights with specific categories:

| Agent | Category | Description |
|-------|----------|-------------|
| ORACLE | `climate_mission_suggestion` | Suggested climate missions with impact estimates |
| SAM | `frontend_improvement` | UX and frontend improvement suggestions |
| LUMINA | `plan` | Workflow and project plans |
| EIVOR | `summary` | Memory and event summaries |
| CONNOR | `system_health` | System health reports and code analysis |
| AEGIS | `safety_warning` | Safety reviews and climate claim verifications |

### Insight Statuses

- `proposed` - Initial state, awaiting review
- `accepted` - Approved by the Founder
- `rejected` - Declined by the Founder
- `implemented` - Fully implemented (for future use)

## API Endpoints

### List Insights

```
GET /api/agents/insights
```

Query parameters:
- `agent_id` - Filter by agent (ORACLE, SAM, etc.)
- `status` - Filter by status (proposed, accepted, rejected, implemented)
- `category` - Filter by category
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

### Get Single Insight

```
GET /api/agents/insights/:id
```

Returns the full insight details including body and metadata.

### Make Decision

```
POST /api/agents/insights/:id/decision
```

Request body:
```json
{
  "decision": "accept" | "reject",
  "reason": "Optional reason for the decision"
}
```

When accepting a `climate_mission_suggestion` insight, a new climate mission is automatically created and linked to the insight.

## Frontend Pages

### Agent Insights Admin Page

Located at `/admin/agents/insights`, this page allows the Founder to:

- View all insights with filtering by agent, status, and category
- See insight status counts (proposed, accepted, rejected, implemented)
- Click on an insight to view full details
- Accept or reject proposed insights with optional reason
- See which insights have been converted to climate missions

### Climate Page Integration

The `/climate` page includes an "Ask ORACLE" button that:

1. Creates an ORACLE task with `propose_new_climate_missions` type
2. Passes the current profile context (name, scope, country, sector)
3. Shows a success message with link to the insights page

When the ORACLE task runs (via GitHub Actions cron or manual CLI), it creates `climate_mission_suggestion` insights that appear in the admin page for review.

## Agent Task Handlers

Each agent's task handlers have been updated to create insights:

### ORACLE

- `propose_new_climate_missions` - Creates climate mission suggestions with impact estimates
- `research_topic` - Creates plan insights with research findings

### SAM

- `review_climate_page` - Creates frontend improvement insights
- `review_accessibility` - Creates frontend improvement insights

### LUMINA

- `plan_frontend_improvements` - Creates plan insights
- `plan_workflow` - Creates plan insights

### EIVOR

- `summarize_recent_events` - Creates summary insights
- `memory_cleanup` - Creates summary insights with memory stats

### CONNOR

- `review_system_health` - Creates system health insights
- `analyze_codebase` - Creates system health insights with code analysis

### AEGIS

- `review_recent_agent_tasks` - Creates safety warning insights
- `check_climate_claims` - Creates safety warning insights for greenwashing detection

## Usage Flow

1. **Create Task**: Use the Agent Control Center (`/admin/agents/tasks`) or the "Ask ORACLE" button on `/climate` to create an agent task.

2. **Task Processing**: The GitHub Actions cron job runs every 15 minutes and processes pending tasks. Alternatively, run manually:
   ```bash
   python -m zora_core.autonomy.cli run-once --limit=5
   ```

3. **Review Insights**: Navigate to `/admin/agents/insights` to see the insights created by agents.

4. **Make Decisions**: Click on a proposed insight to view details and accept or reject it.

5. **Auto-Creation**: When accepting a `climate_mission_suggestion`, a new climate mission is automatically created and linked to the insight.

## Configuration

No additional configuration is required. The Agent Insights system uses the existing:

- Supabase database connection
- JWT authentication
- Agent Runtime infrastructure

## Security

- All insights are tenant-scoped
- JWT authentication required for all API endpoints
- Only users with write access can make decisions on insights
- Journal entries are created for all decisions for audit trail

## Future Enhancements

- Mashup-specific insights (product suggestions, brand collaborations)
- Batch approval/rejection
- Insight templates for common suggestions
- Automated implementation for certain insight types
- Insight analytics and reporting
