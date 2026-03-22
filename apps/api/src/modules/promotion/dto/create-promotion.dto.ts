import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionType, PromotionDiscountType } from '../promotion.entity';

export class CreatePromotionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PromotionType })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rules?: {
    products?: string[];
    categories?: string[];
    buy_quantity?: number;
    get_quantity?: number;
    min_order_value?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schedule?: {
    days?: number[];
    start_time?: string;
    end_time?: string;
  };

  @ApiProperty({ enum: PromotionDiscountType })
  @IsEnum(PromotionDiscountType)
  discount_type: PromotionDiscountType;

  @ApiProperty()
  @IsNumber()
  discount_value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  valid_to?: string;
}
