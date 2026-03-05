import { z } from 'zod';

export const loyaltySchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  points_required: z.coerce.number().int().min(1, 'Pontos obrigatorios'),
  reward_type: z.enum(['discount_percent', 'discount_fixed', 'free_product']),
  reward_value: z.coerce.number().min(0.01, 'Valor obrigatorio'),
});

export type LoyaltyFormData = z.infer<typeof loyaltySchema>;
