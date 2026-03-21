import { useState, useCallback, useEffect, useRef } from 'react';
import { getDb } from './useOfflineCache';
import { store } from '@/store';
import { baseApi } from '@/api/baseApi';

interface PendingOrder {
  id: string;
  data: string;
  created_at: number;
  retry_count: number;
  last_error: string | null;
}

async function initOfflineOrdersTable() {
  const db = await getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS offline_orders (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    )
  `);
}

export function useOfflineOrders() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const initRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM offline_orders',
      );
      setPendingCount(rows[0]?.count ?? 0);
    } catch {
      // Table might not exist yet
    }
  }, []);

  // Initialize table and load count
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initOfflineOrdersTable().then(() => refreshCount());
  }, [refreshCount]);

  const queueOrder = useCallback(async (orderData: any) => {
    try {
      await initOfflineOrdersTable();
      const db = await getDb();
      const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute(
        'INSERT INTO offline_orders (id, data, created_at, retry_count) VALUES ($1, $2, $3, 0)',
        [id, JSON.stringify(orderData), Date.now()],
      );
      await refreshCount();
      return id;
    } catch (err) {
      console.error('[OfflineOrders] Failed to queue order:', err);
      throw err;
    }
  }, [refreshCount]);

  const getPendingOrders = useCallback(async (): Promise<PendingOrder[]> => {
    try {
      const db = await getDb();
      return await db.select<PendingOrder[]>(
        'SELECT * FROM offline_orders ORDER BY created_at ASC',
      );
    } catch {
      return [];
    }
  }, []);

  const syncPendingOrders = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const db = await getDb();
      const pending = await getPendingOrders();

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      const state = store.getState();
      const { token, tenantSlug } = state.auth;

      if (!token || !tenantSlug) {
        setIsSyncing(false);
        return;
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
        'Content-Type': 'application/json',
      };

      for (const order of pending) {
        try {
          const res = await fetch('/api/orders/admin', {
            method: 'POST',
            headers,
            body: order.data,
          });

          if (res.ok) {
            await db.execute('DELETE FROM offline_orders WHERE id = $1', [order.id]);
          } else {
            const errText = await res.text().catch(() => 'Unknown error');
            await db.execute(
              'UPDATE offline_orders SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2',
              [errText, order.id],
            );
          }
        } catch (err) {
          await db.execute(
            'UPDATE offline_orders SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2',
            [String(err), order.id],
          );
        }
      }

      // Invalidate orders cache after sync
      store.dispatch(baseApi.util.invalidateTags(['Orders', 'CashRegister']));
      await refreshCount();
    } catch (err) {
      console.error('[OfflineOrders] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, getPendingOrders, refreshCount]);

  const removeOrder = useCallback(async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM offline_orders WHERE id = $1', [id]);
      await refreshCount();
    } catch (err) {
      console.error('[OfflineOrders] Failed to remove order:', err);
    }
  }, [refreshCount]);

  return {
    pendingCount,
    isSyncing,
    queueOrder,
    getPendingOrders,
    syncPendingOrders,
    removeOrder,
    refreshCount,
  };
}
