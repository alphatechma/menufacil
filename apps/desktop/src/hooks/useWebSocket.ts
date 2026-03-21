import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAppSelector } from '@/store/hooks';
import { baseApi } from '@/api/baseApi';
import { useUpdateOrderStatusMutation } from '@/api/api';
import { store } from '@/store';
import { playNewOrderSound, playStatusUpdateSound } from '@/utils/sounds';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);
  const token = useAppSelector((s) => s.auth.token);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const handleNewOrder = useCallback(
    (order: any) => {
      // Play sound
      playNewOrderSound();

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('Novo Pedido!', {
          body: `Pedido #${order.order_number || order.id?.slice(0, 6)} recebido`,
          icon: '/favicon.ico',
        });
      }

      // Auto-confirm if enabled
      const autoConfirm = localStorage.getItem('desktop_auto_confirm') === 'true';
      if (autoConfirm && order.id) {
        updateOrderStatus({ id: order.id, status: 'confirmed' }).catch(() => {});
      }

      // Invalidate RTK Query cache
      store.dispatch(baseApi.util.invalidateTags(['Orders', 'CashRegister']));
    },
    [updateOrderStatus],
  );

  const handleStatusUpdated = useCallback((_data: any) => {
    playStatusUpdateSound();

    // Invalidate RTK Query cache
    store.dispatch(baseApi.util.invalidateTags(['Orders', 'CashRegister']));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !tenantSlug) return;

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const socket = io('/', {
      path: '/socket.io',
      query: { tenantSlug },
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-tenant', tenantSlug);
    });

    socket.on('order:new', handleNewOrder);
    socket.on('order:status-updated', handleStatusUpdated);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, tenantSlug, token, handleNewOrder, handleStatusUpdated]);

  return socketRef;
}
