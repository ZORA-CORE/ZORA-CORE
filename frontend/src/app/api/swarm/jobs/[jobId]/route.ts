/**
 * Valhalla AI — Prometheus PR 1E: lightweight job-status endpoint.
 *
 * The chat client calls this as a final-fallback disambiguator if
 * the SSE replay stream gets cut by Vercel's 300 s ceiling and the
 * client's reconnect loop has exhausted its budget. If the job is
 * already terminal, the client treats the message as complete and
 * stops trying to reconnect — avoiding the "(Swarm finished without
 * a user-visible response.)" placeholder bubble we observed when
 * the watchdog completed a job server-side but the browser never
 * reconnected to the new stream.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/valhalla/jobs/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<Response> {
  const { jobId } = await ctx.params;
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId.' }, { status: 400 });
  }
  const job = await getJob(jobId).catch(() => null);
  if (!job) {
    return NextResponse.json({ error: 'Unknown jobId.' }, { status: 404 });
  }
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    currentStage: job.currentStage,
    lastHeartbeatAt: job.lastHeartbeatAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
  });
}
