# ZORA World Model / Knowledge Graph v1.0

**Version**: 1.0.0  
**Status**: Implemented  
**Iteration**: World Model v1

## Overview

The ZORA World Model is a knowledge graph that provides a semantic, graph-based view of the entire ZORA CORE architecture. It enables Nordic AI agents (ODIN, HEIMDALL, EIVOR, TYR) and the future Simulation Studio to reason about how everything in the ZORA universe is connected - both technically and climate-wise.

The World Model answers questions like:
- "How are brands, products, materials and climate impact connected?"
- "Which missions tend to work for similar profiles?"
- "What data flows are involved in this workflow or module?"
- "What are the key climate-relevant relationships in the system?"

## Architecture

### Data Sources

The World Model is built from two layers:

1. **Technical Layer** (from Dev Manifest v2):
   - Modules and their dependencies
   - Database tables and their relations
   - API endpoints and their modules
   - Workflows and their steps

2. **Domain Layer** (manual mapping):
   - Business/climate domain concepts (tenant, brand, climate_profile, mission, etc.)
   - Semantic relationships between domain objects
   - Mappings from domain objects to technical tables

### Database Schema

The World Model uses two Postgres tables:

**world_nodes** - Nodes in the knowledge graph:
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| entity_type | TEXT | module, table, endpoint, workflow, domain_object |
| key | TEXT | Unique key within entity_type |
| label | TEXT | Human-readable label |
| description | TEXT | Short description |
| module | TEXT | Parent module (if applicable) |
| tags | JSONB | Searchable tags array |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**world_edges** - Edges (relationships) in the knowledge graph:
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| from_node_id | UUID | Source node ID |
| to_node_id | UUID | Target node ID |
| relation_type | TEXT | Relationship type |
| source | TEXT | Edge source (dev_manifest_v2, manual_domain_mapping, inferred) |
| weight | NUMERIC | Optional importance/confidence weight |
| notes | TEXT | Human-readable notes |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Entity Types

| Type | Description | Example Keys |
|------|-------------|--------------|
| module | ZORA CORE module | climate_os, zora_shop, billing |
| table | Database table | climate_profiles, products, users |
| endpoint | API endpoint | GET /api/climate/profiles |
| workflow | Workflow/DAG | climate_onboarding_v1 |
| domain_object | Business/climate concept | climate_profile, mission, product |

### Relation Types

| Type | Description |
|------|-------------|
| depends_on | Module A depends on module B |
| reads_from | Workflow/endpoint reads from table |
| writes_to | Workflow/endpoint writes to table |
| belongs_to | Entity belongs to parent (table→module, endpoint→module) |
| composed_of | Entity is composed of children (learning_path→modules) |
| flows_to | Data flows from A to B |
| impact_related | Climate impact relationship |
| has_many | One-to-many relationship |
| has_one | One-to-one relationship |
| uses_material | Product uses material |
| linked_to_module | Domain object maps to technical entity |
| references | Foreign key reference |
| uses | Workflow uses endpoint |
| triggers | Entity triggers another entity |

## API Reference

All World Model APIs are admin-protected and require `X-ZORA-ADMIN-SECRET` header.

### GET /api/admin/world-model/nodes

List all nodes with optional filters.

**Query Parameters:**
- `entity_type` - Filter by type (module, table, endpoint, workflow, domain_object)
- `module` - Filter by module name
- `tag` - Filter by tag
- `limit` - Max nodes to return (default 100)
- `offset` - Pagination offset (default 0)

**Response:**
```json
{
  "version": "1.0.0",
  "total": 150,
  "limit": 100,
  "offset": 0,
  "nodes": [
    {
      "entity_type": "module",
      "key": "climate_os",
      "label": "Climate OS",
      "description": "Core climate tracking system...",
      "module": null,
      "tags": ["climate", "profiles", "missions", "impact", "core"],
      "metadata": { "owner_agent": "ODIN" }
    }
  ]
}
```

### GET /api/admin/world-model/node

Get a single node by entity_type and key.

**Query Parameters:**
- `entity_type` - Required
- `key` - Required

