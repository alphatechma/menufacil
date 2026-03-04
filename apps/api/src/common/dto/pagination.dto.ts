import { IsOptional, IsPositive, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAGINATION_DEFAULTS } from '@menufacil/shared';

export class PaginationDto {
  @ApiPropertyOptional({ default: PAGINATION_DEFAULTS.PAGE })
  @IsOptional()
  @IsPositive()
  page?: number = PAGINATION_DEFAULTS.PAGE;

  @ApiPropertyOptional({ default: PAGINATION_DEFAULTS.LIMIT })
  @IsOptional()
  @IsPositive()
  @Max(PAGINATION_DEFAULTS.MAX_LIMIT)
  limit?: number = PAGINATION_DEFAULTS.LIMIT;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
