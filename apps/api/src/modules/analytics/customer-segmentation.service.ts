import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customer/entities/customer.entity';
import { Order } from '../order/entities/order.entity';

export type SegmentType = 'champions' | 'loyal' | 'promising' | 'at_risk' | 'lost';

interface SegmentedCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  recency_days: number;
  frequency: number;
  monetary: number;
  segment: SegmentType;
}

@Injectable()
export class CustomerSegmentationService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getSegments(tenantId: string) {
    const customers = await this.customerRepo.find({
      where: { tenant_id: tenantId },
    });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Get order data for all customers in bulk
    const orderData = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.customer_id', 'customer_id')
      .addSelect('MAX(order.created_at)', 'last_order_at')
      .addSelect('COUNT(CASE WHEN order.created_at >= :ninetyDaysAgo THEN 1 END)', 'frequency')
      .addSelect('COALESCE(SUM(CASE WHEN order.created_at >= :ninetyDaysAgo THEN order.total ELSE 0 END), 0)', 'monetary')
      .addSelect('MIN(order.created_at)', 'first_order_at')
      .where('order.tenant_id = :tenantId', { tenantId })
      .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
      .setParameter('ninetyDaysAgo', ninetyDaysAgo)
      .groupBy('order.customer_id')
      .getRawMany();

    const orderMap = new Map(
      orderData.map((d) => [d.customer_id, d]),
    );

    // Calculate average monetary for relative comparison
    const monetaryValues = orderData
      .map((d) => parseFloat(d.monetary))
      .filter((v) => v > 0);
    const avgMonetary = monetaryValues.length > 0
      ? monetaryValues.reduce((sum, v) => sum + v, 0) / monetaryValues.length
      : 0;

    const segmentedCustomers: SegmentedCustomer[] = customers.map((c) => {
      const data = orderMap.get(c.id);
      const now = new Date();

      let recencyDays = 999;
      let frequency = 0;
      let monetary = 0;
      let firstOrderAt: Date | null = null;

      if (data) {
        recencyDays = data.last_order_at
          ? Math.floor((now.getTime() - new Date(data.last_order_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        frequency = parseInt(data.frequency) || 0;
        monetary = parseFloat(data.monetary) || 0;
        firstOrderAt = data.first_order_at ? new Date(data.first_order_at) : null;
      }

      const segment = this.classifySegment(
        recencyDays,
        frequency,
        monetary,
        avgMonetary,
        firstOrderAt,
        sixtyDaysAgo,
      );

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        recency_days: recencyDays,
        frequency,
        monetary,
        segment,
      };
    });

    // Group by segment
    const segments: Record<SegmentType, { count: number; customers: SegmentedCustomer[] }> = {
      champions: { count: 0, customers: [] },
      loyal: { count: 0, customers: [] },
      promising: { count: 0, customers: [] },
      at_risk: { count: 0, customers: [] },
      lost: { count: 0, customers: [] },
    };

    segmentedCustomers.forEach((c) => {
      segments[c.segment].count++;
      segments[c.segment].customers.push(c);
    });

    return {
      total_customers: customers.length,
      segments,
    };
  }

  async getCustomerSegment(customerId: string, tenantId: string) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const data = await this.orderRepo
      .createQueryBuilder('order')
      .select('MAX(order.created_at)', 'last_order_at')
      .addSelect('COUNT(CASE WHEN order.created_at >= :ninetyDaysAgo THEN 1 END)', 'frequency')
      .addSelect('COALESCE(SUM(CASE WHEN order.created_at >= :ninetyDaysAgo THEN order.total ELSE 0 END), 0)', 'monetary')
      .addSelect('MIN(order.created_at)', 'first_order_at')
      .where('order.customer_id = :customerId', { customerId })
      .andWhere('order.tenant_id = :tenantId', { tenantId })
      .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
      .setParameter('ninetyDaysAgo', ninetyDaysAgo)
      .getRawOne();

    // Get avg monetary for tenant
    const avgData = await this.orderRepo
      .createQueryBuilder('order')
      .select('AVG(sub.monetary)', 'avg_monetary')
      .from((qb) => {
        return qb
          .select('SUM(order.total)', 'monetary')
          .from('orders', 'order')
          .where('order.tenant_id = :tenantId', { tenantId })
          .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
          .andWhere('order.created_at >= :ninetyDaysAgo', { ninetyDaysAgo })
          .groupBy('order.customer_id');
      }, 'sub')
      .getRawOne();

    const avgMonetary = parseFloat(avgData?.avg_monetary) || 0;
    const now = new Date();

    const recencyDays = data?.last_order_at
      ? Math.floor((now.getTime() - new Date(data.last_order_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const frequency = parseInt(data?.frequency) || 0;
    const monetary = parseFloat(data?.monetary) || 0;
    const firstOrderAt = data?.first_order_at ? new Date(data.first_order_at) : null;

    return {
      segment: this.classifySegment(recencyDays, frequency, monetary, avgMonetary, firstOrderAt, sixtyDaysAgo),
      recency_days: recencyDays,
      frequency,
      monetary,
    };
  }

  private classifySegment(
    recencyDays: number,
    frequency: number,
    monetary: number,
    avgMonetary: number,
    firstOrderAt: Date | null,
    sixtyDaysAgo: Date,
  ): SegmentType {
    // Champions: R < 14 days, F >= 5, M >= avg*1.5
    if (recencyDays < 14 && frequency >= 5 && monetary >= avgMonetary * 1.5) {
      return 'champions';
    }

    // Loyal: F >= 3
    if (frequency >= 3) {
      return 'loyal';
    }

    // Promising: R < 30, F >= 1, first order in last 60 days
    if (
      recencyDays < 30 &&
      frequency >= 1 &&
      firstOrderAt &&
      firstOrderAt >= sixtyDaysAgo
    ) {
      return 'promising';
    }

    // At Risk: R 30-60 days, F >= 2
    if (recencyDays >= 30 && recencyDays <= 60 && frequency >= 2) {
      return 'at_risk';
    }

    // Lost: R > 60 days (or never ordered = 999)
    if (recencyDays > 60) {
      return 'lost';
    }

    // Default: promising if recent, lost otherwise
    if (recencyDays < 30) {
      return 'promising';
    }

    return 'lost';
  }
}
