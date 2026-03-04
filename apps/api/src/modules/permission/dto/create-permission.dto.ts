import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'product:create' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Criar Produto' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'uuid-of-module' })
  @IsOptional()
  @IsUUID()
  module_id?: string;
}
