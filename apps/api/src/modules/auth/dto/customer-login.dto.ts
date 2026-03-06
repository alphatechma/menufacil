import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerLoginDto {
  @ApiPropertyOptional({ example: '11999990000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'Joao' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

export class CustomerRegisterDto {
  @ApiProperty({ example: 'Maria Santos' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '11999990000' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}
