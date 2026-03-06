import { IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  number: number;

  @ApiPropertyOptional({ example: 'Salao A' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
