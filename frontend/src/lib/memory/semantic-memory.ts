/**
 * EIVOR Semantic Memory Layer
 * Long-term memory using Pinecone Vector DB for semantic retrieval
 * Stores "Successful Trajectories" as embeddings for pattern matching
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

import type {
  InteractionTrace,
  PineconeRecord,
  MemorySearchResult,
  MemorySearchQuery,
  SemanticMemoryConfig,
  TraceType,
  AgentId,
} from './types';

const DEFAULT_CONFIG: SemanticMemoryConfig = {
  index_name: 'eivor-memory',
  namespace: 'zora-core',
  default_top_k: 10,
  rerank_model: 'pinecone-rerank-v0',
};

const PINECONE_API_BASE = 'https://eivor-memory-cp0lia0.svc.aped-4627-b74a.pinecone.io';

export class SemanticMemoryStore {
  private config: SemanticMemoryConfig;
  private apiKey: string | undefined;
  private reasoningTrace: string[] = [];
  private localFallback: Map<string, InteractionTrace> = new Map();
  private useLocalFallback: boolean = false;

  constructor(config: Partial<SemanticMemoryConfig> = {}, apiKey?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiKey = apiKey || process.env.PINECONE_API_KEY;
    this.useLocalFallback = !this.apiKey;
    this.addTrace('SemanticMemoryStore initialized', {
      index: this.config.index_name,
      namespace: this.config.namespace,
      mode: this.useLocalFallback ? 'local_fallback' : 'pinecone',
    });
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [SEMANTIC_MEMORY] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
  }

  private traceToPineconeRecord(trace: InteractionTrace): PineconeRecord {
    return {
      _id: trace.id,
      content: trace.content,
      trace_type: trace.trace_type,
      agent_id: trace.agent_id,
      task_key: trace.task_key,
      timestamp: trace.timestamp,
      importance_score: trace.importance_score,
      memory_hash: trace.memory_hash,
      outcome_status: trace.outcome.status,
      outcome_score: trace.outcome.score,
    };
  }

  async upsert(traces: InteractionTrace[]): Promise<{ success: boolean; count: number }> {
    this.addTrace('Upserting traces to semantic memory', { count: traces.length });

    if (this.useLocalFallback) {
      for (const trace of traces) {
        this.localFallback.set(trace.id, trace);
      }
      this.addTrace('Stored in local fallback', { count: traces.length });
      return { success: true, count: traces.length };
    }

    const records = traces.map(t => this.traceToPineconeRecord(t));

    try {
      const response = await fetch(`${PINECONE_API_BASE}/records/namespaces/${this.config.namespace}/upsert`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.addTrace('Pinecone upsert failed', { status: response.status, error });
        for (const trace of traces) {
          this.localFallback.set(trace.id, trace);
        }
        return { success: false, count: traces.length };
      }

      this.addTrace('Pinecone upsert successful', { count: traces.length });
      return { success: true, count: traces.length };
    } catch (error) {
      this.addTrace('Pinecone upsert error', { error: String(error) });
      for (const trace of traces) {
        this.localFallback.set(trace.id, trace);
      }
      return { success: false, count: traces.length };
    }
  }

  async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    this.addTrace('Searching semantic memory', { query: query.query, topK: query.topK });

    if (this.useLocalFallback) {
      return this.searchLocalFallback(query);
    }

    const topK = query.topK ?? this.config.default_top_k;
    const filter = this.buildPineconeFilter(query.filter);

    try {
      const searchBody: Record<string, unknown> = {
        query: {
          topK,
          inputs: { text: query.query },
        },
      };

      if (filter && Object.keys(filter).length > 0) {
        (searchBody.query as Record<string, unknown>).filter = filter;
      }

      if (query.rerank && this.config.rerank_model) {
        searchBody.rerank = {
          model: this.config.rerank_model,
          topN: Math.min(topK, 5),
          rankFields: ['content'],
        };
      }

      const response = await fetch(`${PINECONE_API_BASE}/records/namespaces/${this.config.namespace}/search`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) {
        const error = await response.text();
        this.addTrace('Pinecone search failed', { status: response.status, error });
        return this.searchLocalFallback(query);
      }

      const result = await response.json();
      const matches = result.result?.hits || result.matches || [];

      const results: MemorySearchResult[] = matches.map((match: {
        _id: string;
        _score?: number;
        score?: number;
        fields?: Record<string, unknown>;
      }) => ({
        id: match._id,
        score: match._score ?? match.score ?? 0,
        trace: this.reconstructTraceFromMatch(match),
      }));

      this.addTrace('Pinecone search successful', { results: results.length });
      return results;
    } catch (error) {
      this.addTrace('Pinecone search error', { error: String(error) });
      return this.searchLocalFallback(query);
    }
  }

  private buildPineconeFilter(filter?: MemorySearchQuery['filter']): Record<string, unknown> | undefined {
    if (!filter) return undefined;

    const conditions: Record<string, unknown>[] = [];

    if (filter.trace_type) {
      if (Array.isArray(filter.trace_type)) {
        conditions.push({ trace_type: { $in: filter.trace_type } });
      } else {
        conditions.push({ trace_type: { $eq: filter.trace_type } });
      }
    }

    if (filter.agent_id) {
      if (Array.isArray(filter.agent_id)) {
        conditions.push({ agent_id: { $in: filter.agent_id } });
      } else {
        conditions.push({ agent_id: { $eq: filter.agent_id } });
      }
    }

    if (filter.task_key) {
      conditions.push({ task_key: { $eq: filter.task_key } });
    }

    if (filter.min_importance !== undefined) {
      conditions.push({ importance_score: { $gte: filter.min_importance } });
    }

    if (filter.outcome_status) {
      conditions.push({ outcome_status: { $eq: filter.outcome_status } });
    }

    if (filter.since_timestamp) {
      conditions.push({ timestamp: { $gte: filter.since_timestamp } });
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { $and: conditions };
  }

  private reconstructTraceFromMatch(match: {
    _id: string;
    fields?: Record<string, unknown>;
  }): InteractionTrace {
    const fields = match.fields || {};
    return {
      id: match._id,
      timestamp: (fields.timestamp as number) || Date.now(),
      trace_type: (fields.trace_type as TraceType) || 'task_complete',
      agent_id: (fields.agent_id as AgentId) || 'eivor',
      task_key: (fields.task_key as string) || '',
      context: {
        task: '',
        task_key: (fields.task_key as string) || '',
        state: {},
      },
      action: {
        type: 'retrieved',
        parameters: {},
        reasoning_trace: [],
      },
      outcome: {
        status: (fields.outcome_status as 'success' | 'failure' | 'partial' | 'pending') || 'success',
        score: (fields.outcome_score as number) || 0,
        artifacts: [],
      },
      content: (fields.content as string) || '',
      summary: (fields.content as string)?.substring(0, 100) || '',
      lessons: [],
      memory_hash: (fields.memory_hash as string) || '',
      importance_score: (fields.importance_score as number) || 0.5,
      retrieval_count: 0,
    };
  }

  private searchLocalFallback(query: MemorySearchQuery): MemorySearchResult[] {
    this.addTrace('Using local fallback search');
    const queryLower = query.query.toLowerCase();
    const results: MemorySearchResult[] = [];

    for (const trace of this.localFallback.values()) {
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

      if (query.filter?.min_importance !== undefined) {
        if (trace.importance_score < query.filter.min_importance) continue;
      }

      if (query.filter?.outcome_status) {
        if (trace.outcome.status !== query.filter.outcome_status) continue;
      }

      if (query.filter?.since_timestamp) {
        if (trace.timestamp < query.filter.since_timestamp) continue;
      }

      const contentLower = trace.content.toLowerCase();
      const summaryLower = trace.summary.toLowerCase();
      const taskKeyLower = trace.task_key.toLowerCase();

      let score = 0;
      if (contentLower.includes(queryLower)) score += 0.5;
      if (summaryLower.includes(queryLower)) score += 0.3;
      if (taskKeyLower.includes(queryLower)) score += 0.2;

      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (contentLower.includes(word)) score += 0.1;
      }

      if (score > 0) {
        results.push({ id: trace.id, score, trace });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topK = query.topK ?? this.config.default_top_k;
    return results.slice(0, topK);
  }

  async delete(traceIds: string[]): Promise<{ success: boolean; count: number }> {
    this.addTrace('Deleting traces from semantic memory', { count: traceIds.length });

    for (const id of traceIds) {
      this.localFallback.delete(id);
    }

    if (this.useLocalFallback) {
      return { success: true, count: traceIds.length };
    }

    try {
      const response = await fetch(`${PINECONE_API_BASE}/records/namespaces/${this.config.namespace}/delete`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: traceIds }),
      });

      if (!response.ok) {
        this.addTrace('Pinecone delete failed', { status: response.status });
        return { success: false, count: 0 };
      }

      this.addTrace('Pinecone delete successful', { count: traceIds.length });
      return { success: true, count: traceIds.length };
    } catch (error) {
      this.addTrace('Pinecone delete error', { error: String(error) });
      return { success: false, count: 0 };
    }
  }

  async getStats(): Promise<{
    total_vectors: number;
    namespace: string;
    index_name: string;
    mode: string;
  }> {
    if (this.useLocalFallback) {
      return {
        total_vectors: this.localFallback.size,
        namespace: this.config.namespace,
        index_name: this.config.index_name,
        mode: 'local_fallback',
      };
    }

    try {
      const response = await fetch(`${PINECONE_API_BASE}/describe_index_stats`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        return {
          total_vectors: this.localFallback.size,
          namespace: this.config.namespace,
          index_name: this.config.index_name,
          mode: 'pinecone_error',
        };
      }

      const stats = await response.json();
      const namespaceStats = stats.namespaces?.[this.config.namespace] || {};

      return {
        total_vectors: namespaceStats.vectorCount || 0,
        namespace: this.config.namespace,
        index_name: this.config.index_name,
        mode: 'pinecone',
      };
    } catch {
      return {
        total_vectors: this.localFallback.size,
        namespace: this.config.namespace,
        index_name: this.config.index_name,
        mode: 'pinecone_error',
      };
    }
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createSemanticMemoryStore(
  config?: Partial<SemanticMemoryConfig>,
  apiKey?: string
): SemanticMemoryStore {
  return new SemanticMemoryStore(config, apiKey);
}
