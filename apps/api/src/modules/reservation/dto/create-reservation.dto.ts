import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 'Joao Silva' })
  @IsString()
  customer_name: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  customer_phone: string;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '19:00' })
  @Matches(/^\d{2}:\d{2}$/)
  time_start: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  time_end?: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  party_size: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  table_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
