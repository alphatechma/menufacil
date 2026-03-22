import { IsString, IsEnum, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { FlowTriggerType } from '@menufacil/shared';

export class UpdateFlowDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser um texto' })
  name?: string;

  @IsOptional()
  @IsEnum(FlowTriggerType, { message: 'Tipo de gatilho inválido' })
  trigger_type?: FlowTriggerType;

  @IsOptional()
  trigger_config?: Record<string, any>;

  @IsOptional()
  nodes?: any[];

  @IsOptional()
  edges?: any[];

  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;

  @IsOptional()
  @IsInt({ message: 'Prioridade deve ser um número inteiro' })
  priority?: number;
}
