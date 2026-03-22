import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryPersonDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  name: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @IsString({ message: 'Telefone deve ser um texto' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Veículo deve ser um texto' })
  vehicle?: string;

  @ApiPropertyOptional({ description: 'User ID to link this delivery person to a system user' })
  @IsOptional()
  @IsUUID('all', { message: 'ID do usuário inválido' })
  user_id?: string;

  @ApiPropertyOptional({ enum: ['none', 'fixed', 'percent'], default: 'none' })
  @IsOptional()
  @IsIn(['none', 'fixed', 'percent'], { message: 'Tipo de comissão deve ser: none, fixed ou percent' })
  commission_type?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Commission value (R$ or %)' })
  @IsOptional()
  @IsNumber({}, { message: 'Valor da comissão deve ser um número' })
  @Min(0, { message: 'Valor da comissão deve ser maior ou igual a 0' })
  commission_value?: number;
}
