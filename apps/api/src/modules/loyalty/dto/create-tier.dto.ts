import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTierDto {
  @ApiProperty({ example: 'Bronze' })
  @IsString({ message: 'Nome do nível é obrigatório' })
  name: string;

  @ApiProperty({ example: 0 })
  @IsNumber({}, { message: 'Pontos mínimos deve ser um número' })
  @Min(0, { message: 'Pontos mínimos deve ser maior ou igual a 0' })
  min_points: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber({}, { message: 'Multiplicador deve ser um número' })
  @Min(1, { message: 'Multiplicador deve ser pelo menos 1' })
  multiplier: number;

  @ApiPropertyOptional({ example: ['Frete gratis', '10% off'] })
  @IsOptional()
  @IsArray({ message: 'Benefícios deve ser uma lista' })
  @IsString({ each: true, message: 'Cada benefício deve ser um texto' })
  benefits?: string[];

  @ApiPropertyOptional({ example: 'medal' })
  @IsOptional()
  @IsString({ message: 'Ícone deve ser um texto' })
  icon?: string;

  @ApiPropertyOptional({ example: '#CD7F32' })
  @IsOptional()
  @IsString({ message: 'Cor deve ser um texto' })
  color?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(0, { message: 'Ordem deve ser maior ou igual a 0' })
  sort_order?: number;
}
