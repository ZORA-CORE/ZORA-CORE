# Agent Autonomy Layer v0

The Agent Autonomy Layer enables ZORA CORE agents (SAM, LUMINA, etc.) to propose frontend configuration changes that humans can review and approve before they are applied. This creates a safe sandbox where agents can think and suggest improvements without directly mutating production data.

## Core Principle

**Agents do not change production config directly in v0. All changes require human approval.**

This design ensures that the Founder remains the ultimate decision maker while still benefiting from agent intelligence and suggestions.

## Architecture

### Database Schema

The `agent_suggestions` table stores all suggestions:

```sql
CREATE TABLE agent_suggestions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id VARCHAR(50) NOT NULL,
    suggestion_type VARCHAR(100) NOT NULL DEFAULT 'frontend_config_change',
    target_page VARCHAR(100),
    current_config JSONB,
    suggested_config JSONB NOT NULL,
    diff_summary TEXT,
    status suggestion_status NOT NULL DEFAULT 'proposed',
    decision_by_user_id UUID REFERENCES users(id),
    decision_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
```

The `suggestion_status` enum has three values:
- `proposed` - Suggestion is awaiting review
- `applied` - Suggestion was approved and applied
- `rejected` - Suggestion was rejected

### API Endpoints

All endpoints require JWT authentication and are tenant-scoped.

#### POST /api/autonomy/frontend/suggest

Generate a new suggestion for a page.

**Request:**
```json
{
  "page": "home",
  "agent_id": "SAM"
}
```

**Response:**
```json
{
  "id": "uuid",
  "agent_id": "SAM",
  "suggestion_type": "frontend_config_change",
  "target_page": "home",
  "current_config": { ... },
  "suggested_config": { ... },
  "diff_summary": "Change hero_title to \"Your Climate Journey\"",
  "status": "proposed",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### GET /api/autonomy/frontend/suggestions

List suggestions for the current tenant.

**Query Parameters:**
- `status` (optional): Filter by status (proposed, applied, rejected)
- `page` (optional): Filter by target page (home, climate)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "agent_id": "SAM",
      "suggestion_type": "frontend_config_change",
      "target_page": "home",
      "diff_summary": "Change hero_title",
      "status": "proposed",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/autonomy/frontend/suggestions/:id

Get full details of a specific suggestion.

**Response:**
```json
{
  "id": "uuid",
  "agent_id": "SAM",
  "suggestion_type": "frontend_config_change",
  "target_page": "home",
  "current_config": { ... },
  "suggested_config": { ... },
  "diff_summary": "Change hero_title to \"Your Climate Journey\"",
  "status": "proposed",
  "decision_by_user_id": null,
  "decision_reason": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": null
}
```

#### POST /api/autonomy/frontend/suggestions/:id/decision

Apply or reject a suggestion.

**Request:**
```json
{
  "decision": "apply",
  "reason": "Looks good!"
}
```

Or for rejection:
```json
{
  "decision": "reject",
  "reason": "Not aligned with brand guidelines"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Suggestion applied successfully",
  "suggestion_id": "uuid",
  "status": "applied"
}
```

## Suggestion Generation

When a suggestion is requested, the system:

1. Fetches the current config for the target page (or uses defaults)
2. Gathers climate context (profile name, mission counts, impact totals)
3. Constructs a prompt for the LLM asking for improved config
4. Validates the suggested config (ensures required fields, correct types)
5. Generates a human-readable diff summary
6. Stores the suggestion with status `proposed`
7. Creates a journal entry for the suggestion creation

If no OpenAI API key is configured, a stub suggestion is generated for demo purposes.

## Decision Workflow

### Applying a Suggestion

When a suggestion is applied:

1. The `frontend_configs` table is updated with the suggested config
2. The suggestion status is updated to `applied`
3. Two journal entries are created:
   - `frontend_config_updated` (category: config_change)
   - `agent_suggestion_applied` (category: autonomy)
4. An EIVOR memory event is created to record the decision

### Rejecting a Suggestion

When a suggestion is rejected:

1. The suggestion status is updated to `rejected`
2. A journal entry is created: `agent_suggestion_rejected` (category: autonomy)
3. An EIVOR memory event is created to record the decision

## Admin UI

The `/admin/frontend/autonomy` page provides a UI for:

- Generating new suggestions (one button per page: home, climate)
- Viewing the list of suggestions with filters (status, page)
- Viewing suggestion details (current vs suggested config, diff)
- Applying or rejecting suggestions with optional reason

Access requires authentication and Founder or Brand Admin role.

## Journal Integration

The autonomy layer creates journal entries for the full suggestion lifecycle:

| Event | Category | Event Type |
|-------|----------|------------|
| Suggestion created | autonomy | agent_suggestion_created |
| Suggestion applied | autonomy | agent_suggestion_applied |
| Suggestion applied | config_change | frontend_config_updated |
| Suggestion rejected | autonomy | agent_suggestion_rejected |

## EIVOR Memory Integration

When suggestions are applied or rejected, memory events are created for EIVOR to learn from:

- **Applied:** "SAM proposed a new frontend config for the home page which was accepted by the Founder. Changes: [diff_summary]"
- **Rejected:** "SAM proposed a frontend config change for the home page; the Founder rejected this. Reason: [reason]"

This enables agents to learn from past decisions and improve future suggestions.

## Security

- All endpoints require valid JWT authentication
- Suggestions are tenant-scoped (users can only see/modify their tenant's suggestions)
- Only users with Founder or Brand Admin role can access the admin UI
- Agents cannot directly modify production config; all changes require human approval

## Future Enhancements

Potential improvements for future iterations:

- Support for other suggestion types (not just frontend config)
- Batch suggestions (multiple changes in one suggestion)
- Suggestion scheduling (apply at a specific time)
- A/B testing integration (apply suggestion to subset of users)
- Agent learning from rejection patterns
- Automatic suggestion generation based on user behavior
