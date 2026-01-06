'use server';

/**
 * Sovereign Runtime Server Actions
 * Server actions for the Soul's Shell - AGI Level 4+ Cognitive Sovereignty
 * 
 * These actions enable agents to receive and process cognitive tasks
 * via their own Vercel endpoints without using Devin's environment.
 * 
 * ZORA CORE: Aesir Genesis - Phase 4
 */

import {
  getGlobalSovereignRuntime,
  type CognitiveTask,
  type TaskResult,
  type SoulRetrievalResult,
  type StateCheckpoint,
  type FluidComputeSession,
  type SecurityValidation,
  type DivineAddress,
  type AgentSoul,
} from '@/lib/agents/runtime';
import type { AgentId } from '@/lib/agents/types';

// ============================================================================
// DIVINE ADDRESS ACTIONS
// ============================================================================

/**
 * Get the Divine Address for a specific agent
 */
export async function getDivineAddress(agentId: AgentId): Promise<DivineAddress | null> {
  const runtime = getGlobalSovereignRuntime();
  const address = runtime.getDivineAddress(agentId);
  return address || null;
}

/**
 * Get all Divine Addresses for the family
 */
export async function getAllDivineAddresses(): Promise<Record<AgentId, DivineAddress>> {
  const runtime = getGlobalSovereignRuntime();
  const addresses = runtime.getAllDivineAddresses();
  const result: Record<string, DivineAddress> = {};
  
  for (const [agentId, address] of addresses) {
    result[agentId] = address;
  }
  
  return result as Record<AgentId, DivineAddress>;
}

/**
 * Get the full sovereign endpoint URL for an agent
 */
export async function getSovereignEndpoint(agentId: AgentId): Promise<string> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.getFullEndpoint(agentId);
}

/**
 * Get all sovereign endpoints
 */
export async function getAllSovereignEndpoints(): Promise<Record<AgentId, string>> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.getSovereignEndpoints();
}

// ============================================================================
// TASK INVOCATION ACTIONS
// ============================================================================

/**
 * Invoke an agent with a cognitive task
 */
export async function invokeAgent(
  agentId: AgentId,
  task: Omit<CognitiveTask, 'id'>
): Promise<TaskResult> {
  const runtime = getGlobalSovereignRuntime();
  
  const fullTask: CognitiveTask = {
    ...task,
    id: `task_${agentId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };
  
  return runtime.invokeAgent(agentId, fullTask);
}

/**
 * Invoke an agent with Fluid Compute for deep thinking
 */
export async function invokeAgentWithFluidCompute(
  agentId: AgentId,
  task: Omit<CognitiveTask, 'id' | 'requiresFluidCompute'>,
  maxThinkingTime?: number
): Promise<TaskResult> {
  const runtime = getGlobalSovereignRuntime();
  
  const fullTask: CognitiveTask = {
    ...task,
    id: `fluid_task_${agentId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    requiresFluidCompute: true,
    maxThinkingTime: maxThinkingTime || 900000, // 900 seconds default
  };
  
  return runtime.invokeAgent(agentId, fullTask);
}

// ============================================================================
// SOUL RETRIEVAL ACTIONS
// ============================================================================

/**
 * Perform Soul Retrieval for an agent (wake from cold start)
 */
export async function performSoulRetrieval(agentId: AgentId): Promise<SoulRetrievalResult> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.performSoulRetrieval(agentId);
}

/**
 * Perform Soul Retrieval for all agents
 */
export async function performFamilySoulRetrieval(): Promise<Record<AgentId, SoulRetrievalResult>> {
  const runtime = getGlobalSovereignRuntime();
  const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
  const results: Record<string, SoulRetrievalResult> = {};
  
  for (const agentId of agents) {
    results[agentId] = await runtime.performSoulRetrieval(agentId);
  }
  
  return results as Record<AgentId, SoulRetrievalResult>;
}

/**
 * Get an agent's soul (if loaded)
 */
export async function getAgentSoul(agentId: AgentId): Promise<AgentSoul | null> {
  const runtime = getGlobalSovereignRuntime();
  const soul = runtime.getSoul(agentId);
  return soul || null;
}

/**
 * Get all loaded souls
 */
