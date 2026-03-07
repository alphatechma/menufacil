import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phone: string;

  @IsString()
  content: string;
}
