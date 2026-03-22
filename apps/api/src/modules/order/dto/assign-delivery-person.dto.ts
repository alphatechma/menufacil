import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDeliveryPersonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do entregador inválido' })
  delivery_person_id: string | null;
}
