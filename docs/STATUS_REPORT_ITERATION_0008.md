# ZORA CORE - Iteration 0008 Status Report

## JWT Authentication & Multi-Tenant Separation

**Date:** 2025-11-28  
**Status:** In Progress  
**Branch:** `devin/1764303147-jwt-auth-multi-tenant`

---

## Executive Summary

Iteration 0008 introduces JWT-based authentication and multi-tenant data isolation for ZORA CORE. This enables multiple tenants (users, brands, organizations) to have their own isolated data while sharing the same infrastructure.

---

## Current State (Before Iteration 0008)

### Single-Tenant Architecture

The current ZORA CORE implementation is single-tenant:
- All data in `memory_events`, `journal_entries`, `climate_profiles`, and `climate_missions` is shared
- No authentication on API endpoints
- No user/tenant concept in the database

### Existing Schema

Four core tables exist:
- `memory_events` - EIVOR memory storage with pgvector embeddings
- `journal_entries` - High-level system events
- `climate_profiles` - Climate OS profiles
- `climate_missions` - Climate actions and impact tracking

### Workers API

The Cloudflare Workers API (Hono-based) exposes:
- `GET /api/status` - Health check
- `GET/POST /api/climate/profiles` - Climate profiles CRUD
- `GET/POST /api/climate/profiles/:id/missions` - Missions CRUD
- `GET /api/journal` - Journal entries
- `GET /api/agents` - Agent list
- `GET /api/agents/:agentId/memory` - Agent memory
- `POST /api/agents/:agentId/memory/semantic-search` - Semantic search

All endpoints are currently public with no authentication.

---

## Target Multi-Tenant Design

### 1. Database Schema Changes

Add new tables:
- `tenants` - Tenant registry (organizations, brands, individuals)
- `users` - Users belonging to tenants

Add `tenant_id` column to all core tables:
- `memory_events`
- `journal_entries`
- `climate_profiles`
- `climate_missions`

### 2. JWT Authentication

Use HMAC-signed JWT (HS256) with shared secret:
- Environment variable: `ZORA_JWT_SECRET`
- JWT payload: `{ tenant_id, user_id, role, exp, iat }`
- Roles: `founder`, `brand_admin`, `viewer`

### 3. Auth Middleware

Apply to all stateful endpoints:
- `/api/climate/*`
- `/api/agents/*`
- `/api/journal`

Keep `/api/status` public for health checks.

### 4. Tenant Scoping

All queries filter by `tenant_id` from JWT:
```sql
WHERE tenant_id = <tenant_id from token>
```

---

## Implementation Plan

### Phase 1: Database Migration
1. Create `00004_tenants_and_users.sql` migration
2. Add `tenants` and `users` tables
3. Add `tenant_id` to all core tables
4. Create indexes for tenant_id columns

### Phase 2: JWT Auth in Workers
1. Create `auth.ts` utility module
2. Implement `verifyToken()` function
3. Create auth middleware for Hono
4. Apply middleware to protected routes

### Phase 3: Token Generation CLI
1. Create Python CLI tool for issuing JWTs
2. Support `--tenant-id`, `--user-id`, `--role` flags
3. Document usage for developers

### Phase 4: Update Handlers
1. Extract `tenant_id` from verified JWT
2. Add `tenant_id` filter to all queries
3. Add `tenant_id` to all inserts

### Phase 5: Frontend Login
1. Create `/login` page
2. Create auth context/store
3. Update API client with Authorization header
4. Handle 401/403 responses

### Phase 6: Tests & Documentation
1. Add JWT verification tests
2. Add auth middleware tests
3. Update DEVELOPER_SETUP.md
4. Update DATABASE_SCHEMA docs

---

## Environment Variables

### New Variables

```bash
# JWT secret for signing/verifying tokens (required)
ZORA_JWT_SECRET=your-secret-key-at-least-32-chars

# Token expiration in seconds (optional, default: 86400 = 24h)
ZORA_JWT_EXPIRATION=86400
```

### Where to Set

| Component | Location | Notes |
|-----------|----------|-------|
| Workers API | `.dev.vars` (local) or `wrangler secret put` (prod) | Never commit |
| Python CLI | `.env` or shell export | For token generation |
| Frontend | Not needed | Tokens come from CLI/API |

---

## JWT Token Structure

### Payload

```json
{
  "tenant_id": "uuid-of-tenant",
  "user_id": "uuid-of-user",
  "role": "founder",
  "iat": 1732771200,
  "exp": 1732857600
}
```

### Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `founder` | Full access | All operations |
| `brand_admin` | Brand administrator | CRUD on own tenant data |
| `viewer` | Read-only access | Read operations only |

---

## Migration Strategy for Existing Data

For existing data without `tenant_id`:
1. Create a "default" tenant during migration
2. Assign all existing records to default tenant
3. Document this in migration comments

---

## Known Limitations

1. **No External IdP**: Simple HMAC JWT, no OAuth/social login
2. **No User Management UI**: Tokens generated via CLI only
3. **No Password Auth**: No username/password login flow
4. **Dev-Mode Only**: Not production-hardened security
5. **Single Secret**: All tenants share same JWT secret

---

## Tradeoffs and Decisions

### Decision 1: HMAC JWT (HS256) over RSA
**Rationale:** Simpler setup, single secret to manage. RSA would be better for production with multiple services but overkill for dev-mode.

### Decision 2: CLI Token Generation over API Endpoint
**Rationale:** More secure - no risk of exposing token generation endpoint. Developers can generate tokens locally.

### Decision 3: Tenant-Scoped RLS over Application-Level Filtering
**Rationale:** Application-level filtering is simpler to implement and debug. RLS can be added later for defense-in-depth.

### Decision 4: localStorage for Token Storage
**Rationale:** Simple for dev-mode. Production would use httpOnly cookies.

---

## Acceptance Criteria

- [ ] `tenants` and `users` tables created
- [ ] All core tables have `tenant_id` column
- [ ] JWT auth middleware in Workers API
- [ ] All protected endpoints require valid JWT
- [ ] All queries scoped by `tenant_id`
- [ ] CLI tool for token generation
- [ ] Frontend `/login` page
- [ ] API client includes Authorization header
- [ ] Tests for JWT verification
- [ ] Documentation updated

---

## Next Steps (Future Iterations)

1. **Iteration 0009+**: Hybrid search (semantic + keyword)
2. **Iteration 0010+**: OAuth integration (Google, GitHub)
3. **Iteration 0011+**: User management UI
4. **Future**: Row-Level Security policies in Supabase

---

## Files to Create/Modify

### New Files
- `docs/STATUS_REPORT_ITERATION_0008.md` (this file)
- `supabase/migrations/00004_tenants_and_users.sql`
- `workers/api/src/lib/auth.ts`
- `workers/api/src/middleware/auth.ts`
- `zora_core/auth/cli.py`
- `frontend/src/app/login/page.tsx`
- `frontend/src/lib/auth.ts`
- `frontend/src/contexts/AuthContext.tsx`

### Modified Files
- `workers/api/src/index.ts`
- `workers/api/src/types.ts`
- `workers/api/src/handlers/profiles.ts`
- `workers/api/src/handlers/missions.ts`
- `workers/api/src/handlers/journal.ts`
- `workers/api/src/handlers/memory.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/layout.tsx`
- `docs/DEVELOPER_SETUP.md`
- `docs/DATABASE_SCHEMA_v0_1.md`
