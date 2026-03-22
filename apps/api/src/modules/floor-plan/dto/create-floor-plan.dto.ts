import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FloorPlanItemDto {
  @IsString({ message: 'ID da mesa é obrigatório' })
  table_id: string;

  @IsNumber({}, { message: 'Posição X deve ser um número' })
  x: number;

  @IsNumber({}, { message: 'Posição Y deve ser um número' })
  y: number;

  @IsNumber({}, { message: 'Largura deve ser um número' })
  width: number;

  @IsNumber({}, { message: 'Altura deve ser um número' })
  height: number;

  @IsString({ message: 'Formato deve ser um texto' })
  shape: 'rectangle' | 'circle';

  @IsNumber({}, { message: 'Rotação deve ser um número' })
  rotation: number;
}

export class CreateFloorPlanDto {
  @ApiProperty({ example: 'Salao Principal' })
  @IsString({ message: 'Nome da planta é obrigatório' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray({ message: 'Layout deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Item do layout inválido' })
  @Type(() => FloorPlanItemDto)
  layout?: FloorPlanItemDto[];
}
