import { IsString, IsOptional, IsNumber, IsObject, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Pizza Express' })
  @IsString({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiProperty({ example: 'pizza-express' })
  @IsString({ message: 'Slug é obrigatório' })
  @MinLength(2, { message: 'Slug deve ter pelo menos 2 caracteres' })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'URL do logo deve ser um texto' })
  logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'URL do banner deve ser um texto' })
  banner_url?: string;

  @ApiPropertyOptional({ example: '#FF6B35' })
  @IsOptional()
  @IsString({ message: 'Cor primária deve ser um texto' })
  primary_color?: string;

  @ApiPropertyOptional({ example: '#006600' })
  @IsOptional()
  @IsString({ message: 'Cor secundária deve ser um texto' })
  secondary_color?: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsString({ message: 'Cor de destaque deve ser um texto' })
  accent_color?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser um texto' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Endereço deve ser um texto' })
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: 'Horário de funcionamento deve ser um objeto' })
  business_hours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber({}, { message: 'Valor mínimo do pedido deve ser um número' })
  min_order_value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'ID do plano deve ser um texto' })
  plan_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: 'Configurações de notificação devem ser um objeto' })
  notification_settings?: {
    sound_enabled: boolean;
    sound_new_order: boolean;
    sound_out_for_delivery: boolean;
    sound_delivered: boolean;
    push_enabled: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: 'Modos de pedido devem ser um objeto' })
  order_modes?: {
    delivery?: boolean;
    pickup?: boolean;
    dine_in?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: 'Configurações de pagamento devem ser um objeto' })
  payment_config?: {
    pix_key?: string;
    pix_key_type?: string;
    payment_link_url?: string;
    accepts_boleto?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({}, { message: 'Tempo limite de cancelamento deve ser um número' })
  cancel_time_limit?: number;

  // Admin user fields (for super-admin tenant creation)
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString({ message: 'Nome do administrador deve ser um texto' })
  @MinLength(2, { message: 'Nome do administrador deve ter pelo menos 2 caracteres' })
  admin_name?: string;

  @ApiPropertyOptional({ example: 'joao@pizzaexpress.com' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail do administrador inválido' })
  admin_email?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString({ message: 'Senha do administrador deve ser um texto' })
  @MinLength(6, { message: 'Senha do administrador deve ter pelo menos 6 caracteres' })
  admin_password?: string;
}
