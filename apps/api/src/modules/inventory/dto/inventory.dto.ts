import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) current_stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) min_stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cost_price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) min_stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cost_price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class CreateStockMovementDto {
  @ApiProperty() @IsUUID() item_id: string;
  @ApiProperty() @IsString() type: string; // entry, exit, adjustment
  @ApiProperty() @IsNumber() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unit_cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}

export class CreateProductRecipeDto {
  @ApiProperty() @IsUUID() product_id: string;
  @ApiProperty() @IsUUID() item_id: string;
  @ApiProperty() @IsNumber() @Min(0) quantity: number;
}
