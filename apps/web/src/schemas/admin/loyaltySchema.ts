import { z } from 'zod';

export const loyaltySchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  description: z.string().optional(),
  points_required: z.coerce.number().int().min(1, 'Pontos obrigatorios'),
  reward_type: z.enum(['discount_percent', 'discount_fixed', 'free_product']),
  reward_value: z.coerce.number().min(0.01, 'Valor obrigatorio'),
  is_active: z.boolean().optional().default(true),
  max_redemptions_per_customer: z.coerce.number().int().min(0).optional().default(0),
  cooldown_hours: z.coerce.number().int().min(0).optional().default(24),
  expiration_hours: z.coerce.number().int().min(1).optional().default(72),
});

export type LoyaltyFormData = z.infer<typeof loyaltySchema>;
