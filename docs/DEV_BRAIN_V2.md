# Dev Manifest v2.0 - System Map for Nordic Agents

**Version**: 2.0.0  
**Status**: Implemented  
**Iteration**: Dev Manifest v2

## Overview

Dev Manifest v2 is the "system map" for ZORA CORE - a comprehensive, machine-readable description of the entire backend architecture. It serves as the single source of truth for:

- **Nordic AI Agents** (ODIN, THOR, FREYA, BALDUR, HEIMDALL, TYR, EIVOR) to reason about the system
- **Dev Console UI** to display architecture information
- **Developer documentation** and system introspection
- **Future agent engineers** (Devin-level) working inside ZORA

Dev Manifest v2 extends the original v1 manifest with:
- Detailed table definitions with columns and relations
- Workflow/DAG definitions with steps and triggers
- Module dependency graph
- Enhanced API endpoint definitions with parameters

## Architecture

### Components

1. **TypeScript Types** (`workers/api/src/dev/devManifestV2.ts`)
   - `ModuleDefinition` - Module metadata with owner agent and tags
   - `TableDefinition` - Table schema with columns and relations
   - `ApiEndpointDefinition` - Endpoint details with params and auth
   - `WorkflowDefinition` - DAG workflow with steps
   - `DependencyDefinition` - Module-to-module dependencies
   - `DevManifestV2` - Complete manifest structure

2. **API Endpoints** (`workers/api/src/handlers/admin.ts`)
   - `GET /api/admin/dev/manifest/v2` - Full manifest
   - `GET /api/admin/dev/manifest/v2/stats` - Manifest statistics
   - `GET /api/admin/dev/dependencies` - Module dependencies
   - `POST /api/admin/dev/explain-resource` - Resource explanation

3. **Data** (embedded in `devManifestV2.ts`)
   - 18 modules covering all ZORA CORE domains
   - 20+ core tables with column definitions
   - 70+ API endpoints with auth requirements
   - 5 example workflows
   - 35+ module dependencies

## Data Model

### ModuleDefinition

Describes a high-level subsystem in ZORA CORE.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Machine-readable key (e.g., `climate_os`) |
| label | string | Human-readable name (e.g., "Climate OS") |
| description | string | Module description |
| owner_agent | NordicAgent | Primary agent responsible (optional) |
| tags | string[] | Searchable tags |

### TableDefinition

Describes a database table with its schema.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Table name (e.g., `climate_profiles`) |
| module | string | Parent module key |
| description | string | Table description |
| primary_key | string | Primary key column |
| columns | ColumnDefinition[] | Column definitions |
| relations | RelationDefinition[] | Foreign key relations |

### ApiEndpointDefinition

Describes an API endpoint.

| Field | Type | Description |
|-------|------|-------------|
| method | HttpMethod | GET, POST, PUT, PATCH, DELETE |
| path | string | Endpoint path (e.g., `/api/climate/profiles`) |
| module | string | Parent module key |
| summary | string | Endpoint description |
| requires_auth | boolean | Whether auth is required |
| roles | string[] | Required roles (optional) |
| params | EndpointParam[] | Path/query/body parameters |
| tags | string[] | Searchable tags |

### WorkflowDefinition

Describes a workflow/DAG.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Workflow key (e.g., `climate_onboarding_v1`) |
| module | string | Parent module key |
| description | string | Workflow description |
| trigger | WorkflowTrigger | manual, schedule, event, api_call |
| steps | WorkflowStep[] | Workflow steps |

### DependencyDefinition

Describes a module-to-module dependency.

| Field | Type | Description |
|-------|------|-------------|
| from | string | Source module key |
| to | string | Target module key |
| reason | string | Why this dependency exists |

## API Reference

### GET /api/admin/dev/manifest/v2

Returns the full Dev Manifest v2 with all modules, tables, endpoints, workflows, and dependencies.

**Auth**: Requires `X-ZORA-ADMIN-SECRET` header

**Response**:
```json
{
  "version": "2.0.0",
  "generated_at": "2024-01-15T10:30:00.000Z",
  "modules": [...],
  "tables": [...],
  "api_endpoints": [...],
  "workflows": [...],
  "dependencies": [...],
  "stats": {
    "module_count": 18,
    "table_count": 20,
    "endpoint_count": 70,
    "workflow_count": 5,
    "dependency_count": 35,
    "domains": ["climate", "shop", ...],
    "agents": ["ODIN", "THOR", ...]
  }
}
```

