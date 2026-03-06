import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateTableDto } from './create-table.dto';
import { TableStatus } from '../entities/table.entity';

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
