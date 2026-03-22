import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
  description: z.string().optional(),
  image_url: z.string().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
