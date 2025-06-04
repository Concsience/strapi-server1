/**
 * Intelligent Cache System for Strapi E-commerce
 * Advanced Redis-based caching with tags, TTL strategies, and automatic invalidation
 */

import Redis from 'ioredis';
import { performance } from 'perf_hooks';

export interface CacheConfig {
  ttl: number;
  tags?: string[];
  version?: string;
  invalidateOn?: string[];
  autoRefresh?: boolean;
  refreshThreshold?: number; // Percentage of TTL when to auto-refresh
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
}

export class IntelligentCache {
  private redis: Redis;
  private tagIndex: Map<string, Set<string>> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    averageResponseTime: 0
  };
  private responseTimes: number[] = [];

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '2'),
      keyPrefix: 'cache:',
      retryDelayOnFailure: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Redis will lazy connect automatically when first used
    // No explicit connect() call needed

    // Periodic metrics flush
    setInterval(() => this.flushMetrics(), 60000); // Every minute
  }

  /**
   * Get value from cache with intelligent features
   */
  async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Get value and TTL
      const pipeline = this.redis.pipeline();
      pipeline.get(key);
      pipeline.ttl(key);
      const results = await pipeline.exec() as any;

      const value = results?.[0]?.[1] as string | null;
      const ttl = results?.[1]?.[1] as number;

      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (value === null) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();

      // Check for auto-refresh
      if (config?.autoRefresh && ttl > 0) {
        const refreshThreshold = config.refreshThreshold || 0.2; // 20% of TTL
        const totalTtl = config.ttl || 3600;
        const refreshPoint = totalTtl * refreshThreshold;

        if (ttl <= refreshPoint) {
          // Trigger background refresh (don't wait)
          this.scheduleRefresh(key, config);
        }
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache with advanced configuration
   */
  async set(key: string, value: any, config: CacheConfig): Promise<void> {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: config.version || '1.0.0',
        tags: config.tags || []
      });

      // Set value with TTL
      await this.redis.setex(key, config.ttl, serializedValue);

      // Index tags for invalidation
      if (config.tags) {
        await this.indexTags(key, config.tags);
      }

      // Store invalidation triggers
      if (config.invalidateOn) {
        await this.storeInvalidationTriggers(key, config.invalidateOn);
      }

    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * Get or set pattern - cache-aside with intelligent loading
   */
  async getOrSet<T>(
    key: string, 
    loader: () => Promise<T>, 
    config: CacheConfig
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, config);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - load data
    const startTime = performance.now();
    try {
      const data = await loader();
      const loadTime = performance.now() - startTime;

      // Cache the result
      await this.set(key, data, config);

      // Log slow queries
      if (loadTime > 1000) { // > 1 second
        console.warn(`Slow cache loader for key ${key}: ${loadTime}ms`);
      }

      return data;
    } catch (error) {
      console.error(`Cache loader failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;

    for (const tag of tags) {
      const keys = await this.redis.smembers(`tag:${tag}`);
      
      if (keys.length > 0) {
        // Delete all keys with this tag
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec() as any;
        
        deletedCount += keys.length;

        // Clean up tag index
        await this.redis.del(`tag:${tag}`);
      }
    }

    console.log(`Invalidated ${deletedCount} cache entries for tags: ${tags.join(', ')}`);
    return deletedCount;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
      console.log(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
    }

    return keys.length;
  }

  /**
   * Warm up cache with predefined data
   */
  async warmUp(warmUpTasks: Array<{
    key: string;
    loader: () => Promise<any>;
    config: CacheConfig;
  }>): Promise<void> {
    console.log(`Starting cache warm-up for ${warmUpTasks.length} items...`);
    
    const startTime = performance.now();
    const promises = warmUpTasks.map(async (task) => {
      try {
        const data = await task.loader();
        await this.set(task.key, data, task.config);
        return { key: task.key, success: true };
      } catch (error) {
        console.error(`Cache warm-up failed for ${task.key}:`, error);
        return { key: task.key, success: false, error };
      }
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    const duration = performance.now() - startTime;
    console.log(`Cache warm-up completed: ${successful} successful, ${failed} failed in ${Math.round(duration)}ms`);
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics & { 
    memoryUsage?: string;
    connectedClients?: number;
    totalKeys?: number;
  } {
    return {
      ...this.metrics,
      // Additional Redis-specific metrics can be added here
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.redis.flushdb();
    this.tagIndex.clear();
    console.log('Cache cleared');
  }

  /**
   * Private helper methods
   */
  private async indexTags(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    const pipeline = this.redis.pipeline();
    tags.forEach(tag => {
      pipeline.sadd(`tag:${tag}`, key);
      pipeline.expire(`tag:${tag}`, 86400); // 24 hours
    });
    await pipeline.exec() as any;
  }

  private async storeInvalidationTriggers(key: string, triggers: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    triggers.forEach(trigger => {
      pipeline.sadd(`trigger:${trigger}`, key);
      pipeline.expire(`trigger:${trigger}`, 86400); // 24 hours
    });
    await pipeline.exec() as any;
  }

  private async scheduleRefresh(key: string, config: CacheConfig): Promise<void> {
    // In a real implementation, this would trigger a background job
    // For now, we'll just log it
    console.log(`Background refresh scheduled for cache key: ${key}`);
    
    // This could integrate with a job queue like Bull or Agenda
    // await this.jobQueue.add('cache-refresh', { key, config });
  }

  private updateResponseTime(time: number): void {
    this.responseTimes.push(time);
    
    // Keep only last 1000 measurements
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.metrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  private updateHitRate(): void {
    this.metrics.hitRate = (this.metrics.hits / this.metrics.totalRequests) * 100;
  }

  private flushMetrics(): void {
    // Send metrics to monitoring system (Prometheus, DataDog, etc.)
    if (this.metrics.totalRequests > 0) {
      console.log('Cache Metrics:', {
        hitRate: `${this.metrics.hitRate.toFixed(2)}%`,
        totalRequests: this.metrics.totalRequests,
        avgResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`
      });
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// Export singleton instance
export const cache = new IntelligentCache();

// Cache configurations for different content types
export const CacheConfigs = {
  // E-commerce specific cache configs
  artwork: {
    ttl: 3600, // 1 hour
    tags: ['artwork', 'catalog'],
    invalidateOn: ['artwork.update', 'artwork.delete'],
    autoRefresh: true,
    refreshThreshold: 0.2
  } as CacheConfig,

  artist: {
    ttl: 7200, // 2 hours
    tags: ['artist', 'catalog'],
    invalidateOn: ['artist.update', 'artist.delete'],
    autoRefresh: true
  } as CacheConfig,

  cart: {
    ttl: 1800, // 30 minutes
    tags: ['cart'],
    invalidateOn: ['cart.update', 'cart.delete', 'cart-item.update'],
    autoRefresh: false
  } as CacheConfig,

  order: {
    ttl: 86400, // 24 hours (orders rarely change)
    tags: ['order'],
    invalidateOn: ['order.update'],
    autoRefresh: false
  } as CacheConfig,

  search: {
    ttl: 1800, // 30 minutes
    tags: ['search', 'catalog'],
    invalidateOn: ['artwork.update', 'artist.update'],
    autoRefresh: true,
    refreshThreshold: 0.3
  } as CacheConfig,

  stats: {
    ttl: 900, // 15 minutes
    tags: ['stats'],
    invalidateOn: ['order.create', 'order.update'],
    autoRefresh: true
  } as CacheConfig
};