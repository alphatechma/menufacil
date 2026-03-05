import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Senha atual obrigatoria'),
    new_password: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
    confirm_password: z.string().min(1, 'Confirmacao obrigatoria'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Senhas nao conferem',
    path: ['confirm_password'],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
