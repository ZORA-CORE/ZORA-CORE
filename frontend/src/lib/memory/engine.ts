/**
 * EIVOR Memory Engine (The Well of Mímir)
 * Dual-layer memory system combining Hot Memory (KV) and Semantic Memory (Vector DB)
 * Implements trajectory encoding, memory hashing, and lesson retrieval
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

import { createHash } from 'crypto';
import { HotMemoryStore, createHotMemoryStore } from './hot-memory';
import { SemanticMemoryStore, createSemanticMemoryStore } from './semantic-memory';
import type {
  InteractionTrace,
  TraceType,
  AgentId,
  TraceContext,
  TraceAction,
  TraceOutcome,
  MemorySearchQuery,
  MemorySearchResult,
  Lesson,
  Pattern,
  AgentMemoryState,
  MemoryEngineConfig,
  RetrieveLessonsResult,
  EivorStatus,
} from './types';

const DEFAULT_CONFIG: MemoryEngineConfig = {
  hot_memory: {
    max_entries: 10,
    ttl_ms: 3600000,
    prefix: 'eivor:hot:',
  },
  semantic_memory: {
    index_name: 'eivor-memory',
    namespace: 'zora-core',
    default_top_k: 10,
    rerank_model: 'pinecone-rerank-v0',
  },
  enable_pinecone: true,
  enable_kv: true,
};

export class MemoryEngine {
  private hotMemory: HotMemoryStore;
  private semanticMemory: SemanticMemoryStore;
  private config: MemoryEngineConfig;
  private reasoningTrace: string[] = [];
  private lessons: Map<string, Lesson> = new Map();
  private patterns: Map<string, Pattern> = new Map();
  private agentStates: Map<AgentId, AgentMemoryState> = new Map();
  private traceCounter: number = 0;

  constructor(config: Partial<MemoryEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.hotMemory = createHotMemoryStore(this.config.hot_memory);
    this.semanticMemory = createSemanticMemoryStore(this.config.semantic_memory);
    this.addTrace('MemoryEngine (Well of Mímir) initialized');
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [MEMORY_ENGINE] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
  }

  private generateTraceId(): string {
    this.traceCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `trace_${timestamp}_${this.traceCounter}_${random}`;
  }

  private generateMemoryHash(content: string, timestamp: number, agentId: AgentId): string {
    const input = `${content}|${timestamp}|${agentId}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  private generateContentSummary(
    traceType: TraceType,
    context: TraceContext,
    action: TraceAction,
    outcome: TraceOutcome
  ): string {
    const parts: string[] = [];
    parts.push(`[${traceType.toUpperCase()}]`);
    parts.push(`Task: ${context.task}`);
    parts.push(`Action: ${action.type}`);
    parts.push(`Outcome: ${outcome.status} (score: ${outcome.score.toFixed(2)})`);
    if (outcome.error_message) {
      parts.push(`Error: ${outcome.error_message}`);
    }
    if (action.reasoning_trace.length > 0) {
      parts.push(`Reasoning: ${action.reasoning_trace.slice(-3).join(' -> ')}`);
    }
    return parts.join(' | ');
  }

  async encodeTrajectory(
    traceType: TraceType,
    agentId: AgentId,
    context: TraceContext,
    action: TraceAction,
    outcome: TraceOutcome,
    lessons: string[] = []
  ): Promise<InteractionTrace> {
    this.addTrace('Encoding trajectory', { type: traceType, agent: agentId, task: context.task });

    const timestamp = Date.now();
    const content = this.generateContentSummary(traceType, context, action, outcome);
    const memoryHash = this.generateMemoryHash(content, timestamp, agentId);

    const importanceScore = this.calculateImportance(traceType, outcome);

    const trace: InteractionTrace = {
      id: this.generateTraceId(),
      timestamp,
      trace_type: traceType,
      agent_id: agentId,
      task_key: context.task_key,
      context,
      action,
      outcome,
      content,
      summary: content.substring(0, 200),
      lessons,
      memory_hash: memoryHash,
      importance_score: importanceScore,
      retrieval_count: 0,
    };

    await this.hotMemory.store(trace);

    await this.semanticMemory.upsert([trace]);

    await this.updateAgentMemoryState(agentId, trace);

    this.addTrace('Trajectory encoded and stored', { id: trace.id, hash: memoryHash });
    return trace;
  }

  private calculateImportance(traceType: TraceType, outcome: TraceOutcome): number {
    let base = 0.5;

    const typeWeights: Record<TraceType, number> = {
      task_complete: 0.6,
      task_failed: 0.8,
      pr_postmortem: 0.9,
      deployment: 0.7,
      build_failure: 0.85,
      validation: 0.6,
      decision: 0.75,
      learning: 0.7,
      initialization: 0.5,
    };

    base = typeWeights[traceType] || 0.5;

    if (outcome.status === 'failure') {
      base = Math.min(1.0, base + 0.15);
    }

    base = base * 0.7 + outcome.score * 0.3;

    return Math.min(1.0, Math.max(0.0, base));
  }

  async retrieveLessons(currentTask: string, agentId?: AgentId): Promise<RetrieveLessonsResult> {
    this.addTrace('Retrieving lessons for task', { task: currentTask, agent: agentId });

    const query: MemorySearchQuery = {
      query: currentTask,
      topK: 10,
      filter: {
        outcome_status: 'success',
        min_importance: 0.6,
      },
      rerank: true,
    };

    if (agentId) {
      query.filter!.agent_id = agentId;
    }

    const searchResults = await this.semanticMemory.search(query);

    const failureQuery: MemorySearchQuery = {
      query: currentTask,
      topK: 5,
      filter: {
        outcome_status: 'failure',
        min_importance: 0.7,
      },
    };

    const failureResults = await this.semanticMemory.search(failureQuery);

    const relatedTraces = [...searchResults, ...failureResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const lessons = this.extractLessonsFromTraces(relatedTraces);

    const patterns = this.detectPatterns(relatedTraces);

    const recommendations = this.generateRecommendations(lessons, patterns, currentTask);

    this.addTrace('Lessons retrieved', {
      traces: relatedTraces.length,
      lessons: lessons.length,
      patterns: patterns.length,
    });

    return {
      lessons,
      related_traces: relatedTraces,
      patterns,
      recommendations,
      reasoning_trace: this.getReasoningTrace(),
    };
  }

  private extractLessonsFromTraces(traces: MemorySearchResult[]): Lesson[] {
    const lessons: Lesson[] = [];

    for (const result of traces) {
      const trace = result.trace;

      if (trace.lessons && trace.lessons.length > 0) {
        for (const lessonText of trace.lessons) {
          const lesson: Lesson = {
            id: `lesson_${trace.id}_${lessons.length}`,
            timestamp: trace.timestamp,
            source_trace_id: trace.id,
            agent_id: trace.agent_id,
            category: this.categorizeLesson(lessonText, trace.trace_type),
            title: lessonText.substring(0, 50),
            description: lessonText,
            memory_hash: this.generateMemoryHash(lessonText, trace.timestamp, trace.agent_id),
            applied_count: 0,
          };
          lessons.push(lesson);
        }
      }

      if (trace.outcome.status === 'failure' && trace.outcome.error_message) {
        const preventionLesson: Lesson = {
          id: `lesson_prevention_${trace.id}`,
          timestamp: trace.timestamp,
          source_trace_id: trace.id,
          agent_id: trace.agent_id,
          category: 'technical',
          title: `Avoid: ${trace.outcome.error_message.substring(0, 40)}`,
          description: `Previous failure: ${trace.outcome.error_message}`,
          prevention_strategy: `Check for similar conditions before ${trace.action.type}`,
          memory_hash: this.generateMemoryHash(trace.outcome.error_message, trace.timestamp, trace.agent_id),
          applied_count: 0,
        };
        lessons.push(preventionLesson);
      }
    }

    return lessons;
  }

  private categorizeLesson(
    lessonText: string,
    traceType: TraceType
  ): 'technical' | 'process' | 'architecture' | 'climate' | 'collaboration' {
    const lower = lessonText.toLowerCase();

    if (lower.includes('climate') || lower.includes('carbon') || lower.includes('emission')) {
      return 'climate';
    }
    if (lower.includes('team') || lower.includes('review') || lower.includes('feedback')) {
      return 'collaboration';
    }
    if (lower.includes('architecture') || lower.includes('design') || lower.includes('pattern')) {
      return 'architecture';
    }
    if (lower.includes('process') || lower.includes('workflow') || lower.includes('pipeline')) {
      return 'process';
    }

    if (traceType === 'build_failure' || traceType === 'deployment') {
      return 'technical';
    }
    if (traceType === 'decision') {
      return 'architecture';
    }
    if (traceType === 'pr_postmortem') {
      return 'process';
    }

    return 'technical';
  }

  private detectPatterns(traces: MemorySearchResult[]): Pattern[] {
    const taskKeyGroups = new Map<string, MemorySearchResult[]>();

    for (const trace of traces) {
      const key = trace.trace.task_key;
      if (!taskKeyGroups.has(key)) {
        taskKeyGroups.set(key, []);
      }
      taskKeyGroups.get(key)!.push(trace);
    }

    const patterns: Pattern[] = [];

    for (const [taskKey, group] of taskKeyGroups) {
      if (group.length >= 2) {
        const timestamps = group.map(t => t.trace.timestamp).sort();
        const pattern: Pattern = {
          id: `pattern_${taskKey}_${Date.now()}`,
          name: `Recurring: ${taskKey}`,
          description: `This task pattern has occurred ${group.length} times`,
          trace_ids: group.map(t => t.id),
          occurrence_count: group.length,
          first_seen: timestamps[0],
          last_seen: timestamps[timestamps.length - 1],
          category: taskKey.split('_')[0] || 'general',
          prevention_strategies: [],
          memory_hash: this.generateMemoryHash(taskKey, Date.now(), 'eivor'),
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private generateRecommendations(
    lessons: Lesson[],
    patterns: Pattern[],
    currentTask: string
  ): string[] {
    const recommendations: string[] = [];

    const failureLessons = lessons.filter(l => l.prevention_strategy);
    if (failureLessons.length > 0) {
      recommendations.push(
        `Review ${failureLessons.length} previous failure(s) related to this task type before proceeding.`
      );
    }

    const frequentPatterns = patterns.filter(p => p.occurrence_count >= 3);
    if (frequentPatterns.length > 0) {
      recommendations.push(
        `This task matches ${frequentPatterns.length} frequently occurring pattern(s). Consider established approaches.`
      );
    }

    const successLessons = lessons.filter(l => !l.prevention_strategy);
    if (successLessons.length > 0) {
      recommendations.push(
        `${successLessons.length} successful approach(es) found. Apply learned strategies.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        `No strong historical patterns found for "${currentTask}". Proceed with standard approach and document learnings.`
      );
    }

    return recommendations;
  }

  private async updateAgentMemoryState(agentId: AgentId, trace: InteractionTrace): Promise<void> {
    const existing = this.agentStates.get(agentId);
    const recentTraces = await this.hotMemory.getAgentTraces(agentId, 10);
    const recentHashes = recentTraces.map(t => t.memory_hash).join('|');

    const state: AgentMemoryState = {
      agent_id: agentId,
      cognitive_blueprint_hash: existing?.cognitive_blueprint_hash || '',
      capabilities_hash: existing?.capabilities_hash || '',
      playbook_hash: existing?.playbook_hash || '',
      recent_traces_hash: this.generateMemoryHash(recentHashes, Date.now(), agentId),
      combined_memory_hash: '',
      last_updated: Date.now(),
      trace_count: (existing?.trace_count || 0) + 1,
      lesson_count: existing?.lesson_count || 0,
    };

    const combinedInput = `${state.cognitive_blueprint_hash}|${state.capabilities_hash}|${state.playbook_hash}|${state.recent_traces_hash}`;
    state.combined_memory_hash = createHash('sha256').update(combinedInput).digest('hex').substring(0, 16);

    this.agentStates.set(agentId, state);
  }

  async computeAgentMemoryHash(
    agentId: AgentId,
    cognitiveBlueprint: Record<string, unknown>,
    capabilities: string[],
    playbookContent: string
  ): Promise<string> {
    this.addTrace('Computing agent memory hash', { agent: agentId });

    const blueprintHash = createHash('sha256')
      .update(JSON.stringify(cognitiveBlueprint, Object.keys(cognitiveBlueprint).sort()))
      .digest('hex')
      .substring(0, 16);

    const capabilitiesHash = createHash('sha256')
      .update(capabilities.sort().join('|'))
      .digest('hex')
      .substring(0, 16);

    const playbookHash = createHash('sha256')
      .update(playbookContent)
      .digest('hex')
      .substring(0, 16);

    const recentTraces = await this.hotMemory.getAgentTraces(agentId, 10);
    const recentHashes = recentTraces.map(t => t.memory_hash).join('|');
    const recentTracesHash = createHash('sha256')
      .update(recentHashes || 'empty')
      .digest('hex')
      .substring(0, 16);

    const combinedInput = `${blueprintHash}|${capabilitiesHash}|${playbookHash}|${recentTracesHash}`;
    const combinedHash = createHash('sha256').update(combinedInput).digest('hex').substring(0, 16);

    const state: AgentMemoryState = {
      agent_id: agentId,
      cognitive_blueprint_hash: blueprintHash,
      capabilities_hash: capabilitiesHash,
      playbook_hash: playbookHash,
      recent_traces_hash: recentTracesHash,
      combined_memory_hash: combinedHash,
      last_updated: Date.now(),
      trace_count: recentTraces.length,
      lesson_count: 0,
    };

    this.agentStates.set(agentId, state);

    this.addTrace('Agent memory hash computed', { agent: agentId, hash: combinedHash });
    return combinedHash;
  }

  async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    this.addTrace('Searching memory', { query: query.query });

    const hotResults = await this.searchHotMemory(query);

    const semanticResults = await this.semanticMemory.search(query);

    const combined = this.mergeAndDeduplicateResults(hotResults, semanticResults);

    this.addTrace('Search complete', { results: combined.length });
    return combined;
  }

  private async searchHotMemory(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    const recentTraces = await this.hotMemory.getRecentTraces();
    const results: MemorySearchResult[] = [];
    const queryLower = query.query.toLowerCase();

    for (const trace of recentTraces) {
      if (query.filter?.trace_type) {
        const types = Array.isArray(query.filter.trace_type)
          ? query.filter.trace_type
          : [query.filter.trace_type];
        if (!types.includes(trace.trace_type)) continue;
      }

      if (query.filter?.agent_id) {
        const agents = Array.isArray(query.filter.agent_id)
          ? query.filter.agent_id
          : [query.filter.agent_id];
        if (!agents.includes(trace.agent_id)) continue;
      }

      let score = 0;
      if (trace.content.toLowerCase().includes(queryLower)) score += 0.5;
      if (trace.task_key.toLowerCase().includes(queryLower)) score += 0.3;

      if (score > 0) {
        results.push({ id: trace.id, score: score + 0.2, trace });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private mergeAndDeduplicateResults(
    hotResults: MemorySearchResult[],
    semanticResults: MemorySearchResult[]
  ): MemorySearchResult[] {
    const seen = new Set<string>();
    const merged: MemorySearchResult[] = [];

    for (const result of hotResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push({ ...result, score: result.score * 1.1 });
      }
    }

    for (const result of semanticResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }

    return merged.sort((a, b) => b.score - a.score);
  }

  async getStatus(): Promise<EivorStatus> {
    const hotStats = await this.hotMemory.getStats();
    const semanticStats = await this.semanticMemory.getStats();

    const agentHashes: Record<AgentId, string> = {} as Record<AgentId, string>;
    for (const [agentId, state] of this.agentStates) {
      agentHashes[agentId] = state.combined_memory_hash;
    }

    return {
      status: 'sovereign',
      level: 'Cognitive Sovereignty Level',
      memory_stats: {
        hot_memory_count: hotStats.total_entries,
        semantic_memory_count: semanticStats.total_vectors,
        total_traces: hotStats.total_entries + semanticStats.total_vectors,
        total_lessons: this.lessons.size,
        total_patterns: this.patterns.size,
      },
      storage_health: {
        hot_memory: 'healthy',
        semantic_memory: semanticStats.mode === 'pinecone' ? 'healthy' : 'degraded',
      },
      agent_hashes: agentHashes,
      reasoning_trace: this.getReasoningTrace(),
    };
  }

  getReasoningTrace(): string[] {
    return [
      ...this.reasoningTrace,
      ...this.hotMemory.getReasoningTrace(),
      ...this.semanticMemory.getReasoningTrace(),
    ];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
    this.hotMemory.clearReasoningTrace();
    this.semanticMemory.clearReasoningTrace();
  }

  getHotMemory(): HotMemoryStore {
    return this.hotMemory;
  }

  getSemanticMemory(): SemanticMemoryStore {
    return this.semanticMemory;
  }
}

export function createMemoryEngine(config?: Partial<MemoryEngineConfig>): MemoryEngine {
  return new MemoryEngine(config);
}

let globalMemoryEngine: MemoryEngine | null = null;

export function getGlobalMemoryEngine(): MemoryEngine {
  if (!globalMemoryEngine) {
    globalMemoryEngine = createMemoryEngine();
  }
  return globalMemoryEngine;
}
