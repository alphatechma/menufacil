import { z } from 'zod';

export const couponSchema = z
  .object({
    code: z.string().min(1, 'Código obrigatório').toUpperCase(),
    discount_type: z.enum(['percent', 'fixed']),
    discount_value: z.coerce.number().min(0.01, 'Valor obrigatório'),
    min_order: z.coerce.number().min(0).nullable().optional(),
    max_uses: z.coerce.number().int().min(1).nullable().optional(),
    valid_from: z.string().min(1, 'Data inicial obrigatória'),
    valid_until: z.string().min(1, 'Data final obrigatória'),
  })
  .refine((data) => new Date(data.valid_until) > new Date(data.valid_from), {
    message: 'Data final deve ser posterior a data inicial',
    path: ['valid_until'],
  });

export type CouponFormData = z.infer<typeof couponSchema>;
