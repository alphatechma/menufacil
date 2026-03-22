import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkOrderActionType {
  CANCEL = 'cancel',
  UPDATE_STATUS = 'update_status',
}

export class BulkOrderStatusDto {
  @ApiProperty({ enum: BulkOrderActionType })
  @IsEnum(BulkOrderActionType, { message: 'Ação inválida' })
  action: BulkOrderActionType;

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'IDs deve ser uma lista' })
  @IsUUID('4', { each: true, message: 'ID do pedido inválido' })
  ids: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Status deve ser um texto' })
  status?: string;
}
