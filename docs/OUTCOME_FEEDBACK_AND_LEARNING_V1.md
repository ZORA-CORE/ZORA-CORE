# Outcome Feedback & Continual Learning v1.0

**Iteration**: 00D6  
**Schema Version**: 3.6.0  
**Status**: Implemented

## Overview

The Outcome Feedback & Continual Learning v1.0 layer provides a critic/feedback system for ZORA CORE where users and agents can rate outcomes of key entities (missions, workflows, projects, plans, academy paths, etc.). This enables ZORA to understand which things "work well" vs. "not so well" and prepare for future continual learning and optimization.

This is part of the "Intelligence Spine" for Backend v4, complementing:
- Dev Knowledge & API Manifest v1 (00D3)
- Global Impact & Data Aggregates v1 (00D4)
- Workflow / DAG Engine v1 (00D5)

Key capabilities:
- Store feedback on results of key ZORA entities
- Provide aggregated views over what is working well or poorly per tenant
- Expose a Python "critic" service for computing quality scores and summaries
- Ready for agents (LUMINA, ORACLE, CONNOR) to call in later iterations

This is v1: logging & analysis, not auto-optimization. No automatic policy changing is implemented in this iteration.

## Data Model

### outcome_feedback

Generic feedback table for rating outcomes of key ZORA entities.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants (required) |
| user_id | UUID | FK to users (NULL for agent/system feedback) |
| source | TEXT | Feedback source: `user`, `agent`, `system`, `admin` |
| target_type | TEXT | Entity type being rated |
| target_id | UUID | ID of the target entity |
| rating | INTEGER | Rating 1-5 (1=very poor, 5=excellent) |
| sentiment | TEXT | Sentiment value |
| tags | TEXT[] | Array of tags |
| comment | TEXT | Optional comment text |
| context | JSONB | Extra context (environment, device, scenario, etc.) |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### Valid target_type Values

- `climate_mission` - Climate OS missions
- `workflow_run` - Workflow/DAG execution runs
- `zora_shop_project` - ZORA SHOP projects
- `foundation_project` - THE ZORA FOUNDATION projects
- `goes_green_profile` - GOES GREEN profiles
- `goes_green_action` - GOES GREEN actions
- `academy_learning_path` - Climate Academy learning paths
- `academy_lesson` - Climate Academy lessons

#### Valid sentiment Values

- `very_positive`
- `positive`
- `neutral`
- `negative`
- `very_negative`

#### Common Tags

Tags are free-form but common examples include:
- `high_impact` - High climate impact
- `low_effort` - Easy to complete
- `expensive` - Costly to implement
- `confusing` - Hard to understand
- `time_consuming` - Takes a long time
- `effective` - Achieves its goal
- `engaging` - Keeps users interested

### outcome_insights

Precomputed insight summaries per tenant and target type. Used for caching aggregated stats.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants (required) |
| target_type | TEXT | Entity type |
| target_id | UUID | NULL = aggregated per type, non-null = specific entity |
| summary_type | TEXT | Summary type: `basic_stats`, `top_tags`, `combined` |
| stats | JSONB | Aggregated statistics |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### Example stats JSONB

```json
{
  "count": 12,
  "avg_rating": 4.3,
  "sentiment_counts": {
    "very_positive": 5,
    "positive": 4,
    "neutral": 2,
    "negative": 1
  },
  "tag_counts": {
    "high_impact": 7,
    "low_effort": 5,
    "expensive": 2
  },
  "last_feedback_at": "2025-11-30T12:34:56Z",
  "best_entities": [
    { "target_id": "uuid", "avg_rating": 4.9, "feedback_count": 8 }
  ],
  "worst_entities": [
    { "target_id": "uuid", "avg_rating": 2.3, "feedback_count": 3 }
  ]
}
```

## API Reference

### Record Feedback

**POST /api/outcomes/feedback**

Record feedback for a ZORA entity.

**Request Body:**
```json
{
  "target_type": "climate_mission",
  "target_id": "uuid",
  "rating": 4,
  "sentiment": "positive",
  "tags": ["high_impact", "easy_to_do"],
  "comment": "This mission was easy and felt meaningful.",
  "context": {
    "source_page": "/climate",
    "device": "web"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid",
    "source": "user",
    "target_type": "climate_mission",
    "target_id": "uuid",
    "rating": 4,
    "sentiment": "positive",
    "tags": ["high_impact", "easy_to_do"],
    "comment": "This mission was easy and felt meaningful.",
    "context": { "source_page": "/climate", "device": "web" },
    "created_at": "2025-11-30T12:34:56Z"
  },
  "error": null
}
```

**Access:** JWT required. Members of a tenant may submit feedback for their own tenant's entities.

### Get Feedback for Target

**GET /api/outcomes/feedback**

Get feedback entries for a specific target.