**Response:**
```json
{
  "version": "1.0.0",
  "node": {
    "entity_type": "domain_object",
    "key": "climate_profile",
    "label": "Climate Profile",
    "description": "A climate profile for a user, household, organization, or brand...",
    "module": "climate_os",
    "tags": ["climate", "profile", "footprint", "impact", "core"],
    "metadata": {}
  }
}
```

### GET /api/admin/world-model/neighbors

Get a node and its direct neighbors (connected via edges).

**Query Parameters:**
- `entity_type` - Required
- `key` - Required

**Response:**
```json
{
  "version": "1.0.0",
  "node": { ... },
  "neighbors": {
    "outgoing": [
      {
        "edge": {
          "from_node_id": "domain_object:climate_profile",
          "to_node_id": "domain_object:mission",
          "relation_type": "has_many",
          "source": "manual_domain_mapping",
          "notes": "A climate profile has many missions"
        },
        "node": { ... }
      }
    ],
    "incoming": [ ... ]
  }
}
```

### POST /api/admin/world-model/query

Query a subgraph starting from a node.

**Request Body:**
```json
{
  "start": { "entity_type": "module", "key": "climate_os" },
  "relation_types": ["depends_on", "has_many"],
  "max_depth": 2
}
```

**Response:**
```json
{
  "version": "1.0.0",
  "query": {
    "start": { "entity_type": "module", "key": "climate_os" },
    "relation_types": ["depends_on", "has_many"],
    "max_depth": 2
  },
  "result": {
    "node_count": 15,
    "edge_count": 20,
    "depth_reached": 2,
    "nodes": [ ... ],
    "edges": [ ... ]
  }
}
```

### GET /api/admin/world-model/stats

Get statistics about the World Model.

**Response:**
```json
{
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00.000Z",
  "stats": {
    "total_nodes": 150,
    "total_edges": 250,
    "nodes_by_type": {
      "module": 18,
      "table": 20,
      "endpoint": 70,
      "workflow": 5,
      "domain_object": 18
    },
    "edges_by_type": {
      "depends_on": 35,
      "belongs_to": 100,
      "has_many": 20,
      ...
    },
    "edges_by_source": {
      "dev_manifest_v2": 200,
      "manual_domain_mapping": 50,
      "inferred": 0
    }
  }
}
```

### GET /api/admin/world-model/edges

List all edges with optional filters.

**Query Parameters:**
- `relation_type` - Filter by relation type
- `source` - Filter by source (dev_manifest_v2, manual_domain_mapping, inferred)
- `limit` - Max edges to return (default 100)
- `offset` - Pagination offset (default 0)

### GET /api/admin/world-model/climate-graph

Get a climate-focused subgraph showing climate-related entities.

