/**
 * Raven's Message - Autonomous Delegation & Orchestration System
 * Enables Odin (All-Father) to autonomously delegate sub-tasks to other agents
 * Implements real-time status streaming back to the orchestrator
 * ZORA CORE: Aesir Genesis - Phase 3
 */

import type { AgentId } from './types';
import { AsgardMesh, DelegationTask, StatusStream, getGlobalMesh } from './mesh';

export const RAVEN_VERSION = '1.0.0';

export interface RavenConfig {
  maxConcurrentDelegations: number;
  delegationTimeout: number;
  autoRetry: boolean;
  maxRetries: number;
  statusUpdateInterval: number;
  escalationThreshold: number;
}

export interface OdinDirective {
  id: string;
  type: 'task_delegation' | 'coordination' | 'review_request' | 'emergency';
  priority: 'critical' | 'high' | 'normal' | 'low';
  description: string;
  targetAgents: AgentId[];
  subTasks: SubTask[];
  constraints: {
    deadline?: number;
    dependencies?: string[];
    requiredCapabilities?: string[];
  };
  status: 'planning' | 'delegating' | 'in_progress' | 'reviewing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface SubTask {
  id: string;
  parentDirectiveId: string;
  assignedTo: AgentId;
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  status: 'pending' | 'delegated' | 'accepted' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  result?: unknown;
  delegationId?: string;
}

export interface AgentCapability {
  agentId: AgentId;
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  availability: 'available' | 'busy' | 'offline';
  specializations: string[];
}

export interface DelegationStrategy {
  type: 'round_robin' | 'capability_match' | 'load_balanced' | 'priority_based';
  fallbackAgent?: AgentId;
  requireAcknowledgment: boolean;
  timeoutAction: 'retry' | 'escalate' | 'fail';
}

export interface StatusUpdate {
  directiveId: string;
  subTaskId: string;
  agentId: AgentId;
  timestamp: number;
  status: string;
  progress: number;
  message: string;
  data?: unknown;
}

const DEFAULT_RAVEN_CONFIG: RavenConfig = {
  maxConcurrentDelegations: 10,
  delegationTimeout: 300000,
  autoRetry: true,
  maxRetries: 3,
  statusUpdateInterval: 5000,
  escalationThreshold: 0.8,
};

const AGENT_CAPABILITIES: Record<AgentId, AgentCapability> = {
  odin: {
    agentId: 'odin',
    capabilities: ['orchestration', 'planning', 'decision_making', 'conflict_resolution'],
    currentLoad: 0,
    maxLoad: 5,
    availability: 'available',
    specializations: ['architecture', 'strategy', 'coordination'],
  },
  thor: {
    agentId: 'thor',
    capabilities: ['deployment', 'build', 'ci_cd', 'infrastructure', 'verification'],
    currentLoad: 0,
    maxLoad: 3,
    availability: 'available',
    specializations: ['infrastructure', 'devops', 'formal_verification'],
  },
  baldur: {
    agentId: 'baldur',
    capabilities: ['ui_design', 'component_creation', 'accessibility', 'performance'],
    currentLoad: 0,
    maxLoad: 4,
    availability: 'available',
    specializations: ['frontend', 'ux', 'visual_design'],
  },
  tyr: {
    agentId: 'tyr',
    capabilities: ['validation', 'ethics_check', 'security_audit', 'climate_verification'],
    currentLoad: 0,
    maxLoad: 5,
    availability: 'available',
    specializations: ['ethics', 'security', 'compliance'],
  },
  eivor: {
    agentId: 'eivor',
    capabilities: ['memory_storage', 'pattern_analysis', 'lesson_retrieval', 'knowledge_synthesis'],
    currentLoad: 0,
    maxLoad: 10,
    availability: 'available',
    specializations: ['memory', 'learning', 'history'],
  },
  freya: {
    agentId: 'freya',
    capabilities: ['storytelling', 'content_generation', 'growth_strategy', 'engagement'],
    currentLoad: 0,
    maxLoad: 4,
    availability: 'available',
    specializations: ['narrative', 'marketing', 'community'],
  },
  heimdall: {
    agentId: 'heimdall',
    capabilities: ['monitoring', 'threat_detection', 'causal_inference', 'remediation'],
    currentLoad: 0,
    maxLoad: 8,
    availability: 'available',
    specializations: ['security', 'observability', 'prediction'],
  },
};

