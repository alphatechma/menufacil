import { IsString, IsOptional, IsNumber, IsObject, MinLength } from 'class-validator';
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
}
