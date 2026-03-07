export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'picked_up', 'served', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  picked_up: [],
  served: [],
  cancelled: [],
};

export const WEBSOCKET_EVENTS = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATED: 'order:status-updated',
  KDS_NEW_ITEM: 'kds:new-item',
  ORDER_TRACKING_UPDATE: 'order:tracking-update',
  TABLE_STATUS_UPDATED: 'table:status-updated',
  RESERVATION_NEW: 'reservation:new',
  WHATSAPP_MESSAGE_NEW: 'whatsapp:message-new',
  WHATSAPP_STATUS_UPDATE: 'whatsapp:status-update',
} as const;

export const WEBSOCKET_ROOMS = {
  tenantOrders: (tenantId: string) => `tenant:${tenantId}:orders`,
  tenantKds: (tenantId: string) => `tenant:${tenantId}:kds`,
  order: (orderId: string) => `order:${orderId}`,
  tenantTables: (tenantId: string) => `tenant:${tenantId}:tables`,
  tenantWhatsapp: (tenantId: string) => `tenant:${tenantId}:whatsapp`,
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