export class RavensMessage {
  private config: RavenConfig;
  private mesh: AsgardMesh;
  private directives: Map<string, OdinDirective> = new Map();
  private subTasks: Map<string, SubTask> = new Map();
  private statusUpdates: StatusUpdate[] = [];
  private agentCapabilities: Map<AgentId, AgentCapability> = new Map();
  private reasoningTrace: string[] = [];
  private directiveCounter: number = 0;
  private subTaskCounter: number = 0;

  constructor(config: Partial<RavenConfig> = {}, mesh?: AsgardMesh) {
    this.config = { ...DEFAULT_RAVEN_CONFIG, ...config };
    this.mesh = mesh || getGlobalMesh();
    this.initializeCapabilities();
    this.addTrace("Raven's Message system initialized");
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [RAVEN] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
  }

  private initializeCapabilities(): void {
    for (const [agentId, capability] of Object.entries(AGENT_CAPABILITIES)) {
      this.agentCapabilities.set(agentId as AgentId, { ...capability });
    }
  }

  private generateDirectiveId(): string {
    this.directiveCounter++;
    return `directive_${Date.now()}_${this.directiveCounter}`;
  }

  private generateSubTaskId(): string {
    this.subTaskCounter++;
    return `subtask_${Date.now()}_${this.subTaskCounter}`;
  }

