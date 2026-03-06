import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DiscountType } from '@menufacil/shared';
import { CouponRepository } from './coupon.repository';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Coupon } from './entities/coupon.entity';

@Injectable()
export class CouponService {
  constructor(private readonly repository: CouponRepository) {}

  async create(dto: CreateCouponDto, tenantId: string): Promise<Coupon> {
    const coupon = this.repository.create({ ...dto, code: dto.code?.toUpperCase(), tenant_id: tenantId } as any);
    return this.repository.save(coupon);
  }

  async findAll(tenantId: string): Promise<Coupon[]> {
    return this.repository.findByTenant(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Coupon> {
    const coupon = await this.repository.findById(id, tenantId);
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, tenantId: string): Promise<Coupon> {
    await this.findById(id, tenantId);
    await this.repository.update(id, tenantId, dto as any);
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.repository.remove(id, tenantId);
  }

  async validate(code: string, orderTotal: number, tenantId: string): Promise<{ discount: number; coupon: Coupon }> {
    const coupon = await this.repository.findByCode(code.toUpperCase(), tenantId);
    if (!coupon || !coupon.is_active) {
      throw new BadRequestException('Invalid coupon');
    }

    const now = new Date();
    if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_until)) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (coupon.min_order && orderTotal < Number(coupon.min_order)) {
      throw new BadRequestException(`Minimum order is R$${coupon.min_order}`);
    }

    let discount: number;
    if (coupon.discount_type === DiscountType.PERCENT) {
      discount = (orderTotal * Number(coupon.discount_value)) / 100;
    } else {
      discount = Number(coupon.discount_value);
    }

    return { discount: Math.min(discount, orderTotal), coupon };
  }

  async use(id: string): Promise<void> {
    await this.repository.incrementUses(id);
  }
}