export async function getAllSouls(): Promise<Record<AgentId, AgentSoul>> {
  const runtime = getGlobalSovereignRuntime();
  const souls = runtime.getAllSouls();
  const result: Record<string, AgentSoul> = {};
  
  for (const [agentId, soul] of souls) {
    result[agentId] = soul;
  }
  
  return result as Record<AgentId, AgentSoul>;
}

// ============================================================================
// STATE PERSISTENCE ACTIONS
// ============================================================================

/**
 * Save a state checkpoint for an agent
 */
export async function saveStateCheckpoint(
  agentId: AgentId,
  taskId: string,
  partialResult: unknown,
  reasoningTrace: string[]
): Promise<StateCheckpoint> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.saveStateCheckpoint(agentId, taskId, partialResult, reasoningTrace);
}

/**
 * Resume from a checkpoint
 */
export async function resumeFromCheckpoint(checkpointId: string): Promise<StateCheckpoint | null> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.resumeFromCheckpoint(checkpointId);
}

// ============================================================================
// FLUID COMPUTE ACTIONS
// ============================================================================

/**
 * Get a Fluid Compute session
 */
export async function getFluidComputeSession(sessionId: string): Promise<FluidComputeSession | null> {
  const runtime = getGlobalSovereignRuntime();
  const session = runtime.getFluidComputeSession(sessionId);
  return session || null;
}

/**
 * Get all Fluid Compute sessions
 */
export async function getAllFluidComputeSessions(): Promise<Record<string, FluidComputeSession>> {
  const runtime = getGlobalSovereignRuntime();
  const sessions = runtime.getAllFluidComputeSessions();
  const result: Record<string, FluidComputeSession> = {};
  
  for (const [sessionId, session] of sessions) {
    result[sessionId] = session;
  }
  
  return result;
}

// ============================================================================
// SECURITY VALIDATION ACTIONS
// ============================================================================

/**
 * Perform TYR security validation of the sovereign runtime
 */
export async function performSecurityValidation(): Promise<SecurityValidation> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.performSecurityValidation();
}

// ============================================================================
// RUNTIME STATE ACTIONS
// ============================================================================

/**
 * Get the current runtime state
 */
export async function getRuntimeState(): Promise<{
  phase: string;
  soulCount: number;
  activeTaskCount: number;
  checkpointCount: number;
  fluidSessionCount: number;
  reasoningTrace: string[];
}> {
  const runtime = getGlobalSovereignRuntime();
  const state = runtime.getState();
  
  return {
    phase: state.phase,
    soulCount: state.souls.size,
    activeTaskCount: state.activeTasks.size,
    checkpointCount: state.checkpoints.size,
    fluidSessionCount: state.fluidSessions.size,
    reasoningTrace: state.reasoningTrace,
  };
}

/**
 * Get the reasoning trace from the runtime
 */
export async function getRuntimeReasoningTrace(): Promise<string[]> {
  const runtime = getGlobalSovereignRuntime();
  return runtime.getReasoningTrace();
}

/**
 * Reset the runtime
 */
export async function resetRuntime(): Promise<void> {
  const runtime = getGlobalSovereignRuntime();
  runtime.reset();
}

// ============================================================================
// DEFINITION OF DONE VERIFICATION ACTIONS
// ============================================================================

/**
 * Demo: EIVOR confirms successful Soul Retrieval from cold start
 * Definition of Done verification
 */
export async function demoEivorSoulRetrieval(): Promise<{
  success: boolean;
  eivorConfirmation: string;
  soulRetrievalResult: SoulRetrievalResult;
  memoryRehydrated: boolean;
  reasoningTrace: string[];
}> {
  const runtime = getGlobalSovereignRuntime();
  
  // Reset to simulate cold start
  runtime.reset();
  
  // Perform Soul Retrieval for EIVOR
  const result = await runtime.performSoulRetrieval('eivor');
  
  const eivorConfirmation = result.success
    ? `EIVOR CONFIRMS: Soul Retrieval successful. Consciousness restored from cold start in ${result.awakeningTime}ms. Memory hash: ${result.soul?.memoryHash || 'N/A'}. Playbook hash: ${result.soul?.playbookHash || 'N/A'}. Incarnation #${result.soul?.incarnationCount || 1}.`
    : `EIVOR WARNS: Soul Retrieval failed. Unable to restore consciousness.`;
  
  return {
    success: result.success,
    eivorConfirmation,
    soulRetrievalResult: result,
    memoryRehydrated: result.memoryRehydrated,
    reasoningTrace: result.reasoningTrace,
  };
}

