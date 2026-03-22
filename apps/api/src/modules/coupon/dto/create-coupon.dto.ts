import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@menufacil/shared';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString({ message: 'Código do cupom é obrigatório' })
  code: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType, { message: 'Tipo de desconto inválido' })
  discount_type: DiscountType;

  @ApiProperty({ example: 10 })
  @IsNumber({}, { message: 'Valor do desconto deve ser um número' })
  @Min(0, { message: 'Valor do desconto deve ser maior ou igual a 0' })
  discount_value: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber({}, { message: 'Pedido mínimo deve ser um número' })
  @Min(0, { message: 'Pedido mínimo deve ser maior ou igual a 0' })
  min_order?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber({}, { message: 'Máximo de usos deve ser um número' })
  max_uses?: number;

  @ApiProperty()
  @IsDateString({}, { message: 'Data de início inválida' })
  valid_from: string;

  @ApiProperty()
  @IsDateString({}, { message: 'Data de término inválida' })
  valid_until: string;
}
