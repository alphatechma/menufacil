import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkOrderActionType {
  CANCEL = 'cancel',
  UPDATE_STATUS = 'update_status',
}

export class BulkOrderStatusDto {
  @ApiProperty({ enum: BulkOrderActionType })
  @IsEnum(BulkOrderActionType)
  action: BulkOrderActionType;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
