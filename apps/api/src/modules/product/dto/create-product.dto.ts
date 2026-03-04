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
  @ApiProperty({ example: 'Grande' })
  @IsString()
  name: string;

  @ApiProperty({ example: 49.9 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateExtraDto {
  @ApiProperty({ example: 'Bacon' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateExtraGroupDto {
  @ApiProperty({ example: 'Adicionais' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  min_select?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  max_select?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiProperty({ type: [CreateExtraDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExtraDto)
  extras: CreateExtraDto[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Margherita' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Molho de tomate, mussarela, manjericão' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 39.9 })
  @IsNumber()
  @Min(0)
  base_price: number;

  @ApiProperty()
  @IsUUID()
  category_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_pizza?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @ApiPropertyOptional({ type: [CreateVariationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariationDto)
  variations?: CreateVariationDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  extra_group_ids?: string[];
}
