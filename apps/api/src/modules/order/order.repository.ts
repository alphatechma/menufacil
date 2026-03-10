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

  async findByTenant(tenantId: string, unitId?: string | null): Promise<Order[]> {
    const where: any = { tenant_id: tenantId };
    if (unitId) {
      where.unit_id = unitId;
    }
    return this.repo.find({
      where,
      relations: ['items', 'items.extras', 'customer', 'delivery_person', 'table'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<Order[]> {
    return this.repo.find({
      where: { customer_id: customerId, tenant_id: tenantId },
      relations: ['items', 'items.extras', 'table'],
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items', 'items.extras', 'customer', 'delivery_person', 'table'],
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

  async getCompletedOrders(tenantId: string, since: Date): Promise<Order[]> {
    return this.repo
      .createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.created_at >= :since', { since })
      .orderBy('order.created_at', 'DESC')
      .getMany();
  }

  private applyFilters(
    qb: any,
    alias: string,
    filters: { status?: string; payment_method?: string; delivery_person_id?: string },
  ) {
    if (filters.status) {
      qb.andWhere(`${alias}.status = :filterStatus`, { filterStatus: filters.status });
    }
    if (filters.payment_method) {
      qb.andWhere(`${alias}.payment_method = :filterPM`, { filterPM: filters.payment_method });
    }
    if (filters.delivery_person_id) {
      qb.andWhere(`${alias}.delivery_person_id = :filterDP`, { filterDP: filters.delivery_person_id });
    }
  }

  async getDashboardData(
    tenantId: string,
    since: Date,
    until: Date,
    filters: { status?: string; payment_method?: string; delivery_person_id?: string } = {},
  ) {
    // Revenue and order count per day (exclude cancelled from both count and revenue)
    const dailyQb = this.repo
      .createQueryBuilder('o')
      .select("DATE(o.created_at)", 'date')
      .addSelect("COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END)::int", 'orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric", 'revenue')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.created_at <= :until', { until });
    this.applyFilters(dailyQb, 'o', filters);
    const dailyStats = await dailyQb
      .groupBy('DATE(o.created_at)')
      .orderBy('DATE(o.created_at)', 'ASC')
      .getRawMany();

    // Totals
    const totalsQb = this.repo
      .createQueryBuilder('o')
      .select('COUNT(*)::int', 'total_orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric", 'total_revenue')
      .addSelect("COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::int", 'cancelled_orders')
      .addSelect("COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::int", 'delivered_orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.delivery_fee ELSE 0 END), 0)::numeric", 'total_delivery_fee')
      .addSelect("COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.discount ELSE 0 END), 0)::numeric", 'total_discount')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.created_at <= :until', { until });
    this.applyFilters(totalsQb, 'o', filters);
    const totals = await totalsQb.getRawOne();

    // By status (apply all filters consistently)
    const statusQb = this.repo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(o.total), 0)::numeric', 'revenue')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.created_at <= :until', { until });
    this.applyFilters(statusQb, 'o', filters);
    const byStatus = await statusQb.groupBy('o.status').getRawMany();

    // By payment method (apply all filters consistently)
    const pmQb = this.repo
      .createQueryBuilder('o')
      .select('o.payment_method', 'method')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(o.total), 0)::numeric', 'revenue')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.created_at <= :until', { until });
    this.applyFilters(pmQb, 'o', filters);
    const byPaymentMethod = await pmQb.groupBy('o.payment_method').getRawMany();

    // Top products (apply all filters consistently)
    const prodQb = this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'o')
      .select('item.product_name', 'name')
      .addSelect('SUM(item.quantity)::int', 'quantity')
      .addSelect('COALESCE(SUM(item.unit_price * item.quantity), 0)::numeric', 'revenue')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.created_at <= :until', { until });
    this.applyFilters(prodQb, 'o', filters);
    const topProducts = await prodQb
      .groupBy('item.product_name')
      .orderBy('quantity', 'DESC')
      .limit(10)
      .getRawMany();

    // Delivery person stats
    const dpQb = this.repo
      .createQueryBuilder('o')
      .innerJoin('o.delivery_person', 'dp')
      .select('dp.id', 'id')
      .addSelect('dp.name', 'name')
      .addSelect('dp.phone', 'phone')
      .addSelect('dp.vehicle', 'vehicle')
      .addSelect('COUNT(*)::int', 'total_deliveries')
      .addSelect('COALESCE(SUM(o.total), 0)::numeric', 'total_value')
      .addSelect('AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.out_for_delivery_at)) / 60)::int', 'avg_delivery_minutes')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status = :status', { status: 'delivered' })
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.created_at <= :until', { until });
    if (filters.delivery_person_id) {
      dpQb.andWhere('o.delivery_person_id = :filterDP', { filterDP: filters.delivery_person_id });
    }
    const deliveryPersonStats = await dpQb
      .groupBy('dp.id')
      .addGroupBy('dp.name')
      .addGroupBy('dp.phone')
      .addGroupBy('dp.vehicle')
      .orderBy('total_deliveries', 'DESC')
      .getRawMany();

    return {
      daily: dailyStats,
      totals,
      by_status: byStatus,
      by_payment_method: byPaymentMethod,
      top_products: topProducts,
      delivery_persons: deliveryPersonStats,
    };
  }
}
