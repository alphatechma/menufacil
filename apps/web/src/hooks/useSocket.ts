import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useSocket(tenantSlug: string | null, handlers?: Record<string, (...args: any[]) => void>) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const wsUrl = import.meta.env.VITE_API_URL || '/';
    const socket = io(wsUrl, {
      path: '/socket.io',
      query: { tenantSlug },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-tenant', tenantSlug);
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
  }, [tenantSlug]);

  return socketRef;
}
