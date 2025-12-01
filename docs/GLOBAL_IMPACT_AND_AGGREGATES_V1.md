# Global Impact & Data Aggregates v1.0

**Iteration**: 00D4  
**Schema Version**: 3.4.0  
**Status**: Implemented

## Overview

Global Impact & Data Aggregates v1.0 provides a unified view of tenant-wide climate impact metrics across all ZORA CORE modules. This backend-only service answers questions like:

- "How much climate impact does this tenant have?"
- "How is this evolving over time?"

The service aggregates metrics from six modules: Climate OS, GOES GREEN, ZORA SHOP, THE ZORA FOUNDATION, Climate Academy, and Autonomy & Agents.

## Architecture

### Components

1. **Python Analytics Service** (`zora_core/analytics/impact.py`)
   - Core computation logic for impact metrics
   - Designed for agent consumption (CONNOR, LUMINA, ORACLE)
   - CLI interface for manual testing and debugging

2. **Workers API Endpoints** (`workers/api/src/handlers/admin-impact.ts`)
   - REST API for frontend and external integrations
   - JWT-authenticated (founder/brand_admin roles)
   - Consistent error shapes with other admin endpoints

3. **Optional Snapshot Storage** (`tenant_impact_snapshots` table)
   - Historical tracking of impact metrics
   - Time-series analysis support
   - Efficient querying for dashboards

## Data Model

### Metrics by Module

#### Climate OS
| Metric | Description |
|--------|-------------|
| `climate_profiles_total` | Total climate profiles for tenant |
| `climate_missions_total` | Total climate missions |
| `climate_missions_completed` | Missions with status 'completed' |
| `climate_missions_in_progress` | Missions with status 'in_progress' |
| `climate_missions_planned` | Missions with status 'planned' |
| `climate_missions_estimated_impact_kgco2_total` | Sum of estimated_impact_kgco2 for all missions |
| `climate_missions_completed_impact_kgco2_total` | Sum of estimated_impact_kgco2 for completed missions |

#### GOES GREEN
| Metric | Description |
|--------|-------------|
| `goes_green_profiles_total` | Total GOES GREEN profiles |
| `goes_green_actions_total` | Total energy actions |
| `goes_green_actions_completed` | Actions with status 'completed' |
| `goes_green_estimated_savings_kgco2_total` | Sum of estimated CO2 savings |

#### ZORA SHOP
| Metric | Description |
|--------|-------------|
| `zora_shop_brands_total` | Total brands |
| `zora_shop_products_total` | Total products |
| `zora_shop_projects_total` | Total ZORA SHOP projects |
| `zora_shop_projects_launched` | Projects with status 'launched' |
| `zora_shop_orders_total` | Total orders |
| `zora_shop_gmv_total` | Gross merchandise value (sum of order totals) |
| `zora_shop_commission_total` | Total commission earned |

#### THE ZORA FOUNDATION
| Metric | Description |
|--------|-------------|
| `foundation_projects_total` | Total foundation projects |
| `foundation_contributions_total_amount` | Sum of contributions (converted from cents) |
| `foundation_impact_kgco2_total` | Sum of verified impact from impact_log |

#### Climate Academy
| Metric | Description |
|--------|-------------|
| `academy_topics_total` | Total academy topics |
| `academy_lessons_total` | Total lessons |
| `academy_learning_paths_total` | Total learning paths |
| `academy_user_lessons_completed_total` | User lesson completions |
| `academy_user_paths_completed_total` | User path completions |

#### Autonomy & Agents
| Metric | Description |
|--------|-------------|
| `autonomy_commands_total` | Total agent commands |
| `autonomy_tasks_total` | Total agent tasks |
| `autonomy_tasks_completed` | Tasks with status 'completed' |
| `autonomy_tasks_failed` | Tasks with status 'failed' |
| `autonomy_schedules_total` | Total autonomy schedules |
| `autonomy_tasks_pending_approval` | Tasks requiring approval |

### Snapshot Table Schema

