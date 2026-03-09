import { z } from 'zod';

const variationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome obrigatorio'),
  description: z.string().optional().default(''),
  price: z.coerce.number().min(0, 'Preco invalido'),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  description: z.string().optional().default(''),
  base_price: z.coerce.number().min(0, 'Preco invalido'),
  category_id: z.string().min(1, 'Categoria obrigatoria'),
  image_url: z.string().nullable().optional().default(null),
  is_pizza: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0),
  min_variations: z.coerce.number().int().min(0).default(0),
  max_variations: z.coerce.number().int().min(0).default(0),
  variations: z.array(variationSchema).default([]),
  extra_group_ids: z.array(z.string()).default([]),
});

export type ProductFormData = z.infer<typeof productSchema>;