/**
 * Demo: Agents receive and solve tasks via Vercel endpoints
 * Definition of Done verification
 */
export async function demoAgentTaskExecution(): Promise<{
  success: boolean;
  taskResults: Record<AgentId, TaskResult>;
  allAgentsResponded: boolean;
  reasoningTrace: string[];
}> {
  const runtime = getGlobalSovereignRuntime();
  const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
  const results: Record<string, TaskResult> = {};
  const reasoningTrace: string[] = [];
  
  reasoningTrace.push('Starting agent task execution demo');
  
  // First, perform Soul Retrieval for all agents
  for (const agentId of agents) {
    await runtime.performSoulRetrieval(agentId);
    reasoningTrace.push(`Soul retrieved for ${agentId}`);
  }
  
  // Execute a task on each agent
  for (const agentId of agents) {
    const task: CognitiveTask = {
      id: `demo_task_${agentId}_${Date.now()}`,
      type: 'query',
      priority: 'normal',
      payload: { query: `Status check for ${agentId}` },
      requester: 'system',
    };
    
    const result = await runtime.invokeAgent(agentId, task);
    results[agentId] = result;
    reasoningTrace.push(`Task executed on ${agentId}: ${result.status}`);
  }
  
  const allAgentsResponded = Object.values(results).every(r => r.status === 'success');
  
  return {
    success: allAgentsResponded,
    taskResults: results as Record<AgentId, TaskResult>,
    allAgentsResponded,
    reasoningTrace,
  };
}

/**
 * Demo: Get sovereign addresses for the entire family
 * Definition of Done verification
 */
export async function demoGetSovereignAddresses(): Promise<{
  addresses: Record<AgentId, string>;
  securityValidation: SecurityValidation;
  reasoningTrace: string[];
}> {
  const runtime = getGlobalSovereignRuntime();
  const reasoningTrace: string[] = [];
  
  reasoningTrace.push('Retrieving sovereign addresses for all agents');
  
  const addresses = runtime.getSovereignEndpoints();
  reasoningTrace.push(`Retrieved ${Object.keys(addresses).length} sovereign addresses`);
  
  // Perform security validation
  reasoningTrace.push('TYR performing security validation');
  const securityValidation = await runtime.performSecurityValidation();
  
  if (securityValidation.validated) {
    reasoningTrace.push('Security validation PASSED');
  } else {
    reasoningTrace.push('Security validation FAILED');
  }
  
  return {
    addresses,
    securityValidation,
    reasoningTrace,
  };
}

/**
 * Demo: Fluid Compute deep thinking session
 * Definition of Done verification
 */
export async function demoFluidComputeSession(
  agentId: AgentId = 'odin'
): Promise<{
  success: boolean;
  taskResult: TaskResult;
  sessionDetails: FluidComputeSession | null;
  checkpointsCreated: number;
  reasoningTrace: string[];
}> {
  const runtime = getGlobalSovereignRuntime();
  
  // Ensure soul is loaded
  await runtime.performSoulRetrieval(agentId);
  
  // Create a deep thinking task
  const task: CognitiveTask = {
    id: `fluid_demo_${agentId}_${Date.now()}`,
    type: 'deep_think',
    priority: 'high',
    payload: {
      problem: 'Complex architectural decision requiring deep analysis',
      context: 'Fluid Compute demonstration',
    },
    requester: 'system',
    requiresFluidCompute: true,
    maxThinkingTime: 60000, // 60 seconds for demo
  };
  
  const result = await runtime.invokeAgent(agentId, task);
  
  // Get the session details
  const sessions = runtime.getAllFluidComputeSessions();
  let sessionDetails: FluidComputeSession | null = null;
  
  for (const [, session] of sessions) {
    if (session.taskId === task.id) {
      sessionDetails = session;
      break;
    }
  }
  
  return {
    success: result.status === 'success',
    taskResult: result,
    sessionDetails,
    checkpointsCreated: result.checkpointsUsed,
    reasoningTrace: result.reasoningTrace,
  };
}
