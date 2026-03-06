import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SplitBillEqualDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  number_of_people: number;
}
