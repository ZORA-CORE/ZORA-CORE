/**
 * HEIMDALL - Guardian of the Bifrost
 * Real-time Observability and Proactive Monitoring Engine
 * ZORA CORE: Aesir Genesis - Sentinel Level
 */

import type {
  AgentId,
  ThreatLevel,
  AlertSeverity,
  MonitoringLayer,
  HealthStatus,
  TelemetrySpan,
  AgentTrace,
  AgentHealthScore,
  BifrostWatchConfig,
  GjallarhornAlert,
  GjallarhornAlertConfig,
  AlertEvidence,
  CausalNode,
  CausalGraph,
  FailurePrediction,
  HistoricalCorrelation,
  A2AMessage,
  HallucinationDriftIndicator,
  AgentQuarantine,
  RemediationInstruction,
  CognitiveCircuitBreaker,
  HeimdallStatus,
  BifrostWatchState,
} from './types';

import {
  DEFAULT_BIFROST_CONFIG,
  HEALTH_THRESHOLDS,
  CIRCUIT_BREAKER_DEFAULTS,
} from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function generateTraceId(): string {
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Bifrost Watch - Real-time Telemetry and Observability
 * Integrates with Vercel OpenTelemetry or Axiom for tracing
 */
export class BifrostWatch {
  private config: BifrostWatchConfig;
  private state: BifrostWatchState;
  private spanBuffer: TelemetrySpan[] = [];
  private reasoningTrace: string[] = [];

  constructor(config: Partial<BifrostWatchConfig> = {}) {
    this.config = { ...DEFAULT_BIFROST_CONFIG, ...config };
    this.state = {
      isActive: false,
      startedAt: 0,
      tracesCollected: 0,
      alertsTriggered: 0,
      currentThreatLevel: 'green',
      agentTraces: new Map(),
      recentAlerts: [],
    };
  }

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [BIFROST_WATCH] ${message}`);
  }

  start(): void {
    this.state.isActive = true;
    this.state.startedAt = Date.now();
    this.addTrace('Bifrost Watch activated - all monitoring systems online');
  }

  stop(): void {
    this.state.isActive = false;
    this.addTrace('Bifrost Watch deactivated');
  }

  /**
   * Record a telemetry span for an agent operation
   */
  recordSpan(span: Omit<TelemetrySpan, 'traceId' | 'spanId'>): TelemetrySpan {
    const fullSpan: TelemetrySpan = {
      ...span,
      traceId: span.parentSpanId ? span.parentSpanId.split('_')[0] : generateTraceId(),
      spanId: generateId('span'),
    };

    this.spanBuffer.push(fullSpan);
    this.state.tracesCollected++;

    if (this.spanBuffer.length >= this.config.maxBatchSize) {
      this.flushSpans();
    }

    return fullSpan;
  }

  /**
   * Record an agent trace with full context
   */
  recordAgentTrace(trace: Omit<AgentTrace, 'traceId'>): AgentTrace {
    const fullTrace: AgentTrace = {
      ...trace,
      traceId: generateTraceId(),
    };

    const agentTraces = this.state.agentTraces.get(trace.agentId) || [];
    agentTraces.push(fullTrace);
    
    // Keep only last 100 traces per agent
    if (agentTraces.length > 100) {
      agentTraces.shift();
    }
    
    this.state.agentTraces.set(trace.agentId, agentTraces);
    this.addTrace(`Recorded trace for ${trace.agentId}: ${trace.operation} (${trace.status})`);

    return fullTrace;
  }

  /**
   * Calculate health score for an agent based on recent traces
   */
  calculateAgentHealth(agentId: AgentId): AgentHealthScore {
    const traces = this.state.agentTraces.get(agentId) || [];
    const recentTraces = traces.filter(t => Date.now() - t.startTime < 3600000); // Last hour

    const totalOps = recentTraces.length;
    const successOps = recentTraces.filter(t => t.status === 'success').length;
    const failedOps = recentTraces.filter(t => t.status === 'failure').length;
    const latencies = recentTraces
      .filter(t => t.latencyMs !== undefined)
      .map(t => t.latencyMs!);

    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

    const successRate = totalOps > 0 ? successOps / totalOps : 1;
    const errorRate = totalOps > 0 ? failedOps / totalOps : 0;

    // Calculate cognitive integrity based on error patterns
    const cognitiveIntegrity = this.calculateCognitiveIntegrity(recentTraces);

    // Calculate overall score (weighted average)
    const overallScore = (
      successRate * 0.4 +
      (1 - Math.min(errorRate, 1)) * 0.3 +
      (1 - Math.min(avgLatency / 2000, 1)) * 0.15 +
      cognitiveIntegrity * 0.15
    );

    const status = this.determineHealthStatus(overallScore, successRate, errorRate);

    return {
      agentId,
      overallScore,
      successRate,
      avgLatencyMs: avgLatency,
      errorRate,
      lastUpdated: Date.now(),
      status,
      recentFailures: failedOps,
      totalOperations: totalOps,
      cognitiveIntegrity,
    };
  }

  private calculateCognitiveIntegrity(traces: AgentTrace[]): number {
    if (traces.length === 0) return 1;

    // Check for patterns indicating cognitive issues
    let integrityScore = 1;

    // Consecutive failures reduce integrity
    let consecutiveFailures = 0;
    for (const trace of traces.slice(-10)) {
      if (trace.status === 'failure') {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0;
      }
    }
    integrityScore -= consecutiveFailures * 0.1;

    // Timeouts indicate potential issues
    const timeouts = traces.filter(t => t.status === 'timeout').length;
    integrityScore -= (timeouts / traces.length) * 0.2;

    return Math.max(0, Math.min(1, integrityScore));
  }

  private determineHealthStatus(
    overallScore: number,
    successRate: number,
    errorRate: number
  ): HealthStatus {
    if (overallScore >= 0.9 && successRate >= HEALTH_THRESHOLDS.successRateMin) {
      return 'healthy';
    }
    if (overallScore >= 0.7 && errorRate <= HEALTH_THRESHOLDS.errorRateMax * 2) {
      return 'degraded';
    }
    if (overallScore >= 0.5) {
      return 'unhealthy';
    }
    return 'critical';
  }

  private async flushSpans(): Promise<void> {
    if (this.spanBuffer.length === 0) return;

    const spans = [...this.spanBuffer];
    this.spanBuffer = [];

    // In production, this would send to Axiom or OpenTelemetry
    if (this.config.telemetryEndpoint) {
      try {
        await fetch(this.config.telemetryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spans }),
        });
        this.addTrace(`Flushed ${spans.length} spans to telemetry endpoint`);
      } catch (error) {
        this.addTrace(`Failed to flush spans: ${error}`);
      }
    } else {
      this.addTrace(`Buffered ${spans.length} spans (no telemetry endpoint configured)`);
    }
  }

  getState(): BifrostWatchState {
    return { ...this.state };
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }
}

/**
 * Gjallarhorn Alert System - Log Aggregation and Alerting
 */
export class GjallarhornAlertSystem {
  private alertConfigs: Map<string, GjallarhornAlertConfig> = new Map();
  private activeAlerts: Map<string, GjallarhornAlert> = new Map();
  private alertHistory: GjallarhornAlert[] = [];
  private cooldowns: Map<string, number> = new Map();
  private reasoningTrace: string[] = [];

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [GJALLARHORN] ${message}`);
  }

  /**
   * Register an alert configuration
   */
  registerAlert(config: GjallarhornAlertConfig): void {
    this.alertConfigs.set(config.id, config);
    this.addTrace(`Registered alert: ${config.name} (${config.severity})`);
  }

  /**
   * Check if an alert should be triggered based on evidence
   */
  evaluateCondition(
    config: GjallarhornAlertConfig,
    evidence: AlertEvidence[]
  ): boolean {
    const { condition } = config;

    switch (condition.type) {
      case 'threshold':
        return this.evaluateThreshold(condition, evidence);
      case 'anomaly':
        return this.evaluateAnomaly(condition, evidence);
      case 'pattern':
        return this.evaluatePattern(condition, evidence);
      case 'cascade':
        return this.evaluateCascade(condition, evidence);
      default:
        return false;
    }
  }

  private evaluateThreshold(
    condition: GjallarhornAlertConfig['condition'],
    evidence: AlertEvidence[]
  ): boolean {
    if (!condition.metric || !condition.operator || condition.value === undefined) {
      return false;
    }

    const metricEvidence = evidence.find(e => 
      e.type === 'metric' && e.data.metric === condition.metric
    );

    if (!metricEvidence) return false;

    const value = metricEvidence.data.value as number;
    switch (condition.operator) {
      case 'gt': return value > condition.value;
      case 'lt': return value < condition.value;
      case 'eq': return value === condition.value;
      case 'gte': return value >= condition.value;
      case 'lte': return value <= condition.value;
      default: return false;
    }
  }

  private evaluateAnomaly(
    condition: GjallarhornAlertConfig['condition'],
    evidence: AlertEvidence[]
  ): boolean {
    // Check for anomaly patterns in evidence
    return evidence.some(e => 
      e.type === 'pattern' && 
      (e.data.anomalyScore as number) > 0.8
    );
  }

  private evaluatePattern(
    condition: GjallarhornAlertConfig['condition'],
    evidence: AlertEvidence[]
  ): boolean {
    if (!condition.pattern) return false;

    return evidence.some(e => {
      const description = e.description.toLowerCase();
      return description.includes(condition.pattern!.toLowerCase());
    });
  }

  private evaluateCascade(
    condition: GjallarhornAlertConfig['condition'],
    evidence: AlertEvidence[]
  ): boolean {
    if (!condition.agents || condition.agents.length < 2) return false;

    // Check if multiple agents have failures in sequence
    const agentFailures = evidence.filter(e => 
      e.type === 'trace' && 
      e.data.status === 'failure' &&
      condition.agents!.includes(e.data.agentId as AgentId)
    );

    return agentFailures.length >= 2;
  }

  /**
   * Trigger an alert
   */
  triggerAlert(
    configId: string,
    source: GjallarhornAlert['source'],
    evidence: AlertEvidence[],
    customMessage?: string
  ): GjallarhornAlert | null {
    const config = this.alertConfigs.get(configId);
    if (!config || !config.enabled) return null;

    // Check cooldown
    const lastTrigger = this.cooldowns.get(configId);
    if (lastTrigger && Date.now() - lastTrigger < config.cooldownMs) {
      this.addTrace(`Alert ${configId} in cooldown, skipping`);
      return null;
    }

    // Evaluate condition
    if (!this.evaluateCondition(config, evidence)) {
      return null;
    }

    const alert: GjallarhornAlert = {
      id: generateId('alert'),
      alertConfigId: configId,
      severity: config.severity,
      title: config.name,
      message: customMessage || config.description,
      triggeredAt: Date.now(),
      source,
      evidence,
      actionsTaken: [],
      status: 'active',
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.cooldowns.set(configId, Date.now());

    this.addTrace(`=== GJALLARHORN ALERT: ${alert.title} ===`);
    this.addTrace(`Severity: ${alert.severity}`);
    this.addTrace(`Source: ${source.layer}${source.agentId ? ` / ${source.agentId}` : ''}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    if (resolution) {
      alert.actionsTaken.push(resolution);
    }

    this.activeAlerts.delete(alertId);
    this.addTrace(`Alert ${alertId} resolved: ${resolution || 'No resolution provided'}`);

    return true;
  }

  getActiveAlerts(): GjallarhornAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(): GjallarhornAlert[] {
    return [...this.alertHistory];
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }
}

/**
 * Causal Inference Engine - Failure Prediction
 */
export class CausalInferenceEngine {
  private causalGraph: CausalGraph;
  private historicalPatterns: Map<string, HistoricalCorrelation> = new Map();
  private predictions: FailurePrediction[] = [];
  private reasoningTrace: string[] = [];

  constructor() {
    this.causalGraph = {
      nodes: new Map(),
      edges: [],
      lastUpdated: Date.now(),
    };
  }

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [CAUSAL_ENGINE] ${message}`);
  }

  /**
   * Add a node to the causal graph
   */
  addNode(node: Omit<CausalNode, 'id' | 'riskScore'>): CausalNode {
    const fullNode: CausalNode = {
      ...node,
      id: generateId('node'),
      riskScore: this.calculateInitialRisk(node),
    };

    this.causalGraph.nodes.set(fullNode.id, fullNode);
    this.causalGraph.lastUpdated = Date.now();

    return fullNode;
  }

  /**
   * Add a causal edge between nodes
   */
  addEdge(fromId: string, toId: string, weight: number = 1): void {
    const fromNode = this.causalGraph.nodes.get(fromId);
    const toNode = this.causalGraph.nodes.get(toId);

    if (!fromNode || !toNode) return;

    fromNode.dependents.push(toId);
    toNode.dependencies.push(fromId);

    this.causalGraph.edges.push({ from: fromId, to: toId, weight });
    this.causalGraph.lastUpdated = Date.now();
  }

  private calculateInitialRisk(node: Omit<CausalNode, 'id' | 'riskScore'>): number {
    let risk = 0;

    // Failed operations have higher risk
    if (node.outcome === 'failure') {
      risk += 0.5;
    }

    // More dependencies = higher risk
    risk += Math.min(node.dependencies.length * 0.1, 0.3);

    return Math.min(risk, 1);
  }

  /**
   * Record a historical pattern for correlation analysis
   */
  recordPattern(
    pattern: string,
    outcome: 'success' | 'failure',
    relatedAgents: AgentId[],
    timeToOutcome: number
  ): void {
    const existing = this.historicalPatterns.get(pattern);

    if (existing) {
      existing.occurrences++;
      if (outcome === 'failure') {
        existing.failureRate = (existing.failureRate * (existing.occurrences - 1) + 1) / existing.occurrences;
      } else {
        existing.failureRate = (existing.failureRate * (existing.occurrences - 1)) / existing.occurrences;
      }
      existing.avgTimeToFailure = (existing.avgTimeToFailure + timeToOutcome) / 2;
      
      // Add new related agents
      for (const agent of relatedAgents) {
        if (!existing.relatedAgents.includes(agent)) {
          existing.relatedAgents.push(agent);
        }
      }
    } else {
      this.historicalPatterns.set(pattern, {
        pattern,
        occurrences: 1,
        failureRate: outcome === 'failure' ? 1 : 0,
        avgTimeToFailure: timeToOutcome,
        relatedAgents,
      });
    }
  }

  /**
   * Predict potential failures based on current state and historical patterns
   */
  predictFailure(
    agentId: AgentId,
    operation: string,
    context: Record<string, unknown>
  ): FailurePrediction | null {
    this.addTrace(`Analyzing failure risk for ${agentId}: ${operation}`);

    // Find matching historical patterns
    const matchingPatterns: HistoricalCorrelation[] = [];
    for (const [patternKey, correlation] of this.historicalPatterns) {
      if (
        patternKey.includes(operation) ||
        correlation.relatedAgents.includes(agentId)
      ) {
        matchingPatterns.push(correlation);
      }
    }

    if (matchingPatterns.length === 0) {
      this.addTrace('No historical patterns found - low confidence prediction');
      return null;
    }

    // Calculate failure probability
    const avgFailureRate = matchingPatterns.reduce((sum, p) => sum + p.failureRate, 0) / matchingPatterns.length;
    const totalOccurrences = matchingPatterns.reduce((sum, p) => sum + p.occurrences, 0);
    const confidence = Math.min(totalOccurrences / 100, 1); // More data = higher confidence

    // Calculate cascade risk
    const cascadeRisk = this.calculateCascadeRisk(agentId);

    // Only create prediction if risk is significant
    if (avgFailureRate < 0.3 && cascadeRisk < 0.3) {
      this.addTrace(`Low risk detected (failure: ${avgFailureRate}, cascade: ${cascadeRisk})`);
      return null;
    }

    const prediction: FailurePrediction = {
      id: generateId('prediction'),
      predictedAt: Date.now(),
      targetAgentId: agentId,
      targetOperation: operation,
      failureProbability: avgFailureRate,
      cascadeRisk,
      triggerConditions: this.identifyTriggerConditions(context, matchingPatterns),
      preventiveActions: this.suggestPreventiveActions(agentId, avgFailureRate, cascadeRisk),
      confidence,
      historicalCorrelations: matchingPatterns,
    };

    this.predictions.push(prediction);
    this.addTrace(`PREDICTION ISSUED: ${agentId} has ${(avgFailureRate * 100).toFixed(1)}% failure probability`);

    return prediction;
  }

  private calculateCascadeRisk(agentId: AgentId): number {
    // Find nodes for this agent
    const agentNodes = Array.from(this.causalGraph.nodes.values())
      .filter(n => n.agentId === agentId);

    if (agentNodes.length === 0) return 0;

    // Calculate based on dependents
    let totalDependents = 0;
    for (const node of agentNodes) {
      totalDependents += node.dependents.length;
    }

    return Math.min(totalDependents * 0.1, 1);
  }

  private identifyTriggerConditions(
    context: Record<string, unknown>,
    patterns: HistoricalCorrelation[]
  ): string[] {
    const conditions: string[] = [];

    // Check for high-risk patterns
    for (const pattern of patterns) {
      if (pattern.failureRate > 0.5) {
        conditions.push(`Historical pattern "${pattern.pattern}" has ${(pattern.failureRate * 100).toFixed(0)}% failure rate`);
      }
    }

    // Check context for risk factors
    if (context.retryCount && (context.retryCount as number) > 2) {
      conditions.push('Multiple retry attempts detected');
    }

    if (context.latencyMs && (context.latencyMs as number) > 1000) {
      conditions.push('High latency detected');
    }

    return conditions;
  }

  private suggestPreventiveActions(
    agentId: AgentId,
    failureProbability: number,
    cascadeRisk: number
  ): string[] {
    const actions: string[] = [];

    if (failureProbability > 0.7) {
      actions.push(`Block operation for ${agentId} - high failure probability`);
    } else if (failureProbability > 0.5) {
      actions.push(`Add extra validation before ${agentId} operation`);
    }

    if (cascadeRisk > 0.5) {
      actions.push('Isolate operation to prevent cascade failure');
      actions.push('Prepare rollback strategy');
    }

    if (actions.length === 0) {
      actions.push('Monitor closely');
    }

    return actions;
  }

  /**
   * Check if an operation should be blocked based on predictions
   */
  shouldBlockOperation(agentId: AgentId, operation: string): { block: boolean; reason?: string } {
    const recentPredictions = this.predictions.filter(p =>
      p.targetAgentId === agentId &&
      p.targetOperation === operation &&
      Date.now() - p.predictedAt < 300000 // Last 5 minutes
    );

    for (const prediction of recentPredictions) {
      if (prediction.failureProbability > 0.8 && prediction.confidence > 0.7) {
        this.addTrace(`BLOCKING ${agentId}:${operation} - high failure probability with high confidence`);
        return {
          block: true,
          reason: `Predicted ${(prediction.failureProbability * 100).toFixed(0)}% failure probability (confidence: ${(prediction.confidence * 100).toFixed(0)}%)`,
        };
      }

      if (prediction.cascadeRisk > 0.7) {
        this.addTrace(`BLOCKING ${agentId}:${operation} - high cascade risk`);
        return {
          block: true,
          reason: `High cascade failure risk: ${(prediction.cascadeRisk * 100).toFixed(0)}%`,
        };
      }
    }

    return { block: false };
  }

  getPredictions(): FailurePrediction[] {
    return [...this.predictions];
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }
}

