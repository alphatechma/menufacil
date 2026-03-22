import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().min(1, 'Nome obrigatório'),
  street: z.string().min(1, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional().default(''),
  neighborhood: z.string().min(1, 'Bairro obrigatório'),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().min(2, 'Estado obrigatório'),
  zipcode: z.string().min(8, 'CEP inválido'),
});

export type AddressFormData = z.infer<typeof addressSchema>;
