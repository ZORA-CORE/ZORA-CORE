# ZORA Hybrid Search & Reasoner v1.0

Hybrid Search & Reasoner v1 combines EIVOR's semantic search, the World Model graph, and SQL filters to answer complex climate/business questions for Nordic agents.

## Overview

The Hybrid Search service bridges the gap between "ZORA knows what exists" (Dev Brain + World Model) and "ZORA can help answer complex climate/business questions." It provides three core operations that agents can use to reason about tenants, strategies, and knowledge.

## Architecture

The service is implemented as an orchestration layer that composes three existing capabilities:

1. **EIVOR Semantic Search** - Vector-based search over `memory_events` using OpenAI embeddings
2. **World Model Graph** - Schema/domain relationships from Dev Manifest v2
3. **SQL Queries** - Direct queries on climate/shop tables for aggregates and filtering

## Core Operations

### 1. findSimilarTenants

Find tenants similar to a reference tenant or profile based on features like sector, country, scope, and climate score.

**Algorithm**: `feature_similarity_v1`
- Compares sector, country, scope, climate score band
- Checks for presence of GOES GREEN profiles, products, foundation projects
- Returns ranked list with similarity scores and reasons

**Input**:
```typescript
{
  tenant_id?: string;           // Reference tenant ID
  profile?: {                   // OR provide a profile object
    sector?: string;
    country?: string;
    scope?: string;
    tags?: string[];
    description?: string;
  };
  filters?: {
    country?: string;           // Filter by country
    sector?: string;            // Filter by sector
    scope?: string;             // Filter by scope
    min_climate_score?: number; // Minimum climate score
    max_results?: number;       // Max results (default: 20)
  };
}
```

**Output**:
```typescript
{
  version: string;
  reference: {
    tenant_id: string | null;
    sector: string | null;
    country: string | null;
    scope: string | null;
  };
  similar_tenants: Array<{
    tenant_id: string;
    name: string;
    sector: string | null;
    country: string | null;
    scope: string | null;
    climate_score: number | null;
    score: number;              // 0-1 similarity score
    reasons: string[];          // Why this tenant is similar
  }>;
  total_candidates: number;
  algorithm: string;
}
```

### 2. recommendStrategies

Recommend missions, GOES GREEN actions, material changes, or foundation projects based on what similar tenants have done successfully.

**Algorithm**: `frequency_aggregation_v1`
- Finds similar tenants using `findSimilarTenants`
- Aggregates strategies (missions, actions, projects) from similar tenants
- Ranks by frequency and average impact
- Returns recommendations with explanations

**Input**:
```typescript
{
  tenant_id?: string;           // Target tenant ID
  climate_profile_id?: string;  // OR target climate profile ID
  tags?: string[];              // Filter strategies by tags (e.g., "energy", "foundation")
  max_similar_tenants?: number; // Max similar tenants to analyze (default: 20)
  max_strategies?: number;      // Max strategies to return (default: 10)
}
```

**Output**:
```typescript
{
  version: string;
  target: {
    tenant_id: string | null;
    climate_profile_id: string | null;
  };
  similar_tenants_used: number;
  strategies: Array<{
    type: 'mission' | 'goes_green_action' | 'material_change' | 'foundation_project';
    id: string;
    label: string;
    category: string | null;
    score: number;              // 0-1 relevance score
    frequency: number;          // How many similar tenants use this
    avg_impact_kgco2: number | null;
    reasons: string[];          // Why this is recommended
  }>;
  algorithm: string;
}
```

### 3. searchKnowledge

Semantic + graph-aware search across ZORA CORE knowledge sources.

**Algorithm**: `hybrid_search_v1`
- Searches memory_events with EIVOR semantic search
- Searches World Model nodes by text matching
- Searches domain tables (missions, projects, lessons) by SQL ILIKE
- Optionally expands results via graph traversal

**Input**:
```typescript
{
  query: string;                // Search query
  filters?: {
    module?: string;            // Filter by module
    entity_types?: EntityType[]; // Filter by entity types
    tags?: string[];            // Filter by tags
    sources?: ('memory' | 'world_node' | 'table')[]; // Which sources to search
  };
  max_results?: number;         // Max results (default: 30)
  include_graph_expansion?: boolean; // Expand via graph traversal
}
```

**Output**:
```typescript
{
  version: string;
  query: string;
  hits: Array<{
    source: 'memory' | 'world_node' | 'table';
    id: string;
    title: string;
    snippet: string;
    score: number;              // 0-1 relevance score
    metadata: Record<string, unknown>;
  }>;
  total_hits: number;
  sources_searched: string[];
  embedding_model: string | null;
}
```