  async createDirective(
    type: OdinDirective['type'],
    description: string,
    priority: OdinDirective['priority'] = 'normal',
    constraints: OdinDirective['constraints'] = {}
  ): Promise<OdinDirective> {
    const directive: OdinDirective = {
      id: this.generateDirectiveId(),
      type,
      priority,
      description,
      targetAgents: [],
      subTasks: [],
      constraints,
      status: 'planning',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.directives.set(directive.id, directive);
    this.addTrace('Directive created', { id: directive.id, type, priority });

    return directive;
  }

  async planSubTasks(
    directiveId: string,
    tasks: Array<{
      type: string;
      description: string;
      parameters: Record<string, unknown>;
      requiredCapabilities?: string[];
      dependencies?: string[];
    }>
  ): Promise<SubTask[]> {
    const directive = this.directives.get(directiveId);
    if (!directive) {
      throw new Error(`Directive not found: ${directiveId}`);
    }

    const subTasks: SubTask[] = [];

    for (const task of tasks) {
      const assignedAgent = this.selectBestAgent(task.requiredCapabilities || [task.type]);

      const subTask: SubTask = {
        id: this.generateSubTaskId(),
        parentDirectiveId: directiveId,
        assignedTo: assignedAgent,
        type: task.type,
        description: task.description,
        parameters: task.parameters,
        dependencies: task.dependencies || [],
        status: 'pending',
        progress: 0,
      };

      subTasks.push(subTask);
      this.subTasks.set(subTask.id, subTask);
      directive.subTasks.push(subTask);

      if (!directive.targetAgents.includes(assignedAgent)) {
        directive.targetAgents.push(assignedAgent);
      }
    }

    directive.status = 'delegating';
    directive.updatedAt = Date.now();

    this.addTrace('Sub-tasks planned', {
      directiveId,
      taskCount: subTasks.length,
      agents: directive.targetAgents,
    });

    return subTasks;
  }

  private selectBestAgent(requiredCapabilities: string[]): AgentId {
    let bestAgent: AgentId = 'odin';
    let bestScore = -1;

    for (const [agentId, capability] of this.agentCapabilities) {
      if (agentId === 'odin') continue;
      if (capability.availability === 'offline') continue;
      if (capability.currentLoad >= capability.maxLoad) continue;

      const capabilityMatch = requiredCapabilities.filter(
        cap => capability.capabilities.includes(cap) || capability.specializations.includes(cap)
      ).length;

      const loadFactor = 1 - (capability.currentLoad / capability.maxLoad);
      const score = capabilityMatch * 2 + loadFactor;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  async delegateSubTask(subTaskId: string): Promise<DelegationTask> {
    const subTask = this.subTasks.get(subTaskId);
    if (!subTask) {
      throw new Error(`SubTask not found: ${subTaskId}`);
    }

    const directive = this.directives.get(subTask.parentDirectiveId);
    if (!directive) {
      throw new Error(`Parent directive not found: ${subTask.parentDirectiveId}`);
    }

    const hasPendingDependencies = subTask.dependencies.some(depId => {
      const dep = this.subTasks.get(depId);
      return dep && dep.status !== 'completed';
    });

    if (hasPendingDependencies) {
      this.addTrace('Delegation blocked by dependencies', { subTaskId, dependencies: subTask.dependencies });
      throw new Error('Cannot delegate: pending dependencies');
    }

    const delegation = await this.mesh.createDelegation(
      'odin',
      subTask.assignedTo,
      subTask.type,
      subTask.description,
      {
        ...subTask.parameters,
        directiveId: directive.id,
        subTaskId: subTask.id,
        priority: directive.priority,
      },
      directive.constraints.deadline
    );

    subTask.status = 'delegated';
    subTask.delegationId = delegation.id;

    const capability = this.agentCapabilities.get(subTask.assignedTo);
    if (capability) {
      capability.currentLoad++;
    }

    this.mesh.createStatusStream(delegation.id, subTask.assignedTo, ['odin']);

    this.addTrace('Sub-task delegated', {
      subTaskId,
      delegationId: delegation.id,
      assignedTo: subTask.assignedTo,
    });

    return delegation;
  }

  async delegateAllSubTasks(directiveId: string): Promise<DelegationTask[]> {
    const directive = this.directives.get(directiveId);
    if (!directive) {
      throw new Error(`Directive not found: ${directiveId}`);
    }

    const delegations: DelegationTask[] = [];
    const pendingTasks = directive.subTasks.filter(t => t.status === 'pending');

    const sortedTasks = this.topologicalSort(pendingTasks);

    for (const subTask of sortedTasks) {
      try {
        const delegation = await this.delegateSubTask(subTask.id);
        delegations.push(delegation);
      } catch (error) {
        this.addTrace('Failed to delegate sub-task', { subTaskId: subTask.id, error: String(error) });
      }
    }

    directive.status = 'in_progress';
    directive.updatedAt = Date.now();

    return delegations;
  }

  private topologicalSort(tasks: SubTask[]): SubTask[] {
    const sorted: SubTask[] = [];
    const visited = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const visit = (task: SubTask): void => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      for (const depId of task.dependencies) {
        const dep = taskMap.get(depId);
        if (dep) {
          visit(dep);
        }
      }

      sorted.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return sorted;
  }

  async handleStatusUpdate(
    delegationId: string,
    agentId: AgentId,
    status: string,
    progress: number,
    message: string,
    data?: unknown
  ): Promise<void> {
    const delegation = this.mesh.getDelegation(delegationId);
    if (!delegation) return;

    const subTask = Array.from(this.subTasks.values()).find(
      t => t.delegationId === delegationId
    );
    if (!subTask) return;

    const directive = this.directives.get(subTask.parentDirectiveId);
    if (!directive) return;

    const update: StatusUpdate = {
      directiveId: directive.id,
      subTaskId: subTask.id,
      agentId,
      timestamp: Date.now(),
      status,
      progress,
      message,
      data,
    };

    this.statusUpdates.push(update);

    subTask.progress = progress;
    if (status === 'completed') {
      subTask.status = 'completed';
      subTask.result = data;

      const capability = this.agentCapabilities.get(agentId);
      if (capability) {
        capability.currentLoad = Math.max(0, capability.currentLoad - 1);
      }
    } else if (status === 'failed') {
      subTask.status = 'failed';

      const capability = this.agentCapabilities.get(agentId);
      if (capability) {
        capability.currentLoad = Math.max(0, capability.currentLoad - 1);
      }
    } else if (status === 'accepted' || status === 'in_progress') {
      subTask.status = status === 'accepted' ? 'accepted' : 'in_progress';
    }

    this.updateDirectiveStatus(directive);

    this.addTrace('Status update received', {
      directiveId: directive.id,
      subTaskId: subTask.id,
      status,
      progress,
    });
  }

  private updateDirectiveStatus(directive: OdinDirective): void {
    const allCompleted = directive.subTasks.every(t => t.status === 'completed');
    const anyFailed = directive.subTasks.some(t => t.status === 'failed');
    const totalProgress = directive.subTasks.reduce((sum, t) => sum + t.progress, 0);
    const avgProgress = totalProgress / directive.subTasks.length;

    if (allCompleted) {
      directive.status = 'completed';
    } else if (anyFailed) {
      directive.status = 'failed';
    } else if (avgProgress >= this.config.escalationThreshold * 100) {
      directive.status = 'reviewing';
    }

    directive.updatedAt = Date.now();
  }

  async requestHelp(
    fromAgent: AgentId,
    helpType: 'technical' | 'decision' | 'resource' | 'escalation',
    context: Record<string, unknown>
  ): Promise<string> {
    const helpRequestId = `help_${Date.now()}_${fromAgent}`;

    await this.mesh.sendDivineMessage(
      fromAgent,
      'odin',
      'status_stream',
      JSON.stringify({
        type: 'help_request',
        helpType,
        context,
        requestId: helpRequestId,
      }),
      { priority: helpType === 'escalation' ? 'critical' : 'high' }
    );

    this.addTrace('Help requested', { fromAgent, helpType, requestId: helpRequestId });

    return helpRequestId;
  }

  async broadcastLearning(
    fromAgent: AgentId,
    lessonType: string,
    lesson: {
      title: string;
      description: string;
      context: Record<string, unknown>;
      recommendations: string[];
    }
  ): Promise<void> {
    await this.mesh.sendDivineMessage(
      fromAgent,
      'broadcast',
      'memory_broadcast',
      JSON.stringify({
        type: 'learning',
        lessonType,
        lesson,
        timestamp: Date.now(),
      }),
      { priority: 'normal' }
    );

    this.addTrace('Learning broadcast', { fromAgent, lessonType, title: lesson.title });
  }

  getDirective(directiveId: string): OdinDirective | undefined {
    return this.directives.get(directiveId);
  }

  getSubTask(subTaskId: string): SubTask | undefined {
    return this.subTasks.get(subTaskId);
  }

  getDirectiveProgress(directiveId: string): {
    overall: number;
    byAgent: Record<AgentId, number>;
    byStatus: Record<string, number>;
  } | null {
    const directive = this.directives.get(directiveId);
    if (!directive) return null;

    const byAgent: Partial<Record<AgentId, number>> = {};
    const byStatus: Record<string, number> = {};

    for (const subTask of directive.subTasks) {
      byAgent[subTask.assignedTo] = (byAgent[subTask.assignedTo] || 0) + subTask.progress;
      byStatus[subTask.status] = (byStatus[subTask.status] || 0) + 1;
    }

    const overall = directive.subTasks.reduce((sum, t) => sum + t.progress, 0) / directive.subTasks.length;

    return {
      overall,
      byAgent: byAgent as Record<AgentId, number>,
      byStatus,
    };
  }

  getStatusUpdates(filter?: {
    directiveId?: string;
    agentId?: AgentId;
    since?: number;
  }): StatusUpdate[] {
    let updates = [...this.statusUpdates];

    if (filter) {
      if (filter.directiveId) {
        updates = updates.filter(u => u.directiveId === filter.directiveId);
      }
      if (filter.agentId) {
        updates = updates.filter(u => u.agentId === filter.agentId);
      }
      if (filter.since !== undefined) {
        updates = updates.filter(u => u.timestamp >= filter.since!);
      }
    }

    return updates;
  }

  getAgentWorkload(): Record<AgentId, { current: number; max: number; tasks: string[] }> {
    const workload: Partial<Record<AgentId, { current: number; max: number; tasks: string[] }>> = {};

    for (const [agentId, capability] of this.agentCapabilities) {
      const activeTasks = Array.from(this.subTasks.values())
        .filter(t => t.assignedTo === agentId && ['delegated', 'accepted', 'in_progress'].includes(t.status))
        .map(t => t.id);

      workload[agentId] = {
        current: capability.currentLoad,
        max: capability.maxLoad,
        tasks: activeTasks,
      };
    }

    return workload as Record<AgentId, { current: number; max: number; tasks: string[] }>;
  }

  getRavenStatus(): {
    version: string;
    activeDirectives: number;
    pendingSubTasks: number;
    completedSubTasks: number;
    totalStatusUpdates: number;
    agentAvailability: Record<AgentId, string>;
  } {
    const activeDirectives = Array.from(this.directives.values()).filter(
      d => ['planning', 'delegating', 'in_progress', 'reviewing'].includes(d.status)
    ).length;

    const pendingSubTasks = Array.from(this.subTasks.values()).filter(
      t => ['pending', 'delegated', 'accepted', 'in_progress'].includes(t.status)
    ).length;

    const completedSubTasks = Array.from(this.subTasks.values()).filter(
      t => t.status === 'completed'
    ).length;

    const agentAvailability: Partial<Record<AgentId, string>> = {};
    for (const [agentId, capability] of this.agentCapabilities) {
      agentAvailability[agentId] = capability.availability;
    }

    return {
      version: RAVEN_VERSION,
      activeDirectives,
      pendingSubTasks,
      completedSubTasks,
      totalStatusUpdates: this.statusUpdates.length,
      agentAvailability: agentAvailability as Record<AgentId, string>,
    };
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createRavensMessage(config?: Partial<RavenConfig>, mesh?: AsgardMesh): RavensMessage {
  return new RavensMessage(config, mesh);
}

let globalRaven: RavensMessage | null = null;

export function getGlobalRaven(): RavensMessage {
  if (!globalRaven) {
    globalRaven = createRavensMessage();
  }
  return globalRaven;
}
