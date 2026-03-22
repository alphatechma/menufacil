import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateUnitDto {
  @IsString({ message: 'Nome é obrigatório' })
  name: string;

  @IsString({ message: 'Slug é obrigatório' })
  slug: string;

  @IsString({ message: 'Endereço deve ser um texto' })
  @IsOptional()
  address?: string;

  @IsString({ message: 'Telefone deve ser um texto' })
  @IsOptional()
  phone?: string;

  @IsObject({ message: 'Horário de funcionamento deve ser um objeto' })
  @IsOptional()
  business_hours?: Record<
    string,
    { open: boolean; openTime: string; closeTime: string }
  >;

  @IsBoolean({ message: 'Campo ativo deve ser verdadeiro ou falso' })
  @IsOptional()
  is_active?: boolean;

  @IsObject({ message: 'Modos de pedido devem ser um objeto' })
  @IsOptional()
  order_modes?: { delivery: boolean; pickup: boolean; dine_in: boolean };
}
