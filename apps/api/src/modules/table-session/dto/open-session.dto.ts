import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenSessionDto {
  @ApiProperty()
  @IsUUID()
  table_id: string;

  @ApiPropertyOptional({ description: 'ID do usuario que abriu a sessao (staff)' })
  @IsOptional()
  @IsUUID()
  opened_by?: string;
}
