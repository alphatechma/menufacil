import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';

@Injectable()
export class CouponRepository {
  constructor(
    @InjectRepository(Coupon)
    private readonly repo: Repository<Coupon>,
  ) {}

  create(data: Partial<Coupon>): Coupon {
    return this.repo.create(data);
  }

  async save(coupon: Coupon): Promise<Coupon> {
    return this.repo.save(coupon);
  }

  async findByTenant(tenantId: string): Promise<Coupon[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Coupon | null> {
    return this.repo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async findByCode(code: string, tenantId: string): Promise<Coupon | null> {
    return this.repo.findOne({ where: { code, tenant_id: tenantId } });
  }

  async update(id: string, tenantId: string, data: Partial<Coupon>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenant_id: tenantId });
  }

  async incrementUses(id: string): Promise<void> {
    await this.repo.increment({ id }, 'current_uses', 1);
  }
}
