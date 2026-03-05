import { z } from 'zod';

export const tenantRegistrationSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  slug: z.string().min(3, 'Slug deve ter pelo menos 3 caracteres').regex(/^[a-z0-9-]+$/, 'Apenas letras minusculas, numeros e hifens'),
  email: z.string().email('E-mail invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone invalido'),
  plan_id: z.string().min(1, 'Selecione um plano'),
});

export type TenantRegistrationFormData = z.infer<typeof tenantRegistrationSchema>;
