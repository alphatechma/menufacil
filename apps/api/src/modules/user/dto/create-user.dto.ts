import { IsEmail, IsString, IsEnum, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@menufacil/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.ADMIN })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiPropertyOptional({ description: 'Unit ID the user is assigned to (null = all units)' })
  @IsOptional()
  @IsUUID()
  unit_id?: string | null;
}
