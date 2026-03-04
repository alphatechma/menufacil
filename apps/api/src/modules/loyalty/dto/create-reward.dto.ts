import { IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RewardType } from '@menufacil/shared';

export class CreateRewardDto {
  @ApiProperty({ example: '10% de desconto' })
  @IsString()
  name: string;

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
}
