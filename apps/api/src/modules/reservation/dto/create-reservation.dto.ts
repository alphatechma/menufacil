import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 'Joao Silva' })
  @IsString({ message: 'Nome do cliente é obrigatório' })
  customer_name: string;

  @ApiProperty({ example: '11999999999' })
  @IsString({ message: 'Telefone do cliente é obrigatório' })
  customer_phone: string;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString({}, { message: 'Data inválida' })
  date: string;

  @ApiProperty({ example: '19:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário de início deve estar no formato HH:MM' })
  time_start: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário de término deve estar no formato HH:MM' })
  time_end?: string;

  @ApiProperty({ example: 4 })
  @IsNumber({}, { message: 'Quantidade de pessoas deve ser um número' })
  @Min(1, { message: 'Quantidade de pessoas deve ser pelo menos 1' })
  party_size: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID da mesa inválido' })
  table_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do cliente inválido' })
  customer_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  notes?: string;
}
