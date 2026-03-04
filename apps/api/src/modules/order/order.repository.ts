import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemExtra } from './entities/order-item-extra.entity';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderItemExtra)
    private readonly extraRepo: Repository<OrderItemExtra>,
  ) {}

  create(data: Partial<Order>): Order {
    return this.repo.create(data);
  }

  async save(order: Order): Promise<Order> {
    return this.repo.save(order);
  }

  async findByTenant(tenantId: string): Promise<Order[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      relations: ['items', 'items.extras', 'customer'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<Order[]> {
    return this.repo.find({
      where: { customer_id: customerId, tenant_id: tenantId },
      relations: ['items', 'items.extras'],
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items', 'items.extras', 'customer'],
    });
  }

  async getNextOrderNumber(tenantId: string): Promise<string> {
    const result = await this.repo
      .createQueryBuilder('order')
      .select('COUNT(*)', 'count')
      .where('order.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    const num = parseInt(result.count, 10) + 1;
    return String(num).padStart(4, '0');
  }

  async updateStatus(id: string, tenantId: string, data: Partial<Order>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }
}
