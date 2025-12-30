/**
 * EIVOR Memory Types
 * Type definitions for the Episodic Memory System (Well of Mímir)
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

export type TraceType =
  | 'task_complete'
  | 'task_failed'
  | 'pr_postmortem'
  | 'deployment'
  | 'build_failure'
  | 'validation'
  | 'decision'
  | 'learning'
  | 'initialization';

export type AgentId = 'odin' | 'thor' | 'baldur' | 'tyr' | 'eivor' | 'freya' | 'heimdall';

export type OutcomeStatus = 'success' | 'failure' | 'partial' | 'pending';

export interface TraceContext {
  task: string;
  task_key: string;
  state: Record<string, unknown>;
  environment?: {
    branch?: string;
    commit_sha?: string;
    timestamp: number;
  };
}

export interface TraceAction {
  type: string;
  parameters: Record<string, unknown>;
  reasoning_trace: string[];
}

export interface TraceOutcome {
  status: OutcomeStatus;
  score: number;
  artifacts: RelatedArtifact[];
  error_message?: string;
  duration_ms?: number;
}

export interface RelatedArtifact {
  type: 'commit' | 'pr' | 'deployment' | 'file' | 'log' | 'url';
  id: string;
  url?: string;
  description?: string;
}

export interface InteractionTrace {
  id: string;
  timestamp: number;
  trace_type: TraceType;
  agent_id: AgentId;
  task_key: string;
  context: TraceContext;
  action: TraceAction;
  outcome: TraceOutcome;
  content: string;
  summary: string;
  lessons: string[];
  memory_hash: string;
  importance_score: number;
  retrieval_count: number;
}

export interface PineconeRecord {
  _id: string;
  content: string;
  trace_type: TraceType;
  agent_id: AgentId;
  task_key: string;
  timestamp: number;
  importance_score: number;
  memory_hash: string;
  outcome_status: OutcomeStatus;
  outcome_score: number;
}

export interface MemorySearchResult {
  id: string;
  score: number;
  trace: InteractionTrace;
}

export interface MemorySearchQuery {
  query: string;
  topK?: number;
  filter?: {
    trace_type?: TraceType | TraceType[];
    agent_id?: AgentId | AgentId[];
    task_key?: string;
    min_importance?: number;
    outcome_status?: OutcomeStatus;
    since_timestamp?: number;
  };
  rerank?: boolean;
}

export interface Lesson {
  id: string;
  timestamp: number;
  source_trace_id: string;
  agent_id: AgentId;
  category: 'technical' | 'process' | 'architecture' | 'climate' | 'collaboration';
  title: string;
  description: string;
  prevention_strategy?: string;
  memory_hash: string;
  applied_count: number;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  trace_ids: string[];
  occurrence_count: number;
  first_seen: number;
  last_seen: number;
  category: string;
  prevention_strategies: string[];
  memory_hash: string;
}

export interface AgentMemoryState {
  agent_id: AgentId;
  cognitive_blueprint_hash: string;
  capabilities_hash: string;
  playbook_hash: string;
  recent_traces_hash: string;
  combined_memory_hash: string;
  last_updated: number;
  trace_count: number;
  lesson_count: number;
}

export interface HotMemoryEntry {
  trace: InteractionTrace;
  cached_at: number;
  access_count: number;
}

export interface HotMemoryConfig {
  max_entries: number;
  ttl_ms: number;
  prefix: string;
}

export interface SemanticMemoryConfig {
  index_name: string;
  namespace: string;
  default_top_k: number;
  rerank_model?: string;
}

export interface MemoryEngineConfig {
  hot_memory: HotMemoryConfig;
  semantic_memory: SemanticMemoryConfig;
  enable_pinecone: boolean;
  enable_kv: boolean;
}

export interface PostMortemInput {
  pr_number: number;
  pr_url: string;
  build_logs?: string;
  review_feedback?: string[];
  deployment_status?: 'success' | 'failure';
  duration_ms?: number;
}

export interface PostMortemResult {
  trace_id: string;
  lessons: Lesson[];
  patterns_detected: Pattern[];
  playbook_updates: Array<{
    agent_id: AgentId;
    section: string;
    content: string;
  }>;
  memory_hash: string;
  reasoning_trace: string[];
}

export interface RetrieveLessonsResult {
  lessons: Lesson[];
  related_traces: MemorySearchResult[];
  patterns: Pattern[];
  recommendations: string[];
  reasoning_trace: string[];
}

export interface EivorStatus {
  status: 'sovereign' | 'remembering' | 'analyzing' | 'synthesizing' | 'offline';
  level: 'Cognitive Sovereignty Level';
  current_operation?: string;
  memory_stats: {
    hot_memory_count: number;
    semantic_memory_count: number;
    total_traces: number;
    total_lessons: number;
    total_patterns: number;
  };
  storage_health: {
    hot_memory: 'healthy' | 'degraded' | 'offline';
    semantic_memory: 'healthy' | 'degraded' | 'offline';
  };
  agent_hashes: Record<AgentId, string>;
  last_consolidation?: number;
  reasoning_trace: string[];
}

export interface SICAProtocolState {
  active: boolean;
  phase: 'idle' | 'analyzing' | 'extracting' | 'updating' | 'complete';
  current_pr?: number;
  lessons_extracted: number;
  playbooks_updated: string[];
  reasoning_trace: string[];
}

export interface ExperienceReplayRequest {
  requester: AgentId;
  task_description: string;
  context: Record<string, unknown>;
}

export interface ExperienceReplayResponse {
  historical_traces: MemorySearchResult[];
  relevant_lessons: Lesson[];
  patterns: Pattern[];
  recommendations: string[];
  confidence_score: number;
  reasoning_trace: string[];
}
