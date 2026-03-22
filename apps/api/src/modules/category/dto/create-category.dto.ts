import { IsString, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Pizzas Tradicionais' })
  @IsString({ message: 'Nome da categoria é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: 'Nossas pizzas clássicas' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'URL da imagem deve ser um texto' })
  image_url?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  sort_order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;
}
