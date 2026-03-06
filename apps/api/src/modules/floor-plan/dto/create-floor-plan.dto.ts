import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FloorPlanItemDto {
  @IsString()
  table_id: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsString()
  shape: 'rectangle' | 'circle';

  @IsNumber()
  rotation: number;
}

export class CreateFloorPlanDto {
  @ApiProperty({ example: 'Salao Principal' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorPlanItemDto)
  layout?: FloorPlanItemDto[];
}
