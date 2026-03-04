import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZone } from './entities/delivery-zone.entity';

@Injectable()
export class DeliveryZoneRepository {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly repo: Repository<DeliveryZone>,
  ) {}

  create(data: Partial<DeliveryZone>): DeliveryZone {
    return this.repo.create(data);
  }

  async save(zone: DeliveryZone): Promise<DeliveryZone> {
    return this.repo.save(zone);
  }

  async findByTenant(tenantId: string): Promise<DeliveryZone[]> {
    return this.repo.find({ where: { tenant_id: tenantId } });
  }

  async findById(id: string, tenantId: string): Promise<DeliveryZone | null> {
    return this.repo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async update(id: string, tenantId: string, data: Partial<DeliveryZone>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenant_id: tenantId });
  }
}
