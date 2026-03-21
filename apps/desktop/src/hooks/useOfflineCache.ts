import { useState, useCallback, useEffect, useRef } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { store } from '@/store';
import { baseApi } from '@/api/baseApi';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:menufacil_cache.db');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }
  return db;
}

async function setSyncMeta(key: string, value: string) {
  const database = await getDb();
  await database.execute(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES ($1, $2)',
    [key, value],
  );
}

async function getSyncMeta(key: string): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ value: string }[]>(
    'SELECT value FROM sync_meta WHERE key = $1',
    [key],
  );
  return rows.length > 0 ? rows[0].value : null;
}

export function useOfflineCache() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const syncingRef = useRef(false);

  // Load last sync time on mount
  useEffect(() => {
    getSyncMeta('last_sync').then((val) => {
      if (val) setLastSyncTime(val);
    }).catch(() => {});
  }, []);

  const syncCache = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const database = await getDb();
      const state = store.getState();
      const { token, tenantSlug } = state.auth;

      if (!token || !tenantSlug) {
        setSyncStatus('error');
        syncingRef.current = false;
        return;
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
        'Content-Type': 'application/json',
      };

      const baseUrl = '/api';

      // Fetch products, categories, customers in parallel
      const [productsRes, categoriesRes, customersRes] = await Promise.allSettled([
        fetch(`${baseUrl}/products/all`, { headers }),
        fetch(`${baseUrl}/categories/all`, { headers }),
        fetch(`${baseUrl}/customers`, { headers }),
      ]);

      // Cache products
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const products = await productsRes.value.json();
        if (Array.isArray(products)) {
          await database.execute('DELETE FROM products_cache');
          const now = Date.now();
          for (const product of products) {
            await database.execute(
              'INSERT OR REPLACE INTO products_cache (id, data, updated_at) VALUES ($1, $2, $3)',
              [product.id, JSON.stringify(product), now],
            );
          }
        }
      }

      // Cache categories
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const categories = await categoriesRes.value.json();
        if (Array.isArray(categories)) {
          await database.execute('DELETE FROM categories_cache');
          const now = Date.now();
          for (const category of categories) {
            await database.execute(
              'INSERT OR REPLACE INTO categories_cache (id, data, updated_at) VALUES ($1, $2, $3)',
              [category.id, JSON.stringify(category), now],
            );
          }
        }
      }

      // Cache customers
      if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
        const customers = await customersRes.value.json();
        if (Array.isArray(customers)) {
          await database.execute('DELETE FROM customers_cache');
          const now = Date.now();
          for (const customer of customers) {
            await database.execute(
              'INSERT OR REPLACE INTO customers_cache (id, data, updated_at) VALUES ($1, $2, $3)',
              [customer.id, JSON.stringify(customer), now],
            );
          }
        }
      }

      const syncTime = new Date().toISOString();
      await setSyncMeta('last_sync', syncTime);
      setLastSyncTime(syncTime);
      setSyncStatus('synced');
    } catch (err) {
      console.error('[OfflineCache] Sync failed:', err);
      setSyncStatus('offline');
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const getProductsFromCache = useCallback(async (): Promise<any[]> => {
    try {
      const database = await getDb();
      const rows = await database.select<{ data: string }[]>(
        'SELECT data FROM products_cache',
      );
      return rows.map((r) => JSON.parse(r.data));
    } catch {
      return [];
    }
  }, []);

  const getCategoriesFromCache = useCallback(async (): Promise<any[]> => {
    try {
      const database = await getDb();
      const rows = await database.select<{ data: string }[]>(
        'SELECT data FROM categories_cache',
      );
      return rows.map((r) => JSON.parse(r.data));
    } catch {
      return [];
    }
  }, []);

  const getCustomersFromCache = useCallback(async (): Promise<any[]> => {
    try {
      const database = await getDb();
      const rows = await database.select<{ data: string }[]>(
        'SELECT data FROM customers_cache',
      );
      return rows.map((r) => JSON.parse(r.data));
    } catch {
      return [];
    }
  }, []);

  // Auto-sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      syncCache();
    }, 5 * 60 * 1000);

    // Initial sync after a short delay
    const timeout = setTimeout(() => {
      syncCache();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [syncCache]);

  return {
    syncStatus,
    lastSyncTime,
    syncCache,
    getProductsFromCache,
    getCategoriesFromCache,
    getCustomersFromCache,
  };
}

// Export getDb for use in offline orders hook
export { getDb };
