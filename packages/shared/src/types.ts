import {
  UserRole,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  NotificationChannel,
  NotificationStatus,
  RewardType,
} from './enums';

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  phone?: string;
  address?: string;
  business_hours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;
  min_order_value?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IUser {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ICustomer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  loyalty_points: number;
  created_at: Date;
  updated_at: Date;
}

export interface ICustomerAddress {
  id: string;
  customer_id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
}

export interface ICategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
}

export interface IProduct {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
}

export interface IProductVariation {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export interface IExtraGroup {
  id: string;
  tenant_id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
}

export interface IExtra {
  id: string;
  group_id: string;
  name: string;
  price: number;
}

export interface IDeliveryPerson {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  vehicle?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IOrder {
  id: string;
  tenant_id: string;
  customer_id: string;
  delivery_person_id?: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  address_snapshot?: Record<string, unknown>;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variation_id?: string;
  product_name: string;
  variation_name?: string;
  unit_price: number;
  quantity: number;
}

export interface IOrderItemExtra {
  id: string;
  order_item_id: string;
  extra_name: string;
  extra_price: number;
}

export interface IDeliveryZone {
  id: string;
  tenant_id: string;
  name: string;
  fee: number;
  polygon: Array<{ lat: number; lng: number }>;
  min_delivery_time: number;
  max_delivery_time: number;
}

export interface ICoupon {
  id: string;
  tenant_id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order?: number;
  max_uses?: number;
  current_uses: number;
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
}

export interface ILoyaltyReward {
  id: string;
  tenant_id: string;
  name: string;
  points_required: number;
  reward_type: RewardType;
  reward_value: number;
}

export interface INotification {
  id: string;
  tenant_id: string;
  order_id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sent_at?: Date;
}

export interface IPaymentTransaction {
  id: string;
  order_id: string;
  tenant_id: string;
  method: PaymentMethod;
  external_id?: string;
  status: PaymentStatus;
  amount: number;
  pix_qr_code?: string;
  pix_copy_paste?: string;
}

// Plans and Modules
export interface IPlan {
  id: string;
  name: string;
  price: number;
  max_users: number | null;
  max_products: number | null;
  is_active: boolean;
  modules?: ISystemModule[];
  created_at: Date;
  updated_at: Date;
}

export interface ISystemModule {
  id: string;
  key: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IPermission {
  id: string;
  key: string;
  name: string;
  module_id?: string;
  module?: ISystemModule;
  created_at: Date;
  updated_at: Date;
}

export interface IRole {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system_default: boolean;
  permissions?: IPermission[];
  created_at: Date;
  updated_at: Date;
}

export interface ISuperAdminDashboardStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_orders: number;
  total_revenue: number;
  tenants_by_plan: Array<{ plan_name: string; count: number }>;
}

export interface IAuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface IJwtPayload {
  sub: string;
  tenant_id: string;
  role: UserRole;
  type: 'user' | 'customer';
  impersonated_by?: string;
}
