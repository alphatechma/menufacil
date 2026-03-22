import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTenantDto {
  @ApiProperty({ example: 'Meu Restaurante' })
  @IsString({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ example: 'meu-restaurante' })
  @IsString({ message: 'Slug é obrigatório' })
  slug: string;

  @ApiProperty({ example: 'admin@exemplo.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @ApiProperty({ example: '(11) 99999-9999', required: false })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser um texto' })
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'ID do plano deve ser um texto' })
  plan_id?: string;
}