**Response:**
```json
{
  "version": "1.0.0",
  "description": "Climate-focused subgraph of the ZORA World Model",
  "filter_tags": ["climate", "impact", "energy", "green", "foundation", "mission"],
  "node_count": 50,
  "edge_count": 80,
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

### GET /api/admin/world-model/module-graph

Get a module-level graph showing only modules and their dependencies.

### GET /api/admin/world-model/domain-graph

Get the domain object graph showing business/climate concepts.

## Domain Objects

The World Model includes these domain objects representing key business/climate concepts:

| Domain Object | Module | Description |
|---------------|--------|-------------|
| tenant | auth | Multi-tenant root entity |
| brand | zora_shop | Climate-aligned brand |
| organization | organizations_playbooks | Organization with playbooks |
| climate_profile | climate_os | User/org climate footprint tracker |
| mission | climate_os | Concrete climate action |
| goes_green_profile | goes_green | Energy transition profile |
| goes_green_action | goes_green | Energy transition action |
| product | zora_shop | Climate-aligned product |
| material | hemp_materials | Sustainable material |
| foundation_project | zora_foundation | Climate impact project |
| academy_lesson | climate_academy | Educational lesson |
| academy_module | climate_academy | Module grouping lessons |
| academy_learning_path | climate_academy | Structured learning path |
| lab_experiment | quantum_climate_lab | Climate experiment |
| workflow_instance | workflows | Running workflow |
| agent_task | autonomy | Agent task |
| billing_subscription | billing | Tenant subscription |
| climate_impact | climate_os | Aggregated impact metrics |

## How to Extend

### Adding a New Module

When adding a new module to ZORA CORE:

1. Add to Dev Manifest v2 (`devManifestV2.ts`)
2. The World Model will automatically pick it up on next build

### Adding a New Domain Object

Edit `worldModel.ts` and add to `DOMAIN_OBJECTS`:

```typescript
{
  key: 'new_concept',
  label: 'New Concept',
  description: 'Description of the new domain concept',
  module: 'parent_module',
  tags: ['relevant', 'tags'],
}
```

### Adding Domain Relationships

Edit `worldModel.ts` and add to `DOMAIN_EDGES`:

```typescript
{
  from_key: 'source_concept',
  from_type: 'domain_object',
  to_key: 'target_concept',
  to_type: 'domain_object',
  relation_type: 'has_many',
  notes: 'Description of the relationship',
}
```

### Linking Domain Objects to Tables

Add edges with `linked_to_module` relation type:

```typescript
{
  from_key: 'domain_object_key',
  from_type: 'domain_object',
  to_key: 'table_name',
  to_type: 'table',
  relation_type: 'linked_to_module',
  notes: 'Domain object maps to table',
}
```

## Agent Integration

### How Agents Use the World Model

**ODIN** (Chief Strategist & Research Lead):
- Queries `/api/admin/world-model/climate-graph` to understand climate relationships
- Uses `/api/admin/world-model/query` to explore impact pathways
- Analyzes domain objects to plan climate strategies

**HEIMDALL** (Observability & Monitoring):
- Uses `/api/admin/world-model/module-graph` to understand system dependencies
- Monitors relationships for anomalies
- Tracks data flows through the system

**EIVOR** (Memory & Knowledge Keeper):
- Stores World Model snapshots for historical analysis
- Uses graph structure to organize knowledge
- Provides semantic search over the graph

**TYR** (Ethics, Safety & Climate Integrity):
- Reviews domain relationships for safety compliance
- Validates climate impact claims against the graph
- Ensures new features follow established patterns

### Example Agent Queries

**"What affects climate impact?"**
```
POST /api/admin/world-model/query
{
  "start": { "entity_type": "domain_object", "key": "climate_impact" },
  "relation_types": ["impact_related"],
  "max_depth": 2
}
```

**"What does Climate OS depend on?"**
```
GET /api/admin/world-model/neighbors?entity_type=module&key=climate_os
```

**"Show all climate-related entities"**
```
GET /api/admin/world-model/climate-graph
```

## Relationship to Dev Manifest v2

The World Model builds on Dev Manifest v2:

| Dev Manifest v2 | World Model |
|-----------------|-------------|
| Raw architecture data | Graph-based representation |
| Modules, tables, endpoints, workflows | Same + domain objects |
| Module dependencies | All relationship types |
| Static structure | Queryable graph |

Agents should use:
- **Dev Manifest v2** (`/api/admin/dev/manifest/v2`) for raw architecture information
- **World Model** (`/api/admin/world-model/*`) for graph-level reasoning and semantic queries

## Future Evolution

### Planned Enhancements

1. **Persistent Storage**: Store graph in Postgres tables for persistence
2. **Graph Algorithms**: Add shortest path, centrality, clustering
3. **Inference Engine**: Automatically infer new relationships
4. **Temporal Tracking**: Track graph changes over time
5. **Visualization**: Web UI for exploring the graph
6. **Agent Training**: Use graph as training data for ZORA model
7. **Simulation Studio**: Power "what-if" scenarios with graph queries

## Related Documentation

- [Dev Manifest v2](./DEV_BRAIN_V2.md) - Raw architecture manifest
- [ZORA Pantheon](./ZORA_PANTHEON.md) - Nordic agent family
- [Workflow / DAG Engine v1](./WORKFLOW_AND_DAG_ENGINE_V1.md) - Workflow system
