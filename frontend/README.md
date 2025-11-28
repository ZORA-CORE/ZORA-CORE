# ZORA CORE Frontend

This is the Next.js frontend for ZORA CORE, the climate-first AI operating system.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file with the API base URL:

```bash
# .env.local
NEXT_PUBLIC_ZORA_API_BASE_URL=http://localhost:8787
```

For production, set this to your deployed Workers API URL.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/dashboard` | Main dashboard with agents and tasks |
| `/agents` | ZORA Agent Family details |
| `/climate` | Climate OS - profiles and missions |
| `/journal` | ZORA Journal - system events |

## API Client

The frontend uses a typed API client to communicate with the ZORA CORE Workers API.

### Configuration

The API client reads the base URL from the `NEXT_PUBLIC_ZORA_API_BASE_URL` environment variable. If not set, it defaults to `http://localhost:8787`.

### Location

```
src/lib/
├── api.ts      # API client with typed functions
└── types.ts    # TypeScript types for API responses
```

### Available Functions

```typescript
import {
  getStatus,
  getClimateProfiles,
  getClimateProfile,
  createClimateProfile,
  updateClimateProfile,
  getClimateMissions,
  createClimateMission,
  updateMissionStatus,
  getJournalEntries,
} from '@/lib/api';

// Get API status
const status = await getStatus();

// Climate Profiles
const profiles = await getClimateProfiles({ limit: 10, offset: 0 });
const profile = await getClimateProfile('profile-id');
const newProfile = await createClimateProfile({ name: 'My Profile', profile_type: 'person' });
const updated = await updateClimateProfile('profile-id', { name: 'Updated Name' });

// Climate Missions
const missions = await getClimateMissions('profile-id', { limit: 10 });
const newMission = await createClimateMission('profile-id', {
  title: 'Switch to renewable energy',
  category: 'energy',
  impact_estimate: { co2_kg: 500 },
});
const updatedMission = await updateMissionStatus('mission-id', { status: 'completed' });

// Journal Entries
const entries = await getJournalEntries({ limit: 20, offset: 0 });
```

### Error Handling

The API client throws `ZoraApiError` for non-2xx responses:

```typescript
import { ZoraApiError } from '@/lib/api';

try {
  const profile = await getClimateProfile('invalid-id');
} catch (err) {
  if (err instanceof ZoraApiError) {
    console.error(`API Error: ${err.message} (${err.status})`);
  }
}
```

### Types

All API responses are fully typed. Import types from `@/lib/types`:

```typescript
import type {
  ClimateProfile,
  ClimateMission,
  JournalEntry,
  MissionStatus,
  ProfileType,
  JournalCategory,
} from '@/lib/types';
```

## Development

### Build for Production

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Type Check

```bash
npm run build  # Includes type checking
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [ZORA CORE Developer Setup](../docs/DEVELOPER_SETUP.md)
- [Workers API Documentation](../workers/api/README.md)

---

*ZORA CORE Frontend - Iteration 0004*
