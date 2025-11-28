# ZORA CORE API

Cloudflare Workers-based HTTP API for ZORA CORE's core entities.

## Overview

This API provides RESTful endpoints for managing climate profiles, climate missions, journal entries, and agent memory with semantic search. It connects to Supabase (Postgres with pgvector) for persistent storage.

## Prerequisites

- Node.js 18+
- npm or yarn
- Wrangler CLI (installed as dev dependency)
- Supabase project with the ZORA CORE schema applied (including pgvector migration)
- OpenAI API key (for semantic search)

## Setup

### 1. Install Dependencies

```bash
cd workers/api
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file in the `workers/api` directory:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
```

**Important:** Never commit `.dev.vars` to version control. It's already in `.gitignore`.

**Note:** `OPENAI_API_KEY` is required for semantic search endpoints. Without it, semantic search will return a 503 error.

### 3. Run Locally

```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

## API Endpoints

### Health & Status

#### GET /api/status

Returns service health and Supabase connection status.

```bash
curl http://localhost:8787/api/status
```

Response:
```json
{
  "service": "ZORA CORE API",
  "version": "0.4.0",
  "environment": "dev",
  "timestamp": "2025-11-28T12:00:00.000Z",
  "supabase": {
    "connected": true,
    "url": "https://your-project.supabase.co"
  }
}
```

### Agents

#### GET /api/agents

List all ZORA CORE agents.

```bash
curl http://localhost:8787/api/agents
```

Response:
```json
{
  "data": [
    {
      "id": "connor",
      "name": "CONNOR",
      "role": "Systems & Backend Engineer",
      "description": "Designs and implements backend services, APIs, data models and integrations.",
      "pronouns": "he/him",
      "color": "bg-blue-500"
    },
    {
      "id": "lumina",
      "name": "LUMINA",
      "role": "Orchestrator & Project Lead",
      "description": "Coordinates multi-agent workflows, manages task distribution...",
      "pronouns": "she/her",
      "color": "bg-purple-500"
    }
  ]
}
```

#### GET /api/agents/:agentId

Get a single agent by ID.

```bash
curl http://localhost:8787/api/agents/connor
```

### Agent Memory

#### GET /api/agents/:agentId/memory

Fetch recent memory events for a specific agent.

```bash
# Basic request
curl http://localhost:8787/api/agents/connor/memory

# With pagination
curl "http://localhost:8787/api/agents/connor/memory?limit=20&offset=0"
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "agent": "CONNOR",
      "memory_type": "decision",
      "content": "Decided to use Hono for the Workers API...",
      "tags": ["architecture", "backend"],
      "metadata": {},
      "session_id": null,
      "created_at": "2025-11-28T12:00:00.000Z",
      "updated_at": null
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 10,
    "has_more": false
  }
}
```

#### POST /api/agents/:agentId/memory/semantic-search

Perform semantic search on an agent's memories using natural language.

```bash
curl -X POST http://localhost:8787/api/agents/connor/memory/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What decisions were made about the API architecture?",
    "limit": 10
  }'
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "agent": "CONNOR",
      "memory_type": "decision",
      "content": "Decided to use Hono for the Workers API...",
      "tags": ["architecture", "backend"],
      "metadata": {},
      "session_id": null,
      "created_at": "2025-11-28T12:00:00.000Z",
      "updated_at": null,
      "similarity": 0.89
    }
  ],
  "query": "What decisions were made about the API architecture?",
  "model": "text-embedding-3-small"
}
```

**Note:** Semantic search requires `OPENAI_API_KEY` to be configured. The endpoint uses the same embedding model (`text-embedding-3-small`, 1536 dimensions) as the Python backend to ensure consistency.

### Climate Profiles

#### GET /api/climate/profiles

List all climate profiles with pagination.

```bash
# Basic request
curl http://localhost:8787/api/climate/profiles

# With pagination
curl "http://localhost:8787/api/climate/profiles?limit=10&offset=0"

# Filter by type
curl "http://localhost:8787/api/climate/profiles?type=brand"
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "owner_id": "user-123",
      "profile_type": "person",
      "name": "John Doe",
      "description": "Climate-conscious individual",
      "climate_score": 75,
      "created_at": "2025-11-28T12:00:00.000Z"
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

#### GET /api/climate/profiles/:id

Get a single climate profile by ID.

```bash
curl http://localhost:8787/api/climate/profiles/uuid-here
```

#### POST /api/climate/profiles

