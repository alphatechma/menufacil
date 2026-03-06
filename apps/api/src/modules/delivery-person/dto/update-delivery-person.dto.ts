import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDeliveryPersonDto } from './create-delivery-person.dto';

export class UpdateDeliveryPersonDto extends PartialType(CreateDeliveryPersonDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
