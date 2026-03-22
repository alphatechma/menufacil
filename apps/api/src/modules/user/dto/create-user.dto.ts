import { IsEmail, IsString, IsEnum, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@menufacil/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.ADMIN })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Cargo inválido' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do cargo inválido' })
  role_id?: string;

  @ApiPropertyOptional({ description: 'Unit ID the user is assigned to (null = all units)' })
  @IsOptional()
  @IsUUID('all', { message: 'ID da unidade inválido' })
  unit_id?: string | null;
}
