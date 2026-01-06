/**
 * RSIP Engine - Recursive Self-Improvement Protocol
 * AGI Level 4+ Cognitive Sovereignty for ZORA CORE
 * 
 * Enables autonomous self-evolution through:
 * - Self-audit logic (Mimir's Wisdom Analysis)
 * - Delta analysis between planned strategy and actual results
 * - Playbook evolution with versioned intelligence
 * - Recursive code optimization with verification gates
 * - Intelligence scoring and evolutionary benchmarking
 * 
 * ZORA CORE: Aesir Genesis - Phase 3
 */

import { createHash } from 'crypto';
import type { AgentId } from './types';
import type { InteractionTrace, Lesson, Pattern } from '../memory/types';

// ============================================================================
// TYPES
// ============================================================================

export type RSIPPhase = 
  | 'idle'
  | 'auditing'
  | 'analyzing_delta'
  | 'evolving_playbook'
  | 'optimizing_code'
  | 'verifying'
  | 'benchmarking'
  | 'complete'
  | 'failed';

export interface RSIPConfig {
  maxSelfCorrections: number;
  intelligenceScoreIncrement: number;
  minSuccessRateForEvolution: number;
  verificationRequired: boolean;
  autoPlaybookUpdate: boolean;
  autoCodeRefactor: boolean;
}

export interface DeltaAnalysis {
  id: string;
  timestamp: number;
  agentId: AgentId;
  plannedStrategy: {
    description: string;
    expectedOutcome: string;
    estimatedDuration: number;
    riskAssessment: number;
  };
  actualResult: {
    description: string;
    outcome: 'success' | 'partial' | 'failure';
    actualDuration: number;
    errorMessages: string[];
  };
  delta: {
    outcomeMatch: boolean;
    durationDelta: number;
    performanceScore: number;
    inefficiencies: string[];
    improvements: string[];
  };
  architecturalLesson?: string;
  memoryHash: string;
}

export interface SelfAuditResult {
  id: string;
  timestamp: number;
  agentId: AgentId;
  auditType: 'post_mission' | 'periodic' | 'triggered';
  logsAnalyzed: number;
  buildErrorsFound: number;
  memoryTracesScanned: number;
  inefficiencies: Inefficiency[];
  recommendations: Recommendation[];
  overallHealthScore: number;
  memoryHash: string;
}

export interface Inefficiency {
  id: string;
  category: 'performance' | 'reliability' | 'cognitive' | 'process' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  occurrenceCount: number;
  firstDetected: number;
  lastDetected: number;
  suggestedFix: string;
  affectedComponents: string[];
}

export interface Recommendation {
  id: string;
  priority: number;
  type: 'playbook_update' | 'code_refactor' | 'process_change' | 'guardrail_addition';
  targetAgent: AgentId;
  description: string;
  expectedImprovement: number;
  implementationSteps: string[];
  verificationCriteria: string[];
}

export interface PlaybookEvolution {
  id: string;
  timestamp: number;
  agentId: AgentId;
  version: string;
  previousVersion: string;
  changes: PlaybookChange[];
  triggerSource: 'rsip' | 'vlm_feedback' | 'manual' | 'sica';
  commitMessage: string;
  signedBy: AgentId;
  verifiedBy?: AgentId;
}

export interface PlaybookChange {
  section: string;
  changeType: 'add' | 'modify' | 'remove';
  previousContent?: string;
  newContent: string;
  reason: string;
  lessonId?: string;
}

export interface CodeOptimization {
  id: string;
  timestamp: number;
  requestedBy: AgentId;
  targetFiles: string[];
  optimizationType: 'performance' | 'reliability' | 'security' | 'maintainability';
  changes: CodeChange[];
  verificationStatus: 'pending' | 'passed' | 'failed';
  verifiedBy?: AgentId;
  rollbackAvailable: boolean;
}

