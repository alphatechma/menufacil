import { z } from 'zod';

export const customizationSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório'),
  primary_color: z.string().min(1, 'Cor obrigatória'),
  secondary_color: z.string().nullable().optional().default(null),
  accent_color: z.string().nullable().optional().default(null),
  logo_url: z.string().nullable().optional().default(null),
  banner_url: z.string().nullable().optional().default(null),
});

export type CustomizationFormData = z.infer<typeof customizationSchema>;
