/**
 * ODIN Status Report API Route Handler
 * Director's interface for receiving status reports from ODIN
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11 (SINGULARITY)
 */

import { NextResponse } from 'next/server';
import { getGlobalSingularityOrchestrator } from '@/lib/singularity';

export async function GET(): Promise<NextResponse> {
  try {
    const orchestrator = getGlobalSingularityOrchestrator();
    const report = await orchestrator.generateOdinStatusReport();
    const parsed = JSON.parse(report);

    return NextResponse.json({
      success: true,
      report: parsed,
      receivedAt: new Date().toISOString(),
      channel: 'sovereign',
    });

  } catch (error) {
    console.error('Failed to generate ODIN report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate ODIN report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
