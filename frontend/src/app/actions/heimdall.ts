'use server';

/**
 * HEIMDALL Server Actions
 * Server-side actions for the Sentinel monitoring system
 * ZORA CORE: Aesir Genesis - Sentinel Level
 */

import {
  createHeimdall,
  type AgentId,
  type HeimdallStatus,
  type AgentHealthScore,
  type FailurePrediction,
  type RemediationInstruction,
  type GjallarhornAlert,
} from '@/lib/monitor';

// Singleton instance for server-side use
let heimdallInstance: ReturnType<typeof createHeimdall> | null = null;

function getHeimdall() {
  if (!heimdallInstance) {
    heimdallInstance = createHeimdall({
      enableTracing: true,
      enableMetrics: true,
      enableLogging: true,
    });
  }
  return heimdallInstance;
}

/**
 * Activate HEIMDALL monitoring
 */
export async function activateHeimdall(): Promise<{
  success: boolean;
  status: HeimdallStatus;
  message: string;
}> {
  const heimdall = getHeimdall();
  heimdall.activate();

  return {
    success: true,
    status: heimdall.getStatus(),
    message: 'HEIMDALL ACTIVATED - Eternal Vigilance engaged. The Guardian sees all.',
  };
}

/**
 * Deactivate HEIMDALL monitoring
 */
export async function deactivateHeimdall(): Promise<{
  success: boolean;
  message: string;
}> {
  const heimdall = getHeimdall();
  heimdall.deactivate();

  return {
    success: true,
    message: 'HEIMDALL DEACTIVATED - Monitoring systems offline.',
  };
}

/**
 * Get current HEIMDALL status
 */
export async function getHeimdallStatus(): Promise<HeimdallStatus> {
  const heimdall = getHeimdall();
  return heimdall.getStatus();
}

/**
 * Record an agent operation for monitoring
 */
export async function recordAgentOperation(
  agentId: AgentId,
  operation: string,
  status: 'success' | 'failure' | 'timeout',
  latencyMs?: number,
  context?: Record<string, unknown>
): Promise<{
  recorded: boolean;
  healthScore: AgentHealthScore | null;
  allowed: boolean;
  reason?: string;
}> {
  const heimdall = getHeimdall();

  // Check if operation should be allowed first
  const allowCheck = heimdall.shouldAllowOperation(agentId, operation);
  if (!allowCheck.allowed) {
    return {
      recorded: false,
      healthScore: null,
      allowed: false,
      reason: allowCheck.reason,
    };
  }

  // Record the operation
  heimdall.recordAgentOperation(agentId, operation, status, latencyMs, context);

  // Get updated health score
  const currentStatus = heimdall.getStatus();
  const healthScore = currentStatus.agentHealthScores[agentId] || null;

  return {
    recorded: true,
    healthScore,
    allowed: true,
  };
}

/**
 * Record A2A message for drift detection
 */
export async function recordA2AMessage(
  fromAgent: AgentId,
  toAgent: AgentId,
  method: string,
  params: Record<string, unknown>,
  status: 'sent' | 'received' | 'processed' | 'failed' | 'timeout',
  responseTime?: number
): Promise<{
  recorded: boolean;
  driftWarning: boolean;
  quarantined: boolean;
}> {
  const heimdall = getHeimdall();
  heimdall.recordA2AMessage(fromAgent, toAgent, method, params, status, responseTime);

  const currentStatus = heimdall.getStatus();
  const isQuarantined = currentStatus.quarantinedAgents.includes(fromAgent);

  return {
    recorded: true,
    driftWarning: currentStatus.threatLevel !== 'green',
    quarantined: isQuarantined,
  };
}

/**
 * Check if an operation should be allowed
 */
export async function checkOperationAllowed(
  agentId: AgentId,
  operation: string
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const heimdall = getHeimdall();
  return heimdall.shouldAllowOperation(agentId, operation);
}

/**
 * Issue remediation instruction to Thor
 */
