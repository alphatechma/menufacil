import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  description: z.string().optional().default(''),
  image_url: z.string().nullable().optional().default(null),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
