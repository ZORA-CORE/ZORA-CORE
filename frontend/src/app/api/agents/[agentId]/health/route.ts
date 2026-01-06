/**
 * Agent Health Check API Route Handler
 * HEIMDALL monitoring endpoint for agent health
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11 (SINGULARITY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSovereignRuntime } from '@/lib/agents/runtime';
import type { AgentId } from '@/lib/agents/types';

const VALID_AGENTS: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { agentId } = await params;
  
  if (!VALID_AGENTS.includes(agentId as AgentId)) {
    return NextResponse.json(
      { error: `Unknown agent: ${agentId}` },
      { status: 404 }
    );
  }

  const runtime = getGlobalSovereignRuntime();
  const soul = runtime.getSoul(agentId as AgentId);
  const address = runtime.getDivineAddress(agentId as AgentId);
  const state = runtime.getState();

  const now = Date.now();
  const lastActivity = soul?.cognitiveState?.lastActivity || 0;
  const timeSinceActivity = now - lastActivity;

  // Health status determination
  let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (!soul) {
    healthStatus = 'unhealthy';
  } else if (timeSinceActivity > 3600000) { // 1 hour
    healthStatus = 'degraded';
  }

  return NextResponse.json({
    agentId,
    timestamp: now,
    health: {
      status: healthStatus,
      soulLoaded: !!soul,
      divineAddressActive: address?.status === 'active',
      runtimePhase: state.phase,
    },
    metrics: {
      lastActivity,
      timeSinceActivity,
      incarnationCount: soul?.incarnationCount || 0,
      confidence: soul?.cognitiveState?.confidence || 0,
      activeReasoningPaths: soul?.cognitiveState?.activeReasoningPaths || 0,
    },
    endpoints: {
      invoke: `/api/agents/${agentId}`,
      soul: `/api/agents/${agentId}/soul`,
      health: `/api/agents/${agentId}/health`,
    },
  });
}
