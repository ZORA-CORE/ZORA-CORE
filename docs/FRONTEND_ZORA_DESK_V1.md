# ZORA Desk v1 - Frontend Documentation

## Overview

ZORA Desk v1 is the main dashboard/home screen for ZORA CORE, designed to feel like a real operating system control center. It provides a unified view of all ZORA CORE modules with live data from backend APIs.

## Architecture

### Global Layout (AppShell)

The `AppShell` component (`frontend/src/components/layout/AppShell.tsx`) provides a consistent layout wrapper for all authenticated pages:

**Top Bar:**
- ZORA CORE logo/branding
- User menu with profile info and sign out option

**Left Sidebar (Desktop):**
- Main navigation: Desk, Climate OS, GOES GREEN, ZORA SHOP, Academy, Foundation, Agents
- Admin section: Setup, Frontend Config, Autonomy, Agent Console
- Collapsible sidebar with version info footer

**Mobile Navigation:**
- Hamburger menu toggle
- Full-screen overlay sidebar
- Responsive breakpoints at 1024px (lg)

### ZORA Desk Dashboard

Located at `/dashboard`, the Desk displays module cards for each ZORA CORE domain:

1. **Climate OS Card** - Climate profiles, missions, CO2 impact
2. **GOES GREEN Card** - Energy profiles, actions, savings
3. **ZORA SHOP Card** - Brands, products, active projects, GMV
4. **Foundation Card** - Projects, contributions, impact
5. **Academy Card** - Topics, lessons, learning paths
6. **Agents & Autonomy Card** - Commands, tasks, pending approvals

Each card shows:
- Module icon with accent color
- Title and description
- 4 key metrics from backend data
- Primary action button linking to module
- Optional secondary action button

### Quick Actions Panel

Provides shortcuts to common tasks:
- New Mission (Climate OS)
- Agent Console
- Browse Mashups
- View Journal

### System Status Panel

Shows real-time agent system metrics:
- Active/total schedules
- Due now count
- Safety policies
- Tasks in progress
- Failed tasks

## Data Sources

### Backend API Endpoints

The Desk fetches data from two main endpoints:

**GET /api/admin/impact/summary**
Returns aggregated impact data across all modules:
```typescript
interface ImpactSummary {
  climate_os: {
    profiles_count: number;
    missions_count: number;
    missions_completed: number;
    missions_in_progress: number;
    total_impact_kgco2: number;
  };
  goes_green: {
    profiles_count: number;
    actions_count: number;
    estimated_energy_savings_kwh: number;
    green_share_percent: number;
  };
  zora_shop: {
    brands_count: number;
    products_count: number;
    active_projects_count: number;
    total_gmv: number;
  };
  foundation: {
    projects_count: number;
    contributions_count: number;
    total_contributions_amount: number;
    total_impact_kgco2: number;
  };
  academy: {
    topics_count: number;
    lessons_count: number;
    learning_paths_count: number;
    enrollments_count: number;
  };
  computed_at: string;
}
```

**GET /api/admin/system-metrics**
Returns agent system metrics:
```typescript
interface SystemMetrics {
  agent_commands: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  agent_tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
  schedules: {
    total: number;
    active: number;
    due_now: number;
  };
  safety_policies: {
    total: number;
    active: number;
  };
  pending_approvals: number;
  computed_at: string;
}
```

### API Client Functions

Located in `frontend/src/lib/api.ts`:

```typescript
export async function getImpactSummary(): Promise<{ data: ImpactSummary }>;
export async function getSystemMetrics(): Promise<{ data: SystemMetrics }>;
export async function getAutonomyStatus(): Promise<{ data: AutonomyStatus }>;
```

## Internationalization (i18n)

All user-facing strings are centralized in `frontend/src/lib/i18n.ts`:

```typescript
import { t } from '@/lib/i18n';

// Usage
<h1>{t.desk.title}</h1>
<p>{t.cards.climate.description}</p>
```

Key translation sections:
- `t.brand` - Brand name and tagline
- `t.nav` - Navigation labels
- `t.desk` - Desk page titles and messages
- `t.cards` - Module card content
- `t.placeholder` - Coming soon messages
- `t.common` - Common UI labels
- `t.footer` - Footer content

## Navigation Structure

| Route | Module | Status |
|-------|--------|--------|
| `/dashboard` | ZORA Desk | Implemented |
| `/climate` | Climate OS | Existing |
| `/goes-green` | GOES GREEN | Placeholder |
| `/zora-shop` | ZORA SHOP | Placeholder |
| `/academy` | Climate Academy | Placeholder |
| `/foundation` | THE ZORA FOUNDATION | Placeholder |
| `/agents` | Agents Dashboard | Existing |
| `/admin/setup` | Admin Setup | Existing |
| `/admin/frontend` | Frontend Config | Existing |
| `/admin/frontend/autonomy` | Autonomy Config | Existing |
| `/admin/agents/console` | Agent Console | Existing |

## Adding New Module Cards

To add a new module card to the Desk:

1. Add the module data type to `frontend/src/lib/types.ts`
2. Add API function to `frontend/src/lib/api.ts`
3. Add translations to `frontend/src/lib/i18n.ts`
4. Add the ModuleCard component in `/dashboard/page.tsx`:

```tsx
<ModuleCard
  title={t.cards.newModule.title}
  description={t.cards.newModule.description}
  icon={<NewModuleIcon />}
  accentColor="#hexcolor"
  stats={[
    { label: 'Metric 1', value: data.metric1 },
    { label: 'Metric 2', value: data.metric2 },
    // ... up to 4 metrics
  ]}
  href="/new-module"
  buttonLabel={t.cards.newModule.viewButton}
/>
```

## Styling

The Desk uses CSS variables for theming:
- `--background` - Page background
- `--foreground` - Text color
- `--primary` - Primary accent color
- `--card-bg` - Card background
- `--card-border` - Card border color
- `--accent` - Warning/highlight color
- `--danger` - Error/danger color

Module cards use custom accent colors for visual distinction:
- Climate OS: `#10b981` (emerald)
- GOES GREEN: `#22c55e` (green)
- ZORA SHOP: `#6366f1` (indigo)
- Foundation: `#ec4899` (pink)
- Academy: `#f59e0b` (amber)
- Agents: `#8b5cf6` (violet)

## Authentication

The Desk requires authentication:
- Unauthenticated users are redirected to `/login`
- Auth state is managed via `AuthContext`
- JWT tokens stored in localStorage
- User info displayed in top bar and user menu

## Error Handling

The Desk gracefully handles API failures:
- Individual API calls are wrapped in try/catch
- Failed calls return null, allowing partial data display
- Error banner shown when data loading fails
- Default values (0) used for missing metrics

## Future Enhancements

Planned for future iterations:
- Real-time data updates via WebSocket
- Customizable card layout/ordering
- User-specific dashboard preferences
- Charts and visualizations for trends
- Notifications panel
- Search functionality
