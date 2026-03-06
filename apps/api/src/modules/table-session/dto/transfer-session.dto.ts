import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferSessionDto {
  @ApiProperty({ description: 'ID da nova mesa' })
  @IsUUID()
  table_id: string;
}
