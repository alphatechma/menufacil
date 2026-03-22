import { IsString, IsOptional, IsArray, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Atendente' })
  @IsString({ message: 'Nome do cargo é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: 'Atendimento ao cliente e pedidos' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: 'IDs de permissões deve ser uma lista' })
  @IsUUID('4', { each: true, message: 'ID de permissão inválido' })
  permission_ids?: string[];
}