/**
 * A2A Watch - Agent-to-Agent Communication Monitor
 */
export class A2AWatch {
  private messageLog: A2AMessage[] = [];
  private driftIndicators: Map<AgentId, HallucinationDriftIndicator> = new Map();
  private reasoningTrace: string[] = [];

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [A2A_WATCH] ${message}`);
  }

  /**
   * Log an A2A message
   */
  logMessage(message: Omit<A2AMessage, 'id'>): A2AMessage {
    const fullMessage: A2AMessage = {
      ...message,
      id: generateId('msg'),
    };

    this.messageLog.push(fullMessage);

    // Keep only last 1000 messages
    if (this.messageLog.length > 1000) {
      this.messageLog.shift();
    }

    return fullMessage;
  }

  /**
   * Analyze agent communication for hallucination drift
   */
  analyzeForDrift(agentId: AgentId): HallucinationDriftIndicator {
    const recentMessages = this.messageLog.filter(m =>
      (m.fromAgent === agentId || m.toAgent === agentId) &&
      Date.now() - m.timestamp < 600000 // Last 10 minutes
    );

    // Calculate drift indicators
    const contextCoherence = this.calculateContextCoherence(recentMessages, agentId);
    const responseRelevance = this.calculateResponseRelevance(recentMessages, agentId);
    const factualConsistency = this.calculateFactualConsistency(recentMessages, agentId);
    const taskAlignment = this.calculateTaskAlignment(recentMessages, agentId);

    // Overall drift score (higher = more drift)
    const driftScore = 1 - (
      contextCoherence * 0.3 +
      responseRelevance * 0.3 +
      factualConsistency * 0.2 +
      taskAlignment * 0.2
    );

    // Determine recommendation
    let recommendation: HallucinationDriftIndicator['recommendation'] = 'monitor';
    if (driftScore > HEALTH_THRESHOLDS.driftScoreMax * 3) {
      recommendation = 'quarantine';
    } else if (driftScore > HEALTH_THRESHOLDS.driftScoreMax * 2) {
      recommendation = 'intervene';
    } else if (driftScore > HEALTH_THRESHOLDS.driftScoreMax) {
      recommendation = 'warn';
    }

    const indicator: HallucinationDriftIndicator = {
      agentId,
      timestamp: Date.now(),
      driftScore,
      indicators: {
        contextCoherence,
        responseRelevance,
        factualConsistency,
        taskAlignment,
      },
      recentMessages,
      recommendation,
    };

    this.driftIndicators.set(agentId, indicator);

    if (driftScore > HEALTH_THRESHOLDS.driftScoreMax) {
      this.addTrace(`DRIFT DETECTED for ${agentId}: score=${driftScore.toFixed(3)}, recommendation=${recommendation}`);
    }

    return indicator;
  }

  private calculateContextCoherence(messages: A2AMessage[], agentId: AgentId): number {
    // Check if agent responses maintain context
    const agentResponses = messages.filter(m => m.fromAgent === agentId);
    if (agentResponses.length < 2) return 1;

    // Simple heuristic: check for consistent method patterns
    const methods = agentResponses.map(m => m.method);
    const uniqueMethods = new Set(methods);
    
    // Too many different methods in short time = potential drift
    const coherence = 1 - Math.min(uniqueMethods.size / agentResponses.length, 1);
    return Math.max(0.5, coherence); // Minimum 0.5 to avoid false positives
  }

  private calculateResponseRelevance(messages: A2AMessage[], agentId: AgentId): number {
    // Check if responses are relevant to requests
    const agentResponses = messages.filter(m => m.fromAgent === agentId);
    if (agentResponses.length === 0) return 1;

    // Check response times - very fast or very slow responses may indicate issues
    const responseTimes = agentResponses
      .filter(m => m.responseTime !== undefined)
      .map(m => m.responseTime!);

    if (responseTimes.length === 0) return 1;

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    // Ideal response time is 100-2000ms
    if (avgResponseTime < 10 || avgResponseTime > 10000) {
      return 0.5;
    }
    
    return 1;
  }

  private calculateFactualConsistency(messages: A2AMessage[], agentId: AgentId): number {
    // Check for contradictory statements
    const agentMessages = messages.filter(m => m.fromAgent === agentId);
    if (agentMessages.length < 2) return 1;

    // Check for failed messages which might indicate inconsistency
    const failedMessages = agentMessages.filter(m => m.status === 'failed');
    const failureRate = failedMessages.length / agentMessages.length;

    return 1 - failureRate;
  }

  private calculateTaskAlignment(messages: A2AMessage[], agentId: AgentId): number {
    // Check if agent is staying on task
    const agentMessages = messages.filter(m => m.fromAgent === agentId);
    if (agentMessages.length === 0) return 1;

    // Check for timeout messages which indicate task issues
    const timeouts = agentMessages.filter(m => m.status === 'timeout');
    const timeoutRate = timeouts.length / agentMessages.length;

    return 1 - timeoutRate;
  }

  getDriftIndicator(agentId: AgentId): HallucinationDriftIndicator | undefined {
    return this.driftIndicators.get(agentId);
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }
}

/**
 * Gjallarhorn Protocol - Automated Remediation
 */
export class GjallarhornProtocol {
  private quarantines: Map<AgentId, AgentQuarantine> = new Map();
  private circuitBreakers: Map<AgentId, CognitiveCircuitBreaker> = new Map();
  private remediationQueue: RemediationInstruction[] = [];
  private reasoningTrace: string[] = [];

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [GJALLARHORN_PROTOCOL] ${message}`);
  }

  /**
   * Initialize circuit breaker for an agent
   */
  initializeCircuitBreaker(agentId: AgentId, thresholds?: Partial<CognitiveCircuitBreaker['thresholds']>): void {
    this.circuitBreakers.set(agentId, {
      agentId,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      thresholds: { ...CIRCUIT_BREAKER_DEFAULTS, ...thresholds },
    });
    this.addTrace(`Circuit breaker initialized for ${agentId}`);
  }

  /**
   * Record operation result for circuit breaker
   */
  recordResult(agentId: AgentId, success: boolean): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) {
      this.initializeCircuitBreaker(agentId);
      return this.recordResult(agentId, success);
    }

    if (success) {
      breaker.successCount++;
      breaker.lastSuccess = Date.now();
      
      if (breaker.state === 'half_open') {
        if (breaker.successCount >= breaker.thresholds.successThreshold) {
          breaker.state = 'closed';
          breaker.failureCount = 0;
          this.addTrace(`Circuit breaker CLOSED for ${agentId} - recovered`);
        }
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      breaker.successCount = 0;

      if (breaker.state === 'closed' && breaker.failureCount >= breaker.thresholds.failureThreshold) {
        breaker.state = 'open';
        breaker.openedAt = Date.now();
        this.addTrace(`Circuit breaker OPENED for ${agentId} - ${breaker.failureCount} failures`);
      } else if (breaker.state === 'half_open') {
        breaker.state = 'open';
        breaker.openedAt = Date.now();
        this.addTrace(`Circuit breaker re-OPENED for ${agentId} - failed during half-open`);
      }
    }
  }

  /**
   * Check if operation is allowed by circuit breaker
   */
  isOperationAllowed(agentId: AgentId): { allowed: boolean; reason?: string } {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return { allowed: true };

    if (breaker.state === 'closed') {
      return { allowed: true };
    }

    if (breaker.state === 'open') {
      // Check if timeout has passed
      if (breaker.openedAt && Date.now() - breaker.openedAt > breaker.thresholds.timeoutMs) {
        breaker.state = 'half_open';
        breaker.halfOpenAt = Date.now();
        breaker.successCount = 0;
        this.addTrace(`Circuit breaker HALF-OPEN for ${agentId} - testing recovery`);
        return { allowed: true };
      }
      return { allowed: false, reason: 'Circuit breaker is open' };
    }

    // Half-open: allow limited requests
    return { allowed: true };
  }

  /**
   * Quarantine an agent
   */
  quarantineAgent(
    agentId: AgentId,
    reason: AgentQuarantine['reason'],
    evidence: AlertEvidence[],
    autoRelease: boolean = false,
    releaseConditions?: string[]
  ): AgentQuarantine {
    const quarantine: AgentQuarantine = {
      agentId,
      quarantinedAt: Date.now(),
      reason,
      evidence,
      autoRelease,
      releaseConditions,
    };

    this.quarantines.set(agentId, quarantine);
    this.addTrace(`=== AGENT QUARANTINED: ${agentId} ===`);
    this.addTrace(`Reason: ${reason}`);

    return quarantine;
  }

  /**
   * Release an agent from quarantine
   */
  releaseAgent(agentId: AgentId, releasedBy: string): boolean {
    const quarantine = this.quarantines.get(agentId);
    if (!quarantine) return false;

    quarantine.releasedAt = Date.now();
    quarantine.releasedBy = releasedBy;
    this.quarantines.delete(agentId);

    this.addTrace(`Agent ${agentId} released from quarantine by ${releasedBy}`);
    return true;
  }

  /**
   * Check if agent is quarantined
   */
  isQuarantined(agentId: AgentId): boolean {
    return this.quarantines.has(agentId);
  }

  /**
   * Issue remediation instruction to Thor
   */
  issueRemediation(
    targetAgentId: AgentId,
    action: RemediationInstruction['action'],
    priority: RemediationInstruction['priority'],
    params: Record<string, unknown> = {}
  ): RemediationInstruction {
    const instruction: RemediationInstruction = {
      id: generateId('remediation'),
      targetAgentId,
      action,
      priority,
      params,
      issuedAt: Date.now(),
      issuedBy: 'heimdall',
      status: 'pending',
    };

    this.remediationQueue.push(instruction);
    this.addTrace(`Remediation issued: ${action} for ${targetAgentId} (priority: ${priority})`);

    return instruction;
  }

  /**
   * Update remediation status
   */
  updateRemediationStatus(
    instructionId: string,
    status: RemediationInstruction['status'],
    result?: RemediationInstruction['result']
  ): boolean {
    const instruction = this.remediationQueue.find(i => i.id === instructionId);
    if (!instruction) return false;

    instruction.status = status;
    if (result) {
      instruction.result = result;
    }

    this.addTrace(`Remediation ${instructionId} status: ${status}`);
    return true;
  }

  /**
   * Check agent health and auto-quarantine if below threshold
   */
  checkAndQuarantine(healthScore: AgentHealthScore): AgentQuarantine | null {
    if (healthScore.successRate < HEALTH_THRESHOLDS.successRateMin) {
      const evidence: AlertEvidence[] = [{
        type: 'metric',
        timestamp: Date.now(),
        data: {
          metric: 'success_rate',
          value: healthScore.successRate,
          threshold: HEALTH_THRESHOLDS.successRateMin,
        },
        description: `Success rate ${(healthScore.successRate * 100).toFixed(1)}% below threshold ${(HEALTH_THRESHOLDS.successRateMin * 100).toFixed(1)}%`,
      }];

      return this.quarantineAgent(
        healthScore.agentId,
        'success_rate_below_threshold',
        evidence,
        true,
        [`Success rate must exceed ${(HEALTH_THRESHOLDS.successRateMin * 100).toFixed(0)}%`]
      );
    }

    return null;
  }

  getQuarantinedAgents(): AgentId[] {
    return Array.from(this.quarantines.keys());
  }

  getRemediationQueue(): RemediationInstruction[] {
    return [...this.remediationQueue];
  }

  getCircuitBreakerState(agentId: AgentId): CognitiveCircuitBreaker | undefined {
    return this.circuitBreakers.get(agentId);
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }
}

