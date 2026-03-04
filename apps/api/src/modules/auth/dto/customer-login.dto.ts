import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerLoginDto {
  @ApiProperty({ example: '11999990000' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'João' })
  @IsOptional()
  @IsString()
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
  @IsString()
  email?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}
