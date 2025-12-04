# FRONTEND_FOUNDATION_V1_5.md

## Overview

THE ZORA FOUNDATION Frontend v1.5 "Impact OS" transforms the Foundation module from a basic cockpit into a comprehensive climate impact management system. This iteration makes climate projects, contributions, and impact feel tangible and explorable, with visible connections to Climate OS, GOES GREEN, and ZORA SHOP modules.

## Architecture

### Main Foundation Page (`/foundation`)

The Foundation page is organized into four main sections accessible via pill-style navigation:

1. **Overview Section**: High-level KPIs and recent activity
2. **Projects Section**: Browse and filter all foundation projects
3. **Contributions Section**: View contribution history and top supported projects
4. **Impact Section**: Visualize climate impact by category

### Project Detail Page (`/foundation/projects/[projectId]`)

Individual project pages provide comprehensive project context including:
- Project header with title, status, category, and description
- Impact metrics (estimated and verified CO2 impact)
- SDG alignment tags
- Contribution list with totals
- Contribute modal for direct support
- AgentPanel integration with TYR

## Components

### KPICard
Clickable metric card displaying value, label, and optional subtext. Supports navigation to relevant sections.

```typescript
interface KPICardProps {
  value: number | string;
  label: string;
  color?: string;
  subtext?: string;
  onClick?: () => void;
}
```

### SectionNav
Pill-style navigation for switching between Overview, Projects, Contributions, and Impact sections.

### ContributeModal
Modal component for making contributions to projects with:
- Preset amounts (€10, €25, €50, €100, €250)
- Custom amount input
- Contribution type selection (direct, subscription, grant, other)
- Display name and message fields
- Success/error states

### ContributionRow
Row component displaying individual contribution with contributor label, amount, date, and notes.

### CrossModuleConnectionsPanel
Panel showing links to related modules:
- Climate OS missions linked to foundation projects
- GOES GREEN journeys connected to impact
- ZORA SHOP brands supporting foundation

### ProjectFilters
Dropdown filters for project list:
- Status filter (planned, active, completed, paused, cancelled)
- Category filter (reforestation, renewable_energy, ocean_conservation, etc.)
- Region filter (by country)

## Data Flow

### API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/foundation/projects` | GET | List all projects with pagination and filters |
| `/api/foundation/projects/:id` | GET | Get single project details |
| `/api/foundation/projects/:id/contributions` | GET | List contributions for a project |
| `/api/foundation/projects/:id/contributions` | POST | Create new contribution |
| `/api/climate/missions` | GET | Get linked climate missions |
| `/api/goes-green/profiles` | GET | Get linked GOES GREEN profiles |
| `/api/shop/brands` | GET | Get linked SHOP brands |

### State Management

The Foundation page manages the following state:
- `projects`: Array of FoundationProject objects
- `contributions`: Array of FoundationContribution objects
- `selectedProject`: Currently selected project for detail view
- `activeSection`: Current section (overview, projects, contributions, impact)
- `statusFilter`, `categoryFilter`, `regionFilter`: Active filters
- `contributeProject`: Project being contributed to (for modal)
- Cross-module counts: `climateMissionsLinked`, `goesGreenLinked`, `shopBrandsLinked`

## Cross-Module Integration

### Dashboard FoundationCard
Enhanced card on ZORA Desk showing:
- Total contributions amount and count
- Projects supported
- CO2 impact
- Quick links to contributions and impact sections
- Cross-module links to Climate OS and ZORA SHOP

### ZORA SHOP Overview
Foundation card in SHOP overview showing:
- Total foundation projects count
- Active projects supporting real impact
- Direct link to Foundation page

### Command Palette
Foundation commands added:
- "Go to Foundation" - Navigate to main Foundation page
- "View Foundation Projects" - Navigate to projects section
- "View My Contributions" - Navigate to contributions section
- "View Foundation Impact" - Navigate to impact section
- "Create foundation project" - Open create project form

## AgentPanel Integration

TYR serves as the "Impact Guide" on Foundation pages:
- Context: `foundation`
- Agent: TYR
- Placeholder: "Ask TYR for foundation project recommendations..."
- Default prompt: "Match me with relevant climate foundation projects"

Suggestions can include:
- Project recommendations based on user interests
- Impact portfolio suggestions
- Climate integrity checks
- SDG alignment guidance

