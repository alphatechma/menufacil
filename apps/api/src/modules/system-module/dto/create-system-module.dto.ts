import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSystemModuleDto {
  @ApiProperty({ example: 'delivery' })
  @IsString({ message: 'Chave do módulo é obrigatória' })
  key: string;

  @ApiProperty({ example: 'Delivery' })
  @IsString({ message: 'Nome do módulo é obrigatório' })
  name: string;

  @ApiPropertyOptional({ example: 'Zonas de entrega e delivery' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;
}
