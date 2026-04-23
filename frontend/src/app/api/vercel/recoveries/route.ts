/**
 * Valhalla AI — list recent Vercel self-recovery events.
 *
 * The chat UI polls this every few seconds while the Forge is open so
 * the user can see when a production deploy fails and the swarm starts
 * drafting a repair patch. See
 *   src/app/api/vercel/webhook/route.ts
 * for the ingestion side.
 */

import { listRecoveries } from '@/lib/vercel-recovery-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const events = listRecoveries(20);
  return new Response(
    JSON.stringify({ ok: true, events }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
