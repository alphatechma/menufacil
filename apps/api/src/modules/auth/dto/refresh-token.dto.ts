import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Token de atualização deve ser um texto' })
  refresh_token?: string;
}
