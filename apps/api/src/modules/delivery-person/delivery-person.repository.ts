import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from './entities/delivery-person.entity';

@Injectable()
export class DeliveryPersonRepository {
  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly repo: Repository<DeliveryPerson>,
  ) {}

  create(data: Partial<DeliveryPerson>): DeliveryPerson {
    return this.repo.create(data);
  }

  async save(entity: DeliveryPerson): Promise<DeliveryPerson> {
    return this.repo.save(entity);
  }

  async findByTenant(tenantId: string, unitId?: string | null): Promise<DeliveryPerson[]> {
    const where: any = { tenant_id: tenantId };
    if (unitId) {
      where.unit_id = unitId;
    }
    return this.repo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<DeliveryPerson | null> {
    return this.repo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async findByIdWithOrders(id: string, tenantId: string): Promise<DeliveryPerson | null> {
    return this.repo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['orders', 'orders.customer', 'orders.items'],
    });
  }

  async update(id: string, tenantId: string, data: Partial<DeliveryPerson>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Nullify orders referencing this delivery person to avoid FK constraint violation
    await this.repo.query('UPDATE orders SET delivery_person_id = NULL WHERE delivery_person_id = $1', [id]);
    await this.repo.delete({ id, tenant_id: tenantId });
  }
}
