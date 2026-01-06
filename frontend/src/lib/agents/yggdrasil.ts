/**
 * Yggdrasil Sync - Shared Context & State Synchronization
 * Ensures EIVOR's memory flows freely through the mesh
 * Implements state reconciliation across all agents via agents.json
 * ZORA CORE: Aesir Genesis - Phase 3
 */

import { createHash } from 'crypto';
import type { AgentId } from './types';
import { AsgardMesh, getGlobalMesh } from './mesh';

export const YGGDRASIL_VERSION = '1.0.0';

export interface YggdrasilConfig {
  syncInterval: number;
  maxBroadcastSize: number;
  conflictResolution: 'latest_wins' | 'merge' | 'odin_decides';
  enableAutoSync: boolean;
  stateRetentionCount: number;
}

export interface SharedContext {
  id: string;
  type: 'lesson' | 'pattern' | 'decision' | 'alert' | 'state_update' | 'memory_fragment';
  source: AgentId;
  timestamp: number;
  content: {
    title: string;
    description: string;
    data: Record<string, unknown>;
    tags: string[];
  };
  distribution: {
    broadcast: boolean;
    recipients: AgentId[];
    acknowledged: AgentId[];
  };
  hash: string;
  expiresAt?: number;
}

export interface AgentState {
  agentId: AgentId;
  status: 'online' | 'offline' | 'busy' | 'quarantined';
  meshAddress: string;
  lastSync: number;
  stateHash: string;
  healthScore: number;
  activeContexts: string[];
  pendingSync: boolean;
}

export interface GlobalState {
  version: string;
  lastUpdated: number;
  stateHash: string;
  agents: Record<AgentId, AgentState>;
  sharedContexts: SharedContext[];
  syncHistory: SyncEvent[];
  conflictLog: ConflictEvent[];
}

export interface SyncEvent {
  id: string;
  timestamp: number;
  type: 'full_sync' | 'partial_sync' | 'broadcast' | 'reconciliation';
  initiator: AgentId | 'system';
  participants: AgentId[];
  contextIds: string[];
  success: boolean;
  duration: number;
}

export interface ConflictEvent {
  id: string;
  timestamp: number;
  contextId: string;
  conflictingAgents: AgentId[];
  resolution: 'latest_wins' | 'merged' | 'odin_decided' | 'pending';
  resolvedBy?: AgentId;
  details: string;
}

export interface MemoryBroadcast {
  id: string;
  source: AgentId;
  timestamp: number;
  type: 'lesson_learned' | 'pattern_detected' | 'failure_prevention' | 'success_trajectory';
  content: {
    title: string;
    description: string;
    category: string;
    importance: number;
    applicableAgents: AgentId[];
    data: Record<string, unknown>;
  };
  hash: string;
}

const DEFAULT_YGGDRASIL_CONFIG: YggdrasilConfig = {
  syncInterval: 30000,
  maxBroadcastSize: 1048576,
  conflictResolution: 'latest_wins',
  enableAutoSync: true,
  stateRetentionCount: 100,
};

