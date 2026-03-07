import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsObject()
  @IsOptional()
  business_hours?: Record<
    string,
    { open: boolean; openTime: string; closeTime: string }
  >;

  @IsObject()
  @IsOptional()
  order_modes?: { delivery: boolean; pickup: boolean; dine_in: boolean };
}
