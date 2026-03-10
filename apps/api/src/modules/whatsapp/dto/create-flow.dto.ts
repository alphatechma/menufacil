import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';
import { FlowTriggerType } from '@menufacil/shared';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsEnum(FlowTriggerType)
  trigger_type: FlowTriggerType;

  @IsOptional()
  trigger_config?: Record<string, any>;

  @IsOptional()
  @IsArray()
  nodes?: any[];

  @IsOptional()
  @IsArray()
  edges?: any[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;
}
