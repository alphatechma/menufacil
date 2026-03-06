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
