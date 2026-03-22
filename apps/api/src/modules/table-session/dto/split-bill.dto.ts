import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SplitBillEqualDto {
  @ApiProperty({ example: 3 })
  @IsNumber({}, { message: 'Número de pessoas deve ser um número' })
  @Min(1, { message: 'Número de pessoas deve ser pelo menos 1' })
  number_of_people: number;
}
