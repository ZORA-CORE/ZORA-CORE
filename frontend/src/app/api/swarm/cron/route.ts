/**
 * Valhalla AI — Master Protocol PR 3: The Pulse (`/api/swarm/cron`).
 *
 * Vercel Cron target (runs every 12h per `vercel.json`). ODIN reads
 * the AST summary from Supabase, emits a capped list of tech-debt
 * findings, and persists them to `valhalla_tech_debt`.
 *
 * Gating:
 *   * Master flag `VALHALLA_PULSE=1` must be set — otherwise returns
 *     503 so operators can ship this route dark until ready.
 *   * Vercel Cron requests carry `Authorization: Bearer ${CRON_SECRET}`.
 *     When CRON_SECRET is set we enforce it; when unset we accept all
 *     invocations (useful for local testing). In production CRON_SECRET
 *     is REQUIRED and Vercel rotates it automatically for cron jobs.
 *
 * Runtime: Node (Anthropic SDK is not Edge-compatible).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAstSummary,
  insertTechDebt,
  isSingularityStoreEnabled,
} from '@/lib/valhalla/singularity/store';
import { runPulseSweep } from '@/lib/valhalla/singularity/pulse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isPulseEnabled(): boolean {
  const raw = process.env.VALHALLA_PULSE ?? '';
  return raw === '1' || raw.toLowerCase() === 'true';
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // deliberately permissive when unconfigured
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!isPulseEnabled()) {
    return NextResponse.json(
      {
        error:
          'The Pulse is disabled. Set VALHALLA_PULSE=1 to enable the 12h tech-debt sweep.',
      },
      { status: 503 },
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSingularityStoreEnabled()) {
    return NextResponse.json(
      { error: 'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 },
    );
  }

  const repo = process.env.VALHALLA_REPO_NAME || 'ZORA-CORE/ZORA-CORE';
  const startedAt = Date.now();

  try {
    const summary = await fetchAstSummary(repo);
    if (summary.nodeCount === 0) {
      return NextResponse.json(
        {
          ok: true,
          repo,
          note:
            'AST graph is empty — the ast-index workflow has not yet populated it. Skipping sweep.',
          summary,
          durationMs: Date.now() - startedAt,
        },
        { status: 200 },
      );
    }

    const result = await runPulseSweep(repo, summary);
    const inserted = await insertTechDebt(result.findings);

    return NextResponse.json(
      {
        ok: true,
        repo,
        inserted,
        healthSummary: result.healthSummary,
        findings: result.findings,
        usage: result.usage,
        durationMs: Date.now() - startedAt,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message, durationMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
