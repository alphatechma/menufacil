import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PointDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 'Centro e Região' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0)
  fee: number;

  @ApiProperty({ example: ['Centro', 'Boa Vista', 'República'] })
  @IsArray()
  @IsString({ each: true })
  neighborhoods: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  polygon?: PointDto[];

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(0)
  min_delivery_time: number;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  max_delivery_time: number;
}
