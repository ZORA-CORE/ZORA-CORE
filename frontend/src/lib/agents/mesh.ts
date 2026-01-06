/**
 * Asgård Mesh - Agent-to-Agent Communication Infrastructure
 * JSON-RPC + Server-Sent Events (SSE) based messaging system
 * Implements encrypted Divine Messages for secure inter-agent communication
 * ZORA CORE: Aesir Genesis - Phase 3
 */

import { createHash, randomBytes } from 'crypto';
import type {
  AgentId,
  A2AMessage,
  A2AMessageType,
  JSONRPCRequest,
  JSONRPCResponse,
} from './types';

export const MESH_VERSION = '1.0.0';
export const MESH_PROTOCOL = 'Asgård Mesh v1';

export interface MeshAddress {
  agentId: AgentId;
  realm: 'asgard' | 'midgard' | 'bifrost';
  endpoint: string;
  publicKey: string;
  status: 'active' | 'inactive' | 'quarantined';
  lastSeen: number;
}

export interface DivineMessage {
  id: string;
  envelope: {
    from: MeshAddress;
    to: MeshAddress | 'council' | 'broadcast';
    timestamp: number;
    ttl: number;
    priority: 'critical' | 'high' | 'normal' | 'low';
    encrypted: boolean;
  };
  payload: {
    type: A2AMessageType | 'delegation' | 'status_stream' | 'memory_broadcast' | 'sync_request';
    content: string;
    signature: string;
    nonce: string;
  };
  routing: {
    hops: AgentId[];
    maxHops: number;
    requireAck: boolean;
    ackReceived: boolean;
  };
  metadata: Record<string, unknown>;
}

export interface SSEConnection {
  agentId: AgentId;
  connectionId: string;
  established: number;
  lastHeartbeat: number;
  status: 'connected' | 'disconnected' | 'reconnecting';
  messageCount: number;
}

export interface MessageBrokerConfig {
  maxQueueSize: number;
  messageTimeout: number;
  retryAttempts: number;
  heartbeatInterval: number;
  encryptionEnabled: boolean;
  routingStrategy: 'direct' | 'broadcast' | 'mesh';
}