/**
 * HEIMDALL - Main Guardian Class
 * Orchestrates all monitoring and protection systems
 */
export class Heimdall {
  private bifrostWatch: BifrostWatch;
  private alertSystem: GjallarhornAlertSystem;
  private causalEngine: CausalInferenceEngine;
  private a2aWatch: A2AWatch;
  private gjallarhornProtocol: GjallarhornProtocol;
  private status: HeimdallStatus;
  private reasoningTrace: string[] = [];

  constructor(config?: Partial<BifrostWatchConfig>) {
    this.bifrostWatch = new BifrostWatch(config);
    this.alertSystem = new GjallarhornAlertSystem();
    this.causalEngine = new CausalInferenceEngine();
    this.a2aWatch = new A2AWatch();
    this.gjallarhornProtocol = new GjallarhornProtocol();

    this.status = {
      status: 'offline',
      level: 'Sentinel Level',
      threatLevel: 'green',
      activeAlerts: 0,
      monitoringStatus: {
        network: 'offline',
        application: 'offline',
        data: 'offline',
        infrastructure: 'offline',
        agent: 'offline',
      },
      agentHealthScores: {} as Record<AgentId, AgentHealthScore>,
      quarantinedAgents: [],
      recentEvents: {
        authFailures: 0,
        accessDenials: 0,
        anomaliesDetected: 0,
        predictionsIssued: 0,
        remediationsExecuted: 0,
      },
      lastScan: 0,
      reasoningTrace: [],
    };

    this.initializeDefaultAlerts();
  }

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [HEIMDALL] ${message}`);
    this.status.reasoningTrace = this.reasoningTrace.slice(-100);
  }

  private initializeDefaultAlerts(): void {
    // High error rate alert
    this.alertSystem.registerAlert({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Agent error rate exceeds threshold',
      severity: 'high',
      condition: {
        type: 'threshold',
        metric: 'error_rate',
        operator: 'gt',
        value: HEALTH_THRESHOLDS.errorRateMax,
      },
      actions: [{ type: 'notify' }, { type: 'escalate', target: 'odin' }],
      cooldownMs: 300000,
      enabled: true,
    });

    // Cascade failure alert
    this.alertSystem.registerAlert({
      id: 'cascade_failure',
      name: 'Cascade Failure Risk',
      description: 'Multiple agents failing in sequence',
      severity: 'critical',
      condition: {
        type: 'cascade',
        agents: ['odin', 'thor', 'baldur', 'eivor'],
      },
      actions: [{ type: 'quarantine' }, { type: 'rollback' }],
      cooldownMs: 60000,
      enabled: true,
    });

    // Hallucination drift alert
    this.alertSystem.registerAlert({
      id: 'hallucination_drift',
      name: 'Hallucination Drift Detected',
      description: 'Agent showing signs of cognitive drift',
      severity: 'high',
      condition: {
        type: 'threshold',
        metric: 'drift_score',
        operator: 'gt',
        value: HEALTH_THRESHOLDS.driftScoreMax,
      },
      actions: [{ type: 'warn' }, { type: 'quarantine' }],
      cooldownMs: 180000,
      enabled: true,
    });
  }

  /**
   * Activate HEIMDALL - Begin watching
   */
  activate(): void {
    this.status.status = 'watching';
    this.bifrostWatch.start();

    // Initialize circuit breakers for all agents
    const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
    for (const agent of agents) {
      this.gjallarhornProtocol.initializeCircuitBreaker(agent);
    }

    // Set all monitoring layers to active
    this.status.monitoringStatus = {
      network: 'active',
      application: 'active',
      data: 'active',
      infrastructure: 'active',
      agent: 'active',
    };

    this.addTrace('=== HEIMDALL ACTIVATED ===');
    this.addTrace('Eternal Vigilance: ENGAGED');
    this.addTrace('All monitoring systems: ONLINE');
    this.addTrace('The Guardian sees all. The Rainbow Bridge is protected.');
  }

  /**
   * Deactivate HEIMDALL
   */
  deactivate(): void {
    this.status.status = 'offline';
    this.bifrostWatch.stop();

    this.status.monitoringStatus = {
      network: 'offline',
      application: 'offline',
      data: 'offline',
      infrastructure: 'offline',
      agent: 'offline',
    };

    this.addTrace('HEIMDALL DEACTIVATED');
  }

  /**
   * Record an agent operation and analyze
   */
  recordAgentOperation(
    agentId: AgentId,
    operation: string,
    status: 'success' | 'failure' | 'timeout',
    latencyMs?: number,
    context?: Record<string, unknown>
  ): void {
    // Record trace
    this.bifrostWatch.recordAgentTrace({
      agentId,
      operation,
      startTime: Date.now() - (latencyMs || 0),
      endTime: Date.now(),
      status,
      latencyMs,
      resourceUsage: {},
      childSpans: [],
    });

    // Update circuit breaker
    this.gjallarhornProtocol.recordResult(agentId, status === 'success');

    // Record pattern for causal analysis
    this.causalEngine.recordPattern(
      `${agentId}:${operation}`,
      status === 'success' ? 'success' : 'failure',
      [agentId],
      latencyMs || 0
    );

    // Check for failure prediction
    if (context) {
      const prediction = this.causalEngine.predictFailure(agentId, operation, context);
      if (prediction) {
        this.status.recentEvents.predictionsIssued++;
      }
    }

    // Update health score
    const healthScore = this.bifrostWatch.calculateAgentHealth(agentId);
    this.status.agentHealthScores[agentId] = healthScore;

    // Check for auto-quarantine
    const quarantine = this.gjallarhornProtocol.checkAndQuarantine(healthScore);
    if (quarantine) {
      this.status.quarantinedAgents = this.gjallarhornProtocol.getQuarantinedAgents();
    }

    this.status.lastScan = Date.now();
  }

  /**
   * Record A2A message and check for drift
   */
  recordA2AMessage(
    fromAgent: AgentId,
    toAgent: AgentId,
    method: string,
    params: Record<string, unknown>,
    status: A2AMessage['status'],
    responseTime?: number
  ): void {
    this.a2aWatch.logMessage({
      fromAgent,
      toAgent,
      method,
      params,
      timestamp: Date.now(),
      responseTime,
      status,
    });

    // Analyze for drift
    const driftIndicator = this.a2aWatch.analyzeForDrift(fromAgent);
    
    if (driftIndicator.recommendation === 'quarantine') {
      this.gjallarhornProtocol.quarantineAgent(
        fromAgent,
        'hallucination_drift_detected',
        [{
          type: 'metric',
          timestamp: Date.now(),
          data: { driftScore: driftIndicator.driftScore, indicators: driftIndicator.indicators },
          description: `Drift score ${driftIndicator.driftScore.toFixed(3)} exceeds threshold`,
        }],
        true,
        ['Drift score must fall below threshold']
      );
      this.status.quarantinedAgents = this.gjallarhornProtocol.getQuarantinedAgents();
      this.addTrace(`Agent ${fromAgent} quarantined due to hallucination drift`);
    }
  }

  /**
   * Check if an operation should be allowed
   */
  shouldAllowOperation(agentId: AgentId, operation: string): { allowed: boolean; reason?: string } {
    // Check quarantine
    if (this.gjallarhornProtocol.isQuarantined(agentId)) {
      return { allowed: false, reason: `Agent ${agentId} is quarantined` };
    }

    // Check circuit breaker
    const circuitCheck = this.gjallarhornProtocol.isOperationAllowed(agentId);
    if (!circuitCheck.allowed) {
      return circuitCheck;
    }

    // Check causal predictions
    const predictionCheck = this.causalEngine.shouldBlockOperation(agentId, operation);
    if (predictionCheck.block) {
      return { allowed: false, reason: predictionCheck.reason };
    }

    return { allowed: true };
  }

  /**
   * Issue remediation to Thor
   */
  issueRemediation(
    targetAgentId: AgentId,
    action: RemediationInstruction['action'],
    priority: RemediationInstruction['priority'] = 'normal',
    params: Record<string, unknown> = {}
  ): RemediationInstruction {
    const instruction = this.gjallarhornProtocol.issueRemediation(
      targetAgentId,
      action,
      priority,
      params
    );
    this.status.recentEvents.remediationsExecuted++;
    return instruction;
  }

  /**
   * Get current HEIMDALL status
   */
  getStatus(): HeimdallStatus {
    this.status.activeAlerts = this.alertSystem.getActiveAlerts().length;
    this.status.threatLevel = this.calculateThreatLevel();
    return { ...this.status };
  }

  private calculateThreatLevel(): ThreatLevel {
    const activeAlerts = this.alertSystem.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    const quarantinedCount = this.status.quarantinedAgents.length;

    if (criticalAlerts > 0 || quarantinedCount >= 2) {
      return 'red';
    }
    if (highAlerts > 0 || quarantinedCount === 1) {
      return 'orange';
    }
    if (activeAlerts.length > 0) {
      return 'yellow';
    }
    return 'green';
  }

  /**
   * Get health data for Baldur's dashboard
   */
  getHealthDataForDashboard(): {
    agentHealthScores: Record<AgentId, AgentHealthScore>;
    threatLevel: ThreatLevel;
    activeAlerts: GjallarhornAlert[];
    quarantinedAgents: AgentId[];
    recentPredictions: FailurePrediction[];
  } {
    return {
      agentHealthScores: this.status.agentHealthScores,
      threatLevel: this.calculateThreatLevel(),
      activeAlerts: this.alertSystem.getActiveAlerts(),
      quarantinedAgents: this.gjallarhornProtocol.getQuarantinedAgents(),
      recentPredictions: this.causalEngine.getPredictions().slice(-10),
    };
  }

  /**
   * Simulate a causal conflict for testing
   */
  simulateCausalConflict(
    agentId: AgentId,
    operation: string
  ): { blocked: boolean; prediction?: FailurePrediction } {
    this.addTrace(`Simulating causal conflict for ${agentId}:${operation}`);

    // Record some failure patterns
    for (let i = 0; i < 5; i++) {
      this.causalEngine.recordPattern(
        `${agentId}:${operation}`,
        'failure',
        [agentId],
        1000 + Math.random() * 500
      );
    }

    // Now predict
    const prediction = this.causalEngine.predictFailure(agentId, operation, {
      retryCount: 3,
      latencyMs: 2000,
    });

    if (prediction) {
      const blockCheck = this.causalEngine.shouldBlockOperation(agentId, operation);
      this.addTrace(`Conflict simulation result: blocked=${blockCheck.block}`);
      return { blocked: blockCheck.block, prediction };
    }

    return { blocked: false };
  }

  getReasoningTrace(): string[] {
    return [
      ...this.reasoningTrace,
      ...this.bifrostWatch.getReasoningTrace(),
      ...this.alertSystem.getReasoningTrace(),
      ...this.causalEngine.getReasoningTrace(),
      ...this.a2aWatch.getReasoningTrace(),
      ...this.gjallarhornProtocol.getReasoningTrace(),
    ];
  }
}

// Export factory function
export function createHeimdall(config?: Partial<BifrostWatchConfig>): Heimdall {
  return new Heimdall(config);
}

export const HEIMDALL_VERSION = '1.0.0';
