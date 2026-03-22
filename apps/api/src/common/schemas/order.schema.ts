import { z } from 'zod';

export const createOrderSchema = z.object({
  order_type: z.enum(['delivery', 'pickup', 'dine_in'], {
    message: 'Tipo de pedido inválido',
  }),
  payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'wallet'], {
    message: 'Método de pagamento inválido',
  }),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        product_name: z.string().optional(),
        quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
        unit_price: z.number().min(0).optional(),
        variation_id: z.string().uuid().optional().nullable(),
        variation_ids: z.array(z.string().uuid()).optional(),
        variation_name: z.string().optional().nullable(),
        variation_quantities: z.record(z.number()).optional(),
        notes: z.string().optional().nullable(),
        extras: z.array(z.any()).optional(),
      }),
    )
    .min(1, 'Pedido deve ter pelo menos 1 item'),
  customer_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  address: z.any().optional().nullable(),
  address_id: z.string().uuid().optional().nullable(),
  delivery_fee: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  change_for: z.number().optional().nullable(),
  coupon_code: z.string().optional().nullable(),
  table_id: z.string().uuid().optional().nullable(),
  table_session_id: z.string().uuid().optional().nullable(),
  is_paid: z.boolean().optional(),
  payment_splits: z.array(z.any()).optional(),
});
