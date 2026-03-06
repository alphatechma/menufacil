import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryPersonDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicle?: string;

  @ApiPropertyOptional({ description: 'User ID to link this delivery person to a system user' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ enum: ['none', 'fixed', 'percent'], default: 'none' })
  @IsOptional()
  @IsIn(['none', 'fixed', 'percent'])
  commission_type?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Commission value (R$ or %)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commission_value?: number;
}
