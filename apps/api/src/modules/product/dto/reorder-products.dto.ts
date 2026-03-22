import { IsArray, ValidateNested, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderItemDto {
  @ApiProperty()
  @IsUUID('all', { message: 'ID do produto inválido' })
  id: string;

  @ApiProperty()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(0, { message: 'Ordem deve ser maior ou igual a 0' })
  sort_order: number;
}

export class ReorderProductsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray({ message: 'Itens deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Item inválido' })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
