import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().min(1, 'Nome obrigatorio'),
  street: z.string().min(1, 'Rua obrigatoria'),
  number: z.string().min(1, 'Numero obrigatorio'),
  complement: z.string().optional().default(''),
  neighborhood: z.string().min(1, 'Bairro obrigatorio'),
  city: z.string().min(1, 'Cidade obrigatoria'),
  state: z.string().min(2, 'Estado obrigatorio'),
  zipcode: z.string().min(8, 'CEP invalido'),
});

export type AddressFormData = z.infer<typeof addressSchema>;
