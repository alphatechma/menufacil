import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 199 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  max_users?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  max_products?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
