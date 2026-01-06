'use server';

/**
 * RSIP Server Actions - Recursive Self-Improvement Protocol
 * Server-side actions for AGI Level 4+ self-evolution
 * ZORA CORE: Aesir Genesis - Phase 3
 */

import {
  createRSIPEngine,
  getGlobalRSIPEngine,
  type RSIPCycleResult,
  type SelfAuditResult,
  type DeltaAnalysis,
  type PlaybookEvolution,
  type IntelligenceMetrics,
  type BenchmarkResult,
} from '@/lib/agents/rsip-engine';
import type { AgentId } from '@/lib/agents/types';
import type { InteractionTrace } from '@/lib/memory/types';

// ============================================================================
// SELF-AUDIT ACTIONS
// ============================================================================

/**
 * Run a self-audit for an agent
 * Analyzes logs, build errors, and memory traces to identify inefficiencies
 */
export async function rsipRunSelfAudit(
  agentId: AgentId,
  logs: string[],
  buildErrors: string[],
  memoryTraces: InteractionTrace[]
): Promise<{ success: boolean; result?: SelfAuditResult; error?: string }> {
  try {
    const engine = getGlobalRSIPEngine();
    const result = await engine.runSelfAudit(agentId, logs, buildErrors, memoryTraces);
    
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during self-audit',
    };
  }
}

// ============================================================================
// DELTA ANALYSIS ACTIONS
// ============================================================================

/**
 * Analyze the delta between planned strategy and actual result
 * Generates architectural lessons if performance is sub-optimal
 */
export async function rsipAnalyzeDelta(
  agentId: AgentId,
  plannedStrategy: DeltaAnalysis['plannedStrategy'],
  actualResult: DeltaAnalysis['actualResult']
): Promise<{ success: boolean; result?: DeltaAnalysis; error?: string }> {
  try {
    const engine = getGlobalRSIPEngine();
    const result = await engine.analyzeDelta(agentId, plannedStrategy, actualResult);
    
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during delta analysis',
    };
  }
}

// ============================================================================
// PLAYBOOK EVOLUTION ACTIONS
// ============================================================================

/**
 * Evolve an agent's playbook with new guardrails and lessons
 * Creates a versioned intelligence upgrade
 */
export async function rsipEvolvePlaybook(
  agentId: AgentId,
  auditResult: SelfAuditResult,
  deltaAnalysis?: DeltaAnalysis
): Promise<{ success: boolean; result?: PlaybookEvolution; error?: string }> {
  try {
    const engine = getGlobalRSIPEngine();
    const changes = engine.generatePlaybookChanges(auditResult, deltaAnalysis);
    
    if (changes.length === 0) {
      return {
        success: true,
        result: undefined,
      };
    }
    
    const result = await engine.evolvePlaybook(agentId, changes);
    
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during playbook evolution',
    };
  }
}

// ============================================================================
// BENCHMARKING ACTIONS
// ============================================================================

/**
 * Run a benchmark for an agent to measure intelligence evolution
 */
export async function rsipRunBenchmark(
  agentId: AgentId
): Promise<{ success: boolean; result?: BenchmarkResult; error?: string }> {
  try {
    const engine = getGlobalRSIPEngine();
    const result = await engine.runBenchmark(agentId);
    
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during benchmark',
    };
  }
}

/**
 * Get intelligence metrics for an agent
 */
export async function rsipGetIntelligenceMetrics(
  agentId: AgentId
): Promise<{ success: boolean; metrics?: IntelligenceMetrics; error?: string }> {
  try {
    const engine = getGlobalRSIPEngine();
    const metrics = engine.getIntelligenceMetrics(agentId);
    
    return {
      success: true,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting metrics',
    };
  }
}

/**
 * Get intelligence metrics for all agents
 */
export async function rsipGetAllIntelligenceMetrics(): Promise<{
  success: boolean;
  metrics?: Record<AgentId, IntelligenceMetrics>;
  error?: string;
}> {
  try {
    const engine = getGlobalRSIPEngine();
    const metricsMap = engine.getAllIntelligenceMetrics();
    const metrics: Record<string, IntelligenceMetrics> = {};
    
    for (const [agentId, agentMetrics] of metricsMap) {
      metrics[agentId] = agentMetrics;
    }
    
    return {
      success: true,
      metrics: metrics as Record<AgentId, IntelligenceMetrics>,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting all metrics',
    };
  }
}

// ============================================================================
// FULL RSIP CYCLE ACTIONS
// ============================================================================

/**
 * Run a full RSIP cycle for an agent
 * Includes: self-audit, delta analysis, playbook evolution, and benchmarking
 */