### GET /api/admin/dev/manifest/v2/stats

Returns statistics about the manifest.

**Auth**: Requires `X-ZORA-ADMIN-SECRET` header

**Response**:
```json
{
  "module_count": 18,
  "table_count": 20,
  "endpoint_count": 70,
  "workflow_count": 5,
  "dependency_count": 35,
  "domains": ["climate", "shop", "foundation", ...],
  "agents": ["ODIN", "THOR", "FREYA", "BALDUR", "HEIMDALL", "TYR", "EIVOR"]
}
```

### GET /api/admin/dev/dependencies

Returns module dependencies.

**Auth**: Requires `X-ZORA-ADMIN-SECRET` header

**Query Parameters**:
- `module` (optional): Filter by module name

**Response (with module)**:
```json
{
  "module": "climate_os",
  "dependencies": [
    { "from": "climate_os", "to": "auth", "reason": "Climate profiles belong to tenants and users" },
    { "from": "climate_os", "to": "agents", "reason": "ODIN generates climate insights" }
  ],
  "dependants": [
    { "from": "zora_shop", "to": "climate_os", "reason": "Products have climate metadata" },
    { "from": "goes_green", "to": "climate_os", "reason": "Energy profiles link to climate profiles" }
  ]
}
```

**Response (without module)**:
```json
{
  "all_dependencies": [
    { "from": "climate_os", "to": "auth", "reason": "..." },
    ...
  ]
}
```

### POST /api/admin/dev/explain-resource

Explains a specific resource (module, table, endpoint, or workflow).

**Auth**: Requires `X-ZORA-ADMIN-SECRET` header

**Request Body**:
```json
{
  "type": "module",
  "identifier": "climate_os"
}
```

Valid types: `module`, `table`, `endpoint`, `workflow`

**Response**:
```json
{
  "title": "Climate OS",
  "summary": "Core climate tracking system with profiles, missions, impact estimates...",
  "module": "climate_os",
  "relevant_tables": ["climate_profiles", "climate_missions", "climate_plans"],
  "relevant_endpoints": ["GET /api/climate/profiles", "POST /api/climate/profiles", ...],
  "relevant_workflows": ["climate_onboarding_v1"],
  "dependencies": [...]
}
```

## Modules

Dev Manifest v2 includes the following modules:

| Module | Label | Owner Agent | Description |
|--------|-------|-------------|-------------|
| climate_os | Climate OS | ODIN | Core climate tracking with profiles, missions, impact |
| zora_shop | ZORA SHOP | THOR | Climate-first products, brands, materials |
| hemp_materials | Hemp & Climate Materials | ODIN | Hemp-based sustainable materials |
| goes_green | ZORA GOES GREEN | ODIN | Energy transition for households |
| quantum_climate_lab | Quantum Climate Lab | ODIN | Climate experiments and simulations |
| zora_foundation | THE ZORA FOUNDATION | FREYA | Climate impact projects and contributions |
| climate_academy | Climate Academy | FREYA | Educational content and learning paths |
| organizations_playbooks | Organizations & Playbooks | TYR | Multi-tenant orgs with playbooks |
| autonomy | Agent Autonomy | TYR | Task execution engine |
| agents | ZORA Agents | TYR | The 7 Nordic agents |
| billing | Billing & Subscriptions | THOR | Subscriptions and payments |
| auth | Authentication & Users | HEIMDALL | User auth and JWT tokens |
| seed_onboarding | Seed Data & Onboarding | TYR | Tenant onboarding with seed data |
| admin | Admin & System | HEIMDALL | Admin endpoints and dev tools |
| observability | Observability & Metrics | HEIMDALL | System metrics and monitoring |
| journal | Journal & Audit | EIVOR | Event timeline and audit log |
| workflows | Workflow / DAG Engine | TYR | Multi-step process orchestration |
| outcomes | Outcome Feedback & Learning | ODIN | Feedback and continual learning |

## How to Extend

When adding new modules, tables, endpoints, or workflows to ZORA CORE, update the Dev Manifest v2:

### Adding a New Module

