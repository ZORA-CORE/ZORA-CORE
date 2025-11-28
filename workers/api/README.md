# ZORA CORE API

Cloudflare Workers-based HTTP API for ZORA CORE's core entities.

## Overview

This API provides RESTful endpoints for managing climate profiles, climate missions, and journal entries. It connects to Supabase (Postgres) for persistent storage.

## Prerequisites

- Node.js 18+
- npm or yarn
- Wrangler CLI (installed as dev dependency)
- Supabase project with the ZORA CORE schema applied

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
```

**Important:** Never commit `.dev.vars` to version control. It's already in `.gitignore`.

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
  "version": "0.3.0",
  "environment": "dev",
  "timestamp": "2025-11-28T12:00:00.000Z",
  "supabase": {
    "connected": true,
    "url": "https://your-project.supabase.co"
  }
}
```

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

### Deploy to Cloudflare

```bash
# Set secrets first
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY

# Deploy
npm run deploy
```

## Security Notes

**Current State: Development Mode**

- All endpoints are publicly accessible (no authentication)
- Using service role key for database access
- Suitable for development and testing only

**Production Recommendations:**
- Implement JWT-based authentication
- Add rate limiting
- Use user-scoped RLS policies
- Rotate service keys regularly

## Related Documentation

- [Database Schema](../../docs/DATABASE_SCHEMA_v0_1.md)
- [Developer Setup](../../docs/DEVELOPER_SETUP.md)
- [Status Report - Iteration 0003](../../docs/STATUS_REPORT_ITERATION_0003.md)
