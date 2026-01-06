/**
 * Soul Retrieval API Route Handler
 * Enables agents to awaken from cold start via Divine Addresses
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

  if (!soul) {
    return NextResponse.json({
      agentId,
      status: 'dormant',
      message: 'Soul not loaded. POST to this endpoint to perform Soul Retrieval.',
    });
  }

  return NextResponse.json({
    agentId,
    status: 'awakened',
    soul: {
      name: soul.name,
      role: soul.role,
      domain: soul.domain,
      playbookHash: soul.playbookHash,
      memoryHash: soul.memoryHash,
      lastAwakening: soul.lastAwakening,
      incarnationCount: soul.incarnationCount,
      cognitiveState: soul.cognitiveState,
    },
  });
}

export async function POST(
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

  try {
    const runtime = getGlobalSovereignRuntime();
    const result = await runtime.performSoulRetrieval(agentId as AgentId);

    return NextResponse.json({
      agentId,
      success: result.success,
      soulRetrieval: {
        playbookRetrieved: result.playbookRetrieved,
        memoryRehydrated: result.memoryRehydrated,
        checkpointsRestored: result.checkpointsRestored,
        awakeningTime: result.awakeningTime,
      },
      soul: result.soul ? {
        name: result.soul.name,
        role: result.soul.role,
        domain: result.soul.domain,
        playbookHash: result.soul.playbookHash,
        memoryHash: result.soul.memoryHash,
        incarnationCount: result.soul.incarnationCount,
      } : null,
      reasoningTrace: result.reasoningTrace,
    });

  } catch (error) {
    console.error(`Error performing Soul Retrieval for ${agentId}:`, error);
    return NextResponse.json(
      { 
        error: 'Soul Retrieval failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
