import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { useAppSelector } from '@/store/hooks';

export function useSocket(tenantSlug: string | null, handlers?: Record<string, (...args: any[]) => void>) {
  const socketRef = useRef<Socket | null>(null);
  // A sala do gateway é indexada pelo tenant ID (UUID), não pelo slug.
  const tenantId = useAppSelector((s) => s.adminAuth.user?.tenant_id) ?? null;

  useEffect(() => {
    if (!tenantSlug || !tenantId) return;

    const wsUrl = env.wsUrl;
    const socket = io(wsUrl, {
      path: '/socket.io',
      query: { tenantSlug },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Mesma mensagem/sala que o useOrderNotifications usa (join:tenant-orders + tenantId).
      socket.emit('join:tenant-orders', { tenantId });
    });

    if (handlers) {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.on(event, handler);
      }
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantSlug, tenantId]);

  return socketRef;
}
