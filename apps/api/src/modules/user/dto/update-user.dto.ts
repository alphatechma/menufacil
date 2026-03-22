import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@menufacil/shared';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Nome deve ser um texto' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Cargo inválido' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'ID do cargo inválido' })
  role_id?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Unit ID the user is assigned to (null = all units)' })
  @IsOptional()
  @IsUUID('all', { message: 'ID da unidade inválido' })
  unit_id?: string | null;
}
