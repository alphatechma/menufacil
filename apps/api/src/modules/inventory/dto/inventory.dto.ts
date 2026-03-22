import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty() @IsString({ message: 'Nome é obrigatório' }) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Descrição deve ser um texto' }) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'SKU deve ser um texto' }) sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Unidade deve ser um texto' }) unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber({}, { message: 'Estoque atual deve ser um número' }) @Min(0, { message: 'Estoque atual deve ser maior ou igual a 0' }) current_stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({}, { message: 'Estoque mínimo deve ser um número' }) @Min(0, { message: 'Estoque mínimo deve ser maior ou igual a 0' }) min_stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({}, { message: 'Preço de custo deve ser um número' }) @Min(0, { message: 'Preço de custo deve ser maior ou igual a 0' }) cost_price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Categoria deve ser um texto' }) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Fornecedor deve ser um texto' }) supplier?: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Nome deve ser um texto' }) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Descrição deve ser um texto' }) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'SKU deve ser um texto' }) sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Unidade deve ser um texto' }) unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber({}, { message: 'Estoque mínimo deve ser um número' }) @Min(0, { message: 'Estoque mínimo deve ser maior ou igual a 0' }) min_stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({}, { message: 'Preço de custo deve ser um número' }) @Min(0, { message: 'Preço de custo deve ser maior ou igual a 0' }) cost_price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Categoria deve ser um texto' }) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Fornecedor deve ser um texto' }) supplier?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' }) is_active?: boolean;
}

export class CreateStockMovementDto {
  @ApiProperty() @IsUUID('all', { message: 'ID do item inválido' }) item_id: string;
  @ApiProperty() @IsString({ message: 'Tipo é obrigatório' }) type: string; // entry, exit, adjustment
  @ApiProperty() @IsNumber({}, { message: 'Quantidade deve ser um número' }) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({}, { message: 'Custo unitário deve ser um número' }) @Min(0, { message: 'Custo unitário deve ser maior ou igual a 0' }) unit_cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Motivo deve ser um texto' }) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ message: 'Referência deve ser um texto' }) reference?: string;
}

export class CreateProductRecipeDto {
  @ApiProperty() @IsUUID('all', { message: 'ID do produto inválido' }) product_id: string;
  @ApiProperty() @IsUUID('all', { message: 'ID do item inválido' }) item_id: string;
  @ApiProperty() @IsNumber({}, { message: 'Quantidade deve ser um número' }) @Min(0, { message: 'Quantidade deve ser maior ou igual a 0' }) quantity: number;
}
