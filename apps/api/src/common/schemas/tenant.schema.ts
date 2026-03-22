import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter pelo menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minusculas, numeros e hifens'),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan_id: z.string().uuid('ID do plano invalido').optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  business_hours: z.record(z.any()).optional(),
  min_order_value: z.number().min(0).optional(),
  notification_settings: z.record(z.any()).optional(),
  order_modes: z
    .object({
      delivery: z.boolean().optional(),
      pickup: z.boolean().optional(),
      dine_in: z.boolean().optional(),
    })
    .optional(),
  payment_config: z.record(z.any()).optional(),
  cancel_time_limit: z.number().min(0).optional(),
  admin_name: z.string().min(2, 'Nome do admin deve ter pelo menos 2 caracteres').optional(),
  admin_email: z.string().email('Email do admin invalido').optional(),
  admin_password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
});

export const updateTenantSchema = createTenantSchema
  .partial()
  .omit({ admin_name: true, admin_email: true, admin_password: true });