export async function issueRemediation(
  targetAgentId: AgentId,
  action: 'rollback' | 'hotfix' | 'restart' | 'reconfigure' | 'escalate',
  priority: 'immediate' | 'high' | 'normal' | 'low' = 'normal',
  params: Record<string, unknown> = {}
): Promise<RemediationInstruction> {
  const heimdall = getHeimdall();
  return heimdall.issueRemediation(targetAgentId, action, priority, params);
}

/**
 * Get health data for Baldur's dashboard
 */
export async function getHealthDataForDashboard(): Promise<{
  agentHealthScores: Record<AgentId, AgentHealthScore>;
  threatLevel: 'green' | 'yellow' | 'orange' | 'red';
  activeAlerts: GjallarhornAlert[];
  quarantinedAgents: AgentId[];
  recentPredictions: FailurePrediction[];
}> {
  const heimdall = getHeimdall();
  return heimdall.getHealthDataForDashboard();
}

/**
 * Simulate a causal conflict for testing
 * This demonstrates HEIMDALL's ability to detect and block risky operations
 */
export async function simulateCausalConflict(
  agentId: AgentId,
  operation: string
): Promise<{
  blocked: boolean;
  prediction: FailurePrediction | null;
  message: string;
}> {
  const heimdall = getHeimdall();
  const result = heimdall.simulateCausalConflict(agentId, operation);

  return {
    blocked: result.blocked,
    prediction: result.prediction || null,
    message: result.blocked
      ? `HEIMDALL blocked operation ${agentId}:${operation} - causal conflict detected`
      : `Operation ${agentId}:${operation} allowed - no significant risk detected`,
  };
}

/**
 * Log first live trace and send health data to dashboard
 * This fulfills the Definition of Done requirement
 */
export async function heimdallLogFirstTrace(): Promise<{
  success: boolean;
  traceId: string;
  healthData: Awaited<ReturnType<typeof getHealthDataForDashboard>>;
  message: string;
}> {
  const heimdall = getHeimdall();

  // Ensure HEIMDALL is active
  if (heimdall.getStatus().status === 'offline') {
    heimdall.activate();
  }

  // Record a trace for HEIMDALL itself (first live trace)
  heimdall.recordAgentOperation(
    'heimdall',
    'initialization',
    'success',
    50,
    { source: 'first_trace_test', timestamp: Date.now() }
  );

  // Get health data for dashboard
  const healthData = heimdall.getHealthDataForDashboard();

  return {
    success: true,
    traceId: `trace_${Date.now().toString(36)}_heimdall_init`,
    healthData,
    message: 'HEIMDALL logged first live trace and sent health data to dashboard',
  };
}

/**
 * Test the causal conflict detection and blocking
 * This fulfills the Definition of Done requirement for conflict simulation
 */
export async function heimdallTestCausalConflict(): Promise<{
  success: boolean;
  conflictDetected: boolean;
  operationBlocked: boolean;
  prediction: FailurePrediction | null;
  message: string;
}> {
  const heimdall = getHeimdall();

  // Ensure HEIMDALL is active
  if (heimdall.getStatus().status === 'offline') {
    heimdall.activate();
  }

  // Simulate a causal conflict scenario
  // This creates historical failure patterns and then checks if the operation would be blocked
  const result = heimdall.simulateCausalConflict('thor', 'deployment');

  return {
    success: true,
    conflictDetected: result.prediction !== null,
    operationBlocked: result.blocked,
    prediction: result.prediction || null,
    message: result.blocked
      ? 'SUCCESS: HEIMDALL detected causal conflict and blocked operation before execution'
      : 'Causal conflict simulation complete - operation was allowed (risk below threshold)',
  };
}

/**
 * Get HEIMDALL reasoning trace for debugging
 */
export async function getHeimdallReasoningTrace(): Promise<string[]> {
  const heimdall = getHeimdall();
  return heimdall.getReasoningTrace();
}