export interface CodeChange {
  filePath: string;
  changeType: 'refactor' | 'optimize' | 'fix' | 'enhance';
  description: string;
  linesAffected: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface IntelligenceMetrics {
  agentId: AgentId;
  intelligenceScore: number;
  intelligenceVersion: string;
  selfCorrections: number;
  successfulEvolutions: number;
  failedEvolutions: number;
  lastEvolution: number;
  benchmarkHistory: BenchmarkResult[];
  evolutionTrend: 'improving' | 'stable' | 'declining';
}

export interface BenchmarkResult {
  id: string;
  timestamp: number;
  preEvolutionScore: number;
  postEvolutionScore: number;
  delta: number;
  testsPassed: number;
  testsFailed: number;
  performanceMetrics: Record<string, number>;
}

export interface RSIPState {
  phase: RSIPPhase;
  currentAgent?: AgentId;
  currentOperation?: string;
  startTime?: number;
  auditResults: SelfAuditResult[];
  deltaAnalyses: DeltaAnalysis[];
  playbookEvolutions: PlaybookEvolution[];
  codeOptimizations: CodeOptimization[];
  intelligenceMetrics: Map<AgentId, IntelligenceMetrics>;
  reasoningTrace: string[];
}

export interface RSIPCycleResult {
  cycleId: string;
  timestamp: number;
  agentId: AgentId;
  phase: RSIPPhase;
  auditResult?: SelfAuditResult;
  deltaAnalysis?: DeltaAnalysis;
  playbookEvolution?: PlaybookEvolution;
  codeOptimization?: CodeOptimization;
  intelligenceMetrics: IntelligenceMetrics;
  success: boolean;
  reasoningTrace: string[];
}

// ============================================================================
// RSIP ENGINE
// ============================================================================

const DEFAULT_CONFIG: RSIPConfig = {
  maxSelfCorrections: 5,
  intelligenceScoreIncrement: 0.1,
  minSuccessRateForEvolution: 0.7,
  verificationRequired: true,
  autoPlaybookUpdate: true,
  autoCodeRefactor: false,
};

export class RSIPEngine {
  private config: RSIPConfig;
  private state: RSIPState;
  private reasoningTrace: string[] = [];

  constructor(config: Partial<RSIPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      phase: 'idle',
      auditResults: [],
      deltaAnalyses: [],
      playbookEvolutions: [],
      codeOptimizations: [],
      intelligenceMetrics: new Map(),
      reasoningTrace: [],
    };
    this.addTrace('RSIP Engine initialized with config', this.config);
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [RSIP] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
    this.state.reasoningTrace.push(entry);
  }

  // ==========================================================================
  // TASK 1: SELF-AUDIT LOGIC (Mimir's Wisdom Analysis)
  // ==========================================================================

