import { IsString, IsOptional, IsNumber, IsObject, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Pizza Express' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'pizza-express' })
  @IsString()
  @MinLength(2)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  banner_url?: string;

  @ApiPropertyOptional({ example: '#FF6B35' })
  @IsOptional()
  @IsString()
  primary_color?: string;

  @ApiPropertyOptional({ example: '#006600' })
  @IsOptional()
  @IsString()
  secondary_color?: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsString()
  accent_color?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  business_hours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  min_order_value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notification_settings?: {
    sound_enabled: boolean;
    sound_new_order: boolean;
    sound_out_for_delivery: boolean;
    sound_delivered: boolean;
    push_enabled: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  order_modes?: {
    delivery?: boolean;
    pickup?: boolean;
    dine_in?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payment_config?: {
    pix_key?: string;
    pix_key_type?: string;
    payment_link_url?: string;
    accepts_boleto?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cancel_time_limit?: number;

  // Admin user fields (for super-admin tenant creation)
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  admin_name?: string;

  @ApiPropertyOptional({ example: 'joao@pizzaexpress.com' })
  @IsOptional()
  @IsEmail()
  admin_email?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  admin_password?: string;
}
