import { z } from 'zod';

export const customerLoginSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
  name: z.string().optional(),
});

export type CustomerLoginFormData = z.infer<typeof customerLoginSchema>;
