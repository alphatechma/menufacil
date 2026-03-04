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
import { PaymentMethod } from '@menufacil/shared';

export class OrderItemExtraDto {
  @ApiProperty({ example: 'Bacon' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  product_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variation_id?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ type: [OrderItemExtraDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemExtraDto)
  extras?: OrderItemExtraDto[];
}

export class AddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  street: string;

  @IsString()
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  neighborhood: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip_code?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  address_id?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
