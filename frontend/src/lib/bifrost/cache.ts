/**
 * Bifrost Cache Layer - Vercel KV (Redis) Integration
 * High-speed ephemeral caching for sub-millisecond data retrieval
 * The Rainbow Bridge to GitHub - Sovereign Datalayer for ZORA CORE: Aesir Genesis
 */

export interface CacheConfig {
  url?: string;
  token?: string;
  defaultTtl?: number;
  prefix?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  avgLatency: number;
}

type CacheValue = string | number | boolean | null | CacheValue[] | { [key: string]: CacheValue };

export class BifrostCache {
  private config: CacheConfig;
  private localCache: Map<string, CacheEntry<CacheValue>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, avgLatency: 0 };
  private latencies: number[] = [];

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTtl: 300000,
      prefix: 'bifrost:',
      ...config,
    };
  }

  private getKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }
    this.stats.avgLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private isExpired(entry: CacheEntry<CacheValue>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async get<T extends CacheValue>(key: string): Promise<T | null> {
    const start = performance.now();
    const fullKey = this.getKey(key);

    const localEntry = this.localCache.get(fullKey);
    if (localEntry && !this.isExpired(localEntry)) {
      localEntry.hits++;
      this.stats.hits++;
      this.recordLatency(performance.now() - start);
      return localEntry.data as T;
    }

    if (this.config.url && this.config.token) {
      try {
        const response = await fetch(`${this.config.url}/get/${encodeURIComponent(fullKey)}`, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result) {
            const data = JSON.parse(result.result) as T;
            this.localCache.set(fullKey, {
              data,
              timestamp: Date.now(),
              ttl: this.config.defaultTtl!,
              hits: 1,
            });
            this.stats.hits++;
            this.stats.size = this.localCache.size;
            this.recordLatency(performance.now() - start);
            return data;
          }
        }
      } catch {
        // Fall through to miss
      }
    }

    this.stats.misses++;
    this.recordLatency(performance.now() - start);
    return null;
  }

  async set<T extends CacheValue>(key: string, value: T, ttl?: number): Promise<void> {
    const start = performance.now();
    const fullKey = this.getKey(key);
    const effectiveTtl = ttl ?? this.config.defaultTtl!;

    this.localCache.set(fullKey, {
      data: value,
      timestamp: Date.now(),
      ttl: effectiveTtl,
      hits: 0,
    });
    this.stats.size = this.localCache.size;

    if (this.config.url && this.config.token) {
      try {
        await fetch(`${this.config.url}/set/${encodeURIComponent(fullKey)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: JSON.stringify(value),
            ex: Math.floor(effectiveTtl / 1000),
          }),
        });
      } catch {
        // Local cache is still set
      }
    }

    this.recordLatency(performance.now() - start);
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.localCache.delete(fullKey);
    this.stats.size = this.localCache.size;

    if (this.config.url && this.config.token) {
      try {
        await fetch(`${this.config.url}/del/${encodeURIComponent(fullKey)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
          },
        });
      } catch {
        // Local cache is already deleted
      }
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.getKey(pattern);
    let count = 0;

    for (const key of this.localCache.keys()) {
      if (key.startsWith(fullPattern.replace('*', ''))) {
        this.localCache.delete(key);
        count++;
      }
    }

    this.stats.size = this.localCache.size;
    return count;
  }

  async getOrSet<T extends CacheValue>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  clear(): void {
    this.localCache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, avgLatency: 0 };
    this.latencies = [];
  }

  prune(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [key, entry] of this.localCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.localCache.delete(key);
        pruned++;
      }
    }

    this.stats.size = this.localCache.size;
    return pruned;
  }
}

export function createBifrostCache(config?: CacheConfig): BifrostCache {
  return new BifrostCache(config);
}

export class ContentCache extends BifrostCache {
  async getFile(path: string, branch?: string): Promise<string | null> {
    const key = `file:${branch || 'main'}:${path}`;
    return this.get<string>(key);
  }

  async setFile(path: string, content: string, branch?: string, ttl?: number): Promise<void> {
    const key = `file:${branch || 'main'}:${path}`;
    await this.set(key, content, ttl);
  }

  async invalidateBranch(branch: string): Promise<number> {
    return this.invalidatePattern(`file:${branch}:*`);
  }

  async getTree<T = unknown>(path: string, branch?: string): Promise<T[] | null> {
    const key = `tree:${branch || 'main'}:${path}`;
    const result = await this.get<CacheValue[]>(key);
    return result as T[] | null;
  }

  async setTree<T = unknown>(path: string, entries: T[], branch?: string, ttl?: number): Promise<void> {
    const key = `tree:${branch || 'main'}:${path}`;
    await this.set(key, entries as unknown as CacheValue[], ttl);
  }
}

export function createContentCache(config?: CacheConfig): ContentCache {
  return new ContentCache(config);
}
