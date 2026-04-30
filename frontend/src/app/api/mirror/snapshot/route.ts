import { NextRequest, NextResponse } from 'next/server';
import { getMirrorWorkspaceSnapshot, isMirrorStoreEnabled } from '@/lib/valhalla/mirror/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? 'founder';
  const chatSessionId = searchParams.get('chatSessionId');
  const swarmJobId = searchParams.get('swarmJobId');

  if (!isMirrorStoreEnabled()) {
    return NextResponse.json({
      source: 'seed',
      sessions: [],
      plannerItems: [],
      files: [],
      resources: [],
      events: [],
    });
  }

  const snapshot = await getMirrorWorkspaceSnapshot({
    userId,
    chatSessionId,
    swarmJobId,
  });

  return NextResponse.json({
    source: 'database',
    sessions: snapshot?.sessions ?? [],
    plannerItems: snapshot?.plannerItems ?? [],
    files: snapshot?.files ?? [],
    resources: snapshot?.resources ?? [],
    events: snapshot?.events ?? [],
  });
}
