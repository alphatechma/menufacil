import { IsString, IsOptional, IsNumber, IsBoolean, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Casa' })
  @IsOptional()
  @IsString({ message: 'Rótulo deve ser um texto' })
  label?: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString({ message: 'Rua é obrigatória' })
  street: string;

  @ApiProperty({ example: '123' })
  @IsString({ message: 'Número é obrigatório' })
  number: string;

  @ApiPropertyOptional({ example: 'Apt 4' })
  @IsOptional()
  @IsString({ message: 'Complemento deve ser um texto' })
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString({ message: 'Bairro é obrigatório' })
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString({ message: 'Cidade é obrigatória' })
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString({ message: 'Estado é obrigatório' })
  @Length(2, 2, { message: 'Estado deve ter exatamente 2 caracteres' })
  state: string;

  @ApiProperty({ example: '01234-567' })
  @IsString({ message: 'CEP é obrigatório' })
  zipcode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({}, { message: 'Latitude deve ser um número' })
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({}, { message: 'Longitude deve ser um número' })
  lng?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: 'Campo padrão deve ser verdadeiro ou falso' })
  is_default?: boolean;
}
