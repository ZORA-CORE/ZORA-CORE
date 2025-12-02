// Release notes for ZORA CORE - displayed in "What's New" panel
// Update this file when releasing new iterations

export interface ReleaseNote {
  iteration: string;
  title: string;
  description: string;
  date: string;
  highlights: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    iteration: '0016',
    title: 'Deployment Fix & Version Info',
    description: 'Added visible version indicators so you can confirm which iteration is live.',
    date: '2025-01-28',
    highlights: [
      'Version info in footer shows frontend and API commit hashes',
      'System Status in /admin/setup shows detailed version info',
      'Documentation for verifying deployments in Vercel/Cloudflare UI',
    ],
  },
  {
    iteration: '0015',
    title: 'Climate OS v0.3 - Multi-Profile Support',
    description: 'Support for multiple profiles per tenant with individual, household, organization, and brand scopes.',
    date: '2025-01-27',
    highlights: [
      'Create and manage multiple climate profiles',
      'Profile scopes: individual, household, organization, brand',
      'Primary profile indicator and profile-scoped missions',
      'Organization-specific fields (name, sector, website, logo)',
    ],
  },
  {
    iteration: '0014',
    title: 'Automated Schema Sync',
    description: 'GitHub Actions workflow automatically syncs Supabase schema when you push to main.',
    date: '2025-01-26',
    highlights: [
      'No more manual SQL copy/paste to Supabase',
      'Schema syncs automatically on push to main',
      'Manual trigger available in GitHub Actions',
    ],
  },
  {
    iteration: '0013',
    title: 'Agent Autonomy Layer v0',
    description: 'BALDUR/TYR can now propose frontend config changes for your review.',
    date: '2025-01-25',
    highlights: [
      'Agents propose config changes instead of auto-applying',
      'Review and approve/reject suggestions in /admin/frontend/autonomy',
      'Journal entries track suggestion lifecycle',
    ],
  },
  {
    iteration: '0012',
    title: 'Frontend Config Layer v0',
    description: 'Config-driven UI allows customizing page layouts without code changes.',
    date: '2025-01-24',
    highlights: [
      'Edit /dashboard and /climate layout from /admin/frontend',
      'Toggle sections on/off, customize hero text',
      'Config changes logged to journal',
    ],
  },
];

// Get the latest N release notes
export function getLatestReleaseNotes(count: number = 3): ReleaseNote[] {
  return RELEASE_NOTES.slice(0, count);
}

// Get release note by iteration
export function getReleaseNoteByIteration(iteration: string): ReleaseNote | undefined {
  return RELEASE_NOTES.find((note) => note.iteration === iteration);
}
