import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@menufacil/shared';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus, { message: 'Status do pedido inválido' })
  status: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do entregador inválido' })
  delivery_person_id?: string;
}
