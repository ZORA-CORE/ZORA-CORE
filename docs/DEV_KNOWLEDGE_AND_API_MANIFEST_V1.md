# Dev Knowledge & API Manifest v1.0

This document describes the Dev Knowledge & API Manifest system for ZORA CORE, which provides a machine-readable description of all modules, tables, and API endpoints in the system.

## Purpose

The Dev Manifest serves three key purposes:

**1. Internal Architecture Knowledge**: Provides a structured, queryable representation of ZORA CORE's architecture that can be used by developers and tools to understand the system.

**2. Foundation for Agent-Engineer Capabilities**: Enables ZORA's agents (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM) to eventually act as "Devin-level engineers" inside ZORA CORE, understanding the architecture, APIs, and modules to reason about changes.

**3. Developer Documentation**: Serves as living documentation that stays in sync with the actual codebase, helping human developers understand the system structure.

## Types

### DevApiEndpoint

Represents a single API endpoint in the ZORA CORE system.

```typescript
type DevApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;           // e.g., "/api/climate/profiles/:id"
  description: string;    // Human-readable description
  authRequired: boolean;  // Whether JWT auth is required
  roles?: string[];       // Allowed roles (e.g., ["founder", "brand_admin"])
  tags?: string[];        // Searchable tags (e.g., ["list", "climate_profiles"])
};
```

### DevModuleManifest

Represents a module in the ZORA CORE system.

```typescript
type DevModuleManifest = {
  key: string;            // e.g., "climate_os"
  name: string;           // e.g., "Climate OS"
  description: string;    // Module description
  domain: ModuleDomain;   // Domain category
  coreTables: string[];   // Key database tables
  apiEndpoints: DevApiEndpoint[];
};
```

### DevManifest

The complete manifest structure.

```typescript
type DevManifest = {
  version: string;        // e.g., "1.0.0"
  generatedAt: string;    // ISO timestamp
  modules: DevModuleManifest[];
};
```

### ModuleDomain

The domain categories for modules:

- `climate` - Climate tracking and action modules
- `shop` - ZORA SHOP and product modules
- `foundation` - THE ZORA FOUNDATION modules
- `academy` - Climate Academy learning modules
- `energy` - GOES GREEN energy transition modules
- `autonomy` - Agent autonomy and task execution
- `billing` - Billing and subscription modules
- `organizations` - Organization and playbook modules
- `auth` - Authentication and user management
- `system` - System administration and observability
- `other` - Miscellaneous modules

## Module List

The v1 manifest includes 16 modules covering all core ZORA CORE functionality:

### Climate Domain

**climate_os** - Climate profiles, missions, impact estimates, weekly plans, and climate summaries. The core climate tracking and action system.

**hemp_materials** - Specialized module for hemp-based and sustainable materials with climate benefit tracking.

**quantum_climate_lab** - Experimental climate research module for running climate experiments, simulations, and scenario modeling.

### Shop Domain

**zora_shop** - Climate-first product universe with brands, products, materials, climate metadata, and cross-brand collaboration projects.

### Foundation Domain

**zora_foundation** - Climate impact projects, contributions tracking, and foundation initiatives for real-world climate action.

### Academy Domain

**climate_academy** - Educational content system with topics, lessons, modules, learning paths, and progress tracking.

### Energy Domain

**goes_green** - Energy transition module for households and businesses. Tracks energy profiles, green actions, and transition roadmaps.

### Organizations Domain

**organizations_playbooks** - Multi-tenant organization management with climate playbooks for structured sustainability programs.

### Autonomy Domain

**autonomy** - Task execution engine for ZORA agents with commands, tasks, safety policies, schedules, and execution tracking.

**agents** - The 6 core ZORA agents (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM) with insights and suggestions.

### Billing Domain

**billing** - Subscription management, billing plans, payment processing, and commission tracking for ZORA SHOP.

### Auth Domain

**auth** - User authentication, JWT tokens, password management, email verification, and account security.

### System Domain

**seed_onboarding** - Tenant onboarding with seed data for climate missions, materials, products, and learning content.

**admin** - Administrative endpoints for tenant management, user management, system status, and developer tools.

**observability** - System metrics, autonomy status, and monitoring endpoints for operational visibility.

**journal** - Human-readable timeline of events, decisions, and system changes for audit and transparency.

## API Endpoint

### GET /api/admin/dev/manifest

Returns the complete Dev Knowledge & API Manifest.

