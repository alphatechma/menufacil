export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const WEBSOCKET_EVENTS = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATED: 'order:status-updated',
  KDS_NEW_ITEM: 'kds:new-item',
  ORDER_TRACKING_UPDATE: 'order:tracking-update',
} as const;

export const WEBSOCKET_ROOMS = {
  tenantOrders: (tenantId: string) => `tenant:${tenantId}:orders`,
  tenantKds: (tenantId: string) => `tenant:${tenantId}:kds`,
  order: (orderId: string) => `order:${orderId}`,
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
