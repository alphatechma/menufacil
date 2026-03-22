import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenSessionDto {
  @ApiProperty()
  @IsUUID('all', { message: 'ID da mesa inválido' })
  table_id: string;

  @ApiPropertyOptional({ description: 'ID do usuario que abriu a sessao (staff)' })
  @IsOptional()
  @IsUUID('all', { message: 'ID do usuário inválido' })
  opened_by?: string;
}
