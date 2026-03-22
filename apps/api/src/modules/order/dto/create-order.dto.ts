import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, OrderType } from '@menufacil/shared';

export class OrderItemExtraDto {
  @ApiProperty({ example: 'Bacon' })
  @IsString({ message: 'Nome do extra é obrigatório' })
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber({}, { message: 'Preço do extra deve ser um número' })
  @Min(0, { message: 'Preço do extra deve ser maior ou igual a 0' })
  price: number;
}

export class OrderItemDto {
  @ApiProperty()
  @IsUUID('all', { message: 'ID do produto inválido' })
  product_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID da variação inválido' })
  variation_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: 'IDs das variações deve ser uma lista' })
  @IsUUID('4', { each: true, message: 'ID da variação inválido' })
  variation_ids?: string[];

  @ApiPropertyOptional({ description: 'Quantity per variation ID (e.g. {"uuid1": 2, "uuid2": 1})' })
  @IsOptional()
  @IsObject({ message: 'Quantidades por variação deve ser um objeto' })
  variation_quantities?: Record<string, number>;

  @ApiProperty({ example: 1 })
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(1, { message: 'Quantidade deve ser pelo menos 1' })
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  notes?: string;

  @ApiPropertyOptional({ type: [OrderItemExtraDto] })
  @IsOptional()
  @IsArray({ message: 'Extras deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Extra inválido' })
  @Type(() => OrderItemExtraDto)
  extras?: OrderItemExtraDto[];
}

export class AddressDto {
  @IsOptional()
  @IsString({ message: 'Rótulo deve ser um texto' })
  label?: string;

  @IsString({ message: 'Rua é obrigatória' })
  street: string;

  @IsString({ message: 'Número é obrigatório' })
  number: string;

  @IsOptional()
  @IsString({ message: 'Complemento deve ser um texto' })
  complement?: string;

  @IsString({ message: 'Bairro é obrigatório' })
  neighborhood: string;

  @IsString({ message: 'Cidade é obrigatória' })
  city: string;

  @IsOptional()
  @IsString({ message: 'Estado deve ser um texto' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'CEP deve ser um texto' })
  zip_code?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray({ message: 'Itens do pedido deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Item do pedido inválido' })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido' })
  payment_method?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do endereço inválido' })
  address_id?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested({ message: 'Endereço inválido' })
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Código do cupom deve ser um texto' })
  coupon_code?: string;

  @ApiPropertyOptional({ description: 'Amount the customer has (for cash change calculation)' })
  @IsOptional()
  @IsNumber({}, { message: 'Valor para troco deve ser um número' })
  @Min(0, { message: 'Valor para troco deve ser maior ou igual a 0' })
  change_for?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  notes?: string;

  @ApiPropertyOptional({ enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType, { message: 'Tipo de pedido inválido' })
  order_type?: OrderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID da mesa inválido' })
  table_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID da sessão da mesa inválido' })
  table_session_id?: string;

  @ApiPropertyOptional({ description: 'Person name for dine-in orders (used in split bill)' })
  @IsOptional()
  @IsString({ message: 'Nome do cliente deve ser um texto' })
  customer_name?: string;

  @ApiPropertyOptional({ description: 'Customer ID for admin/POS orders (optional for unidentified customers)' })
  @IsOptional()
  @IsUUID('all', { message: 'ID do cliente inválido' })
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Mark order as already paid (for POS/counter orders)' })
  @IsOptional()
  is_paid?: boolean;

  @ApiPropertyOptional({ description: 'Payment splits for split payment (POS)' })
  @IsOptional()
  @IsArray({ message: 'Divisões de pagamento deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Divisão de pagamento inválida' })
  @Type(() => PaymentSplitDto)
  payment_splits?: PaymentSplitDto[];
}

export class PaymentSplitDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido' })
  method: PaymentMethod;

  @ApiProperty()
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0, { message: 'Valor deve ser maior ou igual a 0' })
  amount: number;
}
