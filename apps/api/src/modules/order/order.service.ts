import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { OrderStatus, OrderType, PaymentStatus, ORDER_STATUS_TRANSITIONS, RewardType } from '@menufacil/shared';
import { BulkOrderStatusDto, BulkOrderActionType } from './dto/bulk-order-status.dto';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { CashRegister } from './entities/cash-register.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariation } from '../product/entities/product-variation.entity';
import { CustomerAddress } from '../customer/entities/customer-address.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { DeliveryZoneService } from '../delivery-zone/delivery-zone.service';
import { CouponService } from '../coupon/coupon.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReferralService } from '../referral/referral.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { WhatsappMessageService } from '../whatsapp/services/whatsapp-message.service';
import { InventoryService } from '../inventory/inventory.service';
import { AutoAssignService } from '../delivery-person/auto-assign.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariation)
    private readonly variationRepo: Repository<ProductVariation>,
    @InjectRepository(CustomerAddress)
    private readonly customerAddressRepo: Repository<CustomerAddress>,
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepo: Repository<CashRegister>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly deliveryZoneService: DeliveryZoneService,
    private readonly couponService: CouponService,
    private readonly loyaltyService: LoyaltyService,
    private readonly referralService: ReferralService,
    private readonly eventsGateway: EventsGateway,
    private readonly whatsappMessageService: WhatsappMessageService,
    private readonly inventoryService: InventoryService,
    private readonly autoAssignService: AutoAssignService,
  ) {}

  async create(dto: CreateOrderDto, customerId: string, tenantId: string, unitId?: string | null): Promise<Order> {
    const orderNumber = await this.orderRepository.getNextOrderNumber(tenantId);

    // Resolve products from DB
    const productIds = dto.items.map((i) => i.product_id);
    const products = await this.productRepo.find({
      where: { id: In(productIds), tenant_id: tenantId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Resolve variations if any (support both single variation_id and multiple variation_ids)
    const allVariationIds = new Set<string>();
    for (const item of dto.items) {
      if (item.variation_ids && item.variation_ids.length > 0) {
        item.variation_ids.forEach((id) => allVariationIds.add(id));
      } else if (item.variation_id) {
        allVariationIds.add(item.variation_id);
      }
    }
    let variationMap = new Map<string, ProductVariation>();
    if (allVariationIds.size > 0) {
      const variations = await this.variationRepo.find({
        where: { id: In([...allVariationIds]) },
      });
      variationMap = new Map(variations.map((v) => [v.id, v]));
    }

    // Resolve address: either from inline dto.address or from saved address_id
    let resolvedAddress = dto.address
      ? { ...dto.address }
      : null;

    if (!resolvedAddress && dto.address_id) {
      const savedAddress = await this.customerAddressRepo.findOne({
        where: { id: dto.address_id, customer_id: customerId },
      });
      if (savedAddress) {
        resolvedAddress = {
          label: savedAddress.label,
          street: savedAddress.street,
          number: savedAddress.number,
          complement: savedAddress.complement,
          neighborhood: savedAddress.neighborhood,
          city: savedAddress.city,
          state: savedAddress.state,
          zip_code: savedAddress.zipcode,
        };
      }
    }

    const orderType = dto.order_type || OrderType.DELIVERY;

    // For dine_in orders from staff (waiter), customer_id may not be a valid customer
    // Set to null — the order is tied to the table_session instead
    if (orderType === OrderType.DINE_IN) {
      customerId = null as any;
    }

    // Skip address/delivery fee for pickup and dine-in
    if (orderType !== OrderType.DELIVERY) {
      resolvedAddress = null;
    }

    // Calculate delivery fee from neighborhood
    let deliveryFee = 0;
    if (orderType === OrderType.DELIVERY && resolvedAddress?.neighborhood) {
      const result = await this.deliveryZoneService.findByNeighborhood(resolvedAddress.neighborhood, tenantId);
      if (result.zone) {
        deliveryFee = result.fee;
      }
    }

    // Build items with resolved data
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new BadRequestException(`Produto nao encontrado: ${item.product_id}`);
      }

      // Resolve variations - prefer variation_ids array over single variation_id
      const varIds = (item.variation_ids && item.variation_ids.length > 0)
        ? item.variation_ids
        : (item.variation_id ? [item.variation_id] : []);

      let unitPrice: number;
      let variationName: string | null;

      if (varIds.length > 0) {
        const resolvedVariations = varIds
          .map((vid) => variationMap.get(vid))
          .filter(Boolean) as ProductVariation[];
        if (resolvedVariations.length > 0) {
          const hasQuantities = item.variation_quantities && Object.keys(item.variation_quantities).length > 0;
          if (hasQuantities) {
            // Multi-select (pizza rule): use base_price or highest variation if more expensive
            const totalParts = Object.values(item.variation_quantities!).reduce((a, b) => a + b, 0);
            const basePrice = Number(product.base_price);
            let maxVarPrice = 0;
            const nameParts: string[] = [];
            for (const v of resolvedVariations) {
              const qty = item.variation_quantities![v.id] || 1;
              const p = Number(v.price);
              if (p > maxVarPrice) maxVarPrice = p;
              nameParts.push(`${qty}/${totalParts} ${v.name}`);
            }
            unitPrice = Math.max(basePrice, maxVarPrice);
            variationName = nameParts.join(' / ');
          } else {
            // Multiple variations without quantities: use base_price or highest variation
            unitPrice = Math.max(Number(product.base_price), ...resolvedVariations.map((v) => Number(v.price)));
            variationName = resolvedVariations.map((v) => v.name).join(' / ');
          }
        } else {
          unitPrice = Number(product.base_price);
          variationName = null;
        }
      } else {
        unitPrice = Number(product.base_price);
        variationName = null;
      }

      return {
        product_id: item.product_id,
        variation_id: varIds[0] || item.variation_id || null,
        product_name: product.name,
        variation_name: variationName,
        unit_price: unitPrice,
        quantity: item.quantity,
        notes: item.notes || null,
        extras: item.extras?.map((e) => ({
          extra_name: e.name,
          extra_price: e.price,
        })) || [],
      };
    });

    const subtotal = orderItems.reduce((sum, item) => {
      const extrasTotal = item.extras.reduce((s, e) => s + Number(e.extra_price), 0);
      return sum + (item.unit_price + extrasTotal) * item.quantity;
    }, 0);

    // Validate and apply coupon if provided (regular coupon or loyalty redemption)
    let discount = 0;
    let couponCode: string | undefined;
    if (dto.coupon_code) {
      const code = dto.coupon_code.toUpperCase();

      // First try loyalty redemption coupon
      const loyaltyResult = await this.loyaltyService.validateRedemptionCoupon(code, tenantId);

      if (loyaltyResult.valid && loyaltyResult.redemption) {
        const reward = loyaltyResult.redemption.reward;
        if (reward.reward_type === RewardType.DISCOUNT_PERCENT) {
          discount = (subtotal * Number(reward.reward_value)) / 100;
        } else if (reward.reward_type === RewardType.DISCOUNT_FIXED || reward.reward_type === RewardType.FREE_PRODUCT) {
          discount = Number(reward.reward_value);
        }
        discount = Math.min(discount, subtotal);
        couponCode = code;
        await this.loyaltyService.markRedemptionUsed(code, tenantId);
      } else {
        // Fallback to regular coupon
        const couponResult = await this.couponService.validate(code, subtotal, tenantId);
        discount = couponResult.discount;
        couponCode = code;
        await this.couponService.use(couponResult.coupon.id);
      }
    }

    const total = subtotal + deliveryFee - discount;

    const order = this.orderRepository.create({
      tenant_id: tenantId,
      customer_id: customerId,
      unit_id: unitId || undefined,
      order_number: orderNumber,
      status: OrderStatus.PENDING,
      payment_method: dto.payment_method,
      payment_status: PaymentStatus.PENDING,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total,
      order_type: orderType,
      table_id: dto.table_id || undefined,
      table_session_id: dto.table_session_id || undefined,
      customer_name: dto.customer_name || undefined,
      address_snapshot: resolvedAddress as any,
      change_for: dto.change_for || undefined,
      notes: dto.notes,
      items: orderItems as any,
    });

    const savedOrder = await this.orderRepository.save(order);
    const fullOrder = await this.findById(savedOrder.id, tenantId);

    // Emit WebSocket event for new order
    this.eventsGateway.emitNewOrder(tenantId, fullOrder);

    return fullOrder;
  }

  async createFromAdmin(dto: CreateOrderDto, tenantId: string, unitId?: string | null): Promise<Order> {
    const customerId = dto.customer_id || null;
    const order = await this.create(dto, customerId as any, tenantId, unitId);

    // POS orders start as confirmed and paid
    order.status = OrderStatus.CONFIRMED;
    order.confirmed_at = new Date();

    if (dto.is_paid || (dto.payment_splits && dto.payment_splits.length > 0)) {
      order.payment_status = PaymentStatus.PAID;
      if (dto.payment_splits && dto.payment_splits.length > 0) {
        order.payment_method = dto.payment_splits[0].method;
        (order as any).payment_splits = dto.payment_splits;
      }
    }

    await this.orderRepository.save(order);
    return order;
  }

  async findByTenant(tenantId: string, unitId?: string | null): Promise<Order[]> {
    return this.orderRepository.findByTenant(tenantId, unitId);
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<Order[]> {
    return this.orderRepository.findByCustomer(customerId, tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findById(id, tenantId);
    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }
    return order;
  }

  async deleteOrder(id: string, tenantId: string): Promise<void> {
    const order = await this.orderRepository.findById(id, tenantId);
    if (!order) throw new NotFoundException('Pedido nao encontrado');

    // Delete in correct order: extras → items → payment_transactions → notifications → order
    if (order.items?.length) {
      for (const item of order.items) {
        if (item.extras?.length) {
          await this.orderRepo.query('DELETE FROM order_item_extras WHERE order_item_id = $1', [item.id]);
        }
      }
      await this.orderRepo.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    }
    await this.orderRepo.query('DELETE FROM payment_transactions WHERE order_id = $1', [id]);
    await this.orderRepo.query('DELETE FROM notifications WHERE order_id = $1', [id]);
    await this.orderRepo.query('DELETE FROM orders WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  }

  async cancelByCustomer(orderId: string, customerId: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId, tenantId);
    if (!order) throw new NotFoundException('Pedido nao encontrado');

    // Only the order's customer can cancel
    if (order.customer_id !== customerId) {
      throw new BadRequestException('Voce nao pode cancelar este pedido.');
    }

    // Only pending orders can be cancelled
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Este pedido ja foi confirmado e nao pode ser cancelado.');
    }

    // Check time limit from tenant settings
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const timeLimit = tenant?.cancel_time_limit ?? 5; // default 5 minutes
    const minutesSinceCreated = (Date.now() - new Date(order.created_at).getTime()) / 60000;

    if (minutesSinceCreated > timeLimit) {
      throw new BadRequestException(`O prazo de ${timeLimit} minutos para cancelamento ja expirou.`);
    }

    return this.updateStatus(orderId, OrderStatus.CANCELLED, tenantId);
  }

  async updateStatus(id: string, status: OrderStatus, tenantId: string, deliveryPersonId?: string): Promise<Order> {
    const order = await this.findById(id, tenantId);

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Nao e possivel alterar o status de "${order.status}" para "${status}"`,
      );
    }

    const now = new Date();
    const timestampMap: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.CONFIRMED]: 'confirmed_at',
      [OrderStatus.PREPARING]: 'preparing_at',
      [OrderStatus.READY]: 'ready_at',
      [OrderStatus.OUT_FOR_DELIVERY]: 'out_for_delivery_at',
      [OrderStatus.DELIVERED]: 'delivered_at',
      [OrderStatus.PICKED_UP]: 'picked_up_at',
      [OrderStatus.SERVED]: 'served_at',
      [OrderStatus.CANCELLED]: 'cancelled_at',
    };

    const tsField = timestampMap[status];
    const updateData: any = { status };
    if (tsField) {
      updateData[tsField] = now;
    }
    if (deliveryPersonId) {
      updateData.delivery_person_id = deliveryPersonId;
    }

    await this.orderRepository.updateStatus(id, tenantId, updateData);

    // Auto-deduct stock when order is confirmed
    if (status === OrderStatus.CONFIRMED) {
      this.inventoryService
        .autoDeductStock(id, tenantId)
        .catch((err) => this.logger.warn(`Auto-deduct stock failed: ${err.message}`));
    }

    // Auto-assign delivery person when order is ready and is delivery type with no person assigned
    if (status === OrderStatus.READY && order.order_type === OrderType.DELIVERY && !order.delivery_person_id) {
      try {
        const assigned = await this.autoAssignService.autoAssign(id, tenantId);
        if (assigned) {
          this.logger.log(`Auto-assigned delivery person ${assigned.name} to order ${order.order_number}`);
        }
      } catch (err) {
        this.logger.warn(`Auto-assign delivery failed: ${(err as Error).message}`);
      }
    }

    // Award loyalty points when order is delivered (1 point per R$1)
    if (status === OrderStatus.DELIVERED) {
      const points = Math.floor(Number(order.total));
      if (points > 0) {
        await this.loyaltyService.addPoints(order.customer_id, points, tenantId);
      }

      // Award referral points on first delivered order
      try {
        await this.referralService.awardReferralPoints(order.customer_id, tenantId);
      } catch (err) {
        this.logger.warn(`Referral award failed: ${(err as Error).message}`);
      }
    }

    const updatedOrder = await this.findById(id, tenantId);

    // Emit WebSocket event for status update
    this.eventsGateway.emitOrderStatusUpdate(tenantId, id, updatedOrder);

    // Send WhatsApp notification (fire-and-forget)
    this.whatsappMessageService
      .sendOrderNotification(updatedOrder)
      .catch((err) => this.logger.warn(`WhatsApp notification failed: ${err.message}`));

    return updatedOrder;
  }

  async getPerformanceStats(tenantId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const completedOrders = await this.orderRepository.getCompletedOrders(tenantId, since);

    const calcDiffMin = (start: Date | null, end: Date | null): number | null => {
      if (!start || !end) return null;
      const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
      return diff >= 0 ? diff : null;
    };

    const timings = completedOrders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      created_at: o.created_at,
      total_time: calcDiffMin(o.created_at, o.delivered_at),
      wait_time: calcDiffMin(o.created_at, o.confirmed_at),
      prep_time: calcDiffMin(o.preparing_at, o.ready_at),
      delivery_time: calcDiffMin(o.out_for_delivery_at, o.delivered_at),
    }));

    const validTotals = timings.filter((t) => t.total_time !== null).map((t) => t.total_time!);
    const validPrep = timings.filter((t) => t.prep_time !== null).map((t) => t.prep_time!);
    const validDelivery = timings.filter((t) => t.delivery_time !== null).map((t) => t.delivery_time!);
    const validWait = timings.filter((t) => t.wait_time !== null).map((t) => t.wait_time!);

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const fastest = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
    const slowest = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

    // Ranking: top 10 fastest and slowest
    const sorted = [...timings].filter((t) => t.total_time !== null).sort((a, b) => a.total_time! - b.total_time!);

    return {
      period_days: days,
      total_completed: completedOrders.length,
      avg_total_time: avg(validTotals),
      avg_wait_time: avg(validWait),
      avg_prep_time: avg(validPrep),
      avg_delivery_time: avg(validDelivery),
      fastest_order: fastest(validTotals),
      slowest_order: slowest(validTotals),
      ranking_fastest: sorted.slice(0, 10).map((t) => ({
        order_number: t.order_number,
        total_time: t.total_time,
        created_at: t.created_at,
      })),
      ranking_slowest: sorted.slice(-10).reverse().map((t) => ({
        order_number: t.order_number,
        total_time: t.total_time,
        created_at: t.created_at,
      })),
    };
  }

  async getAdvancedStats(tenantId: string, dateFrom: string, dateTo: string) {
    const sinceDate = new Date(`${dateFrom}T00:00:00`);
    const untilDate = new Date(`${dateTo}T23:59:59.999`);

    // Calculate previous period of same length for comparison
    const periodMs = untilDate.getTime() - sinceDate.getTime();
    const prevUntil = new Date(sinceDate.getTime() - 1);
    const prevSince = new Date(prevUntil.getTime() - periodMs);

    // Current period totals
    const currentTotals = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)::int', 'total_orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric", 'revenue')
      .addSelect("COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::int", 'cancelled_orders')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :since', { since: sinceDate })
      .andWhere('o.created_at <= :until', { until: untilDate })
      .getRawOne();

    // Previous period totals
    const prevTotals = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)::int', 'total_orders')
      .addSelect("COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric", 'revenue')
      .addSelect("COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::int", 'cancelled_orders')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.created_at >= :since', { since: prevSince })
      .andWhere('o.created_at <= :until', { until: prevUntil })
      .getRawOne();

    const revenue = Number(currentTotals.revenue) || 0;
    const orderCount = Number(currentTotals.total_orders) || 0;
    const cancelledOrders = Number(currentTotals.cancelled_orders) || 0;
    const validOrders = orderCount - cancelledOrders;
    const avgTicket = validOrders > 0 ? revenue / validOrders : 0;
    const cancelRate = orderCount > 0 ? (cancelledOrders / orderCount) * 100 : 0;

    const prevRevenue = Number(prevTotals.revenue) || 0;
    const prevOrderCount = Number(prevTotals.total_orders) || 0;
    const prevCancelled = Number(prevTotals.cancelled_orders) || 0;
    const prevValidOrders = prevOrderCount - prevCancelled;
    const prevAvgTicket = prevValidOrders > 0 ? prevRevenue / prevValidOrders : 0;
    const prevCancelRate = prevOrderCount > 0 ? (prevCancelled / prevOrderCount) * 100 : 0;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    // Top 5 products
    const topProducts = await this.orderRepo
      .query(
        `SELECT oi.product_name as name, SUM(oi.quantity)::int as count,
                COALESCE(SUM(oi.unit_price * oi.quantity), 0)::numeric as revenue
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.tenant_id = $1 AND o.status != 'cancelled'
           AND o.created_at >= $2 AND o.created_at <= $3
         GROUP BY oi.product_name
         ORDER BY count DESC
         LIMIT 5`,
        [tenantId, sinceDate, untilDate],
      );

    // Orders by hour (0-23)
    const ordersByHourRaw = await this.orderRepo
      .query(
        `SELECT EXTRACT(HOUR FROM o.created_at)::int as hour, COUNT(*)::int as count
         FROM orders o
         WHERE o.tenant_id = $1 AND o.status != 'cancelled'
           AND o.created_at >= $2 AND o.created_at <= $3
         GROUP BY hour
         ORDER BY hour`,
        [tenantId, sinceDate, untilDate],
      );

    const hourMap = new Map(ordersByHourRaw.map((r: any) => [r.hour, r.count]));
    const ordersByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Number(hourMap.get(i) || 0),
    }));

    // Orders per day (for trend chart)
    const ordersPerDay = await this.orderRepo
      .query(
        `SELECT DATE(o.created_at) as date,
                COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END)::int as count,
                COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::numeric as revenue
         FROM orders o
         WHERE o.tenant_id = $1
           AND o.created_at >= $2 AND o.created_at <= $3
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`,
        [tenantId, sinceDate, untilDate],
      );

    return {
      revenue,
      orderCount: validOrders,
      avgTicket: Math.round(avgTicket * 100) / 100,
      cancelRate: Math.round(cancelRate * 100) / 100,
      revenueComparison: Math.round(pctChange(revenue, prevRevenue) * 100) / 100,
      orderCountComparison: Math.round(pctChange(validOrders, prevValidOrders) * 100) / 100,
      avgTicketComparison: Math.round(pctChange(avgTicket, prevAvgTicket) * 100) / 100,
      cancelRateComparison: Math.round(pctChange(cancelRate, prevCancelRate) * 100) / 100,
      topProducts: topProducts.map((p: any) => ({
        name: p.name,
        count: Number(p.count),
        revenue: Number(p.revenue),
      })),
      ordersByHour,
      ordersPerDay: ordersPerDay.map((d: any) => ({
        date: d.date,
        count: Number(d.count),
        revenue: Number(d.revenue),
      })),
    };
  }

  async assignDeliveryPerson(orderId: string, deliveryPersonId: string | null, tenantId: string): Promise<Order> {
    await this.findById(orderId, tenantId);
    await this.orderRepository.updateStatus(orderId, tenantId, { delivery_person_id: deliveryPersonId } as any);
    return this.findById(orderId, tenantId);
  }

  async getDashboard(
    tenantId: string,
    since: string,
    until: string,
    filters: { status?: string; payment_method?: string; delivery_person_id?: string } = {},
  ) {
    // Use date strings with explicit time to avoid timezone conversion issues
    // "since" starts at 00:00:00 local time, "until" ends at 23:59:59 local time
    const sinceDate = new Date(`${since}T00:00:00`);
    const untilDate = new Date(`${until}T23:59:59.999`);
    return this.orderRepository.getDashboardData(tenantId, sinceDate, untilDate, filters);
  }

  async bulkStatusUpdate(tenantId: string, dto: BulkOrderStatusDto): Promise<{ affected: number; errors: string[] }> {
    if (!dto.ids.length) {
      throw new BadRequestException('Nenhum ID de pedido informado');
    }

    const errors: string[] = [];
    let affected = 0;

    for (const id of dto.ids) {
      try {
        if (dto.action === BulkOrderActionType.CANCEL) {
          await this.updateStatus(id, OrderStatus.CANCELLED, tenantId);
        } else if (dto.action === BulkOrderActionType.UPDATE_STATUS && dto.status) {
          await this.updateStatus(id, dto.status as OrderStatus, tenantId);
        }
        affected++;
      } catch (err: any) {
        errors.push(`Order ${id}: ${err?.message || 'Unknown error'}`);
      }
    }

    return { affected, errors };
  }

  // ── Cash Register ──

  async getOpenCashRegister(tenantId: string): Promise<CashRegister | null> {
    return this.cashRegisterRepo.findOne({
      where: { tenant_id: tenantId, is_open: true },
      relations: ['opened_by_user'],
    });
  }

  async getCashRegisterHistory(tenantId: string, limit: number): Promise<CashRegister[]> {
    return this.cashRegisterRepo.find({
      where: { tenant_id: tenantId, is_open: false },
      relations: ['opened_by_user', 'closed_by_user'],
      order: { closed_at: 'DESC' },
      take: limit,
    });
  }

  async openCashRegister(tenantId: string, userId: string, openingBalance: number): Promise<CashRegister> {
    const existing = await this.cashRegisterRepo.findOne({ where: { tenant_id: tenantId, is_open: true } });
    if (existing) {
      throw new BadRequestException('Ja existe um caixa aberto. Feche-o antes de abrir outro.');
    }

    const register = this.cashRegisterRepo.create({
      tenant_id: tenantId,
      opened_by: userId,
      opening_balance: openingBalance,
      is_open: true,
    });
    return this.cashRegisterRepo.save(register);
  }

  async closeCashRegister(tenantId: string, userId: string, closingBalance: number, notes?: string): Promise<CashRegister> {
    const register = await this.cashRegisterRepo.findOne({ where: { tenant_id: tenantId, is_open: true } });
    if (!register) {
      throw new BadRequestException('Nenhum caixa aberto para fechar.');
    }

    // Sum totals from paid orders created during this register session
    const sessionOrders = await this.orderRepo.find({
      where: {
        tenant_id: tenantId,
        payment_status: PaymentStatus.PAID,
        created_at: MoreThanOrEqual(register.opened_at),
      },
    });

    let totalCash = 0, totalCredit = 0, totalDebit = 0, totalPix = 0;
    for (const o of sessionOrders) {
      const amount = Number(o.total);
      switch (o.payment_method) {
        case 'cash': totalCash += amount; break;
        case 'credit_card': totalCredit += amount; break;
        case 'debit_card': totalDebit += amount; break;
        case 'pix': totalPix += amount; break;
      }
    }

    register.closed_by = userId;
    register.closing_balance = closingBalance;
    register.closing_notes = notes || '';
    register.total_cash = totalCash;
    register.total_credit = totalCredit;
    register.total_debit = totalDebit;
    register.total_pix = totalPix;
    register.orders_count = sessionOrders.length;
    register.closed_at = new Date();
    register.is_open = false;

    return this.cashRegisterRepo.save(register);
  }
}
