import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'product:create' })
  @IsString({ message: 'Chave da permissão é obrigatória' })
  key: string;

  @ApiProperty({ example: 'Criar Produto' })
  @IsString({ message: 'Nome da permissão é obrigatório' })
  name: string;

  @ApiPropertyOptional({ example: 'uuid-of-module' })
  @IsOptional()
  @IsUUID('all', { message: 'ID do módulo inválido' })
  module_id?: string;
}