Create a new climate profile.

```bash
curl -X POST http://localhost:8787/api/climate/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EcoTech Corp",
    "profile_type": "brand",
    "description": "Sustainable technology company",
    "energy_source": "renewable",
    "climate_score": 85
  }'
```

#### PUT /api/climate/profiles/:id

Update an existing climate profile.

```bash
curl -X PUT http://localhost:8787/api/climate/profiles/uuid-here \
  -H "Content-Type: application/json" \
  -d '{
    "climate_score": 90,
    "description": "Updated description"
  }'
```

### Climate Missions

#### GET /api/climate/profiles/:id/missions

List missions for a specific climate profile.

```bash
# Basic request
curl http://localhost:8787/api/climate/profiles/uuid-here/missions

# Filter by status
curl "http://localhost:8787/api/climate/profiles/uuid-here/missions?status=in_progress"
```

#### POST /api/climate/profiles/:id/missions

Create a new mission for a climate profile.

```bash
curl -X POST http://localhost:8787/api/climate/profiles/uuid-here/missions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Switch to renewable energy",
    "description": "Transition office to 100% renewable energy sources",
    "category": "energy",
    "impact_estimate": {
      "co2_kg": 5000,
      "description": "Estimated annual CO2 reduction"
    }
  }'
```

#### PATCH /api/missions/:id

Update a mission (e.g., change status).

```bash
curl -X PATCH http://localhost:8787/api/missions/uuid-here \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'
```

Mission statuses: `planned`, `in_progress`, `completed`, `cancelled`, `failed`

### Journal Entries

#### GET /api/journal

List journal entries with pagination.

```bash
# Basic request
curl http://localhost:8787/api/journal

# Filter by category
curl "http://localhost:8787/api/journal?category=milestone"

# Filter by author
curl "http://localhost:8787/api/journal?author=LUMINA"
```

## Pagination

All list endpoints support pagination with these query parameters:

- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100,
    "has_more": true
  }
}
```

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "status": 400
}
```

Common error codes:
- `BAD_REQUEST` (400): Invalid input
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_ERROR` (500): Server error

## Development

### Type Checking

```bash
npm run typecheck
```

### Running Tests

```bash
npm test
```

## Production Deployment

### Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI installed: `npm install -g wrangler`
3. Authenticated with Cloudflare: `wrangler login`

### Step 1: Set Production Secrets

```bash
# Supabase credentials
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_SERVICE_KEY --env production

# OpenAI for semantic search
wrangler secret put OPENAI_API_KEY --env production

# JWT authentication secret (min 32 characters)
wrangler secret put ZORA_JWT_SECRET --env production
```

### Step 2: Configure Custom Domain (Optional)

Edit `wrangler.toml` and uncomment the routes section:

```toml
[env.production]
routes = [
  { pattern = "api.your-domain.com/*", zone_name = "your-domain.com" }
]
```

### Step 3: Deploy

```bash
npm run deploy
# Or: wrangler deploy --env production
```

### Step 4: Verify

```bash
curl https://your-workers-url/api/status
```

### Production Deployment Checklist

- [ ] All secrets set via `wrangler secret put --env production`
- [ ] Custom domain configured (if using)
- [ ] `/api/status` returns healthy response
- [ ] JWT authentication working
- [ ] Semantic search returning results

## Authentication

All endpoints except `/api/status` require JWT authentication.

Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  https://your-api-url/api/climate/profiles
```

Generate tokens using the Python CLI:

```bash
PYTHONPATH=. python -m zora_core.auth.cli issue-token -v
```

See [JWT Authentication Setup](../../docs/DEVELOPER_SETUP.md#jwt-authentication-setup) for details.

## Security Notes

**Authentication:** JWT-based authentication is enabled on all stateful endpoints. Tokens include tenant_id for multi-tenant data isolation.

**Secrets:** Never commit secrets to version control. Use `wrangler secret put` for production.

**CORS:** Currently allows all origins. For production, consider restricting to your frontend domain.

**Rate Limiting:** Not implemented. Consider adding Cloudflare rate limiting rules.

## Related Documentation

- [Deployment Overview](../../docs/DEPLOYMENT_OVERVIEW.md)
- [Database Schema](../../docs/DATABASE_SCHEMA_v0_1.md)
- [Developer Setup](../../docs/DEVELOPER_SETUP.md)
- [JWT Authentication](../../docs/STATUS_REPORT_ITERATION_0008.md)