## API Endpoints

All endpoints are admin-protected under `/api/admin/hybrid-search/*`.

### GET /api/admin/hybrid-search/info

Returns service information and available operations.

**Response**:
```json
{
  "version": "1.0.0",
  "operations": ["findSimilarTenants", "recommendStrategies", "searchKnowledge"],
  "algorithms": {
    "findSimilarTenants": "feature_similarity_v1 - Compares sector, country, scope, climate score, and domain presence",
    "recommendStrategies": "frequency_aggregation_v1 - Aggregates strategies from similar tenants by frequency and impact",
    "searchKnowledge": "hybrid_search_v1 - Combines EIVOR semantic search, World Model graph, and SQL text search"
  }
}
```

### POST /api/admin/hybrid-search/find-similar-tenants

Find tenants similar to a reference tenant or profile.

**Request**:
```json
{
  "tenant_id": "uuid-of-tenant",
  "filters": {
    "country": "DK",
    "max_results": 10
  }
}
```

**Response**:
```json
{
  "version": "1.0.0",
  "reference": {
    "tenant_id": "uuid-of-tenant",
    "sector": "manufacturing",
    "country": "DK",
    "scope": "organization"
  },
  "similar_tenants": [
    {
      "tenant_id": "uuid-of-similar-tenant",
      "name": "Green Manufacturing Co",
      "sector": "manufacturing",
      "country": "DK",
      "scope": "organization",
      "climate_score": 72,
      "score": 0.65,
      "reasons": [
        "Same sector: manufacturing",
        "Same country: DK",
        "Same scope: organization"
      ]
    }
  ],
  "total_candidates": 45,
  "algorithm": "feature_similarity_v1"
}
```

### POST /api/admin/hybrid-search/recommend-strategies

Get strategy recommendations based on similar tenants.

**Request**:
```json
{
  "tenant_id": "uuid-of-tenant",
  "tags": ["energy"],
  "max_strategies": 5
}
```

**Response**:
```json
{
  "version": "1.0.0",
  "target": {
    "tenant_id": "uuid-of-tenant",
    "climate_profile_id": null
  },
  "similar_tenants_used": 12,
  "strategies": [
    {
      "type": "mission",
      "id": "uuid-of-mission",
      "label": "energy missions (e.g., Switch to renewable energy)",
      "category": "energy",
      "score": 0.85,
      "frequency": 8,
      "avg_impact_kgco2": 1250.5,
      "reasons": [
        "Used by 8 missions across 12 similar tenants",
        "Average impact: 1250.5 kg CO2"
      ]
    },
    {
      "type": "goes_green_action",
      "id": "uuid-of-action",
      "label": "solar_installation (e.g., Install rooftop solar)",
      "category": "solar_installation",
      "score": 0.72,
      "frequency": 5,
      "avg_impact_kgco2": 3500.0,
      "reasons": [
        "Used by 5 GOES GREEN actions across similar tenants",
        "Average impact: 3500.0 kg CO2"
      ]
    }
  ],
  "algorithm": "frequency_aggregation_v1"
}
```

### POST /api/admin/hybrid-search/search-knowledge

Search across all ZORA CORE knowledge sources.

**Request**:
```json
{
  "query": "hemp materials carbon sequestration",
  "filters": {
    "sources": ["memory", "world_node"],
    "entity_types": ["domain_object", "table"]
  },
  "max_results": 20,
  "include_graph_expansion": true
}
```

**Response**:
```json
{
  "version": "1.0.0",
  "query": "hemp materials carbon sequestration",
  "hits": [
    {
      "source": "memory",
      "id": "uuid-of-memory",
      "title": "climate, research, hemp",
      "snippet": "Hemp materials show significant carbon sequestration potential...",
      "score": 0.89,
      "metadata": {
        "agent": "ODIN",
        "memory_type": "research",
        "tags": ["climate", "research", "hemp"],
        "tenant_id": "uuid"
      }
    },
    {
      "source": "world_node",
      "id": "domain_object:material",
      "title": "Material",
      "snippet": "A material used in products - can be hemp, recycled, or other sustainable materials",
      "score": 0.7,
      "metadata": {
        "entity_type": "domain_object",
        "key": "material",
        "module": "hemp_materials",
        "tags": ["material", "hemp", "sustainable", "climate"]
      }
    }
  ],
  "total_hits": 15,
  "sources_searched": ["memory", "world_node"],
  "embedding_model": "text-embedding-3-small"
}
```

## Agent Integration Guide

### ODIN (Chief Strategist & Research Lead)

ODIN should use Hybrid Search for strategic climate questions:

