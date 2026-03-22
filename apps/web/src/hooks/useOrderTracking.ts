import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
const WEBSOCKET_EVENTS = {
  ORDER_TRACKING_UPDATE: 'order:tracking-update',
} as const;

/**
 * Hook for customer: connects to WebSocket and tracks a specific order in real-time.
 */
export function useOrderTracking(orderId: string | null, tenantSlug: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [orderUpdate, setOrderUpdate] = useState<any>(null);

  useEffect(() => {
    if (!orderId || !tenantSlug) return;

    const wsUrl = env.wsUrl;
    const socket = io(wsUrl, {
      path: '/socket.io',
      query: { tenantSlug },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:order', { orderId });
    });

    socket.on(WEBSOCKET_EVENTS.ORDER_TRACKING_UPDATE, (order: any) => {
      if (order.id === orderId) {
        setOrderUpdate(order);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, tenantSlug]);

  return { orderUpdate };
}
