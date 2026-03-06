import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeSessionDto {
  @ApiProperty({ description: 'ID da sessao de destino' })
  @IsUUID()
  target_session_id: string;
}
