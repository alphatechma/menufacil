import { z } from 'zod';

export const deliveryPersonSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  phone: z.string().min(1, 'Telefone e obrigatorio'),
  vehicle: z.string().optional(),
});

export type DeliveryPersonFormData = z.infer<typeof deliveryPersonSchema>;
