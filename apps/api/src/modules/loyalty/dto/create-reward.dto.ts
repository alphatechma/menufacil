import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@menufacil/shared';

export class CreateRewardDto {
  @ApiProperty({ example: '10% de desconto' })
  @IsString({ message: 'Nome da recompensa é obrigatório' })
  name: string;

  @ApiPropertyOptional({ example: 'Desconto de 10% no próximo pedido' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiProperty({ example: 100 })
  @IsNumber({}, { message: 'Pontos necessários deve ser um número' })
  @Min(1, { message: 'Pontos necessários deve ser pelo menos 1' })
  points_required: number;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType, { message: 'Tipo de recompensa inválido' })
  reward_type: RewardType;

  @ApiProperty({ example: 10 })
  @IsNumber({}, { message: 'Valor da recompensa deve ser um número' })
  @Min(0, { message: 'Valor da recompensa deve ser maior ou igual a 0' })
  reward_value: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;

  @ApiPropertyOptional({ example: 0, description: '0 = unlimited' })
  @IsOptional()
  @IsNumber({}, { message: 'Máximo de resgates por cliente deve ser um número' })
  @Min(0, { message: 'Máximo de resgates deve ser maior ou igual a 0' })
  max_redemptions_per_customer?: number;

  @ApiPropertyOptional({ example: 24, description: 'Hours between redemptions' })
  @IsOptional()
  @IsNumber({}, { message: 'Horas de espera deve ser um número' })
  @Min(0, { message: 'Horas de espera deve ser maior ou igual a 0' })
  cooldown_hours?: number;

  @ApiPropertyOptional({ example: 72, description: 'Hours until coupon expires' })
  @IsOptional()
  @IsNumber({}, { message: 'Horas de expiração deve ser um número' })
  @Min(1, { message: 'Horas de expiração deve ser pelo menos 1' })
  expiration_hours?: number;
}
