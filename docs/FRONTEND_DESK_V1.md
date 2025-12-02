# ZORA Desk v1 - Frontend Documentation

## Overview

ZORA Desk v1 is the main dashboard ("cockpit") for the ZORA CORE Climate OS. It provides a unified view of all ZORA modules, displaying real-time data from the backend APIs in a clean, Nordic-inspired layout.

## Architecture

The dashboard is built with modular card components, each responsible for displaying data from a specific ZORA module. This architecture allows for easy maintenance, testing, and future expansion.

### Component Structure

```
frontend/src/app/dashboard/
├── page.tsx                    # Main dashboard page
└── components/
    ├── index.ts                # Component exports
    ├── icons.tsx               # Shared SVG icons
    ├── WelcomeCard.tsx         # User greeting and role display
    ├── ClimateImpactCard.tsx   # Climate OS metrics
    ├── GoesGreenCard.tsx       # GOES GREEN energy journey
    ├── ZoraShopCard.tsx        # ZORA SHOP activity
    ├── FoundationCard.tsx      # Foundation contributions
    ├── AcademyCard.tsx         # Climate Academy progress
    └── AgentsAutonomyCard.tsx  # Nordic AI agent activity
```

## Data Sources

The dashboard fetches data from two main API endpoints:

### Impact Summary API
**Endpoint:** `/api/admin/impact/summary`
**Function:** `getImpactSummary()`

Returns aggregated metrics across all ZORA modules:

| Module | Data Fields |
|--------|-------------|
| Climate OS | profiles_count, missions_count, missions_completed, missions_in_progress, total_impact_kgco2 |
| GOES GREEN | profiles_count, actions_count, estimated_energy_savings_kwh, green_share_percent |
| ZORA SHOP | brands_count, products_count, active_projects_count, total_gmv |
| Foundation | projects_count, contributions_count, total_contributions_amount, total_impact_kgco2 |
| Academy | topics_count, lessons_count, learning_paths_count, enrollments_count |

### System Metrics API
**Endpoint:** `/api/admin/system-metrics`
**Function:** `getSystemMetrics()`

Returns agent and system activity metrics:

| Category | Data Fields |
|----------|-------------|
| Agent Commands | total, pending, completed, failed |
| Agent Tasks | total, pending, in_progress, completed, failed |
| Schedules | total, active, due_now |
| Safety Policies | total, active |
| Approvals | pending_approvals |

## Card Components

### WelcomeCard
Displays a personalized greeting based on time of day, user's display name (if available), and their role in the system. Provides a warm, Nordic-feeling introduction to the dashboard.

### ClimateImpactCard
Shows the user's total climate impact in kg CO2, mission completion status, and progress indicators. Includes status text like "On track" or "Getting started" based on activity level.

### GoesGreenCard
Displays GOES GREEN energy journey metrics including green energy share percentage with a visual progress bar, actions completed, and energy savings in kWh.

### ZoraShopCard
Shows ZORA SHOP activity including brand count, product count, active projects, and total GMV. Links to both the shop and mashups sections.

### FoundationCard
Displays THE ZORA FOUNDATION engagement including total contributions, projects supported, and climate impact. Shows encouraging messages for users who haven't contributed yet.

### AcademyCard
Shows Climate Academy learning progress including enrollments, available lessons, and learning paths. Encourages users to continue or start their climate education.

### AgentsAutonomyCard
Displays Nordic AI agent activity including task status (completed, running, pending), pending approvals, active schedules, and safety policies. Shows autonomy status (Active, Pending Approval, or Idle).

## Design Principles

### Nordic Aesthetic
The dashboard follows a clean, spacious Nordic design philosophy with light backgrounds, subtle colors, and calm typography. The design avoids visual clutter and focuses on clarity.

### Color Palette
Each module has a distinct accent color for easy identification:
- Climate OS: Emerald (#10b981)
- GOES GREEN: Green (#22c55e)
- ZORA SHOP: Indigo (#6366f1)
- Foundation: Rose (#ec4899)
- Academy: Amber (#f59e0b)
- Agents: Violet (#8b5cf6)

### Loading States
The dashboard implements graceful loading states with a centered spinner while data is being fetched. Individual cards handle their own empty states with helpful messages.

### Error Handling
If data fetching fails, the dashboard shows a non-blocking error message while still displaying available information. This ensures users always see something useful.

## TypeScript Types

The dashboard uses strongly-typed interfaces from `@/lib/types`:

```typescript
interface ImpactSummary {
  climate_os: { ... };
  goes_green: { ... };
  zora_shop: { ... };
  foundation: { ... };
  academy: { ... };
  computed_at: string;
}

interface SystemMetrics {
  agent_commands: { ... };
  agent_tasks: { ... };
  schedules: { ... };
  safety_policies: { ... };
  pending_approvals: number;
  computed_at: string;
}
```

## Authentication

The dashboard requires authentication. Unauthenticated users are redirected to `/login`. The user object from `useAuth()` provides:
- `tenantId`: Current tenant identifier
- `userId`: User identifier
- `role`: User role (founder, brand_admin, viewer)
- `display_name`: Optional display name
- `email`: Optional email address

## Quick Actions

The dashboard includes a Quick Actions section with shortcuts to common tasks:
- New Mission (Climate OS)
- Agent Console
- Browse Mashups
- View Journal

## System Status

A dedicated System Status card shows real-time agent system health:
- Active schedules count
- Tasks due now
- Safety policies status
- Tasks in progress
- Failed tasks count

## Future Enhancements

Potential improvements for future iterations:
- Real-time data updates via WebSocket
- Customizable card layout (drag-and-drop)
- Personal dashboard preferences
- Notification center integration
- Advanced filtering and date ranges
- Export functionality for reports
