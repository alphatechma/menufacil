export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: string | null;
  is_open: boolean;
  delivery_fee: number;
  min_order_value: number;
  estimated_delivery_time: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  products: Product[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  category_id: string;
  category?: Category;
  is_active: boolean;
  is_pizza: boolean;
  sort_order: number;
  variations: ProductVariation[];
  extra_groups: ExtraGroup[];
}

export interface ProductVariation {
  id: string;
  name: string;
  price: number;
}

export interface ExtraGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  extras: Extra[];
}

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  product_image?: string | null;
  variation_id: string | null;
  variation_name: string | null;
  unit_price: number;
  quantity: number;
  extras: CartItemExtra[];
}

export interface CartItemExtra {
  name: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses?: CustomerAddress[];
}

export interface Address {
  label?: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'cash';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  total: number;
  delivery_fee: number;
  discount: number;
  payment_method: PaymentMethod;
  payment_status: string;
  address_snapshot: Address | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemExtra {
  extra_name: string;
  extra_price: number;
}

export interface OrderItem {
  product_name: string;
  variation_name: string | null;
  unit_price: number;
  quantity: number;
  extras: OrderItemExtra[];
}

export interface CustomerAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  is_default: boolean;
}
