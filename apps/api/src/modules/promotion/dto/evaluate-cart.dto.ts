import { IsArray, IsNumber, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty()
  @IsString({ message: 'ID do produto é obrigatório' })
  product_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'ID da categoria deve ser um texto' })
  category_id?: string;

  @ApiProperty()
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  quantity: number;

  @ApiProperty()
  @IsNumber({}, { message: 'Preço unitário deve ser um número' })
  unit_price: number;
}

export class EvaluateCartDto {
  @ApiProperty({ type: [CartItemDto] })
  @IsArray({ message: 'Itens deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Item do carrinho inválido' })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
