import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@menufacil/shared';

export class CreateRewardDto {
  @ApiProperty({ example: '10% de desconto' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Desconto de 10% no proximo pedido' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  points_required: number;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  reward_type: RewardType;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  reward_value: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 0, description: '0 = unlimited' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_redemptions_per_customer?: number;

  @ApiPropertyOptional({ example: 24, description: 'Hours between redemptions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cooldown_hours?: number;

  @ApiPropertyOptional({ example: 72, description: 'Hours until coupon expires' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiration_hours?: number;
}
