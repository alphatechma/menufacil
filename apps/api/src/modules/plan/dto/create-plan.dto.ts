import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro' })
  @IsString({ message: 'Nome do plano é obrigatório' })
  name: string;

  @ApiProperty({ example: 199 })
  @IsNumber({}, { message: 'Preço deve ser um número' })
  @Min(0, { message: 'Preço deve ser maior ou igual a 0' })
  price: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'Máximo de usuários deve ser um número' })
  max_users?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber({}, { message: 'Máximo de produtos deve ser um número' })
  max_products?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;
}
