import { z } from 'zod';

export const deliveryPersonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  vehicle: z.string().optional(),
});

export type DeliveryPersonFormData = z.infer<typeof deliveryPersonSchema>;
