import { IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ example: 1 })
  @IsNumber({}, { message: 'Número da mesa deve ser um número' })
  @Min(1, { message: 'Número da mesa deve ser maior ou igual a 1' })
  number: number;

  @ApiPropertyOptional({ example: 'Salao A' })
  @IsOptional()
  @IsString({ message: 'Rótulo deve ser um texto' })
  label?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber({}, { message: 'Capacidade deve ser um número' })
  @Min(1, { message: 'Capacidade deve ser maior ou igual a 1' })
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;
}
