/**
 * EIVOR Hot Memory Layer
 * Short-term memory using Vercel KV (Redis) for fast access
 * Stores the last N interaction traces for immediate retrieval
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

import { BifrostCache } from '../bifrost/cache';
import type {
  InteractionTrace,
  HotMemoryEntry,
  HotMemoryConfig,
  AgentId,
  TraceType,
} from './types';

const DEFAULT_CONFIG: HotMemoryConfig = {
  max_entries: 10,
  ttl_ms: 3600000,
  prefix: 'eivor:hot:',
};

export class HotMemoryStore {
  private cache: BifrostCache;
  private config: HotMemoryConfig;
  private reasoningTrace: string[] = [];

  constructor(config: Partial<HotMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new BifrostCache({
      prefix: this.config.prefix,
      defaultTtl: this.config.ttl_ms,
    });
    this.addTrace('HotMemoryStore initialized with config', this.config);
  }

  private addTrace(message: string, data?: unknown): void {
    const entry = `[${new Date().toISOString()}] [HOT_MEMORY] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    this.reasoningTrace.push(entry);
  }

  private getTraceKey(traceId: string): string {
    return `trace:${traceId}`;
  }

  private getAgentIndexKey(agentId: AgentId): string {
    return `agent_index:${agentId}`;
  }

  private getRecentIndexKey(): string {
    return 'recent_index';
  }

  async store(trace: InteractionTrace): Promise<void> {
    this.addTrace('Storing trace in hot memory', { id: trace.id, agent: trace.agent_id });

    const entry: HotMemoryEntry = {
      trace,
      cached_at: Date.now(),
      access_count: 0,
    };

    await this.cache.set(this.getTraceKey(trace.id), JSON.stringify(entry));

    const agentIndex = await this.getAgentIndex(trace.agent_id);
    agentIndex.unshift(trace.id);
    if (agentIndex.length > this.config.max_entries) {
      const removed = agentIndex.pop();
      if (removed) {
        await this.cache.delete(this.getTraceKey(removed));
        this.addTrace('Evicted old trace from agent index', { removed, agent: trace.agent_id });
      }
    }
    await this.cache.set(this.getAgentIndexKey(trace.agent_id), JSON.stringify(agentIndex));

    const recentIndex = await this.getRecentIndex();
    recentIndex.unshift(trace.id);
    if (recentIndex.length > this.config.max_entries) {
      recentIndex.pop();
    }
    await this.cache.set(this.getRecentIndexKey(), JSON.stringify(recentIndex));

    this.addTrace('Trace stored successfully', { id: trace.id });
  }

  async retrieve(traceId: string): Promise<InteractionTrace | null> {
    this.addTrace('Retrieving trace from hot memory', { id: traceId });

    // Use string type for cache operations and parse JSON
    const rawEntry = await this.cache.get<string>(this.getTraceKey(traceId));
    if (!rawEntry) {
      this.addTrace('Trace not found in hot memory', { id: traceId });
      return null;
    }

    const entry = (typeof rawEntry === 'string' ? JSON.parse(rawEntry) : rawEntry) as HotMemoryEntry;
    entry.access_count++;
    await this.cache.set(this.getTraceKey(traceId), JSON.stringify(entry));

    this.addTrace('Trace retrieved successfully', { id: traceId, access_count: entry.access_count });
    return entry.trace;
  }

  async getRecentTraces(limit?: number): Promise<InteractionTrace[]> {
    const effectiveLimit = limit ?? this.config.max_entries;
    this.addTrace('Getting recent traces', { limit: effectiveLimit });

    const recentIndex = await this.getRecentIndex();
    const traces: InteractionTrace[] = [];

    for (const traceId of recentIndex.slice(0, effectiveLimit)) {
      const trace = await this.retrieve(traceId);
      if (trace) {
        traces.push(trace);
      }
    }

    this.addTrace('Retrieved recent traces', { count: traces.length });
    return traces;
  }

  async getAgentTraces(agentId: AgentId, limit?: number): Promise<InteractionTrace[]> {
    const effectiveLimit = limit ?? this.config.max_entries;
    this.addTrace('Getting agent traces', { agent: agentId, limit: effectiveLimit });

    const agentIndex = await this.getAgentIndex(agentId);
    const traces: InteractionTrace[] = [];

    for (const traceId of agentIndex.slice(0, effectiveLimit)) {
      const trace = await this.retrieve(traceId);
      if (trace) {
        traces.push(trace);
      }
    }

    this.addTrace('Retrieved agent traces', { agent: agentId, count: traces.length });
    return traces;
  }

  async getTracesByType(traceType: TraceType, limit?: number): Promise<InteractionTrace[]> {
    const effectiveLimit = limit ?? this.config.max_entries;
    this.addTrace('Getting traces by type', { type: traceType, limit: effectiveLimit });

    const recentTraces = await this.getRecentTraces(this.config.max_entries);
    const filtered = recentTraces
      .filter(t => t.trace_type === traceType)
      .slice(0, effectiveLimit);

    this.addTrace('Retrieved traces by type', { type: traceType, count: filtered.length });
    return filtered;
  }

  private async getAgentIndex(agentId: AgentId): Promise<string[]> {
    const raw = await this.cache.get<string>(this.getAgentIndexKey(agentId));
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  private async getRecentIndex(): Promise<string[]> {
    const raw = await this.cache.get<string>(this.getRecentIndexKey());
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  async getStats(): Promise<{
    total_entries: number;
    entries_by_agent: Record<AgentId, number>;
    cache_stats: { hits: number; misses: number; avgLatency: number };
  }> {
    const recentIndex = await this.getRecentIndex();
    const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
    const entriesByAgent: Record<string, number> = {};

    for (const agent of agents) {
      const agentIndex = await this.getAgentIndex(agent);
      entriesByAgent[agent] = agentIndex.length;
    }

    return {
      total_entries: recentIndex.length,
      entries_by_agent: entriesByAgent as Record<AgentId, number>,
      cache_stats: this.cache.getStats(),
    };
  }

  async clear(): Promise<void> {
    this.addTrace('Clearing hot memory');
    this.cache.clear();
    this.addTrace('Hot memory cleared');
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createHotMemoryStore(config?: Partial<HotMemoryConfig>): HotMemoryStore {
  return new HotMemoryStore(config);
}
