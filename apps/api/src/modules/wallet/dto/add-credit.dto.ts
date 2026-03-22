import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCreditDto {
  @ApiProperty()
  @IsUUID('all', { message: 'ID do cliente inválido' })
  customerId: string;

  @ApiProperty()
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que 0' })
  amount: number;

  @ApiProperty()
  @IsString({ message: 'Descrição é obrigatória' })
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do pedido inválido' })
  orderId?: string;
}
