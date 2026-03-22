import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferSessionDto {
  @ApiProperty({ description: 'ID da nova mesa' })
  @IsUUID('all', { message: 'ID da mesa inválido' })
  table_id: string;
}