```sql
CREATE TABLE tenant_impact_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_period TEXT NOT NULL,  -- 'daily', 'weekly', 'monthly'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes:
- `(tenant_id, snapshot_period, period_start)` - For time-range queries
- `(tenant_id, snapshot_period, period_end)` - For reverse lookups
- `(created_at DESC)` - For recent snapshots

## API Reference

### GET /api/admin/impact/summary

Returns complete impact summary across all modules for the current tenant.

**Authentication**: JWT (founder or brand_admin role)

**Query Parameters**:
- `tenant_id` (optional): Override tenant for founder role

**Response**:
```json
{
  "data": {
    "tenant_id": "uuid",
    "computed_at": "2024-01-15T10:30:00Z",
    "climate_os": { ... },
    "goes_green": { ... },
    "zora_shop": { ... },
    "foundation": { ... },
    "academy": { ... },
    "autonomy": { ... }
  },
  "error": null
}
```

**Error Response**:
```json
{
  "data": null,
  "error": {
    "code": "IMPACT_SUMMARY_FAILED",
    "message": "Failed to compute impact summary",
    "details": "..."
  }
}
```

### GET /api/admin/impact/timeseries

Returns time-series impact data for the current tenant.

**Authentication**: JWT (founder or brand_admin role)

**Query Parameters**:
- `period` (optional): 'daily', 'weekly', 'monthly' (default: 'monthly')
- `months` (optional): Number of months to look back (default: 6)
- `tenant_id` (optional): Override tenant for founder role

**Response** (from snapshots):
```json
{
  "data": {
    "period": "monthly",
    "source": "snapshots",
    "points": [
      {
        "period_start": "2024-01-01T00:00:00Z",
        "period_end": "2024-02-01T00:00:00Z",
        "climate_os": { ... },
        "goes_green": { ... },
        ...
      }
    ]
  },
  "error": null
}
```

**Response** (computed fallback):
```json
{
  "data": {
    "period": "monthly",
    "source": "computed",
    "points": [
      {
        "period_start": "2024-01-01T00:00:00Z",
        "period_end": "2024-02-01T00:00:00Z",
        "climate_os": { "climate_missions_created": 5 },
        "goes_green": { "actions_created": 3 },
        ...
      }
    ]
  },
  "error": null
}
```

### POST /api/admin/impact/snapshot

Create and store an impact snapshot for the current tenant.

**Authentication**: JWT (founder or brand_admin role)

**Request Body**:
```json
{
  "period": "monthly"  // 'daily', 'weekly', or 'monthly'
}
```

**Response**:
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "snapshot_period": "monthly",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-02-01T00:00:00Z",
    "metrics": { ... },
    "created_at": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

## Python CLI Usage

The Python analytics service includes a CLI for manual testing and debugging.

### Compute Impact Summary

```bash
PYTHONPATH=. python -m zora_core.analytics.cli summary --tenant <tenant-uuid>
PYTHONPATH=. python -m zora_core.analytics.cli summary --tenant <tenant-uuid> --json
```

### Create Snapshot

```bash
PYTHONPATH=. python -m zora_core.analytics.cli snapshot --tenant <tenant-uuid> --period monthly
```

### List Snapshots

```bash
PYTHONPATH=. python -m zora_core.analytics.cli snapshots --tenant <tenant-uuid> --period monthly --limit 6
```

### Compute Time-Series

```bash
PYTHONPATH=. python -m zora_core.analytics.cli timeseries --tenant <tenant-uuid> --period monthly --months 6
```

## Implementation Notes

### Real-Time vs Snapshots

The service supports two modes:

1. **Real-time computation**: Queries base tables directly to compute current metrics. This is always available and provides the most up-to-date data.

2. **Snapshot-based**: Reads from pre-computed snapshots stored in `tenant_impact_snapshots`. This is faster for historical queries but requires snapshots to be created periodically.

The timeseries endpoint automatically falls back to real-time computation if no snapshots exist.

### Performance Considerations

- All metrics are computed in parallel using `Promise.all` (Workers) or sequential queries (Python)
- Count queries use `count: 'exact'` with `head: true` for efficiency
- Snapshot table has indexes optimized for time-range queries
- Consider creating a scheduled job to generate snapshots periodically

### Future Enhancements

- Scheduled snapshot generation via GitHub Actions or Cloudflare Cron
- More granular time-series data (weekly, daily)
- Cross-tenant aggregation for platform-wide metrics (founder only)
- Integration with EIVOR memory for trend analysis
- Dashboard widgets for frontend visualization

## Related Documentation

- [Observability & System Metrics v1](./OBSERVABILITY_AND_METRICS_V1.md)
- [Schema Versioning v1](./SCHEMA_VERSIONING_V1.md)
- [Dev Knowledge & API Manifest v1](./DEV_KNOWLEDGE_AND_API_MANIFEST_V1.md)
