/**
 * HEIMDALL Monitoring Types
 * Type definitions for the Bifrost Watch and Gjallarhorn Protocol
 * ZORA CORE: Aesir Genesis - Sentinel Level
 */

export type AgentId = 'odin' | 'thor' | 'baldur' | 'tyr' | 'eivor' | 'freya' | 'heimdall';

export type ThreatLevel = 'green' | 'yellow' | 'orange' | 'red';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type MonitoringLayer = 'network' | 'application' | 'data' | 'infrastructure' | 'agent';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical' | 'unknown';

export type QuarantineReason = 
  | 'success_rate_below_threshold'
  | 'hallucination_drift_detected'
  | 'cascade_failure_risk'
  | 'cognitive_focus_lost'
  | 'manual_intervention';

export interface TelemetrySpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  agentId: AgentId;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'timeout';
  attributes: Record<string, string | number | boolean>;
  events: TelemetryEvent[];
}

export interface TelemetryEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, string | number | boolean>;
}

export interface AgentTrace {
  agentId: AgentId;
  traceId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'success' | 'failure' | 'timeout';
  latencyMs?: number;
  resourceUsage: ResourceMetrics;
  childSpans: TelemetrySpan[];
  errorMessage?: string;
}

export interface ResourceMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  networkIO?: number;
  apiCalls?: number;
  tokensUsed?: number;
}

export interface AgentHealthScore {
  agentId: AgentId;
  overallScore: number;
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
  lastUpdated: number;
  status: HealthStatus;
  recentFailures: number;
  totalOperations: number;
  cognitiveIntegrity: number;
}

export interface BifrostWatchConfig {
  telemetryEndpoint?: string;
  axiomDataset?: string;
  sampleRate: number;
  flushIntervalMs: number;
  maxBatchSize: number;
  enableTracing: boolean;
  enableMetrics: boolean;
  enableLogging: boolean;
}

export interface GjallarhornAlertConfig {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldownMs: number;
  enabled: boolean;
}

export interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'pattern' | 'cascade';
  metric?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value?: number;
  windowMs?: number;
  pattern?: string;
  agents?: AgentId[];
}

export interface AlertAction {
  type: 'notify' | 'warn' | 'quarantine' | 'rollback' | 'escalate' | 'remediate';
  target?: string;
  params?: Record<string, unknown>;
}

export interface GjallarhornAlert {
  id: string;
  alertConfigId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggeredAt: number;
  resolvedAt?: number;
  source: {
    layer: MonitoringLayer;
    agentId?: AgentId;
    component?: string;
  };
  evidence: AlertEvidence[];
  actionsTaken: string[];
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
}

export interface AlertEvidence {
  type: 'metric' | 'log' | 'trace' | 'pattern';
  timestamp: number;
  data: Record<string, unknown>;
  description: string;
}

export interface CausalNode {
  id: string;
  agentId: AgentId;
  operation: string;
  timestamp: number;
  outcome: 'success' | 'failure' | 'pending';
  dependencies: string[];
  dependents: string[];
  riskScore: number;
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: Array<{ from: string; to: string; weight: number }>;
  lastUpdated: number;
}

export interface FailurePrediction {
  id: string;
  predictedAt: number;
  targetAgentId: AgentId;
  targetOperation: string;
  failureProbability: number;
  cascadeRisk: number;
  triggerConditions: string[];
  preventiveActions: string[];
  confidence: number;
  historicalCorrelations: HistoricalCorrelation[];
}

export interface HistoricalCorrelation {
  pattern: string;
  occurrences: number;
  failureRate: number;
  avgTimeToFailure: number;
  relatedAgents: AgentId[];
}

export interface A2AMessage {
  id: string;
  fromAgent: AgentId;
  toAgent: AgentId;
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
  responseTime?: number;
  status: 'sent' | 'received' | 'processed' | 'failed' | 'timeout';
}

export interface HallucinationDriftIndicator {
  agentId: AgentId;
  timestamp: number;
  driftScore: number;
  indicators: {
    contextCoherence: number;
    responseRelevance: number;
    factualConsistency: number;
    taskAlignment: number;
  };
  recentMessages: A2AMessage[];
  recommendation: 'monitor' | 'warn' | 'intervene' | 'quarantine';
}

export interface AgentQuarantine {
  agentId: AgentId;
  quarantinedAt: number;
  reason: QuarantineReason;
  evidence: AlertEvidence[];
  autoRelease: boolean;
  releaseConditions?: string[];
  releasedAt?: number;
  releasedBy?: string;
}

export interface RemediationInstruction {
  id: string;
  targetAgentId: AgentId;
  action: 'rollback' | 'hotfix' | 'restart' | 'reconfigure' | 'escalate';
  priority: 'immediate' | 'high' | 'normal' | 'low';
  params: Record<string, unknown>;
  issuedAt: number;
  issuedBy: 'heimdall';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: {
    success: boolean;
    message: string;
    completedAt: number;
  };
}

export interface CognitiveCircuitBreaker {
  agentId: AgentId;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailure?: number;
  lastSuccess?: number;
  openedAt?: number;
  halfOpenAt?: number;
  thresholds: {
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
    halfOpenRequests: number;
  };
}

export interface HeimdallStatus {
  status: 'watching' | 'investigating' | 'responding' | 'lockdown' | 'offline';
  level: 'Sentinel Level';
  threatLevel: ThreatLevel;
  activeAlerts: number;
  monitoringStatus: Record<MonitoringLayer, 'active' | 'degraded' | 'offline'>;
  agentHealthScores: Record<AgentId, AgentHealthScore>;
  quarantinedAgents: AgentId[];
  recentEvents: {
    authFailures: number;
    accessDenials: number;
    anomaliesDetected: number;
    predictionsIssued: number;
    remediationsExecuted: number;
  };
  lastScan: number;
  reasoningTrace: string[];
}

export interface BifrostWatchState {
  isActive: boolean;
  startedAt: number;
  tracesCollected: number;
  alertsTriggered: number;
  currentThreatLevel: ThreatLevel;
  agentTraces: Map<AgentId, AgentTrace[]>;
  recentAlerts: GjallarhornAlert[];
}

export const DEFAULT_BIFROST_CONFIG: BifrostWatchConfig = {
  sampleRate: 1.0,
  flushIntervalMs: 5000,
  maxBatchSize: 100,
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true,
};

export const HEALTH_THRESHOLDS = {
  successRateMin: 0.90,
  latencyP95MaxMs: 1000,
  errorRateMax: 0.10,
  cognitiveIntegrityMin: 0.85,
  driftScoreMax: 0.30,
};

export const CIRCUIT_BREAKER_DEFAULTS = {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 30000,
  halfOpenRequests: 3,
};
