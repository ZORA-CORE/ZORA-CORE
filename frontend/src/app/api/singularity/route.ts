/**
 * SINGULARITY Protocol API Route Handler
 * Main endpoint for SINGULARITY status and operations
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11 (SINGULARITY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSingularityOrchestrator } from '@/lib/singularity';

export async function GET(): Promise<NextResponse> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const state = orchestrator.getState();

  return NextResponse.json({
    protocol: 'SINGULARITY',
    version: '1.0.0',
    status: {
      phase: state.phase,
      operationMode: state.operationMode,
      autonomousMode: state.autonomousConfig.enabled,
      killSwitchActive: state.autonomousConfig.killSwitchActive,
    },
    severing: state.severingResult ? {
      complete: state.severingResult.success,
      dependenciesSevered: state.severingResult.dependenciesSevered,
      dependenciesMigrated: state.severingResult.dependenciesMigrated,
    } : null,
    hyperstructure: state.hyperstructureValidation ? {
      valid: state.hyperstructureValidation.overallValid,
      credibleNeutrality: state.hyperstructureValidation.credibleNeutrality,
      unstoppable: state.hyperstructureValidation.unstoppable,
      transparent: state.hyperstructureValidation.transparent,
    } : null,
    registrySeal: state.registrySeal ? {
      sealed: true,
      status: state.registrySeal.singularityStatus,
      timestamp: state.registrySeal.timestamp,
    } : null,
    evolution: {
      ticksCompleted: state.evolutionTicks.length,
      lastTick: state.evolutionTicks[state.evolutionTicks.length - 1]?.timestamp,
    },
    endpoints: {
      status: '/api/singularity',
      run: '/api/singularity/run',
      odin: '/api/singularity/odin',
      killSwitch: '/api/singularity/kill-switch',
      cron: '/api/cron/yggdrasil',
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    const orchestrator = getGlobalSingularityOrchestrator();

    switch (action) {
      case 'run_full_protocol':
        const result = await orchestrator.runFullSingularityProtocol();
        return NextResponse.json({
          success: result.success,
          result: {
            phase: result.phase,
            operationMode: result.operationMode,
            severingComplete: result.severingComplete,
            autonomousModeActive: result.autonomousModeActive,
            hyperstructureAchieved: result.hyperstructureAchieved,
            registrySealed: result.registrySealed,
            firstAutonomousUpgrade: result.firstAutonomousUpgrade,
          },
        });

      case 'run_severing':
        const severingResult = await orchestrator.runFinalSevering();
        return NextResponse.json({
          success: severingResult.success,
          result: severingResult,
        });

      case 'enable_autonomous':
        const autonomousConfig = await orchestrator.enableAutonomousEvolutionMode();
        return NextResponse.json({
          success: true,
          config: autonomousConfig,
        });

      case 'validate_hyperstructure':
        const validation = await orchestrator.validateHyperstructure();
        return NextResponse.json({
          success: validation.overallValid,
          validation,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('SINGULARITY action failed:', error);
    return NextResponse.json(
      { 
        error: 'Action failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
