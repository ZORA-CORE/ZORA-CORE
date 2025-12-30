/**
 * Agent-to-Agent (A2A) Communication Protocol
 * JSON-RPC based messaging system for inter-agent communication
 * ZORA CORE: Aesir Genesis
 */

import type {
  AgentId,
  A2AMessage,
  A2AMessageType,
  JSONRPCRequest,
  JSONRPCResponse,
} from './types';

export interface A2AConfig {
  maxQueueSize: number;
  messageTimeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

export interface MessageHandler {
  agentId: AgentId;
  handler: (message: A2AMessage) => Promise<unknown>;
}

export interface PendingRequest {
  request: JSONRPCRequest;
  resolve: (value: JSONRPCResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  timestamp: number;
}

export class A2ACommunicator {
  private config: A2AConfig;
  private handlers: Map<AgentId, MessageHandler> = new Map();
  private messageQueue: A2AMessage[] = [];
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private messageLog: A2AMessage[] = [];

  constructor(config?: Partial<A2AConfig>) {
    this.config = {
      maxQueueSize: 1000,
      messageTimeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
      ...config,
    };
  }

  registerHandler(agentId: AgentId, handler: (message: A2AMessage) => Promise<unknown>): void {
    this.handlers.set(agentId, { agentId, handler });
  }

  unregisterHandler(agentId: AgentId): void {
    this.handlers.delete(agentId);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async send(
    from: AgentId,
    to: AgentId | 'council' | 'all',
    type: A2AMessageType,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<A2AMessage> {
    const message: A2AMessage = {
      id: this.generateMessageId(),
      from,
      to,
      type,
      content,
      timestamp: Date.now(),
      metadata,
    };

    if (this.config.enableLogging) {
      this.messageLog.push(message);
    }

    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);

    await this.deliverMessage(message);

    return message;
  }

  private async deliverMessage(message: A2AMessage): Promise<void> {
    if (message.to === 'all') {
      for (const handler of this.handlers.values()) {
        if (handler.agentId !== message.from) {
          await this.deliverToHandler(handler, message);
        }
      }
    } else if (message.to === 'council') {
      for (const handler of this.handlers.values()) {
        await this.deliverToHandler(handler, message);
      }
    } else {
      const handler = this.handlers.get(message.to as AgentId);
      if (handler) {
        await this.deliverToHandler(handler, message);
      }
    }
  }

  private async deliverToHandler(handler: MessageHandler, message: A2AMessage): Promise<void> {
    try {
      await handler.handler(message);
    } catch (error) {
      console.error(`Error delivering message to ${handler.agentId}:`, error);
    }
  }

  createJSONRPCRequest(
    method: string,
    params: Record<string, unknown>
  ): JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: this.generateRequestId(),
    };
  }

  createJSONRPCResponse(
    id: string,
    result?: unknown,
    error?: { code: number; message: string; data?: unknown }
  ): JSONRPCResponse {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id,
    };

    if (error) {
      response.error = error;
    } else {
      response.result = result;
    }

    return response;
  }

  async sendRPCRequest(
    from: AgentId,
    to: AgentId,
    method: string,
    params: Record<string, unknown>
  ): Promise<JSONRPCResponse> {
    const request = this.createJSONRPCRequest(method, params);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request ${request.id} timed out`));
      }, this.config.messageTimeout);

      this.pendingRequests.set(request.id, {
        request,
        resolve,
        reject,
        timeout,
        timestamp: Date.now(),
      });

      this.send(from, to, 'directive', JSON.stringify(request), {
        isRPCRequest: true,
        requestId: request.id,
      }).catch(reject);
    });
  }

  handleRPCResponse(response: JSONRPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);
      pending.resolve(response);
    }
  }

  async broadcast(
    from: AgentId,
    type: A2AMessageType,
    content: string
  ): Promise<A2AMessage> {
    return this.send(from, 'all', type, content);
  }

  async requestFromOdin(
    from: AgentId,
    requestType: 'decision' | 'coordination' | 'review' | 'escalation',
    context: Record<string, unknown>
  ): Promise<JSONRPCResponse> {
    return this.sendRPCRequest(from, 'odin', 'odin.request', {
      type: requestType,
      priority: context.priority || 'normal',
      context,
      requester: from,
    });
  }

  async reportToOdin(
    from: AgentId,
    operation: string,
    status: 'success' | 'in_progress' | 'self_correcting' | 'failed',
    details: Record<string, unknown>
  ): Promise<A2AMessage> {
    return this.send(from, 'odin', 'status_report', JSON.stringify({
      operation,
      status,
      details,
      timestamp: Date.now(),
    }));
  }

  async queryEivor(
    from: AgentId,
    operation: 'store' | 'retrieve' | 'search' | 'analyze',
    data: Record<string, unknown>
  ): Promise<JSONRPCResponse> {
    return this.sendRPCRequest(from, 'eivor', 'eivor.memory', {
      operation,
      data,
    });
  }

  async requestValidation(
    from: AgentId,
    claimType: 'claim' | 'data' | 'source' | 'product',
    content: Record<string, unknown>
  ): Promise<JSONRPCResponse> {
    return this.sendRPCRequest(from, 'tyr', 'tyr.validate', {
      type: claimType,
      content,
      urgency: 'normal',
    });
  }

  async alertHeimdall(
    from: AgentId,
    severity: 'low' | 'medium' | 'high' | 'critical',
    alertType: string,
    details: Record<string, unknown>
  ): Promise<A2AMessage> {
    return this.send(from, 'heimdall', 'security_alert', JSON.stringify({
      severity,
      type: alertType,
      details,
      timestamp: Date.now(),
    }), { priority: severity === 'critical' ? 'critical' : 'high' });
  }

  getMessageHistory(
    filter?: {
      from?: AgentId;
      to?: AgentId | 'council' | 'all';
      type?: A2AMessageType;
      since?: number;
    }
  ): A2AMessage[] {
    let messages = [...this.messageLog];

    if (filter) {
      if (filter.from) {
        messages = messages.filter(m => m.from === filter.from);
      }
      if (filter.to) {
        messages = messages.filter(m => m.to === filter.to);
      }
      if (filter.type) {
        messages = messages.filter(m => m.type === filter.type);
      }
      if (filter.since !== undefined) {
        const sinceTime = filter.since;
        messages = messages.filter(m => m.timestamp >= sinceTime);
      }
    }

    return messages;
  }

  getQueueStatus(): {
    queueSize: number;
    pendingRequests: number;
    registeredHandlers: AgentId[];
  } {
    return {
      queueSize: this.messageQueue.length,
      pendingRequests: this.pendingRequests.size,
      registeredHandlers: Array.from(this.handlers.keys()),
    };
  }

  clearHistory(): void {
    this.messageLog = [];
  }

  clearQueue(): void {
    this.messageQueue = [];
  }
}

export function createA2ACommunicator(config?: Partial<A2AConfig>): A2ACommunicator {
  return new A2ACommunicator(config);
}

export const A2A_VERSION = '1.0.0';
export const A2A_PROTOCOL = 'JSON-RPC 2.0';