**Authentication**: Required (JWT)

**Roles**: `founder`, `brand_admin`

**Response Example**:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-11-30T12:34:56.000Z",
  "modules": [
    {
      "key": "climate_os",
      "name": "Climate OS",
      "description": "Climate profiles, missions, impact estimates, weekly plans, and climate summaries.",
      "domain": "climate",
      "coreTables": ["climate_profiles", "climate_missions", "climate_plans"],
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/climate/profiles",
          "description": "List climate profiles for the current tenant",
          "authRequired": true,
          "roles": ["member", "founder", "brand_admin"],
          "tags": ["list", "climate_profiles"]
        }
      ]
    }
  ],
  "stats": {
    "moduleCount": 16,
    "endpointCount": 95,
    "tableCount": 45,
    "domains": ["climate", "shop", "foundation", "academy", "energy", "autonomy", "billing", "organizations", "auth", "system"]
  }
}
```

**Error Response**:

```json
{
  "error": {
    "code": "MISSING_ADMIN_SECRET",
    "message": "X-ZORA-ADMIN-SECRET header is required"
  }
}
```

### GET /api/admin/dev/manifest/stats

Returns statistics about the manifest without the full module data.

**Response Example**:

```json
{
  "moduleCount": 16,
  "endpointCount": 95,
  "tableCount": 45,
  "domains": ["climate", "shop", "foundation", "academy", "energy", "autonomy", "billing", "organizations", "auth", "system"]
}
```

## Python Mirror

A Python mirror of the manifest is available for agent consumption:

```python
from zora_core.dev import (
    get_dev_manifest,
    get_module_by_key,
    get_modules_by_domain,
    search_endpoints,
    get_manifest_stats,
)

# Get the full manifest
manifest = get_dev_manifest()
print(f"Version: {manifest.version}")
print(f"Modules: {len(manifest.modules)}")

# Get a specific module
climate_os = get_module_by_key("climate_os")
print(f"Climate OS has {len(climate_os.api_endpoints)} endpoints")

# Get all climate modules
climate_modules = get_modules_by_domain("climate")
print(f"Found {len(climate_modules)} climate modules")

# Search for endpoints
profile_endpoints = search_endpoints("profiles")
print(f"Found {len(profile_endpoints)} profile-related endpoints")

# Get statistics
stats = get_manifest_stats()
print(f"Total endpoints: {stats['endpoint_count']}")
```

## Future Agent Use

The Dev Manifest is designed to support future "Devin-level agent engineers" inside ZORA CORE. Here's how each agent might use it:

### EIVOR (Memory & Knowledge Keeper)
- Ingest the manifest into long-term memory
- Provide search and summarization over the system architecture
- Answer questions about "where is X implemented?" or "what endpoints handle Y?"

### LUMINA (Orchestrator & Project Lead)
- Use the manifest to plan multi-step tasks that span modules
- Understand dependencies between modules
- Route tasks to the appropriate agent based on module domain

### CONNOR (Systems & Backend Engineer)
- Reference the manifest when implementing new features
- Understand existing API patterns and conventions
- Identify which tables and endpoints are affected by changes

### ORACLE (Researcher & Strategy Engine)
- Analyze the manifest to identify gaps or opportunities
- Research how to extend modules with new capabilities
- Design experiments that span multiple modules

### AEGIS (Safety & Ethics Guardian)
- Audit the manifest for security concerns
- Verify that sensitive endpoints have proper role restrictions
- Monitor for changes that might introduce risks

### SAM (Frontend & Experience Architect)
- Understand which APIs are available for frontend features
- Plan UI components based on available data models
- Ensure frontend changes align with backend capabilities

## Versioning

The manifest uses semantic versioning:

- **Major version**: Breaking changes to the manifest structure
- **Minor version**: New modules or significant endpoint additions
- **Patch version**: Bug fixes or minor endpoint updates

Current version: **1.0.0**

## Maintenance

The manifest is hand-curated and should be updated when:

1. New modules are added to ZORA CORE
2. New API endpoints are created
3. Existing endpoints change significantly
4. Tables are added or renamed

Both the TypeScript (`workers/api/src/dev/devManifest.ts`) and Python (`zora_core/dev/manifest.py`) versions should be kept in sync.

## Schema Version

This feature was introduced in **Iteration 00D3** (Dev Knowledge & API Manifest v1.0). No database schema changes were required.