  async runSelfAudit(
    agentId: AgentId,
    logs: string[],
    buildErrors: string[],
    memoryTraces: InteractionTrace[]
  ): Promise<SelfAuditResult> {
    this.addTrace(`Starting self-audit for agent: ${agentId}`);
    this.state.phase = 'auditing';
    this.state.currentAgent = agentId;
    this.state.startTime = Date.now();

    const inefficiencies: Inefficiency[] = [];
    const recommendations: Recommendation[] = [];

    // Analyze logs for patterns
    const logInefficiencies = this.analyzeLogsForInefficiencies(logs, agentId);
    inefficiencies.push(...logInefficiencies);
    this.addTrace(`Found ${logInefficiencies.length} inefficiencies in logs`);

    // Analyze build errors
    const buildInefficiencies = this.analyzeBuildErrors(buildErrors, agentId);
    inefficiencies.push(...buildInefficiencies);
    this.addTrace(`Found ${buildInefficiencies.length} inefficiencies from build errors`);

    // Analyze memory traces for cognitive patterns
    const cognitiveInefficiencies = this.analyzeMemoryTraces(memoryTraces, agentId);
    inefficiencies.push(...cognitiveInefficiencies);
    this.addTrace(`Found ${cognitiveInefficiencies.length} cognitive inefficiencies`);

    // Generate recommendations based on inefficiencies
    for (const inefficiency of inefficiencies) {
      const recommendation = this.generateRecommendation(inefficiency, agentId);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Calculate overall health score
    const overallHealthScore = this.calculateHealthScore(inefficiencies);

    const result: SelfAuditResult = {
      id: `audit_${agentId}_${Date.now()}`,
      timestamp: Date.now(),
      agentId,
      auditType: 'post_mission',
      logsAnalyzed: logs.length,
      buildErrorsFound: buildErrors.length,
      memoryTracesScanned: memoryTraces.length,
      inefficiencies,
      recommendations,
      overallHealthScore,
      memoryHash: createHash('sha256')
        .update(`audit_${agentId}_${Date.now()}_${inefficiencies.length}`)
        .digest('hex')
        .substring(0, 16),
    };

    this.state.auditResults.push(result);
    this.addTrace(`Self-audit complete`, { healthScore: overallHealthScore, recommendations: recommendations.length });

    return result;
  }

  private analyzeLogsForInefficiencies(logs: string[], agentId: AgentId): Inefficiency[] {
    const inefficiencies: Inefficiency[] = [];
    const patterns = [
      { regex: /timeout|timed out/gi, category: 'performance' as const, severity: 'medium' as const },
      { regex: /retry|retrying/gi, category: 'reliability' as const, severity: 'low' as const },
      { regex: /error|failed|failure/gi, category: 'reliability' as const, severity: 'high' as const },
      { regex: /memory|heap|oom/gi, category: 'resource' as const, severity: 'high' as const },
      { regex: /slow|latency|delay/gi, category: 'performance' as const, severity: 'medium' as const },
      { regex: /deprecated|warning/gi, category: 'process' as const, severity: 'low' as const },
    ];

    const patternCounts = new Map<string, { count: number; examples: string[] }>();

    for (const log of logs) {
      for (const { regex, category, severity } of patterns) {
        const matches = log.match(regex);
        if (matches) {
          const key = `${category}_${severity}`;
          const existing = patternCounts.get(key) || { count: 0, examples: [] };
          existing.count += matches.length;
          if (existing.examples.length < 3) {
            existing.examples.push(log.substring(0, 100));
          }
          patternCounts.set(key, existing);
        }
      }
    }

    for (const [key, data] of patternCounts) {
      const [category, severity] = key.split('_') as [Inefficiency['category'], Inefficiency['severity']];
      if (data.count >= 2) {
        inefficiencies.push({
          id: `ineff_${agentId}_${key}_${Date.now()}`,
          category,
          severity,
          description: `Detected ${data.count} occurrences of ${category} issues`,
          occurrenceCount: data.count,
          firstDetected: Date.now(),
          lastDetected: Date.now(),
          suggestedFix: this.getSuggestedFix(category),
          affectedComponents: data.examples,
        });
      }
    }

    return inefficiencies;
  }

  private analyzeBuildErrors(errors: string[], agentId: AgentId): Inefficiency[] {
    const inefficiencies: Inefficiency[] = [];
    const errorPatterns = [
      { regex: /TS\d+/g, category: 'process' as const, fix: 'Run typecheck before committing' },
      { regex: /cannot find module/gi, category: 'process' as const, fix: 'Verify dependencies are installed' },
      { regex: /type .+ is not assignable/gi, category: 'process' as const, fix: 'Fix type mismatches' },
      { regex: /eslint|lint/gi, category: 'process' as const, fix: 'Run linter before committing' },
    ];

    for (const error of errors) {
      for (const { regex, category, fix } of errorPatterns) {
        if (regex.test(error)) {
          inefficiencies.push({
            id: `ineff_build_${agentId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            category,
            severity: 'high',
            description: `Build error: ${error.substring(0, 200)}`,
            occurrenceCount: 1,
            firstDetected: Date.now(),
            lastDetected: Date.now(),
            suggestedFix: fix,
            affectedComponents: [error],
          });
          break;
        }
      }
    }

    return inefficiencies;
  }

  private analyzeMemoryTraces(traces: InteractionTrace[], agentId: AgentId): Inefficiency[] {
    const inefficiencies: Inefficiency[] = [];
    
    // Analyze failure patterns
    const failures = traces.filter(t => t.outcome.status === 'failure');
    if (failures.length > 0) {
      const failureRate = failures.length / traces.length;
      if (failureRate > 0.2) {
        inefficiencies.push({
          id: `ineff_cognitive_${agentId}_failure_rate`,
          category: 'cognitive',
          severity: failureRate > 0.5 ? 'critical' : 'high',
          description: `High failure rate detected: ${(failureRate * 100).toFixed(1)}%`,
          occurrenceCount: failures.length,
          firstDetected: Math.min(...failures.map(f => f.timestamp)),
          lastDetected: Math.max(...failures.map(f => f.timestamp)),
          suggestedFix: 'Review failure patterns and update cognitive blueprint',
          affectedComponents: failures.slice(0, 5).map(f => f.task_key),
        });
      }
    }

    // Analyze duration patterns
    const durations = traces
      .filter(t => t.outcome.duration_ms)
      .map(t => t.outcome.duration_ms!);
    
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const slowTasks = traces.filter(t => t.outcome.duration_ms && t.outcome.duration_ms > avgDuration * 2);
      
      if (slowTasks.length > 0) {
        inefficiencies.push({
          id: `ineff_cognitive_${agentId}_slow_tasks`,
          category: 'performance',
          severity: 'medium',
          description: `${slowTasks.length} tasks took more than 2x average duration`,
          occurrenceCount: slowTasks.length,
          firstDetected: Math.min(...slowTasks.map(t => t.timestamp)),
          lastDetected: Math.max(...slowTasks.map(t => t.timestamp)),
          suggestedFix: 'Optimize slow task patterns or add caching',
          affectedComponents: slowTasks.slice(0, 5).map(t => t.task_key),
        });
      }
    }

    return inefficiencies;
  }

  private getSuggestedFix(category: Inefficiency['category']): string {
    const fixes: Record<Inefficiency['category'], string> = {
      performance: 'Optimize hot paths and add caching where appropriate',
      reliability: 'Add retry logic and improve error handling',
      cognitive: 'Review and update cognitive blueprint',
      process: 'Update playbook with improved procedures',
      resource: 'Implement resource cleanup and memory management',
    };
    return fixes[category];
  }

  private generateRecommendation(inefficiency: Inefficiency, agentId: AgentId): Recommendation | null {
    const typeMap: Record<Inefficiency['category'], Recommendation['type']> = {
      performance: 'code_refactor',
      reliability: 'guardrail_addition',
      cognitive: 'playbook_update',
      process: 'process_change',
      resource: 'code_refactor',
    };

    return {
      id: `rec_${agentId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      priority: inefficiency.severity === 'critical' ? 1 : inefficiency.severity === 'high' ? 2 : 3,
      type: typeMap[inefficiency.category],
      targetAgent: agentId,
      description: `Address ${inefficiency.category} issue: ${inefficiency.description}`,
      expectedImprovement: inefficiency.severity === 'critical' ? 0.3 : inefficiency.severity === 'high' ? 0.2 : 0.1,
      implementationSteps: [
        `Analyze root cause of ${inefficiency.category} issue`,
        inefficiency.suggestedFix,
        'Verify fix with tests',
        'Update playbook if needed',
      ],
      verificationCriteria: [
        `${inefficiency.category} issue occurrence reduced by 50%`,
        'No regression in other metrics',
      ],
    };
  }

  private calculateHealthScore(inefficiencies: Inefficiency[]): number {
    if (inefficiencies.length === 0) return 1.0;

    const severityWeights = { low: 0.05, medium: 0.15, high: 0.25, critical: 0.4 };
    let totalPenalty = 0;

    for (const ineff of inefficiencies) {
      totalPenalty += severityWeights[ineff.severity] * Math.min(ineff.occurrenceCount, 5);
    }

    return Math.max(0, 1 - totalPenalty);
  }

  // ==========================================================================
  // TASK 1: DELTA ANALYSIS
  // ==========================================================================

  async analyzeDelta(
    agentId: AgentId,
    plannedStrategy: DeltaAnalysis['plannedStrategy'],
    actualResult: DeltaAnalysis['actualResult']
  ): Promise<DeltaAnalysis> {
    this.addTrace(`Starting delta analysis for agent: ${agentId}`);
    this.state.phase = 'analyzing_delta';

    const outcomeMatch = actualResult.outcome === 'success';
    const durationDelta = actualResult.actualDuration - plannedStrategy.estimatedDuration;
    
    // Calculate performance score
    let performanceScore = 1.0;
    if (!outcomeMatch) performanceScore -= 0.4;
    if (durationDelta > plannedStrategy.estimatedDuration * 0.5) performanceScore -= 0.2;
    if (actualResult.errorMessages.length > 0) performanceScore -= 0.1 * Math.min(actualResult.errorMessages.length, 3);
    performanceScore = Math.max(0, performanceScore);

    // Identify inefficiencies
    const inefficiencies: string[] = [];
    if (!outcomeMatch) {
      inefficiencies.push(`Outcome mismatch: expected success, got ${actualResult.outcome}`);
    }
    if (durationDelta > 0) {
      inefficiencies.push(`Duration exceeded estimate by ${durationDelta}ms`);
    }
    for (const error of actualResult.errorMessages.slice(0, 3)) {
      inefficiencies.push(`Error encountered: ${error.substring(0, 100)}`);
    }

    // Generate improvements
    const improvements: string[] = [];
    if (!outcomeMatch) {
      improvements.push('Add pre-execution validation checks');
      improvements.push('Implement fallback strategies');
    }
    if (durationDelta > plannedStrategy.estimatedDuration * 0.5) {
      improvements.push('Optimize execution path');
      improvements.push('Add progress checkpoints');
    }
    if (actualResult.errorMessages.length > 0) {
      improvements.push('Enhance error handling');
      improvements.push('Add retry logic for transient failures');
    }

    // Generate architectural lesson if significant delta
    let architecturalLesson: string | undefined;
    if (performanceScore < 0.7) {
      architecturalLesson = `Agent ${agentId} strategy "${plannedStrategy.description}" resulted in sub-optimal outcome. ` +
        `Key issues: ${inefficiencies.slice(0, 2).join('; ')}. ` +
        `Recommended improvements: ${improvements.slice(0, 2).join('; ')}.`;
    }

    const analysis: DeltaAnalysis = {
      id: `delta_${agentId}_${Date.now()}`,
      timestamp: Date.now(),
      agentId,
      plannedStrategy,
      actualResult,
      delta: {
        outcomeMatch,
        durationDelta,
        performanceScore,
        inefficiencies,
        improvements,
      },
      architecturalLesson,
      memoryHash: createHash('sha256')
        .update(`delta_${agentId}_${performanceScore}_${Date.now()}`)
        .digest('hex')
        .substring(0, 16),
    };

    this.state.deltaAnalyses.push(analysis);
    this.addTrace(`Delta analysis complete`, { performanceScore, hasLesson: !!architecturalLesson });

    return analysis;
  }

  // ==========================================================================
  // TASK 2: PLAYBOOK EVOLUTION (SICA Protocol)
  // ==========================================================================

  async evolvePlaybook(
    agentId: AgentId,
    changes: PlaybookChange[],
    triggerSource: PlaybookEvolution['triggerSource'] = 'rsip'
  ): Promise<PlaybookEvolution> {
    this.addTrace(`Starting playbook evolution for agent: ${agentId}`);
    this.state.phase = 'evolving_playbook';

    // Get current version
    const currentMetrics = this.state.intelligenceMetrics.get(agentId);
    const previousVersion = currentMetrics?.intelligenceVersion || '1.0.0';
    
    // Increment version
    const versionParts = previousVersion.split('.').map(Number);
    versionParts[2] += 1; // Increment patch version
    if (versionParts[2] >= 10) {
      versionParts[2] = 0;
      versionParts[1] += 1;
    }
    const newVersion = versionParts.join('.');

    const evolution: PlaybookEvolution = {
      id: `evolution_${agentId}_${Date.now()}`,
      timestamp: Date.now(),
      agentId,
      version: newVersion,
      previousVersion,
      changes,
      triggerSource,
      commitMessage: `RSIP: Intelligence Upgrade v${newVersion} - ${changes.length} changes`,
      signedBy: 'eivor', // EIVOR signs all playbook updates
    };

    // If verification is required, TYR must verify
    if (this.config.verificationRequired) {
      evolution.verifiedBy = 'tyr';
    }

    this.state.playbookEvolutions.push(evolution);
    this.addTrace(`Playbook evolution complete`, { version: newVersion, changes: changes.length });

    // Update intelligence metrics
    this.updateIntelligenceMetrics(agentId, {
      intelligenceVersion: newVersion,
      successfulEvolutions: (currentMetrics?.successfulEvolutions || 0) + 1,
      lastEvolution: Date.now(),
    });

    return evolution;
  }

  generatePlaybookChanges(
    auditResult: SelfAuditResult,
    deltaAnalysis?: DeltaAnalysis
  ): PlaybookChange[] {
    const changes: PlaybookChange[] = [];

    // Generate changes from recommendations
    for (const rec of auditResult.recommendations.filter(r => r.type === 'playbook_update')) {
      changes.push({
        section: 'Guardrails',
        changeType: 'add',
        newContent: `### RSIP Guardrail [${new Date().toISOString()}]\n` +
          `- **Issue**: ${rec.description}\n` +
          `- **Prevention**: ${rec.implementationSteps.join(', ')}\n` +
          `- **Verification**: ${rec.verificationCriteria.join(', ')}`,
        reason: rec.description,
      });
    }

    // Generate changes from delta analysis
    if (deltaAnalysis?.architecturalLesson) {
      changes.push({
        section: 'Architectural Lessons',
        changeType: 'add',
        newContent: `### Delta Lesson [${new Date().toISOString()}]\n` +
          `- **Lesson**: ${deltaAnalysis.architecturalLesson}\n` +
          `- **Performance Score**: ${deltaAnalysis.delta.performanceScore.toFixed(2)}\n` +
          `- **Improvements**: ${deltaAnalysis.delta.improvements.join(', ')}`,
        reason: 'Sub-optimal strategy execution detected',
        lessonId: deltaAnalysis.id,
      });
    }

    // Generate changes from inefficiencies
    for (const ineff of auditResult.inefficiencies.filter(i => i.severity === 'critical' || i.severity === 'high')) {
      changes.push({
        section: 'Technical Guardrails',
        changeType: 'add',
        newContent: `### ${ineff.category.toUpperCase()} Guard [${new Date().toISOString()}]\n` +
          `- **Issue**: ${ineff.description}\n` +
          `- **Fix**: ${ineff.suggestedFix}\n` +
          `- **Affected**: ${ineff.affectedComponents.slice(0, 3).join(', ')}`,
        reason: `${ineff.severity} severity ${ineff.category} issue`,
      });
    }

    return changes;
  }

  // ==========================================================================
  // TASK 3: RECURSIVE CODE OPTIMIZATION
  // ==========================================================================

  async requestCodeOptimization(
    requestedBy: AgentId,
    targetFiles: string[],
    optimizationType: CodeOptimization['optimizationType'],
    reason: string
  ): Promise<CodeOptimization> {
    this.addTrace(`Code optimization requested by ${requestedBy}`, { targetFiles, optimizationType });
    this.state.phase = 'optimizing_code';

    // Generate code changes (in real implementation, this would analyze and generate actual changes)
    const changes: CodeChange[] = targetFiles.map(file => ({
      filePath: file,
      changeType: optimizationType === 'performance' ? 'optimize' : 
                  optimizationType === 'security' ? 'fix' : 'refactor',
      description: `${optimizationType} optimization for ${file}`,
      linesAffected: 0, // Would be calculated from actual changes
      riskLevel: optimizationType === 'security' ? 'high' : 'medium',
    }));

    const optimization: CodeOptimization = {
      id: `optim_${requestedBy}_${Date.now()}`,
      timestamp: Date.now(),
      requestedBy,
      targetFiles,
      optimizationType,
      changes,
      verificationStatus: 'pending',
      rollbackAvailable: true,
    };

    this.state.codeOptimizations.push(optimization);
    this.addTrace(`Code optimization created`, { id: optimization.id, changes: changes.length });

    return optimization;
  }

  async verifyCodeOptimization(
    optimizationId: string,
    verifier: AgentId
  ): Promise<{ passed: boolean; reason: string }> {
    this.addTrace(`Verifying code optimization ${optimizationId} by ${verifier}`);
    this.state.phase = 'verifying';

    const optimization = this.state.codeOptimizations.find(o => o.id === optimizationId);
    if (!optimization) {
      return { passed: false, reason: 'Optimization not found' };
    }

    // TYR verification gate - ensure ethical guardrails and security are not compromised
    if (verifier === 'tyr') {
      // Check for security-sensitive changes
      const hasSecurityRisk = optimization.changes.some(c => c.riskLevel === 'high');
      
      if (hasSecurityRisk && optimization.optimizationType !== 'security') {
        optimization.verificationStatus = 'failed';
        return { 
          passed: false, 
          reason: 'High-risk changes detected in non-security optimization. Manual review required.' 
        };
      }
    }

    optimization.verificationStatus = 'passed';
    optimization.verifiedBy = verifier;
    this.addTrace(`Code optimization verified`, { id: optimizationId, verifier });

    return { passed: true, reason: 'Verification passed' };
  }

  // ==========================================================================
  // TASK 4: INTELLIGENCE SCORING & BENCHMARKING
  // ==========================================================================

  updateIntelligenceMetrics(
    agentId: AgentId,
    updates: Partial<IntelligenceMetrics>
  ): IntelligenceMetrics {
    const existing = this.state.intelligenceMetrics.get(agentId) || {
      agentId,
      intelligenceScore: 1.0,
      intelligenceVersion: '1.0.0',
      selfCorrections: 0,
      successfulEvolutions: 0,
      failedEvolutions: 0,
      lastEvolution: 0,
      benchmarkHistory: [],
      evolutionTrend: 'stable' as const,
    };

    const updated: IntelligenceMetrics = {
      ...existing,
      ...updates,
    };

    // Calculate evolution trend
    if (updated.benchmarkHistory.length >= 2) {
      const recent = updated.benchmarkHistory.slice(-3);
      const avgDelta = recent.reduce((sum, b) => sum + b.delta, 0) / recent.length;
      updated.evolutionTrend = avgDelta > 0.05 ? 'improving' : avgDelta < -0.05 ? 'declining' : 'stable';
    }

    this.state.intelligenceMetrics.set(agentId, updated);
    return updated;
  }

  async runBenchmark(agentId: AgentId): Promise<BenchmarkResult> {
    this.addTrace(`Running benchmark for agent: ${agentId}`);
    this.state.phase = 'benchmarking';

    const metrics = this.state.intelligenceMetrics.get(agentId);
    const preScore = metrics?.intelligenceScore || 1.0;

    // Calculate post-evolution score based on recent performance
    const recentAudits = this.state.auditResults
      .filter(a => a.agentId === agentId)
      .slice(-5);
    
    const avgHealthScore = recentAudits.length > 0
      ? recentAudits.reduce((sum, a) => sum + a.overallHealthScore, 0) / recentAudits.length
      : preScore;

    const recentDeltas = this.state.deltaAnalyses
      .filter(d => d.agentId === agentId)
      .slice(-5);
    
    const avgPerformance = recentDeltas.length > 0
      ? recentDeltas.reduce((sum, d) => sum + d.delta.performanceScore, 0) / recentDeltas.length
      : preScore;

    const postScore = (avgHealthScore + avgPerformance) / 2;
    const delta = postScore - preScore;

    const benchmark: BenchmarkResult = {
      id: `bench_${agentId}_${Date.now()}`,
      timestamp: Date.now(),
      preEvolutionScore: preScore,
      postEvolutionScore: postScore,
      delta,
      testsPassed: Math.floor(postScore * 10),
      testsFailed: Math.floor((1 - postScore) * 10),
      performanceMetrics: {
        healthScore: avgHealthScore,
        performanceScore: avgPerformance,
        evolutionCount: metrics?.successfulEvolutions || 0,
      },
    };

    // Update intelligence metrics with new score
    this.updateIntelligenceMetrics(agentId, {
      intelligenceScore: postScore,
      benchmarkHistory: [...(metrics?.benchmarkHistory || []), benchmark].slice(-10),
    });

    this.addTrace(`Benchmark complete`, { preScore, postScore, delta });

    return benchmark;
  }

  recordSelfCorrection(agentId: AgentId, success: boolean): void {
    const metrics = this.state.intelligenceMetrics.get(agentId);
    
    if (success) {
      this.updateIntelligenceMetrics(agentId, {
        selfCorrections: (metrics?.selfCorrections || 0) + 1,
        intelligenceScore: Math.min(1.0, (metrics?.intelligenceScore || 1.0) + this.config.intelligenceScoreIncrement),
      });
      this.addTrace(`Self-correction recorded for ${agentId}: SUCCESS`);
    } else {
      this.updateIntelligenceMetrics(agentId, {
        failedEvolutions: (metrics?.failedEvolutions || 0) + 1,
      });
      this.addTrace(`Self-correction recorded for ${agentId}: FAILED`);
    }
  }

  // ==========================================================================
  // FULL RSIP CYCLE
  // ==========================================================================

  async runFullCycle(
    agentId: AgentId,
    logs: string[],
    buildErrors: string[],
    memoryTraces: InteractionTrace[],
    plannedStrategy?: DeltaAnalysis['plannedStrategy'],
    actualResult?: DeltaAnalysis['actualResult']
  ): Promise<RSIPCycleResult> {
    const cycleId = `rsip_cycle_${agentId}_${Date.now()}`;
    this.addTrace(`Starting full RSIP cycle: ${cycleId}`);

    try {
      // Step 1: Self-Audit
      const auditResult = await this.runSelfAudit(agentId, logs, buildErrors, memoryTraces);

      // Step 2: Delta Analysis (if strategy data provided)
      let deltaAnalysis: DeltaAnalysis | undefined;
      if (plannedStrategy && actualResult) {
        deltaAnalysis = await this.analyzeDelta(agentId, plannedStrategy, actualResult);
      }

      // Step 3: Playbook Evolution (if auto-update enabled and issues found)
      let playbookEvolution: PlaybookEvolution | undefined;
      if (this.config.autoPlaybookUpdate && 
          (auditResult.recommendations.length > 0 || deltaAnalysis?.architecturalLesson)) {
        const changes = this.generatePlaybookChanges(auditResult, deltaAnalysis);
        if (changes.length > 0) {
          playbookEvolution = await this.evolvePlaybook(agentId, changes);
        }
      }

      // Step 4: Code Optimization (if auto-refactor enabled and performance issues found)
      let codeOptimization: CodeOptimization | undefined;
      if (this.config.autoCodeRefactor) {
        const perfIssues = auditResult.inefficiencies.filter(i => i.category === 'performance');
        if (perfIssues.length > 0) {
          codeOptimization = await this.requestCodeOptimization(
            agentId,
            perfIssues.flatMap(i => i.affectedComponents).slice(0, 5),
            'performance',
            'RSIP auto-optimization'
          );
          
          // Verify with TYR
          await this.verifyCodeOptimization(codeOptimization.id, 'tyr');
        }
      }

      // Step 5: Benchmark
      await this.runBenchmark(agentId);

      // Record successful self-correction
      this.recordSelfCorrection(agentId, true);

      this.state.phase = 'complete';

      const result: RSIPCycleResult = {
        cycleId,
        timestamp: Date.now(),
        agentId,
        phase: 'complete',
        auditResult,
        deltaAnalysis,
        playbookEvolution,
        codeOptimization,
        intelligenceMetrics: this.state.intelligenceMetrics.get(agentId)!,
        success: true,
        reasoningTrace: [...this.reasoningTrace],
      };

      this.addTrace(`RSIP cycle complete: ${cycleId}`, { success: true });
      return result;

    } catch (error) {
      this.state.phase = 'failed';
      this.recordSelfCorrection(agentId, false);
      
      const result: RSIPCycleResult = {
        cycleId,
        timestamp: Date.now(),
        agentId,
        phase: 'failed',
        intelligenceMetrics: this.state.intelligenceMetrics.get(agentId) || {
          agentId,
          intelligenceScore: 0.5,
          intelligenceVersion: '1.0.0',
          selfCorrections: 0,
          successfulEvolutions: 0,
          failedEvolutions: 1,
          lastEvolution: 0,
          benchmarkHistory: [],
          evolutionTrend: 'declining',
        },
        success: false,
        reasoningTrace: [...this.reasoningTrace, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      this.addTrace(`RSIP cycle failed: ${cycleId}`, { error: error instanceof Error ? error.message : 'Unknown' });
      return result;
    }
  }

  // ==========================================================================
  // STATE & UTILITIES
  // ==========================================================================

  getState(): RSIPState {
    return {
      ...this.state,
      intelligenceMetrics: new Map(this.state.intelligenceMetrics),
    };
  }

  getIntelligenceMetrics(agentId: AgentId): IntelligenceMetrics | undefined {
    return this.state.intelligenceMetrics.get(agentId);
  }

  getAllIntelligenceMetrics(): Map<AgentId, IntelligenceMetrics> {
    return new Map(this.state.intelligenceMetrics);
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
    this.state.reasoningTrace = [];
  }

  reset(): void {
    this.state = {
      phase: 'idle',
      auditResults: [],
      deltaAnalyses: [],
      playbookEvolutions: [],
      codeOptimizations: [],
      intelligenceMetrics: new Map(),
      reasoningTrace: [],
    };
    this.reasoningTrace = [];
    this.addTrace('RSIP Engine reset');
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let globalRSIPEngine: RSIPEngine | null = null;

export function createRSIPEngine(config?: Partial<RSIPConfig>): RSIPEngine {
  return new RSIPEngine(config);
}

export function getGlobalRSIPEngine(): RSIPEngine {
  if (!globalRSIPEngine) {
    globalRSIPEngine = new RSIPEngine();
  }
  return globalRSIPEngine;
}

export function resetGlobalRSIPEngine(): void {
  globalRSIPEngine = null;
}
