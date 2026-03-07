import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { WhatsappTemplateType } from '@menufacil/shared';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsEnum(WhatsappTemplateType)
  type: WhatsappTemplateType;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