## Status Colors

| Status | Color | CSS Class |
|--------|-------|-----------|
| Planned | Blue | `bg-blue-500/20 text-blue-400 border-blue-500/30` |
| Active | Emerald | `bg-emerald-500/20 text-emerald-400 border-emerald-500/30` |
| Completed | Purple | `bg-purple-500/20 text-purple-400 border-purple-500/30` |
| Paused | Amber | `bg-amber-500/20 text-amber-400 border-amber-500/30` |
| Cancelled | Gray | `bg-gray-500/20 text-gray-400 border-gray-500/30` |

## Category Labels

| Category Key | Display Label |
|--------------|---------------|
| reforestation | Reforestation |
| renewable_energy | Renewable Energy |
| ocean_conservation | Ocean Conservation |
| sustainable_agriculture | Sustainable Agriculture |
| carbon_capture | Carbon Capture |
| education | Education |
| community | Community |
| other | Other |

## File Structure

```
frontend/src/
├── app/
│   ├── foundation/
│   │   ├── page.tsx                    # Main Foundation Impact OS page
│   │   └── projects/
│   │       └── [projectId]/
│   │           └── page.tsx            # Project detail page
│   ├── dashboard/
│   │   └── components/
│   │       └── FoundationCard.tsx      # Enhanced dashboard card
│   └── zora-shop/
│       └── page.tsx                    # Updated with Foundation card
├── components/
│   ├── CommandPaletteProvider.tsx      # Foundation commands added
│   └── cockpit/
│       └── AgentPanel.tsx              # TYR context for foundation
└── lib/
    ├── api.ts                          # Foundation API functions
    └── types.ts                        # Foundation types
```

## Types

### FoundationProject
```typescript
interface FoundationProject {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: FoundationProjectStatus;
  climate_focus_domain: string | null;
  location_country: string | null;
  location_region: string | null;
  sdg_tags: string[] | null;
  estimated_impact_kgco2: number | null;
  verified_impact_kgco2: number | null;
  impact_methodology: string | null;
  external_url: string | null;
  image_url: string | null;
  min_contribution_amount_cents: number | null;
  currency: string;
  tags: string[] | null;
  contribution_count: number;
  total_contributions_cents: number;
}
```

### FoundationContribution
```typescript
interface FoundationContribution {
  id: string;
  tenant_id: string;
  project_id: string;
  amount_cents: number;
  currency: string;
  source_type: string;
  source_reference: string | null;
  contributor_label: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  contributed_at: string;
  created_at: string;
}
```

### CreateFoundationContributionInput
```typescript
interface CreateFoundationContributionInput {
  amount_cents: number;
  currency?: string;
  source_type?: string;
  source_reference?: string;
  contributor_label?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}
```

## Usage Examples

### Navigate to Foundation with Section
```typescript
// Navigate to projects section
router.push('/foundation?section=projects');

// Navigate to contributions section
router.push('/foundation?section=contributions');

// Navigate to impact section
router.push('/foundation?section=impact');
```

### Create Contribution
```typescript
import { createFoundationContribution } from '@/lib/api';

const contribution = await createFoundationContribution(projectId, {
  amount_cents: 2500, // €25.00
  source_type: 'direct',
  contributor_label: 'John Doe',
  notes: 'Supporting reforestation efforts',
});
```

## Future Enhancements

1. **Payment Integration**: Connect to payment providers for real transactions
2. **Impact Certificates**: Generate shareable impact certificates
3. **Project Updates**: Timeline of project milestones and updates
4. **Recurring Contributions**: Subscription-based support
5. **Impact Leaderboards**: Community rankings by contribution/impact
6. **Project Matching**: AI-powered project recommendations based on user profile
7. **Carbon Offset Calculator**: Calculate personal carbon footprint and offset needs

## Related Documentation

- [FOUNDATION_BACKEND_V1.md](./FOUNDATION_BACKEND_V1.md) - Backend API documentation
- [FRONTEND_BILLING_UI_V1.md](./FRONTEND_BILLING_UI_V1.md) - Billing integration
- [FRONTEND_ZORA_SHOP_V1.md](./FRONTEND_ZORA_SHOP_V1.md) - SHOP integration
- [FRONTEND_COMMAND_PALETTE_V1.md](./FRONTEND_COMMAND_PALETTE_V1.md) - Command palette
