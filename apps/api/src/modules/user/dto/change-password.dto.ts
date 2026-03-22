import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Senha atual é obrigatória' })
  @MinLength(6, { message: 'Senha atual deve ter pelo menos 6 caracteres' })
  current_password: string;

  @IsString({ message: 'Nova senha é obrigatória' })
  @MinLength(6, { message: 'Nova senha deve ter pelo menos 6 caracteres' })
  new_password: string;
}
