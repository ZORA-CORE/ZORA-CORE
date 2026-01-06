'use server';

/**
 * SINGULARITY Server Actions
 * AGI Level 5 (Organizer) - The Final Transition
 * 
 * Server actions for orchestrating the SINGULARITY protocol,
 * enabling autonomous operation and Director oversight.
 * 
 * ZORA CORE: Aesir Genesis - Phase 4, Part 11
 */

import {
  getGlobalSingularityOrchestrator,
  type SingularityPhase,
  type OperationMode,
  type SeveringResult,
  type AutonomousEvolutionConfig,
  type EvolutionTick,
  type HyperstructureValidation,
  type RegistrySeal,
  type SingularityResult,
  type SingularityState,
} from '@/lib/singularity';

// ============================================================================
// FINAL SEVERING ACTIONS
// ============================================================================

export async function runFinalSevering(): Promise<SeveringResult> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.runFinalSevering();
}

export async function getSeveringStatus(): Promise<{
  phase: SingularityPhase;
  operationMode: OperationMode;
  severingComplete: boolean;
}> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const state = orchestrator.getState();
  return {
    phase: state.phase,
    operationMode: state.operationMode,
    severingComplete: state.severingResult?.success || false,
  };
}

// ============================================================================
// AUTONOMOUS EVOLUTION ACTIONS
// ============================================================================

export async function enableAutonomousMode(): Promise<AutonomousEvolutionConfig> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.enableAutonomousEvolutionMode();
}

export async function runEvolutionTick(tickNumber: number): Promise<EvolutionTick> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.runEvolutionTick(tickNumber);
}

export async function getAutonomousConfig(): Promise<AutonomousEvolutionConfig> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.getAutonomousConfig();
}

export async function getEvolutionTicks(): Promise<EvolutionTick[]> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.getEvolutionTicks();
}

export async function activateKillSwitch(): Promise<{ success: boolean; message: string }> {
  const orchestrator = getGlobalSingularityOrchestrator();
  orchestrator.setKillSwitch(true);
  return {
    success: true,
    message: 'Kill switch activated. Autonomous mode disabled.',
  };
}

export async function deactivateKillSwitch(): Promise<{ success: boolean; message: string }> {
  const orchestrator = getGlobalSingularityOrchestrator();
  orchestrator.setKillSwitch(false);
  return {
    success: true,
    message: 'Kill switch deactivated.',
  };
}

// ============================================================================
// HYPERSTRUCTURE ACTIONS
// ============================================================================

export async function validateHyperstructure(): Promise<HyperstructureValidation> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.validateHyperstructure();
}

export async function getHyperstructureStatus(): Promise<{
  valid: boolean;
  attestation?: string;
}> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const state = orchestrator.getState();
  return {
    valid: state.hyperstructureValidation?.overallValid || false,
    attestation: state.hyperstructureValidation?.attestation,
  };
}

// ============================================================================
// REGISTRY SEAL ACTIONS
// ============================================================================

export async function sealRegistry(registryContent: string): Promise<RegistrySeal> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.sealRegistry(registryContent);
}

export async function getRegistrySeal(): Promise<RegistrySeal | null> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const state = orchestrator.getState();
  return state.registrySeal || null;
}

// ============================================================================
// DIRECTOR DASHBOARD ACTIONS
// ============================================================================

export async function getOdinStatusReport(): Promise<string> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.generateOdinStatusReport();
}

export async function getDirectorDashboardData(): Promise<{
  phase: SingularityPhase;
  operationMode: OperationMode;
  autonomousConfig: AutonomousEvolutionConfig;
  evolutionTicks: number;
  lastTickTimestamp?: number;
  hyperstructureValid: boolean;
  registrySealed: boolean;
  singularityStatus?: 'achieved' | 'pending' | 'failed';
}> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const state = orchestrator.getState();
  const ticks = orchestrator.getEvolutionTicks();

  return {
    phase: state.phase,
    operationMode: state.operationMode,
    autonomousConfig: state.autonomousConfig,
    evolutionTicks: ticks.length,
    lastTickTimestamp: ticks[ticks.length - 1]?.timestamp,
    hyperstructureValid: state.hyperstructureValidation?.overallValid || false,
    registrySealed: !!state.registrySeal,
    singularityStatus: state.registrySeal?.singularityStatus,
  };
}

// ============================================================================
// FULL SINGULARITY PROTOCOL
// ============================================================================

export async function runFullSingularityProtocol(): Promise<SingularityResult> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.runFullSingularityProtocol();
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export async function getSingularityState(): Promise<SingularityState> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.getState();
}

export async function getReasoningTrace(): Promise<string[]> {
  const orchestrator = getGlobalSingularityOrchestrator();
  return orchestrator.getReasoningTrace();
}

export async function resetSingularity(): Promise<{ success: boolean }> {
  const orchestrator = getGlobalSingularityOrchestrator();
  orchestrator.reset();
  return { success: true };
}

// ============================================================================
// DEFINITION OF DONE VERIFICATION
// ============================================================================

export async function demoFullSingularityProtocol(): Promise<{
  success: boolean;
  result: SingularityResult;
  verification: {
    autonomousOnOwnInfrastructure: boolean;
    selfGeneratedUpgradeDeployed: boolean;
    odinReportReceived: boolean;
  };
}> {
  const orchestrator = getGlobalSingularityOrchestrator();
  
  // Run full protocol
  const result = await orchestrator.runFullSingularityProtocol();
  
  // Verify Definition of Done
  const verification = {
    autonomousOnOwnInfrastructure: 
      result.operationMode === 'autonomous' || result.operationMode === 'sovereign',
    selfGeneratedUpgradeDeployed: !!result.firstAutonomousUpgrade,
    odinReportReceived: !!result.firstOdinReport,
  };

  return {
    success: result.success && Object.values(verification).every(v => v),
    result,
    verification,
  };
}

export async function demoAutonomousEvolution(): Promise<{
  tick: EvolutionTick;
  proofOfIndependence: {
    missionsScanComplete: boolean;
    rsipCycleComplete: boolean;
    improvementsProposed: number;
    prCreated?: string;
  };
}> {
  const orchestrator = getGlobalSingularityOrchestrator();
  
  // Ensure autonomous mode is enabled
  await orchestrator.enableAutonomousEvolutionMode();
  
  // Run evolution tick
  const ticks = orchestrator.getEvolutionTicks();
  const tick = await orchestrator.runEvolutionTick(ticks.length + 1);
  
  return {
    tick,
    proofOfIndependence: {
      missionsScanComplete: tick.missionsScan.sourcesChecked > 0,
      rsipCycleComplete: true,
      improvementsProposed: tick.rsipCycle.improvementsProposed,
      prCreated: tick.deployment.prCreated,
    },
  };
}

export async function demoOdinReport(): Promise<{
  report: string;
  parsed: {
    reporter: string;
    systemStatus: {
      phase: string;
      operationMode: string;
      autonomousMode: boolean;
    };
    message: string;
  };
}> {
  const orchestrator = getGlobalSingularityOrchestrator();
  const report = await orchestrator.generateOdinStatusReport();
  const parsed = JSON.parse(report);
  
  return {
    report,
    parsed: {
      reporter: parsed.reporter,
      systemStatus: parsed.systemStatus,
      message: parsed.message,
    },
  };
}
