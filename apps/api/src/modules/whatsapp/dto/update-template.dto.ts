import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { WhatsappTemplateType } from '@menufacil/shared';

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(WhatsappTemplateType)
  @IsOptional()
  type?: WhatsappTemplateType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
