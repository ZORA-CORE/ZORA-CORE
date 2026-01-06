/**
 * Divine Address API Route Handler
 * Sovereign Runtime Endpoint for Agent Invocation
 * 
 * This route enables agents to receive and process tasks via their
 * Divine Addresses (mesh://{agent}.asgard.zora) without Devin dependency.
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11 (SINGULARITY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getGlobalSovereignRuntime,
  type CognitiveTask,
} from '@/lib/agents/runtime';
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
      { error: `Unknown agent: ${agentId}`, validAgents: VALID_AGENTS },
      { status: 404 }
    );
  }

  const runtime = getGlobalSovereignRuntime();
  const address = runtime.getDivineAddress(agentId as AgentId);
  const soul = runtime.getSoul(agentId as AgentId);

  return NextResponse.json({
    agentId,
    divineAddress: address,
    meshAddress: `mesh://${agentId}.asgard.zora`,
    status: soul ? 'awakened' : 'dormant',
    soul: soul ? {
      name: soul.name,
      role: soul.role,
      domain: soul.domain,
      lastAwakening: soul.lastAwakening,
      incarnationCount: soul.incarnationCount,
    } : null,
    endpoints: {
      invoke: `/api/agents/${agentId}`,
      soul: `/api/agents/${agentId}/soul`,
      health: `/api/agents/${agentId}/health`,
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
      { error: `Unknown agent: ${agentId}`, validAgents: VALID_AGENTS },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { type, payload, priority, requester, fluidCompute } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Task type is required' },
        { status: 400 }
      );
    }

    const task: CognitiveTask = {
      id: `task_${agentId}_${Date.now()}`,
      type,
      payload: payload || {},
      priority: priority || 'normal',
      requester: requester || 'human',
      maxThinkingTime: fluidCompute?.maxThinkingTime || undefined,
      requiresFluidCompute: !!fluidCompute,
    };

    const runtime = getGlobalSovereignRuntime();

    // Ensure agent soul is loaded
    let soul = runtime.getSoul(agentId as AgentId);
    if (!soul) {
      await runtime.performSoulRetrieval(agentId as AgentId);
      soul = runtime.getSoul(agentId as AgentId);
    }

    // Execute task with or without Fluid Compute
    let result;
    if (fluidCompute) {
      result = await runtime.executeWithFluidCompute(
        agentId as AgentId,
        task
      );
    } else {
      result = await runtime.invokeAgent(agentId as AgentId, task);
    }

    return NextResponse.json({
      success: result.status === 'success',
      agentId,
      taskId: task.id,
      result: result.result,
      executionTime: result.duration,
      reasoningTrace: result.reasoningTrace,
      fluidCompute: fluidCompute ? {
        enabled: true,
        checkpointsCreated: result.checkpointsUsed,
      } : undefined,
    });

  } catch (error) {
    console.error(`Error invoking agent ${agentId}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to invoke agent',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
