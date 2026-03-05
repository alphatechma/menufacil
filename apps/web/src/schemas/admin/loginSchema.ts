import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