**Query Parameters:**
- `target_type` (required) - Entity type
- `target_id` (required) - Entity ID
- `limit` (optional, default 50) - Maximum results
- `offset` (optional, default 0) - Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "source": "user",
      "target_type": "climate_mission",
      "target_id": "uuid",
      "rating": 4,
      "sentiment": "positive",
      "tags": ["high_impact"],
      "comment": "Great mission!",
      "context": {},
      "created_at": "2025-11-30T12:34:56Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "error": null
}
```

### Stats for Target

**GET /api/outcomes/stats/target**

Get aggregated stats for a specific target.

**Query Parameters:**
- `target_type` (required) - Entity type
- `target_id` (required) - Entity ID

**Response:**
```json
{
  "data": {
    "target_type": "climate_mission",
    "target_id": "uuid",
    "count": 12,
    "avg_rating": 4.3,
    "sentiment_counts": {
      "very_positive": 5,
      "positive": 4,
      "neutral": 2,
      "negative": 1
    },
    "top_tags": [
      { "tag": "high_impact", "count": 7 },
      { "tag": "easy_to_do", "count": 5 }
    ],
    "last_feedback_at": "2025-11-30T12:34:56Z"
  },
  "error": null
}
```

### Stats for Type

**GET /api/outcomes/stats/type**

Get aggregated stats for all entities of a type within the tenant.

**Query Parameters:**
- `target_type` (required) - Entity type

**Response:**
```json
{
  "data": {
    "target_type": "zora_shop_project",
    "target_id": null,
    "count": 25,
    "avg_rating": 4.1,
    "sentiment_counts": {
      "very_positive": 10,
      "positive": 8,
      "neutral": 5,
      "negative": 2
    },
    "top_tags": [
      { "tag": "high_impact", "count": 15 },
      { "tag": "effective", "count": 12 }
    ],
    "last_feedback_at": "2025-11-30T12:34:56Z",
    "best_entities": [
      { "target_id": "uuid", "avg_rating": 4.9, "feedback_count": 8 }
    ],
    "worst_entities": [
      { "target_id": "uuid", "avg_rating": 2.3, "feedback_count": 3 }
    ]
  },
  "error": null
}
```

## Python CLI Usage

### Record Feedback

```bash
PYTHONPATH=. python -m zora_core.learning.cli record-feedback \
  --tenant <uuid> \
  --target-type climate_mission \
  --target-id <uuid> \
  --rating 4 \
  --sentiment positive \
  --tags "high_impact,easy_to_do" \
  --comment "Great mission!"
```

### Get Feedback

```bash
PYTHONPATH=. python -m zora_core.learning.cli get-feedback \
  --tenant <uuid> \
  --target-type climate_mission \
  --target-id <uuid> \
  --limit 10
```

### Stats for Target

```bash
PYTHONPATH=. python -m zora_core.learning.cli stats-for-target \
  --tenant <uuid> \
  --target-type climate_mission \
  --target-id <uuid>
```

### Stats for Type

```bash
PYTHONPATH=. python -m zora_core.learning.cli stats-for-type \
  --tenant <uuid> \
  --target-type zora_shop_project
```

### Refresh All Insights

```bash
PYTHONPATH=. python -m zora_core.learning.cli refresh-insights \
  --tenant <uuid>
```

## Integration Points

### Journal Integration

When feedback is recorded, a journal entry is automatically created:
- Category: `learning`
- Event type: `outcome_feedback_recorded`
- Metadata includes: target_type, target_id, rating, source

This enables tracking of all feedback events in the system journal.

### Future Hooks

Later iterations can:
- Call the critic from autonomy workflows to evaluate outcomes
- Adapt workflows/playbooks based on aggregated feedback
- Use feedback data to train/fine-tune the ZORA model
- Implement automatic policy optimization based on what works best

## Future Evolution

### Continual Learning / Critic Agents

ORACLE can analyze feedback patterns to:
- Identify which missions/workflows/projects are most effective
- Suggest improvements to underperforming entities
- Prioritize high-impact, low-effort actions

### Playbook Optimization

Feedback on playbook runs can inform:
- Which playbook templates work best
- Optimal step ordering and configuration
- Automatic playbook improvement suggestions

### Mission / Plan Suggestion Tuning

Climate OS can use feedback to:
- Recommend missions with high success rates
- Avoid suggesting missions with poor feedback
- Personalize recommendations based on user preferences

### AGI-like "What Works Best" Reasoning

The outcome feedback layer provides the foundation for:
- Cross-domain learning (what works in Climate OS may inform ZORA SHOP)
- Meta-learning about ZORA's own effectiveness
- Continuous improvement of the entire system

## Related Documentation

- [Workflow / DAG Engine v1](./WORKFLOW_AND_DAG_ENGINE_V1.md)
- [Global Impact & Data Aggregates v1](./GLOBAL_IMPACT_AND_AGGREGATES_V1.md)
- [Dev Knowledge & API Manifest v1](./DEV_KNOWLEDGE_AND_API_MANIFEST_V1.md)
- [Agent Task Execution Engine v1](./AGENT_TASK_EXECUTION_ENGINE_V1.md)
