import { z } from 'zod';

export const deliveryZoneSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  fee: z.coerce.number().min(0, 'Taxa inválida'),
  min_delivery_time: z.coerce.number().int().min(1, 'Tempo mínimo obrigatório'),
  max_delivery_time: z.coerce.number().int().min(1, 'Tempo máximo obrigatório'),
  neighborhoods: z.array(z.string()).min(1, 'Adicione ao menos um bairro'),
});

export type DeliveryZoneFormData = z.infer<typeof deliveryZoneSchema>;
