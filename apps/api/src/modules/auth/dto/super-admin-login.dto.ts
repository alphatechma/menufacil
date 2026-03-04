import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @ApiProperty({ example: 'superadmin@menufacil.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'super123' })
  @IsString()
  @MinLength(6)
  password: string;
}