- **`recommend-strategies`**: When advising tenants on climate strategy
  - "What missions should this tenant prioritize based on similar organizations?"
  - "Which foundation projects align with this tenant's sector?"

- **`search-knowledge`**: For research and strategic insights
  - "Find relevant research on hemp materials for construction"
  - "What do we know about energy transition in manufacturing?"

**Example ODIN workflow**:
```
1. Receive question: "What climate strategies work for manufacturing companies in Denmark?"
2. Call POST /api/admin/hybrid-search/find-similar-tenants with sector=manufacturing, country=DK
3. Call POST /api/admin/hybrid-search/recommend-strategies with the tenant_id
4. Synthesize recommendations into strategic advice
```

### EIVOR (Memory & Knowledge Keeper)

EIVOR should use Hybrid Search to augment memory with graph-aware search:

- **`search-knowledge`**: For comprehensive knowledge retrieval
  - Combine semantic search over memories with World Model context
  - Use `include_graph_expansion: true` to discover related concepts

**Example EIVOR workflow**:
```
1. Receive query: "What do we know about climate profiles and missions?"
2. Call POST /api/admin/hybrid-search/search-knowledge with query and entity_types filter
3. Return enriched results with both memory hits and domain context
```

### HEIMDALL (Observability & Monitoring)

HEIMDALL should use Hybrid Search for system pattern analysis:

- **`find-similar-tenants`**: For tenant clustering and pattern detection
  - "Which tenants have similar profiles but different outcomes?"
  - "Find tenants that might benefit from specific interventions"

**Example HEIMDALL workflow**:
```
1. Analyze tenant performance metrics
2. Call POST /api/admin/hybrid-search/find-similar-tenants for underperforming tenants
3. Compare with high-performing similar tenants
4. Identify patterns and potential interventions
```

### TYR (Ethics, Safety & Climate Integrity)

TYR should use Hybrid Search to evaluate strategies against ethics/integrity:

- **`recommend-strategies`** + policy evaluation
  - Verify recommended strategies align with climate integrity standards
  - Flag strategies that might involve greenwashing

**Example TYR workflow**:
```
1. Receive strategy recommendation from ODIN
2. Call POST /api/admin/hybrid-search/search-knowledge for related policies
3. Evaluate strategy against integrity criteria
4. Approve or flag for human review
```

## Scoring Algorithms

### Feature Similarity (findSimilarTenants)

Scores are computed by summing weighted matches:

| Feature | Weight | Condition |
|---------|--------|-----------|
| Sector | 0.30 | Exact match |
| Country | 0.20 | Exact match |
| Scope | 0.15 | Exact match |
| Climate Score | 0.15 | Within 10 points |
| Climate Score | 0.08 | Within 25 points |
| GOES GREEN | 0.10 | Both have profiles |
| Products | 0.05 | Both have products |
| Foundation | 0.05 | Both have projects |

Maximum score: 1.0

### Frequency Aggregation (recommendStrategies)

Strategy scores combine frequency and impact:

```
score = min(frequency_ratio + impact_bonus, 1.0)

where:
  frequency_ratio = count / similar_tenants_count
  impact_bonus = avg_impact_kgco2 / 10000 (for missions/actions)
               = avg_impact_kgco2 / 50000 (for foundation projects)
```

### Hybrid Search Scoring (searchKnowledge)

| Source | Score Range | Criteria |
|--------|-------------|----------|
| Memory (semantic) | 0.0-1.0 | Cosine similarity from pgvector |
| World Node (label match) | 0.9 | Query in label or key |
| World Node (desc match) | 0.7 | Query in description |
| World Node (partial) | 0.5 * ratio | Partial term matches |
| World Node (expansion) | 0.3 | Graph-related nodes |
| Table (SQL) | 0.55-0.6 | ILIKE match |

## Future Evolution

### v1.1 (Planned)
- Tenant embeddings for semantic similarity
- Weighted scoring based on outcome feedback
- Caching for frequently-used queries

### v1.2 (Planned)
- ML-based ranking using historical outcomes
- Cross-tenant pattern detection
- Integration with Simulation Studio

### v2.0 (Future)
- Real-time recommendation updates
- Personalized scoring per agent
- Advanced graph algorithms (PageRank, community detection)

## Related Documentation

- [World Model v1](./WORLD_MODEL_V1.md) - Domain graph and relationships
- [Dev Brain v2](./DEV_BRAIN_V2.md) - System architecture manifest
- [Climate OS Backend v1](./CLIMATE_OS_BACKEND_V1.md) - Climate profiles and missions
- [GOES GREEN Backend v1](./GOES_GREEN_BACKEND_V1.md) - Energy transition tracking
