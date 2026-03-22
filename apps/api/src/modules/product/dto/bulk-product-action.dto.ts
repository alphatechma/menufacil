import { IsArray, IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkProductActionType {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  DELETE = 'delete',
  ADJUST_PRICE = 'adjust_price',
}

export enum PriceAdjustmentType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export class BulkProductActionDto {
  @ApiProperty({ enum: BulkProductActionType })
  @IsEnum(BulkProductActionType, { message: 'Ação inválida' })
  action: BulkProductActionType;

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'IDs deve ser uma lista' })
  @IsUUID('4', { each: true, message: 'ID de produto inválido' })
  ids: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Valor deve ser um número' })
  value?: number;

  @ApiProperty({ enum: PriceAdjustmentType, required: false })
  @IsOptional()
  @IsEnum(PriceAdjustmentType, { message: 'Tipo de ajuste inválido' })
  adjustment_type?: PriceAdjustmentType;
}
