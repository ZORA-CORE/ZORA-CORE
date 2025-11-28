# Frontend Config Layer v0

The Frontend Config Layer enables config-driven UI for ZORA CORE, allowing multi-tenant frontend configuration stored in Supabase. This system is designed for future agent control (SAM/LUMINA) to safely adjust the frontend experience.

## Overview

The Frontend Config Layer provides a way to store per-page, per-tenant configuration that controls UI elements like hero text, section visibility, and call-to-action buttons. When no configuration exists for a page, sensible defaults are returned without auto-creating database rows.

## Database Schema

The `frontend_configs` table stores configuration data:

```sql
CREATE TABLE IF NOT EXISTS frontend_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

A unique constraint on `(tenant_id, page)` ensures one configuration per page per tenant.

## API Endpoints

### GET /api/frontend/config/:page

Retrieves the configuration for a specific page. Returns default configuration with `is_default: true` if no stored config exists.

**Request:**
```
GET /api/frontend/config/home
Authorization: Bearer <jwt_token>
```

**Response (default config):**
```json
{
  "page": "home",
  "config": {
    "hero_title": "ZORA CORE",
    "hero_subtitle": "Climate-first AI Operating System.",
    "primary_cta_label": "Open Climate OS",
    "primary_cta_link": "/climate",
    "show_climate_dashboard": true,
    "show_missions_section": true
  },
  "is_default": true
}
```

**Response (stored config):**
```json
{
  "page": "home",
  "config": {
    "hero_title": "Custom Title",
    "hero_subtitle": "Custom subtitle.",
    "primary_cta_label": "Get Started",
    "primary_cta_link": "/climate",
    "show_climate_dashboard": true,
    "show_missions_section": false
  },
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "is_default": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### PUT /api/frontend/config/:page

Creates or updates the configuration for a specific page. Requires `founder` or `brand_admin` role.

**Request:**
```
PUT /api/frontend/config/home
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "config": {
    "hero_title": "Custom Title",
    "hero_subtitle": "Custom subtitle.",
    "show_climate_dashboard": false
  }
}
```

**Response:**
```json
{
  "page": "home",
  "config": {
    "hero_title": "Custom Title",
    "hero_subtitle": "Custom subtitle.",
    "primary_cta_label": "Open Climate OS",
    "primary_cta_link": "/climate",
    "show_climate_dashboard": false,
    "show_missions_section": true
  },
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "is_default": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## Page Configurations

### Home Page (Dashboard)

Page key: `home`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| hero_title | string | "ZORA CORE" | Main hero heading |
| hero_subtitle | string | "Climate-first AI Operating System." | Hero subheading |
| primary_cta_label | string | "Open Climate OS" | Primary button text |
| primary_cta_link | string | "/climate" | Primary button link |
| show_climate_dashboard | boolean | true | Show climate summary section |
| show_missions_section | boolean | true | Show recent missions section |

### Climate Page

Page key: `climate`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| hero_title | string | "Climate OS" | Main hero heading |
| hero_subtitle | string | "Track your climate impact..." | Hero subheading |
| show_profile_section | boolean | true | Show climate profile section |
| show_dashboard_section | boolean | true | Show dashboard stats section |
| show_missions_section | boolean | true | Show missions section |

## Config Merging

When a stored configuration is retrieved, it is merged with the default configuration for that page. This ensures that all expected keys are always present in the response, even if only some keys were stored. Stored values override defaults.

```typescript
const mergedConfig = { ...defaults, ...storedConfig };
```

This approach allows adding new configuration keys in future versions without breaking existing stored configurations.

## Journal Integration

Every configuration change creates a journal entry with:

- **Category:** `config_change`
- **Event Type:** `frontend_config_updated`
- **Details:** Includes `page`, `old_config`, and `new_config`

This provides an audit trail of all frontend configuration changes.

## Admin UI

The `/admin/frontend` page provides a UI for editing frontend configurations. Access requires:

1. Valid JWT authentication
2. `founder` or `brand_admin` role

The admin UI allows:

- Selecting between pages (home, climate)
- Editing text fields (hero title, subtitle, CTA)
- Toggling boolean fields (section visibility)
- Viewing JSON preview of configuration
- Saving changes with immediate effect

## Frontend Integration

### Using Config in Pages

Pages fetch their configuration on load using the `getFrontendConfig` helper:

```typescript
import { getFrontendConfig } from "@/lib/api";

const DEFAULT_CONFIG = {
  hero_title: "Default Title",
  // ... other defaults
};

// In useEffect or server component
const response = await getFrontendConfig("home");
const config = { ...DEFAULT_CONFIG, ...response.config };
```

### Conditional Rendering

Use config toggles to conditionally render sections:

```tsx
{config.show_missions_section && (
  <MissionsSection />
)}
```

## Future Considerations

The Frontend Config Layer is designed to support future agent control:

- **SAM** can adjust UI elements based on user preferences or A/B testing
- **LUMINA** can orchestrate config changes as part of larger workflows
- **AEGIS** can enforce safety rules on config changes (e.g., preventing misleading content)

The journal integration ensures all changes are auditable, supporting the human-in-the-loop principle.

## Related Files

- `supabase/SUPABASE_SCHEMA_V1_FULL.sql` - Database schema
- `workers/api/src/handlers/frontend-config.ts` - API handler
- `workers/api/src/types.ts` - TypeScript types
- `frontend/src/lib/api.ts` - Frontend API client
- `frontend/src/lib/types.ts` - Frontend types
- `frontend/src/app/dashboard/page.tsx` - Dashboard page using config
- `frontend/src/app/climate/page.tsx` - Climate page using config
- `frontend/src/app/admin/frontend/page.tsx` - Admin UI for editing config
