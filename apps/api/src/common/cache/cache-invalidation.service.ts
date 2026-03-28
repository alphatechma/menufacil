import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async invalidateByPattern(_pattern: string): Promise<void> {
    // For in-memory cache, reset all (simple but effective)
    // cache-manager v7 uses store.reset() or we clear individual keys
    const store = (this.cache as any).store;
    if (store && typeof store.reset === 'function') {
      await store.reset();
    }
  }

  async invalidateKey(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
