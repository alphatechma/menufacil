export interface CartItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  variation_id?: string;
  variation_name?: string;
  unit_price: number;
  quantity: number;
  extras: { name: string; price: number }[];
  notes?: string;
}

export interface PaymentSplit {
  method: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  amount: number;
}

export const PAYMENT_METHODS = [
  { value: 'pix' as const, label: 'PIX', shortcut: '1' },
  { value: 'credit_card' as const, label: 'Crédito', shortcut: '2' },
  { value: 'debit_card' as const, label: 'Débito', shortcut: '3' },
  { value: 'cash' as const, label: 'Dinheiro', shortcut: '4' },
] as const;

export const ORDER_TYPES = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Retirada' },
  { value: 'dine_in', label: 'Mesa' },
] as const;
