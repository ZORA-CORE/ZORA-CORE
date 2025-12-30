/**
 * AgentCouncil - The Family Council
 * Implements Tree-of-Thought (ToT) reasoning for multi-agent coordination
 * Agentic Interaction Protocol for ZORA CORE: Aesir Genesis
 */

import type {
  Agent,
  AgentId,
  AgentStatus,
  CouncilDecision,
  ThoughtNode,
  ThoughtTree,
  ReasoningPath,
  A2AMessage,
  CouncilSession,
  VotingResult,
  CouncilSessionDecision,
} from './types';

export class AgentCouncil {
  private agents: Map<AgentId, Agent> = new Map();
  private activeSessions: Map<string, CouncilSession> = new Map();
  private messageQueue: A2AMessage[] = [];

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    const agentDefinitions: Array<{ id: AgentId; name: string; role: string; domain: string }> = [
      { id: 'odin', name: 'ODIN', role: 'All-Father Orchestrator', domain: 'architecture' },
      { id: 'thor', name: 'THOR', role: 'Protector of Infrastructure', domain: 'infrastructure' },
      { id: 'baldur', name: 'BALDUR', role: 'Radiant UX/UI', domain: 'design' },
      { id: 'tyr', name: 'TYR', role: 'God of Justice', domain: 'ethics' },
      { id: 'eivor', name: 'EIVOR', role: 'Sage of Memory', domain: 'memory' },
      { id: 'freya', name: 'FREYA', role: 'Goddess of Wisdom', domain: 'research' },
      { id: 'heimdall', name: 'HEIMDALL', role: 'Guardian', domain: 'security' },
    ];

