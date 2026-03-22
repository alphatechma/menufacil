import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { Customer } from '../customer/entities/customer.entity';
import { Product } from '../product/entities/product.entity';
import { DeliveryPerson } from '../delivery-person/entities/delivery-person.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { ProductRecipe } from '../inventory/entities/product-recipe.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepo: Repository<DeliveryPerson>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepo: Repository<InventoryItem>,
    @InjectRepository(ProductRecipe)
    private readonly productRecipeRepo: Repository<ProductRecipe>,
  ) {}

  async getOverview(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    // Calculate the same-length previous period
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs);
    const prevTo = new Date(fromDate.getTime());

    // Current period stats
    const currentStats = await this.getPeriodStats(tenantId, fromDate, toDate);
    const previousStats = await this.getPeriodStats(tenantId, prevFrom, prevTo);

    // Revenue by day
    const revenueByDay = await this.orderRepo
      .createQueryBuilder('o')
      .select("DATE(o.created_at AT TIME ZONE 'UTC')", 'date')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .groupBy("DATE(o.created_at AT TIME ZONE 'UTC')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Orders by status
    const ordersByStatusRaw = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .groupBy('o.status')
      .getRawMany();

    const ordersByStatus: Record<string, number> = {};
    ordersByStatusRaw.forEach((r) => {
      ordersByStatus[r.status] = parseInt(r.count);
    });

    // Orders by payment method
    const ordersByPaymentRaw = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.payment_method', 'payment_method')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.payment_method IS NOT NULL')
      .groupBy('o.payment_method')
      .getRawMany();

    const ordersByPayment: Record<string, number> = {};
    ordersByPaymentRaw.forEach((r) => {
      ordersByPayment[r.payment_method] = parseInt(r.count);
    });

    // New customers in period
    const newCustomersCurrent = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.created_at >= :from', { from: fromDate })
      .andWhere('c.created_at <= :to', { to: toDate })
      .getCount();

    const newCustomersPrevious = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.created_at >= :from', { from: prevFrom })
      .andWhere('c.created_at <= :to', { to: prevTo })
      .getCount();

    // Returning customers (placed > 1 order before this period and ordered in this period)
    const returningCustomersCurrent = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(DISTINCT o.customer_id)', 'count')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.customer_id IS NOT NULL')
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('o2.customer_id')
          .from('orders', 'o2')
          .where('o2.tenant_id = :tenantId')
          .andWhere('o2.created_at < :from')
          .andWhere("o2.status != 'cancelled'")
          .getQuery();
        return 'o.customer_id IN ' + subQuery;
      })
      .getRawOne();

    const returningCustomersPrevious = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(DISTINCT o.customer_id)', 'count')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: prevFrom })
      .andWhere('o.created_at <= :to', { to: prevTo })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.customer_id IS NOT NULL')
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('o2.customer_id')
          .from('orders', 'o2')
          .where('o2.tenant_id = :tenantId')
          .andWhere('o2.created_at < :prevFrom', { prevFrom })
          .andWhere("o2.status != 'cancelled'")
          .getQuery();
        return 'o.customer_id IN ' + subQuery;
      })
      .getRawOne();

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    return {
      revenue: {
        current: parseFloat(currentStats.revenue) || 0,
        previous: parseFloat(previousStats.revenue) || 0,
        change: calcChange(parseFloat(currentStats.revenue) || 0, parseFloat(previousStats.revenue) || 0),
      },
      orderCount: {
        current: parseInt(currentStats.orderCount) || 0,
        previous: parseInt(previousStats.orderCount) || 0,
        change: calcChange(parseInt(currentStats.orderCount) || 0, parseInt(previousStats.orderCount) || 0),
      },
      avgTicket: {
        current: parseFloat(currentStats.avgTicket) || 0,
        previous: parseFloat(previousStats.avgTicket) || 0,
        change: calcChange(parseFloat(currentStats.avgTicket) || 0, parseFloat(previousStats.avgTicket) || 0),
      },
      cancelRate: {
        current: parseFloat(currentStats.cancelRate) || 0,
        previous: parseFloat(previousStats.cancelRate) || 0,
        change: calcChange(parseFloat(currentStats.cancelRate) || 0, parseFloat(previousStats.cancelRate) || 0),
      },
      newCustomers: {
        current: newCustomersCurrent,
        previous: newCustomersPrevious,
        change: calcChange(newCustomersCurrent, newCustomersPrevious),
      },
      returningCustomers: {
        current: parseInt(returningCustomersCurrent?.count) || 0,
        previous: parseInt(returningCustomersPrevious?.count) || 0,
        change: calcChange(
          parseInt(returningCustomersCurrent?.count) || 0,
          parseInt(returningCustomersPrevious?.count) || 0,
        ),
      },
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        revenue: parseFloat(r.revenue) || 0,
        orders: parseInt(r.orders) || 0,
      })),
      ordersByStatus,
      ordersByPayment,
    };
  }

  private async getPeriodStats(tenantId: string, from: Date, to: Date) {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(CASE WHEN o.status != :cancelled THEN o.total ELSE 0 END), 0)', 'revenue')
      .addSelect('COUNT(CASE WHEN o.status != :cancelled THEN 1 END)', 'orderCount')
      .addSelect(
        'CASE WHEN COUNT(CASE WHEN o.status != :cancelled THEN 1 END) > 0 THEN ' +
          'ROUND(SUM(CASE WHEN o.status != :cancelled THEN o.total ELSE 0 END) / COUNT(CASE WHEN o.status != :cancelled THEN 1 END), 2) ELSE 0 END',
        'avgTicket',
      )
      .addSelect(
        'CASE WHEN COUNT(o.id) > 0 THEN ROUND(COUNT(CASE WHEN o.status = :cancelled THEN 1 END) * 100.0 / COUNT(o.id), 1) ELSE 0 END',
        'cancelRate',
      )
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from })
      .andWhere('o.created_at <= :to', { to })
      .setParameter('cancelled', 'cancelled')
      .getRawOne();

    return result;
  }

  async getProducts(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Top products
    const topProducts = await this.orderItemRepo
      .createQueryBuilder('oi')
      .select('oi.product_id', 'id')
      .addSelect('oi.product_name', 'name')
      .addSelect('SUM(oi.quantity)', 'quantity')
      .addSelect('SUM(oi.quantity * oi.unit_price)', 'revenue')
      .innerJoin('oi.order', 'o')
      .leftJoin('products', 'p', 'p.id = oi.product_id')
      .leftJoin('categories', 'c', 'c.id = p.category_id')
      .addSelect('COALESCE(c.name, \'Sem categoria\')', 'category')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .groupBy('oi.product_id')
      .addGroupBy('oi.product_name')
      .addGroupBy('c.name')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    // Category breakdown
    const categoryBreakdown = await this.orderItemRepo
      .createQueryBuilder('oi')
      .select('COALESCE(c.name, \'Sem categoria\')', 'category')
      .addSelect('SUM(oi.quantity * oi.unit_price)', 'revenue')
      .innerJoin('oi.order', 'o')
      .leftJoin('products', 'p', 'p.id = oi.product_id')
      .leftJoin('categories', 'c', 'c.id = p.category_id')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .groupBy('c.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    const totalRevenue = categoryBreakdown.reduce(
      (sum, c) => sum + (parseFloat(c.revenue) || 0),
      0,
    );

    // Profitability (using product_recipes + inventory_items)
    const profitabilityRaw = await this.orderItemRepo
      .createQueryBuilder('oi')
      .select('oi.product_id', 'id')
      .addSelect('oi.product_name', 'name')
      .addSelect('SUM(oi.quantity * oi.unit_price)', 'revenue')
      .addSelect('SUM(oi.quantity)', 'total_qty')
      .innerJoin('oi.order', 'o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .groupBy('oi.product_id')
      .addGroupBy('oi.product_name')
      .orderBy('revenue', 'DESC')
      .limit(20)
      .getRawMany();

    // Get recipe costs for these products
    const productIds = profitabilityRaw.map((p) => p.id);
    let recipeCostMap: Record<string, number> = {};

    if (productIds.length > 0) {
      const recipeCosts = await this.productRecipeRepo
        .createQueryBuilder('pr')
        .select('pr.product_id', 'product_id')
        .addSelect('SUM(pr.quantity * ii.cost_price)', 'unit_cost')
        .innerJoin('inventory_items', 'ii', 'ii.id = pr.item_id')
        .where('pr.product_id IN (:...productIds)', { productIds })
        .groupBy('pr.product_id')
        .getRawMany();

      recipeCosts.forEach((rc) => {
        recipeCostMap[rc.product_id] = parseFloat(rc.unit_cost) || 0;
      });
    }

    const profitability = profitabilityRaw.map((p) => {
      const revenue = parseFloat(p.revenue) || 0;
      const totalQty = parseInt(p.total_qty) || 1;
      const unitCost = recipeCostMap[p.id] || 0;
      const cost = unitCost * totalQty;
      const margin = revenue - cost;
      const marginPercent = revenue > 0 ? parseFloat(((margin / revenue) * 100).toFixed(1)) : 0;

      return {
        id: p.id,
        name: p.name,
        revenue: parseFloat(revenue.toFixed(2)),
        cost: parseFloat(cost.toFixed(2)),
        margin: parseFloat(margin.toFixed(2)),
        marginPercent,
      };
    });

    return {
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: parseInt(p.quantity) || 0,
        revenue: parseFloat(parseFloat(p.revenue).toFixed(2)) || 0,
        category: p.category,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        revenue: parseFloat(parseFloat(c.revenue).toFixed(2)) || 0,
        percentage:
          totalRevenue > 0
            ? parseFloat((((parseFloat(c.revenue) || 0) / totalRevenue) * 100).toFixed(1))
            : 0,
      })),
      profitability,
    };
  }

  async getCustomers(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Total customers
    const totalCustomers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .getCount();

    // New vs returning by day
    const newVsReturning = await this.orderRepo.query(
      `
      WITH daily_orders AS (
        SELECT
          DATE(o.created_at AT TIME ZONE 'UTC') as date,
          o.customer_id,
          (SELECT MIN(o2.created_at) FROM orders o2
           WHERE o2.customer_id = o.customer_id
           AND o2.tenant_id = $1
           AND o2.status != 'cancelled') as first_order_at
        FROM orders o
        WHERE o.tenant_id = $1
          AND o.created_at >= $2
          AND o.created_at <= $3
          AND o.status != 'cancelled'
          AND o.customer_id IS NOT NULL
      )
      SELECT
        date,
        COUNT(DISTINCT CASE WHEN DATE(first_order_at AT TIME ZONE 'UTC') = date THEN customer_id END) as new,
        COUNT(DISTINCT CASE WHEN DATE(first_order_at AT TIME ZONE 'UTC') < date THEN customer_id END) as returning
      FROM daily_orders
      GROUP BY date
      ORDER BY date ASC
      `,
      [tenantId, fromDate, toDate],
    );

    // Top customers
    const topCustomers = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.customer_id', 'id')
      .addSelect('c.name', 'name')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('SUM(o.total)', 'totalSpent')
      .innerJoin('o.customer', 'c')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.customer_id IS NOT NULL')
      .groupBy('o.customer_id')
      .addGroupBy('c.name')
      .orderBy('"totalSpent"', 'DESC')
      .limit(10)
      .getRawMany();

    // Average order frequency (orders per customer in period)
    const avgFreqResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('AVG(sub.order_count)', 'avg_freq')
      .from((qb) => {
        return qb
          .select('COUNT(o2.id)', 'order_count')
          .from('orders', 'o2')
          .where('o2.tenant_id = :tenantId', { tenantId })
          .andWhere('o2.created_at >= :from', { from: fromDate })
          .andWhere('o2.created_at <= :to', { to: toDate })
          .andWhere("o2.status != 'cancelled'")
          .andWhere('o2.customer_id IS NOT NULL')
          .groupBy('o2.customer_id');
      }, 'sub')
      .getRawOne();

    // RFM Segments (reuse logic from segmentation service)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const orderData = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.customer_id', 'customer_id')
      .addSelect('MAX(o.created_at)', 'last_order_at')
      .addSelect('COUNT(CASE WHEN o.created_at >= :ninetyDaysAgo THEN 1 END)', 'frequency')
      .addSelect('COALESCE(SUM(CASE WHEN o.created_at >= :ninetyDaysAgo THEN o.total ELSE 0 END), 0)', 'monetary')
      .addSelect('MIN(o.created_at)', 'first_order_at')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere("o.status != 'cancelled'")
      .andWhere('o.customer_id IS NOT NULL')
      .setParameter('ninetyDaysAgo', ninetyDaysAgo)
      .groupBy('o.customer_id')
      .getRawMany();

    const monetaryValues = orderData
      .map((d) => parseFloat(d.monetary))
      .filter((v) => v > 0);
    const avgMonetary = monetaryValues.length > 0
      ? monetaryValues.reduce((sum, v) => sum + v, 0) / monetaryValues.length
      : 0;

    const segments = { champions: 0, loyal: 0, at_risk: 0, lost: 0, new: 0 };
    const now = new Date();

    orderData.forEach((data) => {
      const recencyDays = data.last_order_at
        ? Math.floor((now.getTime() - new Date(data.last_order_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const frequency = parseInt(data.frequency) || 0;
      const monetary = parseFloat(data.monetary) || 0;
      const firstOrderAt = data.first_order_at ? new Date(data.first_order_at) : null;

      if (recencyDays < 14 && frequency >= 5 && monetary >= avgMonetary * 1.5) {
        segments.champions++;
      } else if (frequency >= 3) {
        segments.loyal++;
      } else if (recencyDays > 60) {
        segments.lost++;
      } else if (recencyDays >= 30 && frequency >= 2) {
        segments.at_risk++;
      } else if (firstOrderAt && firstOrderAt >= sixtyDaysAgo) {
        segments.new++;
      } else if (recencyDays < 30) {
        segments.new++;
      } else {
        segments.lost++;
      }
    });

    // Add customers without orders as "new" or "lost"
    const customersWithOrders = orderData.length;
    const customersWithoutOrders = totalCustomers - customersWithOrders;
    if (customersWithoutOrders > 0) {
      segments.new += customersWithoutOrders;
    }

    return {
      totalCustomers,
      newVsReturning: newVsReturning.map((r: any) => ({
        date: r.date,
        new: parseInt(r.new) || 0,
        returning: parseInt(r.returning) || 0,
      })),
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        orderCount: parseInt(c.orderCount) || 0,
        totalSpent: parseFloat(parseFloat(c.totalSpent).toFixed(2)) || 0,
      })),
      avgOrderFrequency: parseFloat(parseFloat(avgFreqResult?.avg_freq || '0').toFixed(1)),
      segments,
    };
  }

  async getDelivery(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Delivery persons performance
    const deliveryPersons = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.delivery_person_id', 'id')
      .addSelect('dp.name', 'name')
      .addSelect('COUNT(o.id)', 'deliveries')
      .addSelect(
        "AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.out_for_delivery_at)) / 60)",
        'avgTime',
      )
      .addSelect(
        "ROUND(COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(o.id), 0), 1)",
        'completionRate',
      )
      .addSelect('dp.commission_type', 'commission_type')
      .addSelect('dp.commission_value', 'commission_value')
      .addSelect('dp.receives_delivery_fee', 'receives_delivery_fee')
      .addSelect('SUM(o.total)', 'total_revenue')
      .addSelect('SUM(o.delivery_fee)', 'total_delivery_fee')
      .innerJoin('o.delivery_person', 'dp')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere('o.delivery_person_id IS NOT NULL')
      .groupBy('o.delivery_person_id')
      .addGroupBy('dp.name')
      .addGroupBy('dp.commission_type')
      .addGroupBy('dp.commission_value')
      .addGroupBy('dp.receives_delivery_fee')
      .orderBy('deliveries', 'DESC')
      .getRawMany();

    // Calculate commissions
    const deliveryPersonsFormatted = deliveryPersons.map((dp) => {
      let totalCommission = 0;
      const deliveries = parseInt(dp.deliveries) || 0;
      const totalRevenue = parseFloat(dp.total_revenue) || 0;
      const totalDeliveryFee = parseFloat(dp.total_delivery_fee) || 0;

      if (dp.commission_type === 'fixed') {
        totalCommission = deliveries * (parseFloat(dp.commission_value) || 0);
      } else if (dp.commission_type === 'percent') {
        totalCommission = totalRevenue * ((parseFloat(dp.commission_value) || 0) / 100);
      }

      if (dp.receives_delivery_fee) {
        totalCommission += totalDeliveryFee;
      }

      return {
        id: dp.id,
        name: dp.name,
        deliveries,
        avgTime: dp.avgTime ? parseFloat(parseFloat(dp.avgTime).toFixed(0)) : null,
        completionRate: parseFloat(dp.completionRate) || 0,
        totalCommission: parseFloat(totalCommission.toFixed(2)),
      };
    });

    // Average delivery time across all
    const avgDeliveryTimeResult = await this.orderRepo
      .createQueryBuilder('o')
      .select(
        "AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.out_for_delivery_at)) / 60)",
        'avgTime',
      )
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :from', { from: fromDate })
      .andWhere('o.created_at <= :to', { to: toDate })
      .andWhere("o.status = 'delivered'")
      .andWhere('o.delivered_at IS NOT NULL')
      .andWhere('o.out_for_delivery_at IS NOT NULL')
      .getRawOne();

    // Zone stats (from address_snapshot -> neighborhood / delivery zone)
    const zoneStats = await this.orderRepo.query(
      `
      SELECT
        COALESCE(dz.name, 'Sem zona') as zone,
        COUNT(o.id) as deliveries,
        AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.out_for_delivery_at)) / 60) as "avgTime",
        SUM(o.total) as revenue
      FROM orders o
      LEFT JOIN delivery_zones dz ON dz.tenant_id = o.tenant_id
        AND (
          o.address_snapshot->>'neighborhood' = ANY(
            SELECT jsonb_array_elements_text(dz.neighborhoods)
          )
        )
      WHERE o.tenant_id = $1
        AND o.created_at >= $2
        AND o.created_at <= $3
        AND o.order_type = 'delivery'
        AND o.status != 'cancelled'
      GROUP BY COALESCE(dz.name, 'Sem zona')
      ORDER BY deliveries DESC
      `,
      [tenantId, fromDate, toDate],
    );

    return {
      deliveryPersons: deliveryPersonsFormatted,
      avgDeliveryTime: avgDeliveryTimeResult?.avgTime
        ? parseFloat(parseFloat(avgDeliveryTimeResult.avgTime).toFixed(0))
        : null,
      zoneStats: zoneStats.map((z: any) => ({
        zone: z.zone,
        deliveries: parseInt(z.deliveries) || 0,
        avgTime: z.avgTime ? parseFloat(parseFloat(z.avgTime).toFixed(0)) : null,
        revenue: parseFloat(parseFloat(z.revenue || '0').toFixed(2)),
      })),
    };
  }

  async exportCsv(
    tenantId: string,
    type: string,
    from: string,
    to: string,
  ): Promise<string> {
    const BOM = '\uFEFF';

    switch (type) {
      case 'overview': {
        const data = await this.getOverview(tenantId, from, to);
        let csv = BOM + 'Métrica;Atual;Anterior;Variação (%)\n';
        csv += `Receita;${data.revenue.current};${data.revenue.previous};${data.revenue.change}\n`;
        csv += `Pedidos;${data.orderCount.current};${data.orderCount.previous};${data.orderCount.change}\n`;
        csv += `Ticket Médio;${data.avgTicket.current};${data.avgTicket.previous};${data.avgTicket.change}\n`;
        csv += `Taxa Cancelamento (%);${data.cancelRate.current};${data.cancelRate.previous};${data.cancelRate.change}\n`;
        csv += `Novos Clientes;${data.newCustomers.current};${data.newCustomers.previous};${data.newCustomers.change}\n`;
        csv += `Clientes Recorrentes;${data.returningCustomers.current};${data.returningCustomers.previous};${data.returningCustomers.change}\n`;
        csv += '\nData;Receita;Pedidos\n';
        data.revenueByDay.forEach((r) => {
          csv += `${r.date};${r.revenue};${r.orders}\n`;
        });
        return csv;
      }
      case 'products': {
        const data = await this.getProducts(tenantId, from, to);
        let csv = BOM + 'Produto;Quantidade;Receita;Categoria\n';
        data.topProducts.forEach((p) => {
          csv += `${p.name};${p.quantity};${p.revenue};${p.category}\n`;
        });
        csv += '\nProduto;Receita;Custo;Margem;Margem (%)\n';
        data.profitability.forEach((p) => {
          csv += `${p.name};${p.revenue};${p.cost};${p.margin};${p.marginPercent}\n`;
        });
        return csv;
      }
      case 'customers': {
        const data = await this.getCustomers(tenantId, from, to);
        let csv = BOM + 'Cliente;Pedidos;Total Gasto\n';
        data.topCustomers.forEach((c) => {
          csv += `${c.name};${c.orderCount};${c.totalSpent}\n`;
        });
        csv += `\nTotal Clientes;${data.totalCustomers}\n`;
        csv += `Frequência Média;${data.avgOrderFrequency}\n`;
        csv += `\nSegmento;Quantidade\n`;
        Object.entries(data.segments).forEach(([seg, count]) => {
          csv += `${seg};${count}\n`;
        });
        return csv;
      }
      case 'delivery': {
        const data = await this.getDelivery(tenantId, from, to);
        let csv = BOM + 'Entregador;Entregas;Tempo Médio (min);Taxa Conclusão (%);Comissão Total\n';
        data.deliveryPersons.forEach((dp) => {
          csv += `${dp.name};${dp.deliveries};${dp.avgTime ?? '-'};${dp.completionRate};${dp.totalCommission}\n`;
        });
        csv += `\nTempo Médio Geral;${data.avgDeliveryTime ?? '-'}\n`;
        csv += '\nZona;Entregas;Tempo Médio (min);Receita\n';
        data.zoneStats.forEach((z: any) => {
          csv += `${z.zone};${z.deliveries};${z.avgTime ?? '-'};${z.revenue}\n`;
        });
        return csv;
      }
      default:
        return BOM + 'Tipo inválido\n';
    }
  }
}
