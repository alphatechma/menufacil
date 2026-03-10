import { IsString, IsEnum, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { FlowTriggerType } from '@menufacil/shared';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsEnum(FlowTriggerType)
  trigger_type: FlowTriggerType;

  @IsOptional()
  trigger_config?: Record<string, any>;

  @IsOptional()
  nodes?: any[];

  @IsOptional()
  edges?: any[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;
}