export class YggdrasilSync {
  private config: YggdrasilConfig;
  private mesh: AsgardMesh;
  private globalState: GlobalState;
  private sharedContexts: Map<string, SharedContext> = new Map();
  private memoryBroadcasts: Map<string, MemoryBroadcast> = new Map();
  private reasoningTrace: string[] = [];
  private contextCounter: number = 0;
  private syncCounter: number = 0;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<YggdrasilConfig> = {}, mesh?: AsgardMesh) {
    this.config = { ...DEFAULT_YGGDRASIL_CONFIG, ...config };
    this.mesh = mesh || getGlobalMesh();
    this.globalState = this.initializeGlobalState();
    this.addTrace('Yggdrasil Sync initialized');

    if (this.config.enableAutoSync) {
      this.startAutoSync();
    }
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [YGGDRASIL] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
  }

  private initializeGlobalState(): GlobalState {
    const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
    const agentStates: Partial<Record<AgentId, AgentState>> = {};

    for (const agentId of agents) {
      agentStates[agentId] = {
        agentId,
        status: 'online',
        meshAddress: `mesh://${agentId}.asgard.zora`,
        lastSync: Date.now(),
        stateHash: this.generateHash(`${agentId}_initial_${Date.now()}`),
        healthScore: 1.0,
        activeContexts: [],
        pendingSync: false,
      };
    }

    return {
      version: YGGDRASIL_VERSION,
      lastUpdated: Date.now(),
      stateHash: this.generateHash(`global_initial_${Date.now()}`),
      agents: agentStates as Record<AgentId, AgentState>,
      sharedContexts: [],
      syncHistory: [],
      conflictLog: [],
    };
  }

  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private generateContextId(): string {
    this.contextCounter++;
    return `ctx_${Date.now()}_${this.contextCounter}`;
  }

  private generateSyncId(): string {
    this.syncCounter++;
    return `sync_${Date.now()}_${this.syncCounter}`;
  }

  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.performGlobalSync().catch(error => {
        this.addTrace('Auto-sync failed', { error: String(error) });
      });
    }, this.config.syncInterval);

    this.addTrace('Auto-sync started', { interval: this.config.syncInterval });
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.addTrace('Auto-sync stopped');
    }
  }

  async createSharedContext(
    source: AgentId,
    type: SharedContext['type'],
    title: string,
    description: string,
    data: Record<string, unknown>,
    options: {
      tags?: string[];
      broadcast?: boolean;
      recipients?: AgentId[];
      ttl?: number;
    } = {}
  ): Promise<SharedContext> {
    const contextId = this.generateContextId();
    const timestamp = Date.now();

    const context: SharedContext = {
      id: contextId,
      type,
      source,
      timestamp,
      content: {
        title,
        description,
        data,
        tags: options.tags || [],
      },
      distribution: {
        broadcast: options.broadcast ?? true,
        recipients: options.recipients || [],
        acknowledged: [source],
      },
      hash: this.generateHash(`${contextId}_${JSON.stringify(data)}_${timestamp}`),
      expiresAt: options.ttl ? timestamp + options.ttl : undefined,
    };

    this.sharedContexts.set(contextId, context);
    this.globalState.sharedContexts.push(context);

    const agentState = this.globalState.agents[source];
    if (agentState) {
      agentState.activeContexts.push(contextId);
      agentState.lastSync = timestamp;
    }

    if (context.distribution.broadcast) {
      await this.broadcastContext(context);
    } else if (context.distribution.recipients.length > 0) {
      await this.distributeContext(context, context.distribution.recipients);
    }

    this.addTrace('Shared context created', { id: contextId, type, source });

    return context;
  }

  private async broadcastContext(context: SharedContext): Promise<void> {
    await this.mesh.sendDivineMessage(
      context.source,
      'broadcast',
      'memory_broadcast',
      JSON.stringify({
        contextId: context.id,
        type: context.type,
        content: context.content,
        hash: context.hash,
      }),
      { priority: 'normal' }
    );

    this.addTrace('Context broadcast', { contextId: context.id });
  }

  private async distributeContext(context: SharedContext, recipients: AgentId[]): Promise<void> {
    for (const recipient of recipients) {
      await this.mesh.sendDivineMessage(
        context.source,
        recipient,
        'memory_broadcast',
        JSON.stringify({
          contextId: context.id,
          type: context.type,
          content: context.content,
          hash: context.hash,
        }),
        { priority: 'normal' }
      );
    }

    this.addTrace('Context distributed', { contextId: context.id, recipients });
  }

  async acknowledgeContext(contextId: string, agentId: AgentId): Promise<boolean> {
    const context = this.sharedContexts.get(contextId);
    if (!context) return false;

    if (!context.distribution.acknowledged.includes(agentId)) {
      context.distribution.acknowledged.push(agentId);
    }

    const agentState = this.globalState.agents[agentId];
    if (agentState && !agentState.activeContexts.includes(contextId)) {
      agentState.activeContexts.push(contextId);
    }

    this.addTrace('Context acknowledged', { contextId, agentId });
    return true;
  }

  async broadcastMemory(
    source: AgentId,
    type: MemoryBroadcast['type'],
    title: string,
    description: string,
    category: string,
    importance: number,
    data: Record<string, unknown>,
    applicableAgents?: AgentId[]
  ): Promise<MemoryBroadcast> {
    const broadcastId = `mem_${Date.now()}_${source}`;
    const timestamp = Date.now();

    const broadcast: MemoryBroadcast = {
      id: broadcastId,
      source,
      timestamp,
      type,
      content: {
        title,
        description,
        category,
        importance,
        applicableAgents: applicableAgents || ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'],
        data,
      },
      hash: this.generateHash(`${broadcastId}_${JSON.stringify(data)}`),
    };

    this.memoryBroadcasts.set(broadcastId, broadcast);

    await this.mesh.sendDivineMessage(
      source,
      'broadcast',
      'memory_broadcast',
      JSON.stringify(broadcast),
      { priority: importance > 0.8 ? 'high' : 'normal' }
    );

    await this.createSharedContext(
      source,
      type === 'lesson_learned' ? 'lesson' : type === 'pattern_detected' ? 'pattern' : 'memory_fragment',
      title,
      description,
      { ...data, broadcastId, category, importance },
      { broadcast: true, tags: [category, type] }
    );

    this.addTrace('Memory broadcast sent', { broadcastId, type, source, importance });

    return broadcast;
  }

  async performGlobalSync(): Promise<SyncEvent> {
    const syncId = this.generateSyncId();
    const startTime = Date.now();
    const participants: AgentId[] = [];

    this.addTrace('Global sync started', { syncId });

    for (const [agentId, agentState] of Object.entries(this.globalState.agents)) {
      if (agentState.status === 'online' || agentState.status === 'busy') {
        participants.push(agentId as AgentId);
        agentState.pendingSync = true;
      }
    }

    const contextIds = Array.from(this.sharedContexts.keys());

    await this.mesh.sendDivineMessage(
      'odin',
      'broadcast',
      'sync_request',
      JSON.stringify({
        syncId,
        type: 'full_sync',
        stateHash: this.globalState.stateHash,
        contextCount: contextIds.length,
        timestamp: startTime,
      }),
      { priority: 'high', requireAck: true }
    );

    for (const agentId of participants) {
      const agentState = this.globalState.agents[agentId];
      if (agentState) {
        agentState.lastSync = Date.now();
        agentState.pendingSync = false;
        agentState.stateHash = this.generateHash(`${agentId}_${Date.now()}_${contextIds.length}`);
      }
    }

    this.globalState.lastUpdated = Date.now();
    this.globalState.stateHash = this.generateHash(
      `global_${Date.now()}_${participants.join('_')}_${contextIds.length}`
    );

    const syncEvent: SyncEvent = {
      id: syncId,
      timestamp: startTime,
      type: 'full_sync',
      initiator: 'system',
      participants,
      contextIds,
      success: true,
      duration: Date.now() - startTime,
    };

    this.globalState.syncHistory.push(syncEvent);

    if (this.globalState.syncHistory.length > this.config.stateRetentionCount) {
      this.globalState.syncHistory = this.globalState.syncHistory.slice(-this.config.stateRetentionCount);
    }

    this.addTrace('Global sync completed', {
      syncId,
      participants: participants.length,
      contexts: contextIds.length,
      duration: syncEvent.duration,
    });

    return syncEvent;
  }

  async syncAgentState(agentId: AgentId, newState: Partial<AgentState>): Promise<void> {
    const currentState = this.globalState.agents[agentId];
    if (!currentState) return;

    const oldHash = currentState.stateHash;

    Object.assign(currentState, newState);
    currentState.lastSync = Date.now();
    currentState.stateHash = this.generateHash(`${agentId}_${Date.now()}_${JSON.stringify(newState)}`);

    await this.mesh.sendDivineMessage(
      agentId,
      'broadcast',
      'status_stream',
      JSON.stringify({
        type: 'state_update',
        agentId,
        oldHash,
        newHash: currentState.stateHash,
        changes: Object.keys(newState),
      }),
      { priority: 'normal' }
    );

    this.addTrace('Agent state synced', { agentId, changes: Object.keys(newState) });
  }

  async resolveConflict(
    contextId: string,
    conflictingAgents: AgentId[],
    resolution: ConflictEvent['resolution'],
    resolvedBy?: AgentId
  ): Promise<ConflictEvent> {
    const conflictId = `conflict_${Date.now()}_${contextId}`;

    const conflict: ConflictEvent = {
      id: conflictId,
      timestamp: Date.now(),
      contextId,
      conflictingAgents,
      resolution,
      resolvedBy,
      details: `Conflict resolved using ${resolution} strategy`,
    };

    this.globalState.conflictLog.push(conflict);

    if (this.globalState.conflictLog.length > this.config.stateRetentionCount) {
      this.globalState.conflictLog = this.globalState.conflictLog.slice(-this.config.stateRetentionCount);
    }

    this.addTrace('Conflict resolved', { conflictId, contextId, resolution });

    return conflict;
  }

  getSharedContext(contextId: string): SharedContext | undefined {
    return this.sharedContexts.get(contextId);
  }

  getAgentContexts(agentId: AgentId): SharedContext[] {
    const agentState = this.globalState.agents[agentId];
    if (!agentState) return [];

    return agentState.activeContexts
      .map(id => this.sharedContexts.get(id))
      .filter((ctx): ctx is SharedContext => ctx !== undefined);
  }

  getContextsByType(type: SharedContext['type']): SharedContext[] {
    return Array.from(this.sharedContexts.values()).filter(ctx => ctx.type === type);
  }

  getRecentBroadcasts(limit: number = 10): MemoryBroadcast[] {
    return Array.from(this.memoryBroadcasts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getGlobalState(): GlobalState {
    return { ...this.globalState };
  }

  getAgentState(agentId: AgentId): AgentState | undefined {
    return this.globalState.agents[agentId];
  }

  getSyncHistory(limit?: number): SyncEvent[] {
    const history = [...this.globalState.syncHistory];
    return limit ? history.slice(-limit) : history;
  }

  getConflictLog(limit?: number): ConflictEvent[] {
    const log = [...this.globalState.conflictLog];
    return limit ? log.slice(-limit) : log;
  }

  getYggdrasilStatus(): {
    version: string;
    globalStateHash: string;
    lastSync: number;
    activeContexts: number;
    memoryBroadcasts: number;
    syncEvents: number;
    conflicts: number;
    agentStatus: Record<AgentId, { status: string; healthScore: number; lastSync: number }>;
  } {
    const agentStatus: Partial<Record<AgentId, { status: string; healthScore: number; lastSync: number }>> = {};

    for (const [agentId, state] of Object.entries(this.globalState.agents)) {
      agentStatus[agentId as AgentId] = {
        status: state.status,
        healthScore: state.healthScore,
        lastSync: state.lastSync,
      };
    }

    return {
      version: YGGDRASIL_VERSION,
      globalStateHash: this.globalState.stateHash,
      lastSync: this.globalState.lastUpdated,
      activeContexts: this.sharedContexts.size,
      memoryBroadcasts: this.memoryBroadcasts.size,
      syncEvents: this.globalState.syncHistory.length,
      conflicts: this.globalState.conflictLog.length,
      agentStatus: agentStatus as Record<AgentId, { status: string; healthScore: number; lastSync: number }>,
    };
  }

  exportStateForAgentsJson(): {
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
  } {
    const addresses: Partial<Record<AgentId, string>> = {};
    const healthScores: Partial<Record<AgentId, number>> = {};

    for (const [agentId, state] of Object.entries(this.globalState.agents)) {
      addresses[agentId as AgentId] = state.meshAddress;
      healthScores[agentId as AgentId] = state.healthScore;
    }

    return {
      mesh: {
        version: YGGDRASIL_VERSION,
        protocol: 'Asgård Mesh v1',
        addresses: addresses as Record<AgentId, string>,
      },
      sync: {
        version: YGGDRASIL_VERSION,
        lastSync: this.globalState.lastUpdated,
        stateHash: this.globalState.stateHash,
      },
      coordination: {
        activeContexts: this.sharedContexts.size,
        recentSyncs: this.globalState.syncHistory.length,
        healthScores: healthScores as Record<AgentId, number>,
      },
    };
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createYggdrasilSync(config?: Partial<YggdrasilConfig>, mesh?: AsgardMesh): YggdrasilSync {
  return new YggdrasilSync(config, mesh);
}

let globalYggdrasil: YggdrasilSync | null = null;

export function getGlobalYggdrasil(): YggdrasilSync {
  if (!globalYggdrasil) {
    globalYggdrasil = createYggdrasilSync();
  }
  return globalYggdrasil;
}
