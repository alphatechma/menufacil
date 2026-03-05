import { z } from 'zod';
import { addressSchema } from './addressSchema';

export const checkoutSchema = z.object({
  payment_method: z.enum(['credit_card', 'debit_card', 'pix', 'cash'], {
    required_error: 'Selecione a forma de pagamento',
  }),
  address_id: z.string().nullable().optional(),
  new_address: addressSchema.optional(),
  notes: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