1. Add to `MODULES` array in `devManifestV2.ts`:
```typescript
{
  name: 'new_module',
  label: 'New Module',
  description: 'Description of the new module',
  owner_agent: 'ODIN',
  tags: ['new', 'feature'],
}
```

2. Add dependencies to `DEPENDENCIES` array:
```typescript
{ from: 'new_module', to: 'auth', reason: 'New module requires authentication' }
```

### Adding a New Table

Add to `TABLES` array:
```typescript
{
  name: 'new_table',
  module: 'new_module',
  description: 'Description of the table',
  primary_key: 'id',
  columns: [
    { name: 'id', type: 'uuid', description: 'Primary key' },
    { name: 'tenant_id', type: 'uuid', description: 'FK to tenants' },
    // ... more columns
  ],
  relations: [
    { type: 'belongs_to', target_table: 'tenants', via_column: 'tenant_id', notes: 'Parent tenant' },
  ],
}
```

### Adding a New Endpoint

Add to `API_ENDPOINTS` array:
```typescript
{
  method: 'GET',
  path: '/api/new-module/items',
  module: 'new_module',
  summary: 'List items in the new module',
  requires_auth: true,
  roles: ['member', 'founder', 'brand_admin'],
  params: [
    { name: 'limit', in: 'query', required: false, description: 'Max items to return' },
  ],
  tags: ['list', 'new_items'],
}
```

### Adding a New Workflow

Add to `WORKFLOWS` array:
```typescript
{
  name: 'new_workflow_v1',
  module: 'new_module',
  description: 'Description of the workflow',
  trigger: 'manual',
  steps: [
    { step_name: 'step_1', agent: 'ODIN', uses_tables: ['new_table'], description: 'First step' },
    { step_name: 'step_2', agent: 'TYR', calls_endpoints: ['/api/new-module/items'], description: 'Second step' },
  ],
}
```

## Agent Integration

### How Agents Use Dev Manifest v2

**ODIN** (Chief Strategist & Research Lead):
- Queries `/api/admin/dev/manifest/v2` to understand system architecture
- Uses `/api/admin/dev/explain-resource` to get context about specific modules
- Analyzes dependencies to plan system improvements

**THOR** (Backend & Infra Engineer):
- Uses table definitions to understand data models
- Queries endpoint definitions for API documentation
- Plans infrastructure changes based on module dependencies

**FREYA** (Humans, Storytelling & Growth):
- Uses module descriptions for user-facing documentation
- Understands which modules relate to user experience

**BALDUR** (Frontend, UX & Product Experience):
- Queries endpoints to understand available APIs
- Uses module structure for UI organization

**HEIMDALL** (Observability & Monitoring):
- Monitors all modules listed in the manifest
- Uses dependencies to understand impact of issues

**TYR** (Ethics, Safety & Climate Integrity):
- Reviews workflows for safety compliance
- Validates that new features follow dependency patterns

**EIVOR** (Memory & Knowledge Keeper):
- Stores manifest snapshots for historical analysis
- Tracks changes to system architecture over time

### Dev Console UI Integration

The Dev Console UI should:
1. Fetch `/api/admin/dev/manifest/v2` on load
2. Display modules in a navigable tree/graph
3. Show dependency graph visualization
4. Allow searching endpoints and tables
5. Provide "explain" functionality for any resource

## Related Documentation

- [Dev Knowledge & API Manifest v1](./DEV_KNOWLEDGE_AND_API_MANIFEST_V1.md) - Original v1 manifest
- [ZORA Pantheon](./ZORA_PANTHEON.md) - Nordic agent family documentation
- [Workflow / DAG Engine v1](./WORKFLOW_AND_DAG_ENGINE_V1.md) - Workflow system
- [Agent Task Execution Engine v1](./AGENT_TASK_EXECUTION_ENGINE_V1.md) - Task execution

## Future Evolution

### Planned Enhancements

1. **Auto-generation**: Generate manifest from code annotations and database schema
2. **Versioning**: Track manifest changes over time
3. **Validation**: Validate manifest against actual codebase
4. **Agent Training**: Use manifest as training data for ZORA model
5. **Interactive Explorer**: Web UI for exploring the manifest
6. **Change Detection**: Alert when manifest is out of sync with code
