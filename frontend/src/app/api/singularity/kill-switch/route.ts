/**
 * Kill Switch API Route Handler
 * Director's emergency control to pause autonomous operation
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11 (SINGULARITY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSingularityOrchestrator } from '@/lib/singularity';

export async function GET(): Promise<NextResponse> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const config = orchestrator.getAutonomousConfig();

  return NextResponse.json({
    killSwitchActive: config.killSwitchActive,
    autonomousModeEnabled: config.enabled,
    message: config.killSwitchActive 
      ? 'Kill switch is ACTIVE. Autonomous evolution is paused.'
      : 'Kill switch is inactive. Autonomous evolution is running normally.',
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { activate } = body;

    if (typeof activate !== 'boolean') {
      return NextResponse.json(
        { error: 'activate must be a boolean' },
        { status: 400 }
      );
    }

    const orchestrator = getGlobalSingularityOrchestrator();
    orchestrator.setKillSwitch(activate);

    const config = orchestrator.getAutonomousConfig();

    return NextResponse.json({
      success: true,
      killSwitchActive: config.killSwitchActive,
      autonomousModeEnabled: config.enabled,
      message: activate 
        ? 'Kill switch ACTIVATED. Autonomous evolution has been paused.'
        : 'Kill switch DEACTIVATED. Autonomous evolution can resume.',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Kill switch operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Kill switch operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
