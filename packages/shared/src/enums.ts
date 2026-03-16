export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  KITCHEN = 'kitchen',
  WAITER = 'waiter',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  PICKED_UP = 'picked_up',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  DINE_IN = 'dine_in',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum DiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum RewardType {
  DISCOUNT_PERCENT = 'discount_percent',
  DISCOUNT_FIXED = 'discount_fixed',
  FREE_PRODUCT = 'free_product',
}

export enum WhatsappInstanceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

export enum WhatsappTemplateType {
  WELCOME = 'welcome',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PREPARING = 'order_preparing',
  ORDER_READY = 'order_ready',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  MARKETING = 'marketing',
  CUSTOM = 'custom',
}

export enum WhatsappMessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum WhatsappMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum FlowTriggerType {
  MESSAGE_RECEIVED = 'message_received',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  SCHEDULED = 'scheduled',
  NEW_CUSTOMER = 'new_customer',
}

export enum FlowNodeType {
  TRIGGER = 'trigger',
  SEND_MESSAGE = 'send_message',
  SEND_MEDIA = 'send_media',
  SEND_MENU_LINK = 'send_menu_link',
  WAIT_INPUT = 'wait_input',
  DELAY = 'delay',
  CONDITION = 'condition',
  CHECK_HOURS = 'check_hours',
  CHECK_CUSTOMER = 'check_customer',
  LOOKUP_ORDER = 'lookup_order',
  TRANSFER_HUMAN = 'transfer_human',
  SEND_MENU = 'send_menu',
  SEND_PAYMENT = 'send_payment',
  CHECK_PAYMENT_METHOD = 'check_payment_method',
}

export enum FlowExecutionStatus {
  RUNNING = 'running',
  WAITING_INPUT = 'waiting_input',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
