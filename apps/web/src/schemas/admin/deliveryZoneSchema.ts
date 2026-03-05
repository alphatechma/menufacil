import { z } from 'zod';

export const deliveryZoneSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  fee: z.coerce.number().min(0, 'Taxa invalida'),
  min_delivery_time: z.coerce.number().int().min(1, 'Tempo minimo obrigatorio'),
  max_delivery_time: z.coerce.number().int().min(1, 'Tempo maximo obrigatorio'),
  neighborhoods: z.array(z.string()).min(1, 'Adicione ao menos um bairro'),
});

export type DeliveryZoneFormData = z.infer<typeof deliveryZoneSchema>;
