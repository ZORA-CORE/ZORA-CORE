'use server';

/**
 * A2A Protocol Server Actions
 * Asgård Mesh - Agent-to-Agent Communication
 * ZORA CORE: Aesir Genesis - Phase 3
 */

import {
  getGlobalMesh,
  getGlobalRaven,
  getGlobalYggdrasil,
  type AgentId,
  type DivineMessage,
  type DelegationTask,
  type OdinDirective,
  type SubTask,
  type SharedContext,
  type MemoryBroadcast,
  type SyncEvent,
} from '@/lib/agents';

// ============================================================================
// Asgård Mesh Actions
// ============================================================================

export async function meshSendDivineMessage(
  from: AgentId,
  to: AgentId | 'council' | 'broadcast',
  type: DivineMessage['payload']['type'],
  content: string,
  options?: {
    priority?: 'critical' | 'high' | 'normal' | 'low';
    ttl?: number;
    requireAck?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean; message?: DivineMessage; error?: string }> {
  try {
    const mesh = getGlobalMesh();
    const message = await mesh.sendDivineMessage(from, to, type, content, options);
    return { success: true, message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function meshGetStatus(): Promise<{
  version: string;
  protocol: string;
  addresses: Array<{
    agentId: AgentId;
    realm: string;
    endpoint: string;
    status: string;
    lastSeen: number;
  }>;
  connections: Array<{
    agentId: AgentId;
    connectionId: string;
    status: string;
    messageCount: number;
  }>;
  activeDelegations: number;
  activeStreams: number;
  queueSize: number;
  pendingAcks: number;
}> {
  const mesh = getGlobalMesh();
  return mesh.getMeshStatus();
}

export async function meshGetMessageHistory(filter?: {
  from?: AgentId;
  to?: AgentId | 'council' | 'broadcast';
  type?: DivineMessage['payload']['type'];
  since?: number;
  limit?: number;
}): Promise<DivineMessage[]> {
  const mesh = getGlobalMesh();
  return mesh.getMessageHistory(filter);
}

export async function meshEstablishConnection(agentId: AgentId): Promise<{
  connectionId: string;
  status: string;
  established: number;
}> {
  const mesh = getGlobalMesh();
  const connection = mesh.establishSSEConnection(agentId);
  return {
    connectionId: connection.connectionId,
    status: connection.status,
    established: connection.established,
  };
}

export async function meshCloseConnection(agentId: AgentId): Promise<{ success: boolean }> {
  const mesh = getGlobalMesh();
  mesh.closeSSEConnection(agentId);
  return { success: true };
}

export async function meshHeartbeat(agentId: AgentId): Promise<{ success: boolean }> {
  const mesh = getGlobalMesh();
  const result = mesh.heartbeat(agentId);
  return { success: result };
}

// ============================================================================
// Raven's Message Actions (Delegation & Orchestration)
// ============================================================================

export async function ravenCreateDirective(
  type: OdinDirective['type'],
  description: string,
  priority?: OdinDirective['priority'],
  constraints?: OdinDirective['constraints']
): Promise<{ success: boolean; directive?: OdinDirective; error?: string }> {
  try {
    const raven = getGlobalRaven();
    const directive = await raven.createDirective(type, description, priority, constraints);
    return { success: true, directive };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenPlanSubTasks(
  directiveId: string,
  tasks: Array<{
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    requiredCapabilities?: string[];
    dependencies?: string[];
  }>
): Promise<{ success: boolean; subTasks?: SubTask[]; error?: string }> {
  try {
    const raven = getGlobalRaven();
    const subTasks = await raven.planSubTasks(directiveId, tasks);
    return { success: true, subTasks };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenDelegateSubTask(
  subTaskId: string
): Promise<{ success: boolean; delegation?: DelegationTask; error?: string }> {
  try {
    const raven = getGlobalRaven();
    const delegation = await raven.delegateSubTask(subTaskId);
    return { success: true, delegation };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenDelegateAllSubTasks(
  directiveId: string
): Promise<{ success: boolean; delegations?: DelegationTask[]; error?: string }> {
  try {
    const raven = getGlobalRaven();
    const delegations = await raven.delegateAllSubTasks(directiveId);
    return { success: true, delegations };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenHandleStatusUpdate(
  delegationId: string,
  agentId: AgentId,
  status: string,
  progress: number,
  message: string,
  data?: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const raven = getGlobalRaven();
    await raven.handleStatusUpdate(delegationId, agentId, status, progress, message, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenRequestHelp(
  fromAgent: AgentId,
  helpType: 'technical' | 'decision' | 'resource' | 'escalation',
  context: Record<string, unknown>
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const raven = getGlobalRaven();
    const requestId = await raven.requestHelp(fromAgent, helpType, context);
    return { success: true, requestId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenBroadcastLearning(
  fromAgent: AgentId,
  lessonType: string,
  lesson: {
    title: string;
    description: string;
    context: Record<string, unknown>;
    recommendations: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const raven = getGlobalRaven();
    await raven.broadcastLearning(fromAgent, lessonType, lesson);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function ravenGetDirective(
  directiveId: string
): Promise<OdinDirective | undefined> {
  const raven = getGlobalRaven();
  return raven.getDirective(directiveId);
}

export async function ravenGetDirectiveProgress(directiveId: string): Promise<{
  overall: number;
  byAgent: Record<AgentId, number>;
  byStatus: Record<string, number>;
} | null> {
  const raven = getGlobalRaven();
  return raven.getDirectiveProgress(directiveId);
}

export async function ravenGetAgentWorkload(): Promise<
  Record<AgentId, { current: number; max: number; tasks: string[] }>
> {
  const raven = getGlobalRaven();
  return raven.getAgentWorkload();
}

export async function ravenGetStatus(): Promise<{
  version: string;
  activeDirectives: number;
  pendingSubTasks: number;
  completedSubTasks: number;
  totalStatusUpdates: number;
  agentAvailability: Record<AgentId, string>;
}> {
  const raven = getGlobalRaven();
  return raven.getRavenStatus();
}

// ============================================================================
// Yggdrasil Sync Actions (Shared Context & State)
// ============================================================================

export async function yggdrasilCreateSharedContext(
  source: AgentId,
  type: SharedContext['type'],
  title: string,
  description: string,
  data: Record<string, unknown>,
  options?: {
    tags?: string[];
    broadcast?: boolean;
    recipients?: AgentId[];
    ttl?: number;
  }
): Promise<{ success: boolean; context?: SharedContext; error?: string }> {
  try {
    const yggdrasil = getGlobalYggdrasil();
    const context = await yggdrasil.createSharedContext(
      source,
      type,
      title,
      description,
      data,
      options
    );
    return { success: true, context };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function yggdrasilAcknowledgeContext(
  contextId: string,
  agentId: AgentId
): Promise<{ success: boolean; error?: string }> {
  try {
    const yggdrasil = getGlobalYggdrasil();
    const result = await yggdrasil.acknowledgeContext(contextId, agentId);
    return { success: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function yggdrasilBroadcastMemory(
  source: AgentId,
  type: MemoryBroadcast['type'],
  title: string,
  description: string,
  category: string,
  importance: number,
  data: Record<string, unknown>,
  applicableAgents?: AgentId[]
): Promise<{ success: boolean; broadcast?: MemoryBroadcast; error?: string }> {
  try {
    const yggdrasil = getGlobalYggdrasil();
    const broadcast = await yggdrasil.broadcastMemory(
      source,
      type,
      title,
      description,
      category,
      importance,
      data,
      applicableAgents
    );
    return { success: true, broadcast };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function yggdrasilPerformGlobalSync(): Promise<{
  success: boolean;
  syncEvent?: SyncEvent;
  error?: string;
}> {
  try {
    const yggdrasil = getGlobalYggdrasil();
    const syncEvent = await yggdrasil.performGlobalSync();
    return { success: true, syncEvent };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function yggdrasilSyncAgentState(
  agentId: AgentId,
  newState: {
    status?: 'online' | 'offline' | 'busy' | 'quarantined';
    healthScore?: number;
    pendingSync?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const yggdrasil = getGlobalYggdrasil();
    await yggdrasil.syncAgentState(agentId, newState);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function yggdrasilGetSharedContext(
  contextId: string
): Promise<SharedContext | undefined> {
  const yggdrasil = getGlobalYggdrasil();
  return yggdrasil.getSharedContext(contextId);
}

export async function yggdrasilGetAgentContexts(agentId: AgentId): Promise<SharedContext[]> {
  const yggdrasil = getGlobalYggdrasil();
  return yggdrasil.getAgentContexts(agentId);
}

export async function yggdrasilGetContextsByType(
  type: SharedContext['type']
): Promise<SharedContext[]> {
  const yggdrasil = getGlobalYggdrasil();
  return yggdrasil.getContextsByType(type);
}

export async function yggdrasilGetRecentBroadcasts(limit?: number): Promise<MemoryBroadcast[]> {
  const yggdrasil = getGlobalYggdrasil();
  return yggdrasil.getRecentBroadcasts(limit);
}

export async function yggdrasilGetGlobalState(): Promise<{
  version: string;
  lastUpdated: number;
  stateHash: string;
  agentCount: number;
  sharedContextCount: number;
  syncHistoryCount: number;
  conflictCount: number;
}> {
  const yggdrasil = getGlobalYggdrasil();
  const state = yggdrasil.getGlobalState();
  return {
    version: state.version,
    lastUpdated: state.lastUpdated,
    stateHash: state.stateHash,
    agentCount: Object.keys(state.agents).length,
    sharedContextCount: state.sharedContexts.length,
    syncHistoryCount: state.syncHistory.length,
    conflictCount: state.conflictLog.length,
  };
}

export async function yggdrasilGetStatus(): Promise<{
  version: string;
  globalStateHash: string;
  lastSync: number;
  activeContexts: number;
  memoryBroadcasts: number;
  syncEvents: number;
  conflicts: number;
  agentStatus: Record<AgentId, { status: string; healthScore: number; lastSync: number }>;
}> {
  const yggdrasil = getGlobalYggdrasil();
  return yggdrasil.getYggdrasilStatus();
}

export async function yggdrasilExportStateForAgentsJson(): Promise<{
  mesh: {
    version: string;
    protocol: string;
    addresses: Record<AgentId, string>;
  };
  sync: {
    version: string;
    lastSync: number;
    stateHash: string;
  };
  coordination: {
    activeContexts: number;
    recentSyncs: number;
    healthScores: Record<AgentId, number>;
  };
}> {
  const yggdrasil = getGlobalYggdrasil();
  return yggdrasil.exportStateForAgentsJson();
}

// ============================================================================
// Combined A2A Protocol Actions
// ============================================================================

/**
 * Simulate ODIN delegating a technical task to THOR via Asgård Mesh
 * This demonstrates the Definition of Done requirement
 */
export async function simulateOdinToThorDelegation(
  taskDescription: string,
  taskType: string = 'infrastructure'
): Promise<{
  success: boolean;
  directive?: OdinDirective;
  delegations?: DelegationTask[];
  messages?: DivineMessage[];
  error?: string;
}> {
  try {
    const raven = getGlobalRaven();
    const mesh = getGlobalMesh();

    // Step 1: ODIN creates a directive
    const directive = await raven.createDirective(
      'task_delegation',
      taskDescription,
      'high',
      { deadline: Date.now() + 3600000 } // 1 hour deadline
    );

    // Step 2: Plan sub-tasks for THOR
    await raven.planSubTasks(directive.id, [
      {
        type: taskType,
        description: taskDescription,
        parameters: { source: 'odin', priority: 'high' },
        requiredCapabilities: ['infrastructure', 'deployment'],
      },
    ]);

    // Step 3: Delegate to THOR via Asgård Mesh
    const delegations = await raven.delegateAllSubTasks(directive.id);

    // Step 4: Get message history for verification
    const messages = mesh.getMessageHistory({
      from: 'odin',
      to: 'thor',
      limit: 10,
    });

    return {
      success: true,
      directive,
      delegations,
      messages,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get comprehensive A2A Protocol status
 */
export async function getA2AProtocolStatus(): Promise<{
  mesh: Awaited<ReturnType<typeof meshGetStatus>>;
  raven: Awaited<ReturnType<typeof ravenGetStatus>>;
  yggdrasil: Awaited<ReturnType<typeof yggdrasilGetStatus>>;
}> {
  return {
    mesh: await meshGetStatus(),
    raven: await ravenGetStatus(),
    yggdrasil: await yggdrasilGetStatus(),
  };
}

/**
 * Get reasoning traces from all A2A Protocol components
 */
export async function getA2AReasoningTraces(): Promise<{
  mesh: string[];
  raven: string[];
  yggdrasil: string[];
}> {
  const mesh = getGlobalMesh();
  const raven = getGlobalRaven();
  const yggdrasil = getGlobalYggdrasil();

  return {
    mesh: mesh.getReasoningTrace(),
    raven: raven.getReasoningTrace(),
    yggdrasil: yggdrasil.getReasoningTrace(),
  };
}
