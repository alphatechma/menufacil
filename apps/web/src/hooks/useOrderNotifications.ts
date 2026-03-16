import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
const WEBSOCKET_EVENTS = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATED: 'order:status-updated',
  ORDER_TRACKING_UPDATE: 'order:tracking-update',
} as const;
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast, selectNotificationSettings, addPendingOrder, removePendingOrder, selectPendingOrderIds } from '@/store/slices/notificationSlice';
import {
  playNewOrderSound,
  playOutForDeliverySound,
  playDeliveredSound,
} from '@/utils/notificationSounds';
import { baseApi } from '@/api/baseApi';

/**
 * Hook for admin panel: connects to WebSocket and handles order notifications
 * with sounds, toasts, and push notifications.
 */
export function useOrderNotifications() {
  const dispatch = useAppDispatch();
  const { user, tenantSlug } = useAppSelector((s) => s.adminAuth);
  const settings = useAppSelector(selectNotificationSettings);
  const socketRef = useRef<Socket | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const handleNewOrder = useCallback(
    (order: any) => {
      const s = settingsRef.current;

      // Toast
      dispatch(
        addToast({
          id: `order-new-${order.id}-${Date.now()}`,
          type: 'new_order',
          title: `Novo Pedido #${order.order_number}`,
          message: `${order.customer?.name || 'Cliente'} - ${formatCurrency(order.total)}`,
          orderId: order.id,
          orderNumber: order.order_number,
          timestamp: Date.now(),
        }),
      );

      // Sound + add to pending loop
      if (s.soundEnabled && s.soundNewOrder) {
        playNewOrderSound();
      }
      // Add to pending list — sound will loop until confirmed
      if (order.status === 'pending') {
        dispatch(addPendingOrder(order.id));
      }

      // Push notification
      if (s.pushEnabled && Notification.permission === 'granted') {
        new Notification(`Novo Pedido #${order.order_number}`, {
          body: `${order.customer?.name || 'Cliente'} - ${formatCurrency(order.total)}`,
          icon: '/favicon.ico',
          tag: `order-${order.id}`,
        });
      }

      // Invalidate orders cache
      dispatch(baseApi.util.invalidateTags(['Orders']));
    },
    [dispatch],
  );

  const handleStatusUpdate = useCallback(
    (order: any) => {
      const s = settingsRef.current;
      const statusLabel = STATUS_LABELS[order.status] || order.status;

      // Remove from pending sound loop when no longer pending
      if (order.status !== 'pending') {
        dispatch(removePendingOrder(order.id));
      }

      // Toast
      dispatch(
        addToast({
          id: `order-status-${order.id}-${Date.now()}`,
          type: 'status_update',
          title: `Pedido #${order.order_number}`,
          message: `Status: ${statusLabel}`,
          orderId: order.id,
          orderNumber: order.order_number,
          status: order.status,
          timestamp: Date.now(),
        }),
      );

      // Sound
      if (s.soundEnabled) {
        if (order.status === 'out_for_delivery' && s.soundOutForDelivery) {
          playOutForDeliverySound();
        } else if (order.status === 'delivered' && s.soundDelivered) {
          playDeliveredSound();
        }
      }

      // Push notification
      if (s.pushEnabled && Notification.permission === 'granted') {
        new Notification(`Pedido #${order.order_number} - ${statusLabel}`, {
          body: `Status atualizado para: ${statusLabel}`,
          icon: '/favicon.ico',
          tag: `order-${order.id}`,
        });
      }

      // Invalidate orders cache
      dispatch(baseApi.util.invalidateTags(['Orders']));
    },
    [dispatch],
  );

  useEffect(() => {
    if (!user || !tenantSlug) return;

    // Fetch tenant to get tenantId
    const tenantId = user.tenant_id;
    if (!tenantId) return;

    const socket = io('/', {
      path: '/socket.io',
      query: { tenantSlug },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:tenant-orders', { tenantId });
    });

    socket.on(WEBSOCKET_EVENTS.ORDER_NEW, handleNewOrder);
    socket.on(WEBSOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdate);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, tenantSlug, handleNewOrder, handleStatusUpdate]);

  // Intermittent sound loop for pending orders
  const pendingOrderIds = useAppSelector(selectPendingOrderIds);
  const pendingRef = useRef(pendingOrderIds);
  pendingRef.current = pendingOrderIds;

  useEffect(() => {
    if (pendingOrderIds.length === 0) return;

    const interval = setInterval(() => {
      const s = settingsRef.current;
      if (s.soundEnabled && s.soundNewOrder && pendingRef.current.length > 0) {
        playNewOrderSound();
      }
    }, 5000); // repeat every 5 seconds

    return () => clearInterval(interval);
  }, [pendingOrderIds.length]);

  // Request push permission
  const requestPushPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  return { requestPushPermission };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
