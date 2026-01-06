/**
 * Yggdrasil Cron API Route Handler
 * Autonomous Evolution Tick Scheduler
 * 
 * This endpoint is called by Vercel Cron to run autonomous evolution ticks.
 * The Divine Family scans for climate missions, runs RSIP optimization,
 * and proposes/deploys improvements without human intervention.
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11 (SINGULARITY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSingularityOrchestrator } from '@/lib/singularity';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for cron jobs

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Verify cron authorization (Vercel sends this header)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const orchestrator = getGlobalSingularityOrchestrator();
    const config = orchestrator.getAutonomousConfig();

    // Check if autonomous mode is enabled
    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        message: 'Autonomous Evolution Mode is not enabled',
        config,
      });
    }

    // Check kill switch
    if (config.killSwitchActive) {
      return NextResponse.json({
        success: false,
        message: 'Kill switch is active. Autonomous evolution paused.',
        config,
      });
    }

    // Get current tick count
    const existingTicks = orchestrator.getEvolutionTicks();
    const tickNumber = existingTicks.length + 1;

    // Run evolution tick
    const tick = await orchestrator.runEvolutionTick(tickNumber);

    return NextResponse.json({
      success: true,
      tick: {
        id: tick.id,
        tickNumber: tick.tickNumber,
        timestamp: tick.timestamp,
        missionsScan: tick.missionsScan,
        rsipCycle: tick.rsipCycle,
        deployment: tick.deployment,
        healthCheck: tick.healthCheck,
      },
      summary: {
        missionsFound: tick.missionsScan.missionsFound,
        improvementsProposed: tick.rsipCycle.improvementsProposed,
        improvementsApplied: tick.rsipCycle.improvementsApplied,
        prCreated: tick.deployment.prCreated,
        systemHealthy: tick.healthCheck.allAgentsHealthy,
      },
    });

  } catch (error) {
    console.error('Yggdrasil evolution tick failed:', error);
    return NextResponse.json(
      { 
        error: 'Evolution tick failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Manual trigger for evolution tick (for testing/debugging)
  return GET(request);
}
