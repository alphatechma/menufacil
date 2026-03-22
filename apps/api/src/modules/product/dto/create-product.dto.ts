import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'ID deve ser um texto' })
  id?: string;

  @ApiProperty({ example: 'Grande' })
  @IsString({ message: 'Nome da variação é obrigatório' })
  name: string;

  @ApiPropertyOptional({ example: '500ml' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiProperty({ example: 49.9 })
  @IsNumber({}, { message: 'Preço deve ser um número' })
  @Min(0, { message: 'Preço deve ser maior ou igual a 0' })
  price: number;
}

export class CreateExtraDto {
  @ApiProperty({ example: 'Bacon' })
  @IsString({ message: 'Nome do extra é obrigatório' })
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber({}, { message: 'Preço deve ser um número' })
  @Min(0, { message: 'Preço deve ser maior ou igual a 0' })
  price: number;
}

export class CreateExtraGroupDto {
  @ApiProperty({ example: 'Adicionais' })
  @IsString({ message: 'Nome do grupo é obrigatório' })
  name: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Seleção mínima deve ser um número' })
  min_select?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber({}, { message: 'Seleção máxima deve ser um número' })
  max_select?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: 'Campo obrigatório deve ser verdadeiro ou falso' })
  is_required?: boolean;

  @ApiProperty({ type: [CreateExtraDto] })
  @IsArray({ message: 'Extras deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Extra inválido' })
  @Type(() => CreateExtraDto)
  extras: CreateExtraDto[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Margherita' })
  @IsString({ message: 'Nome do produto é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: 'Molho de tomate, mussarela, manjericão' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiProperty({ example: 39.9 })
  @IsNumber({}, { message: 'Preço base deve ser um número' })
  @Min(0, { message: 'Preço base deve ser maior ou igual a 0' })
  base_price: number;

  @ApiProperty()
  @IsUUID('all', { message: 'ID da categoria inválido' })
  category_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'URL da imagem deve ser um texto' })
  image_url?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  sort_order?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Mínimo de variações deve ser um número' })
  @Min(0, { message: 'Mínimo de variações deve ser maior ou igual a 0' })
  min_variations?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Máximo de variações deve ser um número' })
  @Min(0, { message: 'Máximo de variações deve ser maior ou igual a 0' })
  max_variations?: number;

  @ApiPropertyOptional({ type: [String], example: ['vegetariano', 'vegano'] })
  @IsOptional()
  @IsArray({ message: 'Tags alimentares deve ser uma lista' })
  @IsString({ each: true, message: 'Cada tag deve ser um texto' })
  dietary_tags?: string[];

  @ApiPropertyOptional({ type: [CreateVariationDto] })
  @IsOptional()
  @IsArray({ message: 'Variações deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Variação inválida' })
  @Type(() => CreateVariationDto)
  variations?: CreateVariationDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: 'IDs dos grupos de extras deve ser uma lista' })
  @IsUUID('4', { each: true, message: 'ID do grupo de extra inválido' })
  extra_group_ids?: string[];
}
