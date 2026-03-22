import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString({ message: 'Telefone é obrigatório' })
  phone: string;

  @IsString({ message: 'Conteúdo da mensagem é obrigatório' })
  content: string;
}
