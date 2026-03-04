import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSystemModuleDto {
  @ApiProperty({ example: 'delivery' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Delivery' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Zonas de entrega e delivery' })
  @IsOptional()
  @IsString()
  description?: string;
}
