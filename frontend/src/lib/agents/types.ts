/**
 * Agent Types - ZORA CORE: Aesir Genesis
 * Type definitions for the multi-agent system
 */

export type AgentId = 'odin' | 'thor' | 'baldur' | 'tyr' | 'eivor' | 'freya' | 'heimdall';

export type AgentStatus = 
  | 'initializing'
  | 'online'
  | 'offline'
  | 'thinking'
  | 'coordinating'
  | 'self_correcting'
  | 'validating'
  | 'researching'
  | 'watching';

export interface CognitiveState {
  currentTask: string | null;
  confidence: number;
  lastActivity: number;
  memoryContext?: string[];
  activeReasoningPaths?: number;
}

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  domain: string;
  status: AgentStatus;
  cognitiveState: CognitiveState;
}

export interface ThoughtNode {
  id: string;
  content: string;
  depth: number;
  score: number;
  children: ThoughtNode[];
  reasoning: string;
  evaluation: {
    score: number;
    factors: Record<string, number>;
    recommendation: string;
  } | null;
}

export interface ReasoningPath {
  nodes: ThoughtNode[];
  totalScore: number;
  depth: number;
}

export interface ThoughtTree {
  root: ThoughtNode;
  paths: ReasoningPath[];
  bestPath: ReasoningPath | null;
  totalNodes: number;
  maxDepth: number;
}

export type A2AMessageType = 
  | 'proposal'
  | 'critique'
  | 'support'
  | 'question'
  | 'directive'
  | 'status_report'
  | 'memory_query'
  | 'validation_request'
  | 'security_alert';

export interface A2AMessage {
  id: string;
  from: AgentId | 'council' | 'system';
  to: AgentId | 'council' | 'all';
  type: A2AMessageType;
  content: string;
  timestamp: number;
  sessionId?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: string;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string;
}

export interface CouncilSession {
  id: string;
  topic: string;
  initiator: AgentId;
  participants: AgentId[];
  status: 'active' | 'voting' | 'concluded' | 'cancelled';
  startTime: number;
  endTime?: number;
  messages: A2AMessage[];
  decisions: CouncilSessionDecision[];
  consensus: string | null;
}

export interface CouncilSessionDecision {
  type: 'vote' | 'directive' | 'consensus';
  result: VotingResult | DirectiveResult;
  timestamp: number;
}

export interface VotingResult {
  proposal: string;
  votes: Partial<Record<AgentId, { vote: 'approve' | 'reject' | 'abstain'; reason: string }>>;
  summary: {
    approve: number;
    reject: number;
    abstain: number;
    total: number;
  };
  passed: boolean;
  timestamp: number;
}

export interface DirectiveResult {
  directive: string;
  issuer: AgentId;
  targets: AgentId[];
  acknowledged: AgentId[];
  status: 'pending' | 'acknowledged' | 'completed' | 'failed';
}

export interface CouncilDecision {
  sessionId: string;
  topic: string;
  participants: AgentId[];
  messageCount: number;
  decisions: CouncilSessionDecision[];
  duration: number;
  consensus: string;
  readyForHumanReview: boolean;
}

export interface EnsembleReasoningConfig {
  paths: number;
  strategies: string[];
  judgeWeights: {
    successProbability: number;
    climateAlignment: number;
    technicalDebt: number;
    complexity: number;
  };
  consensusThreshold: number;
}

export interface SelfCorrectionConfig {
  maxAttempts: number;
  errorCategories: string[];
  escalationTarget: AgentId;
}

export interface ValidationLoopConfig {
  sources: string[];
  confidenceThreshold: number;
  requireMultipleSources: boolean;
}

export interface EpisodicMemoryEntry {
  id: string;
  hash: string;
  type: string;
  timestamp: number;
  actors: AgentId[];
  context: Record<string, unknown>;
  outcome: Record<string, unknown>;
  lessons: string[];
  retrievalCount: number;
  importanceScore: number;
}

export interface AgentRegistry {
  version: string;
  lastUpdated: number;
  agents: Record<AgentId, AgentRegistryEntry>;
  council: CouncilRegistryEntry;
  memory: MemoryRegistryEntry;
}

export interface AgentRegistryEntry {
  id: AgentId;
  name: string;
  role: string;
  domain: string;
  status: AgentStatus;
  lastOnline: number;
  cognitiveBlueprint: string;
  capabilities: string[];
  familyBonds: Partial<Record<AgentId, string>>;
}

export interface CouncilRegistryEntry {
  activeSessions: number;
  totalDecisions: number;
  lastSession: number;
  consensusRate: number;
}

export interface MemoryRegistryEntry {
  totalMemories: number;
  patternsIdentified: number;
  lessonsSynthesized: number;
  recentHashes: string[];
}

export interface OdinOnlineStatus {
  status: 'online';
  ensembleReasoning: 'active';
  parallelPaths: number;
  judgeMind: 'calibrated';
  familyBonds: 'established';
  climateFilter: 'engaged';
  memoryLink: 'connected';
  message: string;
}
