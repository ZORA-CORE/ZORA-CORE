# ZORA OS Cockpit v1 (Frontend v3)

This document describes the module-specific cockpit pages implemented in Iteration 00F2.

## Overview

ZORA OS Cockpit v1 provides deep module pages for each core area of the ZORA platform. Each cockpit displays live data, allows basic CRUD actions via forms, and includes an AgentPanel component that can call backend services to suggest strategies or actions.

## Architecture

### Shared Components

#### AgentPanel Component

Location: `frontend/src/components/cockpit/AgentPanel.tsx`

The AgentPanel is a shared component used across all cockpit pages. It provides a consistent interface for users to interact with Nordic agents.

**Props:**
- `context`: `'climate' | 'goes_green' | 'shop' | 'foundation' | 'academy'` - Determines which agent and tags to use
- `profileId?`: Optional profile ID for context-specific suggestions
- `title?`: Custom title for the panel
- `description?`: Custom description
- `onSuggestionSelect?`: Callback when a suggestion is selected

**Context to Agent Mapping:**
- `climate` → HEIMDALL (climate mission intelligence)
- `goes_green` → FREYA (energy transition intelligence)
- `shop` → BALDUR (sustainable product intelligence)
- `foundation` → TYR (foundation project matching)
- `academy` → ODIN (climate learning recommendations)

**Context to Hybrid Search Tags:**
- `climate` → `["climate"]`
- `goes_green` → `["energy"]`
- `shop` → `["products", "hemp"]`
- `foundation` → `["foundation"]`
- `academy` → `["learning", "academy"]`

### Backend Endpoint

Location: `workers/api/src/handlers/agent-panel.ts`

**POST `/api/agent-panel/suggest`**

Request:
```json
{
  "context": "climate",
  "prompt": "Suggest climate missions based on similar tenants",
  "profile_id": "optional-profile-id",
  "tags": ["optional", "additional", "tags"]
}
```

Response:
```json
{
  "suggestions": [
    {
      "id": "suggestion-id",
      "type": "mission",
      "title": "Switch to renewable energy",
      "summary": "Transition your home to 100% renewable energy sources",
      "category": "energy",
      "score": 0.85,
      "impact_kgco2": 500,
      "reasons": ["Similar tenants have done this", "High impact potential"]
    }
  ],
  "context": "climate",
  "similar_tenants_used": 5,
  "algorithm": "hybrid_search_v1"
}
```

## Cockpit Pages

### 1. Climate Cockpit (`/climate`)

**Route:** `/climate` (upgraded existing page)

**Features:**
- List of climate profiles with scope badges (individual, household, organization, brand)
- Profile selector with create new option
- Dashboard summary cards (total missions, completed, in progress, total impact)
- Mission list with status management (planned → in_progress → completed)
- Create mission form
- AgentPanel for HEIMDALL suggestions
- Profile detail pane with edit capability

**Data Sources:**
- `GET /api/climate/profiles` - List profiles
- `POST /api/climate/profiles` - Create profile
- `GET /api/climate/profiles/:id/missions` - List missions
- `POST /api/climate/profiles/:id/missions` - Create mission
- `PATCH /api/climate/missions/:id` - Update mission status

### 2. GOES GREEN Cockpit (`/goes-green`)

**Route:** `/goes-green`

**Features:**
- Energy profile management (household/organization)
- Green action tracking with status workflow
- Action statistics (total, planned, active, completed)
- CO2 savings tracking from completed actions
- Create profile and action forms
- AgentPanel for FREYA suggestions
- Quick stats sidebar

**Data Sources:**
- `GET /api/goes-green/profiles` - List profiles
- `POST /api/goes-green/profiles` - Create profile
- `GET /api/goes-green/profiles/:id/actions` - List actions
- `POST /api/goes-green/profiles/:id/actions` - Create action
- `PATCH /api/goes-green/profiles/:id/actions/:actionId` - Update action status

### 3. ZORA SHOP Cockpit (`/zora-shop`)

**Route:** `/zora-shop`

**Features:**
- Tabbed interface: Brands, Products, Materials
- Brand cards with verification status and climate commitment
- Product cards with climate labels (climate-positive, climate-neutral, low-impact)
- Material cards with sustainability scores and certifications
- Create product form (linked to selected brand)
- AgentPanel for BALDUR suggestions
- Shop statistics sidebar

**Data Sources:**
- `GET /api/shop/brands` - List brands
- `GET /api/shop/products` - List products
- `POST /api/shop/products` - Create product
- `GET /api/shop/materials` - List materials

