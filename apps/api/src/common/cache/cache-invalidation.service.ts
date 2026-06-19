import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async invalidateByPattern(_pattern: string): Promise<void> {
    // cache-manager v7 exposes Cache.clear() to flush all stores (in-memory/Redis).
    // The old store.reset() API no longer exists, so we clear everything — coarse but
    // safe, since cached entries (e.g. GET /tenants/slug/:slug, /plans/public) repopulate.
    await this.cache.clear();
  }

  async invalidateKey(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
