import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { WhatsappTemplateType } from '@menufacil/shared';

export class CreateTemplateDto {
  @IsString({ message: 'Nome do template é obrigatório' })
  name: string;

  @IsEnum(WhatsappTemplateType, { message: 'Tipo de template inválido' })
  type: WhatsappTemplateType;

  @IsString({ message: 'Conteúdo do template é obrigatório' })
  content: string;

  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  @IsOptional()
  is_active?: boolean;
}