### 4. Foundation Cockpit (`/foundation`)

**Route:** `/foundation`

**Features:**
- Climate project cards with status, category, and impact metrics
- Project detail panel with full information
- Contribution form for supporting projects
- Create project form
- Impact summary cards (total projects, active, estimated CO2, verified CO2)
- AgentPanel for TYR suggestions

**Data Sources:**
- `GET /api/foundation/projects` - List projects
- `POST /api/foundation/projects` - Create project
- `POST /api/foundation/projects/:id/contributions` - Create contribution

### 5. Academy Cockpit (`/academy`)

**Route:** `/academy`

**Features:**
- Tabbed interface: Lessons, Modules, Learning Paths
- Lesson cards with content type icons, difficulty badges, and progress tracking
- Module cards with duration and completion status
- Learning path cards with target audience and progress
- Progress statistics sidebar
- AgentPanel for ODIN suggestions

**Data Sources:**
- `GET /api/academy/lessons` - List lessons
- `GET /api/academy/modules` - List modules
- `GET /api/academy/learning-paths` - List learning paths
- `GET /api/academy/progress` - Get user progress

## TypeScript Types

All types are defined in `frontend/src/lib/types.ts`:

### Agent Panel Types
- `AgentPanelContext` - Union type for context values
- `AgentPanelStrategyType` - Union type for suggestion types
- `AgentPanelSuggestion` - Suggestion object structure
- `AgentPanelSuggestInput` - Request input structure
- `AgentPanelSuggestResponse` - Response structure

### GOES GREEN Types
- `GoesGreenProfile` - Energy profile structure
- `GoesGreenAction` - Green action structure
- `GoesGreenActionStatus` - Action status enum
- `CreateGoesGreenProfileInput` - Profile creation input
- `CreateGoesGreenActionInput` - Action creation input

### Foundation Types
- `FoundationProject` - Project structure
- `FoundationContribution` - Contribution structure
- `FoundationProjectStatus` - Project status enum
- `CreateFoundationProjectInput` - Project creation input
- `CreateFoundationContributionInput` - Contribution creation input

### Academy Types
- `AcademyLesson` - Lesson structure
- `AcademyModule` - Module structure
- `AcademyLearningPath` - Learning path structure
- `AcademyUserProgress` - User progress structure
- `AcademyContentType` - Content type enum
- `AcademyDifficultyLevel` - Difficulty level enum

## API Wrapper Functions

All API functions are in `frontend/src/lib/api.ts`:

### Agent Panel
- `getAgentPanelSuggestions(input)` - Get suggestions from agent

### GOES GREEN
- `getGoesGreenProfiles()` - List profiles
- `createGoesGreenProfile(input)` - Create profile
- `getGoesGreenActions(profileId)` - List actions for profile
- `createGoesGreenAction(profileId, input)` - Create action
- `updateGoesGreenActionStatus(profileId, actionId, status)` - Update action status

### Foundation
- `getFoundationProjects()` - List projects
- `createFoundationProject(input)` - Create project
- `createFoundationContribution(projectId, input)` - Create contribution

### Academy
- `getAcademyLessons()` - List lessons
- `getAcademyModules()` - List modules
- `getAcademyLearningPaths()` - List learning paths
- `getAcademyProgress()` - Get user progress
- `updateAcademyProgress(entityType, entityId)` - Update progress

## Design Patterns

### Nordic Design Language
All cockpits follow the ZORA Nordic design language:
- Dark theme with emerald/green accents for climate-positive elements
- Clean, calm aesthetic with generous whitespace
- Consistent card-based layouts
- Status badges with color coding
- Responsive grid layouts (1-3 columns based on viewport)

### Consistent Layout
Each cockpit follows a similar structure:
1. Header with title and description
2. Summary statistics cards (4-column grid)
3. Main content area (2/3 width) with tabbed or sectioned content
4. Sidebar (1/3 width) with AgentPanel and quick stats
5. Back to Desk button

### Error Handling
- Error messages displayed in red alert boxes
- Dismiss button for clearing errors
- Retry functionality where applicable
- Loading spinners during data fetches

### CRUD Patterns
- Create forms toggle visibility with button
- Forms validate required fields
- Submit buttons show loading state
- Success automatically closes form and updates list
- Errors displayed without closing form

## Future Enhancements

Potential improvements for v2:
- Real-time updates via WebSocket
- Bulk actions for missions/actions
- Advanced filtering and search
- Export functionality
- Charts and visualizations
- Agent conversation history
- Suggestion bookmarking
- Cross-module linking (e.g., link mission to foundation project)
