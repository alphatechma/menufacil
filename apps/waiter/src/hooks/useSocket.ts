import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function useSocket(events: Record<string, (...args: any[]) => void>) {
  const tenantSlug = useAuthStore((s) => s.tenantSlug);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!tenantSlug) return;

    // Prevent double-connect in React strict mode
    if (mountedRef.current && socketRef.current?.connected) return;
    mountedRef.current = true;

    const socket = io(window.location.origin, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const user = useAuthStore.getState().user;
      if (user?.tenant_id) {
        socket.emit('join:tenant-tables', { tenantId: user.tenant_id });
        socket.emit('join:tenant-orders', { tenantId: user.tenant_id });
      }
    });

    for (const [event, handler] of Object.entries(events)) {
      socket.on(event, handler);
    }

    return () => {
      mountedRef.current = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantSlug]);

  return socketRef;
}
