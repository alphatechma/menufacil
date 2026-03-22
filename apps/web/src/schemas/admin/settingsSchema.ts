import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(3, 'Slug deve ter pelo menos 3 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hifens').optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  min_order_value: z.coerce.number().min(0).nullable().optional(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
