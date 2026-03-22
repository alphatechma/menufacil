import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionType, PromotionDiscountType } from '../promotion.entity';

export class CreatePromotionDto {
  @ApiProperty()
  @IsString({ message: 'Nome da promoção é obrigatório' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiProperty({ enum: PromotionType })
  @IsEnum(PromotionType, { message: 'Tipo de promoção inválido' })
  type: PromotionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: 'Regras devem ser um objeto' })
  rules?: {
    products?: string[];
    categories?: string[];
    buy_quantity?: number;
    get_quantity?: number;
    min_order_value?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: 'Agendamento deve ser um objeto' })
  schedule?: {
    days?: number[];
    start_time?: string;
    end_time?: string;
  };

  @ApiProperty({ enum: PromotionDiscountType })
  @IsEnum(PromotionDiscountType, { message: 'Tipo de desconto inválido' })
  discount_type: PromotionDiscountType;

  @ApiProperty()
  @IsNumber({}, { message: 'Valor do desconto deve ser um número' })
  discount_value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'Data de início inválida' })
  valid_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'Data de término inválida' })
  valid_to?: string;
}
