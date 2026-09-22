import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { instanceToPlain } from 'class-transformer';
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS } from './cache.constants';
import { buildPublicCacheKey, buildUserCacheKey } from './cache-key.util';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger('AppCacheService', { timestamp: true });
  /** LRU order: oldest at index 0, most recently used at the end. */
  private readonly keyOrder: string[] = [];
  private readonly keySet = new Set<string>();
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  buildPublicKey(
    scope: string,
    params: Record<string, string | number | boolean | null | undefined> = {},
  ): string {
    return buildPublicCacheKey(scope, params);
  }

  buildUserKey(
    userId: string,
    scope: string,
    params: Record<string, string | number | boolean | null | undefined> = {},
  ): string {
    return buildUserCacheKey(userId, scope, params);
  }

  async wrap<T>(key: string, loader: () => T | Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined && cached !== null) {
      await this.touchKey(key);
      this.logger.verbose(`cache hit key=${key}`);
      return this.cloneForReturn(cached);
    }

    this.logger.verbose(`cache miss key=${key}`);

    try {
      const value = await this.cache.wrap<T>(
        key,
        async () => {
          const loaded = await loader();
          return this.cloneForStorage(loaded);
        },
        CACHE_TTL_MS,
      );
      await this.touchKey(key);
      return this.cloneForReturn(value);
    } catch (error) {
      await this.cache.del(key);
      this.removeKeyFromMetadata(key);
      this.logger.error(
        `cache wrap failed key=${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    const keysToDelete = [...this.keyOrder].filter((key) =>
      key.startsWith(prefix),
    );
    if (keysToDelete.length === 0) {
      return;
    }
    await Promise.all(keysToDelete.map((key) => this.cache.del(key)));
    for (const key of keysToDelete) {
      this.removeKeyFromMetadata(key);
    }
    this.logger.verbose(
      `cache delByPrefix prefix=${prefix} removed=${keysToDelete.length}`,
    );
  }

  async clear(): Promise<void> {
    await this.cache.clear();
    this.keyOrder.length = 0;
    this.keySet.clear();
    this.logger.verbose('cache clear');
  }

  userPrefix(userId: string): string {
    return `u:v1:${userId}:`;
  }

  private cloneForStorage<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    const plain = instanceToPlain(value, { exposeUnsetFields: false });
    return structuredClone(plain) as T;
  }

  private cloneForReturn<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    return structuredClone(value) as T;
  }

  private async registerKey(key: string): Promise<void> {
    if (!this.keySet.has(key)) {
      this.keySet.add(key);
      this.keyOrder.push(key);
      await this.evictIfNeeded();
    }
  }

  private async touchKey(key: string): Promise<void> {
    if (!this.keySet.has(key)) {
      await this.registerKey(key);
      return;
    }
    const index = this.keyOrder.indexOf(key);
    if (index >= 0) {
      this.keyOrder.splice(index, 1);
      this.keyOrder.push(key);
    }
  }

  private removeKeyFromMetadata(key: string): void {
    if (!this.keySet.has(key)) {
      return;
    }
    this.keySet.delete(key);
    const index = this.keyOrder.indexOf(key);
    if (index >= 0) {
      this.keyOrder.splice(index, 1);
    }
  }

  private async evictIfNeeded(): Promise<void> {
    while (this.keyOrder.length > CACHE_MAX_ENTRIES) {
      const lruKey = this.keyOrder.shift();
      if (!lruKey) {
        break;
      }
      this.keySet.delete(lruKey);
      await this.cache.del(lruKey);
      this.logger.verbose(`cache evict lru key=${lruKey}`);
    }
  }
}