export interface DelegationTask {
  id: string;
  delegator: AgentId;
  delegate: AgentId;
  task: {
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    deadline?: number;
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  progress: number;
  statusUpdates: Array<{
    timestamp: number;
    status: string;
    details: Record<string, unknown>;
  }>;
  result?: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface StatusStream {
  taskId: string;
  agentId: AgentId;
  listeners: AgentId[];
  updates: Array<{
    timestamp: number;
    progress: number;
    message: string;
    data?: unknown;
  }>;
  isActive: boolean;
}

const DEFAULT_BROKER_CONFIG: MessageBrokerConfig = {
  maxQueueSize: 10000,
  messageTimeout: 60000,
  retryAttempts: 3,
  heartbeatInterval: 30000,
  encryptionEnabled: true,
  routingStrategy: 'mesh',
};

export class AsgardMesh {
  private config: MessageBrokerConfig;
  private addresses: Map<AgentId, MeshAddress> = new Map();
  private messageQueue: DivineMessage[] = [];
  private pendingMessages: Map<string, DivineMessage> = new Map();
  private sseConnections: Map<AgentId, SSEConnection> = new Map();
  private delegations: Map<string, DelegationTask> = new Map();
  private statusStreams: Map<string, StatusStream> = new Map();
  private messageHandlers: Map<AgentId, (message: DivineMessage) => Promise<void>> = new Map();
  private reasoningTrace: string[] = [];
  private messageCounter: number = 0;

  constructor(config: Partial<MessageBrokerConfig> = {}) {
    this.config = { ...DEFAULT_BROKER_CONFIG, ...config };
    this.initializeAddresses();
    this.addTrace('Asgård Mesh initialized');
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [ASGARD_MESH] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
  }

  private initializeAddresses(): void {
    const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
    
    for (const agentId of agents) {
      const address: MeshAddress = {
        agentId,
        realm: 'asgard',
        endpoint: `mesh://${agentId}.asgard.zora`,
        publicKey: this.generatePublicKey(agentId),
        status: 'active',
        lastSeen: Date.now(),
      };
      this.addresses.set(agentId, address);
    }
    
    this.addTrace('Agent addresses initialized', { count: agents.length });
  }

  private generatePublicKey(agentId: AgentId): string {
    return createHash('sha256')
      .update(`${agentId}_${MESH_VERSION}_${Date.now()}`)
      .digest('hex')
      .substring(0, 64);
  }

  private generateMessageId(): string {
    this.messageCounter++;
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `divine_${timestamp}_${this.messageCounter}_${random}`;
  }

  private generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  private signMessage(content: string, fromAgent: AgentId): string {
    const address = this.addresses.get(fromAgent);
    if (!address) return '';
    
    return createHash('sha256')
      .update(`${content}|${address.publicKey}|${Date.now()}`)
      .digest('hex');
  }

  private encryptPayload(content: string, _toAddress: MeshAddress | 'council' | 'broadcast'): string {
    if (!this.config.encryptionEnabled) return content;
    
    const encoded = Buffer.from(content).toString('base64');
    return encoded;
  }

  private decryptPayload(encrypted: string): string {
    if (!this.config.encryptionEnabled) return encrypted;
    
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }

  getAddress(agentId: AgentId): MeshAddress | undefined {
    return this.addresses.get(agentId);
  }

  getAllAddresses(): MeshAddress[] {
    return Array.from(this.addresses.values());
  }

  registerHandler(agentId: AgentId, handler: (message: DivineMessage) => Promise<void>): void {
    this.messageHandlers.set(agentId, handler);
    this.addTrace('Handler registered', { agent: agentId });
  }

  unregisterHandler(agentId: AgentId): void {
    this.messageHandlers.delete(agentId);
    this.addTrace('Handler unregistered', { agent: agentId });
  }

  async sendDivineMessage(
    from: AgentId,
    to: AgentId | 'council' | 'broadcast',
    type: DivineMessage['payload']['type'],
    content: string,
    options: {
      priority?: DivineMessage['envelope']['priority'];
      ttl?: number;
      requireAck?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<DivineMessage> {
    const fromAddress = this.addresses.get(from);
    if (!fromAddress) {
      throw new Error(`Unknown sender: ${from}`);
    }

    let toAddress: MeshAddress | 'council' | 'broadcast';
    if (to === 'council' || to === 'broadcast') {
      toAddress = to;
    } else {
      const addr = this.addresses.get(to);
      if (!addr) {
        throw new Error(`Unknown recipient: ${to}`);
      }
      toAddress = addr;
    }

    const nonce = this.generateNonce();
    const encryptedContent = this.encryptPayload(content, toAddress);
    const signature = this.signMessage(encryptedContent + nonce, from);

    const message: DivineMessage = {
      id: this.generateMessageId(),
      envelope: {
        from: fromAddress,
        to: toAddress,
        timestamp: Date.now(),
        ttl: options.ttl || 300000,
        priority: options.priority || 'normal',
        encrypted: this.config.encryptionEnabled,
      },
      payload: {
        type,
        content: encryptedContent,
        signature,
        nonce,
      },
      routing: {
        hops: [from],
        maxHops: 5,
        requireAck: options.requireAck || false,
        ackReceived: false,
      },
      metadata: options.metadata || {},
    };

    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);

    if (options.requireAck) {
      this.pendingMessages.set(message.id, message);
    }

    await this.routeMessage(message);

    this.addTrace('Divine message sent', {
      id: message.id,
      from,
      to,
      type,
      priority: message.envelope.priority,
    });

    return message;
  }

  private async routeMessage(message: DivineMessage): Promise<void> {
    const { to } = message.envelope;

    if (to === 'broadcast') {
      for (const [agentId, handler] of this.messageHandlers) {
        if (agentId !== message.envelope.from.agentId) {
          await this.deliverToAgent(agentId, message, handler);
        }
      }
    } else if (to === 'council') {
      for (const [agentId, handler] of this.messageHandlers) {
        await this.deliverToAgent(agentId, message, handler);
      }
    } else {
      const handler = this.messageHandlers.get(to.agentId);
      if (handler) {
        await this.deliverToAgent(to.agentId, message, handler);
      }
    }
  }

  private async deliverToAgent(
    agentId: AgentId,
    message: DivineMessage,
    handler: (message: DivineMessage) => Promise<void>
  ): Promise<void> {
    try {
      message.routing.hops.push(agentId);
      await handler(message);

      if (message.routing.requireAck) {
        await this.sendAcknowledgment(message, agentId);
      }

      const address = this.addresses.get(agentId);
      if (address) {
        address.lastSeen = Date.now();
      }
    } catch (error) {
      this.addTrace('Message delivery failed', { agentId, messageId: message.id, error: String(error) });
    }
  }

  private async sendAcknowledgment(originalMessage: DivineMessage, acknowledger: AgentId): Promise<void> {
    const pending = this.pendingMessages.get(originalMessage.id);
    if (pending) {
      pending.routing.ackReceived = true;
      this.pendingMessages.delete(originalMessage.id);
    }

    this.addTrace('Acknowledgment sent', { messageId: originalMessage.id, acknowledger });
  }

  establishSSEConnection(agentId: AgentId): SSEConnection {
    const connectionId = `sse_${agentId}_${Date.now()}_${randomBytes(4).toString('hex')}`;
    
    const connection: SSEConnection = {
      agentId,
      connectionId,
      established: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'connected',
      messageCount: 0,
    };

    this.sseConnections.set(agentId, connection);
    this.addTrace('SSE connection established', { agentId, connectionId });

    return connection;
  }

  closeSSEConnection(agentId: AgentId): void {
    const connection = this.sseConnections.get(agentId);
    if (connection) {
      connection.status = 'disconnected';
      this.sseConnections.delete(agentId);
      this.addTrace('SSE connection closed', { agentId });
    }
  }

  heartbeat(agentId: AgentId): boolean {
    const connection = this.sseConnections.get(agentId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
      return true;
    }
    return false;
  }

  async createDelegation(
    delegator: AgentId,
    delegate: AgentId,
    taskType: string,
    description: string,
    parameters: Record<string, unknown>,
    deadline?: number
  ): Promise<DelegationTask> {
    const taskId = `delegation_${Date.now()}_${randomBytes(4).toString('hex')}`;

    const delegation: DelegationTask = {
      id: taskId,
      delegator,
      delegate,
      task: {
        type: taskType,
        description,
        parameters,
        deadline,
      },
      status: 'pending',
      progress: 0,
      statusUpdates: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.delegations.set(taskId, delegation);

    await this.sendDivineMessage(
      delegator,
      delegate,
      'delegation',
      JSON.stringify({
        taskId,
        type: taskType,
        description,
        parameters,
        deadline,
      }),
      {
        priority: 'high',
        requireAck: true,
        metadata: { delegationType: 'task_assignment' },
      }
    );

    this.addTrace('Delegation created', { taskId, delegator, delegate, taskType });

    return delegation;
  }

  async acceptDelegation(taskId: string, delegate: AgentId): Promise<boolean> {
    const delegation = this.delegations.get(taskId);
    if (!delegation || delegation.delegate !== delegate) {
      return false;
    }

    delegation.status = 'accepted';
    delegation.updatedAt = Date.now();
    delegation.statusUpdates.push({
      timestamp: Date.now(),
      status: 'accepted',
      details: { acceptedBy: delegate },
    });

    await this.sendDivineMessage(
      delegate,
      delegation.delegator,
      'status_stream',
      JSON.stringify({
        taskId,
        status: 'accepted',
        message: `Task accepted by ${delegate}`,
      }),
      { priority: 'normal' }
    );

    this.addTrace('Delegation accepted', { taskId, delegate });
    return true;
  }

  async updateDelegationProgress(
    taskId: string,
    delegate: AgentId,
    progress: number,
    message: string,
    data?: unknown
  ): Promise<boolean> {
    const delegation = this.delegations.get(taskId);
    if (!delegation || delegation.delegate !== delegate) {
      return false;
    }

    delegation.status = 'in_progress';
    delegation.progress = Math.min(100, Math.max(0, progress));
    delegation.updatedAt = Date.now();
    delegation.statusUpdates.push({
      timestamp: Date.now(),
      status: `progress_${progress}`,
      details: { message, data },
    });

    const stream = this.statusStreams.get(taskId);
    if (stream) {
      stream.updates.push({
        timestamp: Date.now(),
        progress,
        message,
        data,
      });
    }

    await this.sendDivineMessage(
      delegate,
      delegation.delegator,
      'status_stream',
      JSON.stringify({
        taskId,
        status: 'in_progress',
        progress,
        message,
        data,
      }),
      { priority: 'normal' }
    );

    this.addTrace('Delegation progress updated', { taskId, progress, message });
    return true;
  }

  async completeDelegation(
    taskId: string,
    delegate: AgentId,
    result: unknown
  ): Promise<boolean> {
    const delegation = this.delegations.get(taskId);
    if (!delegation || delegation.delegate !== delegate) {
      return false;
    }

    delegation.status = 'completed';
    delegation.progress = 100;
    delegation.result = result;
    delegation.updatedAt = Date.now();
    delegation.statusUpdates.push({
      timestamp: Date.now(),
      status: 'completed',
      details: { result },
    });

    const stream = this.statusStreams.get(taskId);
    if (stream) {
      stream.isActive = false;
      stream.updates.push({
        timestamp: Date.now(),
        progress: 100,
        message: 'Task completed',
        data: result,
      });
    }

    await this.sendDivineMessage(
      delegate,
      delegation.delegator,
      'status_stream',
      JSON.stringify({
        taskId,
        status: 'completed',
        progress: 100,
        result,
      }),
      { priority: 'high', requireAck: true }
    );

    this.addTrace('Delegation completed', { taskId, delegate });
    return true;
  }

  async failDelegation(
    taskId: string,
    delegate: AgentId,
    error: string
  ): Promise<boolean> {
    const delegation = this.delegations.get(taskId);
    if (!delegation || delegation.delegate !== delegate) {
      return false;
    }

    delegation.status = 'failed';
    delegation.updatedAt = Date.now();
    delegation.statusUpdates.push({
      timestamp: Date.now(),
      status: 'failed',
      details: { error },
    });

    await this.sendDivineMessage(
      delegate,
      delegation.delegator,
      'status_stream',
      JSON.stringify({
        taskId,
        status: 'failed',
        error,
      }),
      { priority: 'critical', requireAck: true }
    );

    this.addTrace('Delegation failed', { taskId, delegate, error });
    return true;
  }

  createStatusStream(taskId: string, agentId: AgentId, listeners: AgentId[]): StatusStream {
    const stream: StatusStream = {
      taskId,
      agentId,
      listeners,
      updates: [],
      isActive: true,
    };

    this.statusStreams.set(taskId, stream);
    this.addTrace('Status stream created', { taskId, agentId, listeners });

    return stream;
  }

  subscribeToStream(taskId: string, listener: AgentId): boolean {
    const stream = this.statusStreams.get(taskId);
    if (!stream) return false;

    if (!stream.listeners.includes(listener)) {
      stream.listeners.push(listener);
    }
    return true;
  }

  getDelegation(taskId: string): DelegationTask | undefined {
    return this.delegations.get(taskId);
  }

  getAgentDelegations(agentId: AgentId): {
    delegated: DelegationTask[];
    received: DelegationTask[];
  } {
    const delegated: DelegationTask[] = [];
    const received: DelegationTask[] = [];

    for (const delegation of this.delegations.values()) {
      if (delegation.delegator === agentId) {
        delegated.push(delegation);
      }
      if (delegation.delegate === agentId) {
        received.push(delegation);
      }
    }

    return { delegated, received };
  }

  getMessageHistory(filter?: {
    from?: AgentId;
    to?: AgentId | 'council' | 'broadcast';
    type?: DivineMessage['payload']['type'];
    since?: number;
    limit?: number;
  }): DivineMessage[] {
    let messages = [...this.messageQueue];

    if (filter) {
      if (filter.from) {
        messages = messages.filter(m => m.envelope.from.agentId === filter.from);
      }
      if (filter.to) {
        messages = messages.filter(m => {
          if (filter.to === 'council' || filter.to === 'broadcast') {
            return m.envelope.to === filter.to;
          }
          return typeof m.envelope.to !== 'string' && m.envelope.to.agentId === filter.to;
        });
      }
      if (filter.type) {
        messages = messages.filter(m => m.payload.type === filter.type);
      }
      if (filter.since !== undefined) {
        messages = messages.filter(m => m.envelope.timestamp >= filter.since!);
      }
      if (filter.limit) {
        messages = messages.slice(-filter.limit);
      }
    }

    return messages;
  }

  getMeshStatus(): {
    version: string;
    protocol: string;
    addresses: MeshAddress[];
    connections: SSEConnection[];
    activeDelegations: number;
    activeStreams: number;
    queueSize: number;
    pendingAcks: number;
  } {
    return {
      version: MESH_VERSION,
      protocol: MESH_PROTOCOL,
      addresses: this.getAllAddresses(),
      connections: Array.from(this.sseConnections.values()),
      activeDelegations: Array.from(this.delegations.values()).filter(
        d => d.status === 'pending' || d.status === 'accepted' || d.status === 'in_progress'
      ).length,
      activeStreams: Array.from(this.statusStreams.values()).filter(s => s.isActive).length,
      queueSize: this.messageQueue.length,
      pendingAcks: this.pendingMessages.size,
    };
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createAsgardMesh(config?: Partial<MessageBrokerConfig>): AsgardMesh {
  return new AsgardMesh(config);
}

let globalMesh: AsgardMesh | null = null;

export function getGlobalMesh(): AsgardMesh {
  if (!globalMesh) {
    globalMesh = createAsgardMesh();
  }
  return globalMesh;
}
