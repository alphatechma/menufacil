import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDeliveryPersonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delivery_person_id: string | null;
}
