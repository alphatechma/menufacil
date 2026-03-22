import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { WhatsappTemplateType } from '@menufacil/shared';

export class UpdateTemplateDto {
  @IsString({ message: 'Nome deve ser um texto' })
  @IsOptional()
  name?: string;

  @IsEnum(WhatsappTemplateType, { message: 'Tipo de template inválido' })
  @IsOptional()
  type?: WhatsappTemplateType;

  @IsString({ message: 'Conteúdo deve ser um texto' })
  @IsOptional()
  content?: string;

  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  @IsOptional()
  is_active?: boolean;
}
