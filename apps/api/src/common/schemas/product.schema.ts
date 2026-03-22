import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  description: z.string().optional(),
  base_price: z.number().min(0, 'Preço deve ser positivo'),
  category_id: z.string().uuid('Categoria inválida').optional().nullable(),
  image_url: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
  dietary_tags: z.array(z.string()).optional(),
  variation_type: z.string().optional(),
  max_flavors: z.number().optional(),
  variations: z
    .array(
      z.object({
        name: z.string().min(1, 'Nome da variação é obrigatório'),
        description: z.string().optional(),
        price: z.number().min(0, 'Preço da variação deve ser positivo'),
      }),
    )
    .optional(),
  extra_group_ids: z.array(z.string().uuid()).optional(),
});

export const updateProductSchema = createProductSchema.partial();
