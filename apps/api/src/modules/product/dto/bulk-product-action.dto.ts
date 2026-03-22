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
  @IsEnum(BulkProductActionType)
  action: BulkProductActionType;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiProperty({ enum: PriceAdjustmentType, required: false })
  @IsOptional()
  @IsEnum(PriceAdjustmentType)
  adjustment_type?: PriceAdjustmentType;
}
