# ZORA CORE - Frontend Dev/Agent Console v1

**Dev/Agent Console v1** | Frontend Feature

This document describes the Dev/Agent Console implementation for ZORA CORE, providing visibility into system stats, agent activity, and knowledge overview.

## Overview

The Dev/Agent Console is a dedicated page that surfaces key information about the ZORA CORE system, allowing founders and administrators to monitor the health and activity of the Nordic agents and the knowledge base.

## Access

The Dev/Agent Console is accessible at `/agents/dev-console` and requires authentication. It can be quickly accessed via the Command Palette (Cmd/Ctrl+K) by typing "Dev Console" or "Agent Console".

## Sections

### 1. System Overview

Displays architecture and health information from multiple sources.

#### Dev Manifest Stats

Source: `GET /api/admin/dev/manifest/v2/stats`

Displays:
- Number of modules
- Number of tables
- Number of endpoints
- Number of workflows
- Number of agents
- Current version

#### World Model Stats

Source: `GET /api/admin/world-model/stats`

Displays:
- Total nodes in the knowledge graph
- Total edges (relationships)
- Breakdown by node type
- Breakdown by edge type

#### System Health

Source: `GET /api/health`

Displays:
- System status (ok/error)
- Environment name (development/production)
- API version
- Git commit hash
- Supabase connection status

### 2. Agent & ODIN Activity

Shows a timeline of recent agent activity, including:

- Agent commands (`/api/agent-commands`)
- Agent tasks (`/api/agent-tasks`)
- ODIN ingestion jobs
- Bootstrap job executions

Each activity item shows:
- Agent ID (color-coded by agent)
- Activity title/description
- Activity type (command, task, ingestion, bootstrap)
- Status (pending, in_progress, completed, failed)
- Timestamp

### 3. Knowledge & WebTool Overview

#### Knowledge Documents

Source: `GET /api/admin/odin/knowledge/stats`

Displays:
- Total document count
- Breakdown by domain:
  - climate_policy
  - hemp_materials
  - energy_efficiency
  - sustainable_fashion
  - impact_investing

#### Allowed Web Domains

Source: `GET /api/admin/webtool/domains`

Displays a list of allowed domains with:
- Domain name
- Source (bootstrap_job, manual, config)
- Enabled/disabled status

## Data Sources

| Section | Endpoint | Auth Required |
|---------|----------|---------------|
| Dev Manifest Stats | `GET /api/admin/dev/manifest/v2/stats` | Yes (founder/brand_admin) |
| World Model Stats | `GET /api/admin/world-model/stats` | Yes (founder/brand_admin) |
| System Health | `GET /api/health` | No (basic), Yes (deep) |
| Agent Tasks | `GET /api/agent-tasks` | Yes |
| Agent Commands | `GET /api/agent-commands` | Yes |
| Knowledge Stats | `GET /api/admin/odin/knowledge/stats` | Yes (founder/brand_admin) |
| Allowed Domains | `GET /api/admin/webtool/domains` | Yes (founder/brand_admin) |

## Architecture

### File Location

```
frontend/src/app/agents/dev-console/page.tsx
```

### Key Components

The page uses the following components:

- `AppShell` - Main layout wrapper
- `Card` - Section containers
- `StatBox` - Individual stat display
- `LoadingSpinner` - Loading state
- `EmptyState` - No data state

### State Management

The page manages several pieces of state:

```typescript
const [manifestStats, setManifestStats] = useState<ManifestStats | null>(null);
const [worldModelStats, setWorldModelStats] = useState<WorldModelStats | null>(null);
const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([]);
```

### Data Fetching

All data is fetched in parallel on page load:

```typescript
const fetchAllData = async () => {
  const [manifest, worldModel, health, knowledge, domains, tasks, commands] = await Promise.all([
    fetchWithAuth('/api/admin/dev/manifest/v2/stats'),
    fetchWithAuth('/api/admin/world-model/stats'),
    fetchWithAuth('/api/health'),
    fetchWithAuth('/api/admin/odin/knowledge/stats'),
    fetchWithAuth('/api/admin/webtool/domains'),
    fetchWithAuth('/api/agent-tasks?limit=10'),
    fetchWithAuth('/api/agent-commands?limit=10'),
  ]);
  // ... process and set state
};
```

## Agent Color Coding

Each Nordic agent has a distinct color for easy identification:

| Agent | Color |
|-------|-------|
| ODIN | Purple |
| THOR | Blue |
| FREYA | Pink |
| BALDUR | Amber |
| HEIMDALL | Emerald |
| TYR | Red |
| EIVOR | Indigo |

## Status Colors

Activity status is color-coded:

| Status | Color |
|--------|-------|
| completed, success | Emerald |
| failed, error | Red |
| pending, in_progress | Amber |

## Refresh Functionality

The page includes a manual refresh button that:
- Shows a spinning animation while refreshing
- Re-fetches all data from the API
- Updates all sections simultaneously

## Error Handling

The page handles various error states:

1. **Not Authenticated** - Shows a message prompting the user to sign in
2. **API Errors** - Gracefully handles failed API calls by showing empty states
3. **No Data** - Shows appropriate empty state messages for each section

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Updates** - WebSocket connection for live activity feed
2. **Activity Filtering** - Filter by agent, type, or status
3. **Time Range Selection** - View activity for specific time periods
4. **Export Functionality** - Export activity logs and stats
5. **Alerting** - Notifications for failed tasks or health issues
6. **Detailed Views** - Click-through to detailed task/command views
7. **Performance Metrics** - Response times, throughput, etc.

## Related Documentation

- [FRONTEND_COMMAND_PALETTE_V1.md](./FRONTEND_COMMAND_PALETTE_V1.md) - Command Palette documentation
- [DEV_BRAIN_V2.md](./DEV_BRAIN_V2.md) - Dev Manifest documentation
- [WORLD_MODEL_V1.md](./WORLD_MODEL_V1.md) - World Model documentation
- [ODIN_WEB_INGESTION_V1.md](./ODIN_WEB_INGESTION_V1.md) - ODIN Web Ingestion documentation
- [WEB_TOOL_V1.md](./WEB_TOOL_V1.md) - WebTool documentation
