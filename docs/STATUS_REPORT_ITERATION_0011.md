# ZORA CORE - Iteration 0011: Climate OS v0.2

## Summary

This iteration upgrades Climate OS to feel like a real product with richer profiles, mission categories with impact estimates, a progress dashboard, automatic journal events, and starter missions bootstrap functionality.

## What Was Implemented

### 1. Database Schema Extensions

Extended the canonical schema (`supabase/SUPABASE_SCHEMA_V1_FULL.sql`) with new columns:

**Climate Profiles (5 new columns):**
- `country` - VARCHAR(100) for user's country
- `city_or_region` - VARCHAR(255) for city or region
- `household_size` - INTEGER for number of people in household
- `primary_energy_source` - VARCHAR(100) for main energy source (grid_mixed, solar, wind, etc.)
- `notes` - TEXT for additional notes

**Climate Missions (2 new columns):**
- `estimated_impact_kgco2` - NUMERIC(12,2) for estimated CO2 impact in kilograms
- `due_date` - DATE for mission due date

All schema changes use idempotent `ADD COLUMN IF NOT EXISTS` pattern.

### 2. Workers API Updates

**Profile Handlers (`handlers/profiles.ts`):**
- Extended POST and PUT endpoints to accept and return new profile fields
- Added journal entry creation on profile create/update
- Uses new `insertJournalEntry` helper function

**Mission Handlers (`handlers/missions.ts`):**
- Extended POST and PATCH endpoints to accept and return new mission fields
- Added journal entry creation on mission create and status change
- Populates both `estimated_impact_kgco2` numeric column and `impact_estimate` JSONB for backwards compatibility

**Bootstrap Endpoint (`POST /api/climate/missions/bootstrap`):**
- Creates 4 starter missions for tenants with zero missions
- Idempotent - returns `{created: false, reason: 'missions_already_exist'}` if missions exist
- Starter missions cover energy, transport, food, and products categories
- Creates journal entry when missions are bootstrapped

**Journal Helper (`lib/journal.ts`):**
- New `insertJournalEntry` function for clean journal integration
- Accepts event type, summary, metadata, and related entity IDs
- Uses `system_event` category with event type encoded in JSON details

### 3. Frontend Updates

**Types (`lib/types.ts`):**
- Added `tenant_id` to ClimateProfile and ClimateMission interfaces
- Added 5 new profile fields and 2 new mission fields
- Added `MissionCategory` type for mission categories
- Added `BootstrapMissionsResponse` and `DashboardSummary` interfaces

**API Client (`lib/api.ts`):**
- Added `bootstrapMissions()` function for starter missions

**Climate Page (`app/climate/page.tsx`):**
- Richer profile creation form with country, city/region, household size, and primary energy source
- Dashboard summary showing total missions, completed, in progress, and total CO2 impact
- "Create Starter Missions" button when tenant has zero missions
- Updated profile display section with all new fields
- Updated mission categories to include energy, transport, food, products, other
- Updated version to v0.5 - Climate OS v0.2

### 4. Tests

Added `workers/api/src/__tests__/missions.test.ts` with 7 tests:
- Bootstrap missions structure validation
- Starter missions field validation
- Mission categories validation
- Mission fields validation (estimated_impact_kgco2, due_date)
- Journal integration validation

Total: 48 passing tests

## Starter Missions

The bootstrap endpoint creates these 4 starter missions:

| Title | Category | Impact (kg CO2) |
|-------|----------|-----------------|
| Switch 5 bulbs to LED | energy | 20 |
| Replace one weekly car trip with public transport | transport | 15 |
| Try 2 meat-free days this week | food | 10 |
| Review your next 3 purchases for climate-friendly alternatives | products | 5 |

Total estimated impact: 50 kg CO2

## Journal Event Types

The following event types are now automatically logged:

- `climate_profile_created` - When a new profile is created
- `climate_profile_updated` - When a profile is updated
- `climate_mission_created` - When a new mission is created
- `climate_mission_status_updated` - When mission status changes
- `climate_missions_bootstrapped` - When starter missions are created

## How to Use

### Apply Schema Updates

1. Go to your Supabase project SQL Editor
2. Copy the contents of `supabase/SUPABASE_SCHEMA_V1_FULL.sql`
3. Paste and click Run
4. The script will add new columns if they don't exist

### Create Starter Missions

1. Log in to Climate OS at `/climate`
2. Create a profile if you don't have one
3. Click "Create Starter Missions" button
4. 4 starter missions will be created for your tenant

### View Journal Entries

Navigate to `/journal` to see automatic entries for:
- Profile creation and updates
- Mission creation and status changes
- Starter missions bootstrap

## Known Limitations

- Impact estimates are rough placeholders (not scientifically calculated)
- No profile editing UI yet (only creation)
- No mission due date UI yet (field exists but not exposed)
- Journal entries use `system_event` category (no dedicated climate category)

## Next Steps (Iteration 0012+)

1. **Profile Editing** - Add UI to edit existing profile fields
2. **Mission Due Dates** - Add due date picker to mission creation form
3. **Impact Calculator** - More accurate CO2 impact estimates based on profile data
4. **Progress Visualization** - Charts and graphs for climate progress over time
5. **Mission Templates** - More starter mission categories and templates
6. **Notifications** - Reminders for missions approaching due date

## Files Changed

- `supabase/SUPABASE_SCHEMA_V1_FULL.sql` - Schema version 1.1.0
- `workers/api/src/types.ts` - Extended TypeScript types
- `workers/api/src/handlers/profiles.ts` - Profile handlers with journal integration
- `workers/api/src/handlers/missions.ts` - Mission handlers with bootstrap endpoint
- `workers/api/src/lib/journal.ts` - New journal helper module
- `workers/api/src/__tests__/missions.test.ts` - New test file
- `frontend/src/lib/types.ts` - Extended frontend types
- `frontend/src/lib/api.ts` - Added bootstrap function
- `frontend/src/app/climate/page.tsx` - Richer UI with dashboard and bootstrap
