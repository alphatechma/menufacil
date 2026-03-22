import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PointDto {
  @IsNumber({}, { message: 'Latitude deve ser um número' })
  lat: number;

  @IsNumber({}, { message: 'Longitude deve ser um número' })
  lng: number;
}

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 'Centro e Região' })
  @IsString({ message: 'Nome da zona é obrigatório' })
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber({}, { message: 'Taxa de entrega deve ser um número' })
  @Min(0, { message: 'Taxa de entrega deve ser maior ou igual a 0' })
  fee: number;

  @ApiProperty({ example: ['Centro', 'Boa Vista', 'República'] })
  @IsArray({ message: 'Bairros deve ser uma lista' })
  @IsString({ each: true, message: 'Cada bairro deve ser um texto' })
  neighborhoods: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray({ message: 'Polígono deve ser uma lista' })
  @ValidateNested({ each: true, message: 'Ponto do polígono inválido' })
  @Type(() => PointDto)
  polygon?: PointDto[];

  @ApiProperty({ example: 30 })
  @IsNumber({}, { message: 'Tempo mínimo de entrega deve ser um número' })
  @Min(0, { message: 'Tempo mínimo de entrega deve ser maior ou igual a 0' })
  min_delivery_time: number;

  @ApiProperty({ example: 60 })
  @IsNumber({}, { message: 'Tempo máximo de entrega deve ser um número' })
  @Min(0, { message: 'Tempo máximo de entrega deve ser maior ou igual a 0' })
  max_delivery_time: number;
}