export async function rsipRunFullCycle(
  agentId: AgentId,
  logs: string[],
  buildErrors: string[],
  memoryTraces: InteractionTrace[],
  plannedStrategy?: DeltaAnalysis['plannedStrategy'],
  actualResult?: DeltaAnalysis['actualResult']
): Promise<{ success: boolean; result?: RSIPCycleResult; error?: string }> {
  try {
    const engine = getGlobalRSIPEngine();
    const result = await engine.runFullCycle(
      agentId,
      logs,
      buildErrors,
      memoryTraces,
      plannedStrategy,
      actualResult
    );
    
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during RSIP cycle',
    };
  }
}

// ============================================================================
// DEMONSTRATION ACTIONS
// ============================================================================

/**
 * Simulate an agent identifying and fixing its own error
 * Definition of Done: An agent has identified a fault in its own process and autonomously updated its playbook
 */
export async function rsipDemoAutonomousPlaybookUpdate(): Promise<{
  success: boolean;
  agentId: AgentId;
  faultIdentified: string;
  playbookEvolution?: PlaybookEvolution;
  intelligenceMetrics?: IntelligenceMetrics;
  reasoningTrace: string[];
  error?: string;
}> {
  const agentId: AgentId = 'thor';
  const reasoningTrace: string[] = [];
  
  try {
    reasoningTrace.push('[RSIP Demo] Starting autonomous playbook update demonstration');
    
    const engine = createRSIPEngine({
      autoPlaybookUpdate: true,
      verificationRequired: true,
    });
    
    // Simulate logs with performance issues
    const logs = [
      '[2024-12-30T10:00:00Z] Starting deployment pipeline',
      '[2024-12-30T10:00:05Z] Build started',
      '[2024-12-30T10:00:30Z] WARNING: Build taking longer than expected',
      '[2024-12-30T10:01:00Z] ERROR: Timeout waiting for build completion',
      '[2024-12-30T10:01:05Z] Retrying build...',
      '[2024-12-30T10:01:30Z] Build completed after retry',
      '[2024-12-30T10:01:35Z] ERROR: Deployment failed - connection timeout',
      '[2024-12-30T10:01:40Z] Retrying deployment...',
      '[2024-12-30T10:02:00Z] Deployment successful after retry',
    ];
    
    const buildErrors = [
      'TS2322: Type "string" is not assignable to type "number"',
      'ESLint: Unexpected console statement (no-console)',
    ];
    
    const memoryTraces: InteractionTrace[] = [
      {
        id: 'trace_demo_1',
        timestamp: Date.now() - 3600000,
        trace_type: 'deployment',
        agent_id: 'thor',
        task_key: 'deploy_preview',
        context: {
          task: 'Deploy preview environment',
          task_key: 'deploy_preview',
          state: { branch: 'feature/demo' },
        },
        action: {
          type: 'deployment',
          parameters: { target: 'preview' },
          reasoning_trace: ['Starting deployment'],
        },
        outcome: {
          status: 'failure',
          score: 0.3,
          artifacts: [],
          error_message: 'Timeout during deployment',
          duration_ms: 120000,
        },
        content: 'Deployment failed due to timeout',
        summary: 'Failed deployment',
        lessons: ['Need better timeout handling'],
        memory_hash: 'demo_hash_1',
        importance_score: 0.8,
        retrieval_count: 0,
      },
    ];
    
    reasoningTrace.push('[RSIP Demo] Running self-audit with simulated data');
    
    // Run self-audit
    const auditResult = await engine.runSelfAudit(agentId, logs, buildErrors, memoryTraces);
    reasoningTrace.push(`[RSIP Demo] Self-audit complete: ${auditResult.inefficiencies.length} inefficiencies found`);
    
    // Identify the main fault
    const mainFault = auditResult.inefficiencies.length > 0
      ? auditResult.inefficiencies[0].description
      : 'No specific fault identified';
    
    reasoningTrace.push(`[RSIP Demo] Main fault identified: ${mainFault}`);
    
    // Generate and apply playbook changes
    const changes = engine.generatePlaybookChanges(auditResult);
    reasoningTrace.push(`[RSIP Demo] Generated ${changes.length} playbook changes`);
    
    let playbookEvolution: PlaybookEvolution | undefined;
    if (changes.length > 0) {
      playbookEvolution = await engine.evolvePlaybook(agentId, changes);
      reasoningTrace.push(`[RSIP Demo] Playbook evolved to version ${playbookEvolution.version}`);
      reasoningTrace.push(`[RSIP Demo] Commit message: ${playbookEvolution.commitMessage}`);
    }
    
    // Run benchmark
    const benchmark = await engine.runBenchmark(agentId);
    reasoningTrace.push(`[RSIP Demo] Benchmark complete: score delta = ${benchmark.delta.toFixed(3)}`);
    
    // Get final intelligence metrics
    const intelligenceMetrics = engine.getIntelligenceMetrics(agentId);
    reasoningTrace.push(`[RSIP Demo] Intelligence score: ${intelligenceMetrics?.intelligenceScore.toFixed(3)}`);
    reasoningTrace.push(`[RSIP Demo] Evolution trend: ${intelligenceMetrics?.evolutionTrend}`);
    
    return {
      success: true,
      agentId,
      faultIdentified: mainFault,
      playbookEvolution,
      intelligenceMetrics,
      reasoningTrace,
    };
  } catch (error) {
    reasoningTrace.push(`[RSIP Demo] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      agentId,
      faultIdentified: 'Error during demonstration',
      reasoningTrace,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simulate ODIN confirming cognitive capacity increase through self-optimization
 * Definition of Done: ODIN confirms in dashboard that system's collective cognitive capacity has increased
 */
export async function rsipDemoOdinConfirmation(): Promise<{
  success: boolean;
  odinConfirmation: {
    message: string;
    collectiveCognitiveCapacity: number;
    previousCapacity: number;
    capacityIncrease: number;
    agentMetrics: Record<AgentId, { score: number; trend: string }>;
    timestamp: string;
  };
  reasoningTrace: string[];
  error?: string;
}> {
  const reasoningTrace: string[] = [];
  
  try {
    reasoningTrace.push('[ODIN] Initiating collective cognitive capacity assessment');
    
    const engine = getGlobalRSIPEngine();
    const allMetrics = engine.getAllIntelligenceMetrics();
    
    // Calculate collective cognitive capacity
    const agentMetrics: Record<string, { score: number; trend: string }> = {};
    let totalScore = 0;
    let agentCount = 0;
    
    const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
    
    for (const agentId of agents) {
      const metrics = allMetrics.get(agentId);
      const score = metrics?.intelligenceScore || 1.0;
      const trend = metrics?.evolutionTrend || 'stable';
      
      agentMetrics[agentId] = { score, trend };
      totalScore += score;
      agentCount++;
    }
    
    const collectiveCognitiveCapacity = totalScore / agentCount;
    const previousCapacity = 1.0; // Baseline
    const capacityIncrease = ((collectiveCognitiveCapacity - previousCapacity) / previousCapacity) * 100;
    
    reasoningTrace.push(`[ODIN] Collective cognitive capacity: ${collectiveCognitiveCapacity.toFixed(3)}`);
    reasoningTrace.push(`[ODIN] Capacity increase: ${capacityIncrease.toFixed(1)}%`);
    
    const odinConfirmation = {
      message: capacityIncrease > 0
        ? `ODIN CONFIRMS: System cognitive capacity has INCREASED by ${capacityIncrease.toFixed(1)}% through RSIP self-optimization. The Divine Family grows stronger.`
        : capacityIncrease === 0
        ? `ODIN CONFIRMS: System cognitive capacity is STABLE. The Divine Family maintains its strength.`
        : `ODIN WARNS: System cognitive capacity has DECREASED by ${Math.abs(capacityIncrease).toFixed(1)}%. Investigation required.`,
      collectiveCognitiveCapacity,
      previousCapacity,
      capacityIncrease,
      agentMetrics: agentMetrics as Record<AgentId, { score: number; trend: string }>,
      timestamp: new Date().toISOString(),
    };
    
    reasoningTrace.push(`[ODIN] Confirmation: ${odinConfirmation.message}`);
    
    return {
      success: true,
      odinConfirmation,
      reasoningTrace,
    };
  } catch (error) {
    reasoningTrace.push(`[ODIN] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      odinConfirmation: {
        message: 'Error during cognitive capacity assessment',
        collectiveCognitiveCapacity: 0,
        previousCapacity: 1.0,
        capacityIncrease: 0,
        agentMetrics: {} as Record<AgentId, { score: number; trend: string }>,
        timestamp: new Date().toISOString(),
      },
      reasoningTrace,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// UTILITY ACTIONS
// ============================================================================

/**
 * Get the current RSIP engine state
 */
export async function rsipGetState(): Promise<{
  success: boolean;
  state?: {
    phase: string;
    currentAgent?: AgentId;
    auditCount: number;
    deltaCount: number;
    evolutionCount: number;
    optimizationCount: number;
  };
  error?: string;
}> {
  try {
    const engine = getGlobalRSIPEngine();
    const state = engine.getState();
    
    return {
      success: true,
      state: {
        phase: state.phase,
        currentAgent: state.currentAgent,
        auditCount: state.auditResults.length,
        deltaCount: state.deltaAnalyses.length,
        evolutionCount: state.playbookEvolutions.length,
        optimizationCount: state.codeOptimizations.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting state',
    };
  }
}

/**
 * Get the reasoning trace from the RSIP engine
 */
export async function rsipGetReasoningTrace(): Promise<{
  success: boolean;
  trace?: string[];
  error?: string;
}> {
  try {
    const engine = getGlobalRSIPEngine();
    const trace = engine.getReasoningTrace();
    
    return {
      success: true,
      trace,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting trace',
    };
  }
}