    for (const def of agentDefinitions) {
      this.agents.set(def.id, {
        id: def.id,
        name: def.name,
        role: def.role,
        domain: def.domain,
        status: 'initializing',
        cognitiveState: {
          currentTask: null,
          confidence: 0,
          lastActivity: Date.now(),
        },
      });
    }
  }

  getAgent(id: AgentId): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  updateAgentStatus(id: AgentId, status: AgentStatus): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.cognitiveState.lastActivity = Date.now();
    }
  }

  /**
   * Tree-of-Thought Reasoning
   * Generates multiple reasoning paths and evaluates them
   */
  async treeOfThought(
    problem: string,
    context: Record<string, unknown>,
    maxDepth: number = 3,
    branchingFactor: number = 3
  ): Promise<ThoughtTree> {
    const rootNode: ThoughtNode = {
      id: `thought_${Date.now()}_root`,
      content: problem,
      depth: 0,
      score: 0,
      children: [],
      reasoning: '',
      evaluation: null,
    };

    const tree: ThoughtTree = {
      root: rootNode,
      paths: [],
      bestPath: null,
      totalNodes: 1,
      maxDepth: 0,
    };

    await this.expandNode(rootNode, context, maxDepth, branchingFactor, tree);
    tree.paths = this.extractPaths(rootNode);
    tree.bestPath = this.selectBestPath(tree.paths);

    return tree;
  }

  private async expandNode(
    node: ThoughtNode,
    context: Record<string, unknown>,
    maxDepth: number,
    branchingFactor: number,
    tree: ThoughtTree
  ): Promise<void> {
    if (node.depth >= maxDepth) {
      node.evaluation = await this.evaluateThought(node, context);
      node.score = node.evaluation.score;
      return;
    }

    const thoughts = await this.generateThoughts(node, context, branchingFactor);

    for (const thought of thoughts) {
      const childNode: ThoughtNode = {
        id: `thought_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: thought.content,
        depth: node.depth + 1,
        score: 0,
        children: [],
        reasoning: thought.reasoning,
        evaluation: null,
      };

      node.children.push(childNode);
      tree.totalNodes++;
      tree.maxDepth = Math.max(tree.maxDepth, childNode.depth);

      await this.expandNode(childNode, context, maxDepth, branchingFactor, tree);
    }

    if (node.children.length > 0) {
      node.score = Math.max(...node.children.map(c => c.score));
    }
  }

  private async generateThoughts(
    node: ThoughtNode,
    context: Record<string, unknown>,
    count: number
  ): Promise<Array<{ content: string; reasoning: string }>> {
    const thoughts: Array<{ content: string; reasoning: string }> = [];

    const strategies = [
      'conservative',
      'progressive',
      'holistic',
      'climate-first',
    ];

    for (let i = 0; i < Math.min(count, strategies.length); i++) {
      thoughts.push({
        content: `${strategies[i]} approach to: ${node.content}`,
        reasoning: `Applying ${strategies[i]} strategy considering context`,
      });
    }

    return thoughts;
  }

  private async evaluateThought(
    node: ThoughtNode,
    context: Record<string, unknown>
  ): Promise<{ score: number; factors: Record<string, number>; recommendation: string }> {
    const factors = {
      feasibility: 0.7 + Math.random() * 0.3,
      climateAlignment: 0.6 + Math.random() * 0.4,
      technicalSoundness: 0.65 + Math.random() * 0.35,
      riskLevel: 0.5 + Math.random() * 0.5,
    };

    const weights = {
      feasibility: 0.3,
      climateAlignment: 0.25,
      technicalSoundness: 0.25,
      riskLevel: 0.2,
    };

    const score = Object.entries(factors).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0
    );

    return {
      score,
      factors,
      recommendation: score > 0.75 ? 'approve' : score > 0.5 ? 'review' : 'reject',
    };
  }

  private extractPaths(root: ThoughtNode): ReasoningPath[] {
    const paths: ReasoningPath[] = [];

    const traverse = (node: ThoughtNode, currentPath: ThoughtNode[]): void => {
      const newPath = [...currentPath, node];

      if (node.children.length === 0) {
        paths.push({
          nodes: newPath,
          totalScore: newPath.reduce((sum, n) => sum + n.score, 0) / newPath.length,
          depth: newPath.length,
        });
      } else {
        for (const child of node.children) {
          traverse(child, newPath);
        }
      }
    };

    traverse(root, []);
    return paths;
  }

  private selectBestPath(paths: ReasoningPath[]): ReasoningPath | null {
    if (paths.length === 0) return null;
    return paths.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );
  }

  /**
   * Council Session Management
   * Facilitates agent discussions before human review
   */
  async startCouncilSession(
    topic: string,
    initiator: AgentId,
    participants?: AgentId[]
  ): Promise<CouncilSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const session: CouncilSession = {
      id: sessionId,
      topic,
      initiator,
      participants: participants || Array.from(this.agents.keys()),
      status: 'active',
      startTime: Date.now(),
      messages: [],
      decisions: [],
      consensus: null,
    };

    this.activeSessions.set(sessionId, session);

    await this.notifyParticipants(session, 'session_started');

    return session;
  }

  async submitToCouncil(
    sessionId: string,
    agentId: AgentId,
    content: string,
    type: 'proposal' | 'critique' | 'support' | 'question'
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const message: A2AMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      from: agentId,
      to: 'council',
      type,
      content,
      timestamp: Date.now(),
      sessionId,
    };

    session.messages.push(message);
    this.messageQueue.push(message);

    await this.processCouncilMessage(session, message);
  }

  private async processCouncilMessage(
    session: CouncilSession,
    message: A2AMessage
  ): Promise<void> {
    for (const participantId of session.participants) {
      if (participantId !== message.from) {
        await this.notifyAgent(participantId, message);
      }
    }
  }

  async callForVote(
    sessionId: string,
    proposal: string
  ): Promise<VotingResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const votes: Map<AgentId, { vote: 'approve' | 'reject' | 'abstain'; reason: string }> = new Map();

    for (const participantId of session.participants) {
      const agent = this.agents.get(participantId);
      if (agent && agent.status === 'online') {
        const vote = await this.getAgentVote(agent, proposal, session);
        votes.set(participantId, vote);
      }
    }

    const approvals = Array.from(votes.values()).filter(v => v.vote === 'approve').length;
    const rejections = Array.from(votes.values()).filter(v => v.vote === 'reject').length;
    const abstentions = Array.from(votes.values()).filter(v => v.vote === 'abstain').length;

    const result: VotingResult = {
      proposal,
      votes: Object.fromEntries(votes),
      summary: {
        approve: approvals,
        reject: rejections,
        abstain: abstentions,
        total: votes.size,
      },
      passed: approvals > rejections && approvals >= Math.ceil(votes.size / 2),
      timestamp: Date.now(),
    };

    session.decisions.push({
      type: 'vote',
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  private async getAgentVote(
    agent: Agent,
    proposal: string,
    session: CouncilSession
  ): Promise<{ vote: 'approve' | 'reject' | 'abstain'; reason: string }> {
    const domainRelevance = this.assessDomainRelevance(agent.domain, proposal);

    if (domainRelevance < 0.3) {
      return { vote: 'abstain', reason: 'Outside domain expertise' };
    }

    const alignment = 0.5 + Math.random() * 0.5;

    if (alignment > 0.7) {
      return { vote: 'approve', reason: `Aligns with ${agent.domain} principles` };
    } else if (alignment < 0.4) {
      return { vote: 'reject', reason: `Conflicts with ${agent.domain} requirements` };
    } else {
      return { vote: 'abstain', reason: 'Insufficient information to decide' };
    }
  }

  private assessDomainRelevance(domain: string, proposal: string): number {
    const domainKeywords: Record<string, string[]> = {
      architecture: ['design', 'structure', 'system', 'pattern', 'module'],
      infrastructure: ['deploy', 'build', 'ci', 'pipeline', 'server'],
      design: ['ui', 'ux', 'component', 'style', 'interface'],
      ethics: ['climate', 'validation', 'truth', 'verify', 'claim'],
      memory: ['store', 'remember', 'log', 'history', 'learn'],
      research: ['investigate', 'analyze', 'study', 'explore', 'innovate'],
      security: ['protect', 'secure', 'access', 'auth', 'guard'],
    };

    const keywords = domainKeywords[domain] || [];
    const proposalLower = proposal.toLowerCase();
    const matches = keywords.filter(kw => proposalLower.includes(kw)).length;

    return Math.min(1, matches / 2);
  }

  async concludeSession(sessionId: string): Promise<CouncilDecision> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'concluded';
    session.endTime = Date.now();

    const decision: CouncilDecision = {
      sessionId,
      topic: session.topic,
      participants: session.participants,
      messageCount: session.messages.length,
      decisions: session.decisions,
      duration: session.endTime - session.startTime,
      consensus: this.determineConsensus(session),
      readyForHumanReview: true,
    };

    session.consensus = decision.consensus;

    this.activeSessions.delete(sessionId);

    return decision;
  }

  private determineConsensus(session: CouncilSession): string {
    const voteDecisions = session.decisions.filter(d => d.type === 'vote');
    if (voteDecisions.length === 0) {
      return 'No formal votes taken';
    }

    const lastVote = voteDecisions[voteDecisions.length - 1];
    const result = lastVote.result as VotingResult;
    if (result.passed) {
      return `Approved with ${result.summary.approve}/${result.summary.total} votes`;
    } else {
      return `Rejected with ${result.summary.reject}/${result.summary.total} votes`;
    }
  }

  private async notifyParticipants(
    session: CouncilSession,
    eventType: string
  ): Promise<void> {
    for (const participantId of session.participants) {
      const agent = this.agents.get(participantId);
      if (agent) {
        agent.cognitiveState.currentTask = `Council session: ${session.topic}`;
      }
    }
  }

  private async notifyAgent(agentId: AgentId, message: A2AMessage): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.cognitiveState.lastActivity = Date.now();
    }
  }

  /**
   * Get council status for monitoring
   */
  getCouncilStatus(): {
    agents: Array<{ id: AgentId; name: string; status: AgentStatus }>;
    activeSessions: number;
    pendingMessages: number;
  } {
    return {
      agents: Array.from(this.agents.values()).map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
      })),
      activeSessions: this.activeSessions.size,
      pendingMessages: this.messageQueue.length,
    };
  }
}

export function createAgentCouncil(): AgentCouncil {
  return new AgentCouncil();
}

export const COUNCIL_VERSION = '1.0.0';
export const COUNCIL_CODENAME = 'Aesir Genesis';
