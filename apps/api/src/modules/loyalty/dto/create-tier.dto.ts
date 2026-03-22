import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTierDto {
  @ApiProperty({ example: 'Bronze' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  min_points: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @Min(1)
  multiplier: number;

  @ApiPropertyOptional({ example: ['Frete gratis', '10% off'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ example: 'medal' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#CD7F32' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sort_order?: number;
}
