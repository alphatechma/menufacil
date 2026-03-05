import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  min_order_value: z.coerce.number().min(0).nullable().optional(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
