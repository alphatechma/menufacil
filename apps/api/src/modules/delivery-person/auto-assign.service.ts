import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from './entities/delivery-person.entity';
import { Order } from '../order/entities/order.entity';
import { OrderStatus } from '@menufacil/shared';

@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);

  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepo: Repository<DeliveryPerson>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  /**
   * Auto-assign the best available delivery person to an order.
   * Picks active person with fewest current active deliveries.
   */
  async autoAssign(orderId: string, tenantId: string): Promise<DeliveryPerson | null> {
    // Get all active delivery persons for this tenant
    const activePeople = await this.deliveryPersonRepo.find({
      where: { tenant_id: tenantId, is_active: true },
    });

    if (!activePeople.length) {
      this.logger.warn(`No active delivery persons for tenant ${tenantId}`);
      return null;
    }

    // Count active deliveries per person (orders with status 'out_for_delivery')
    const counts = await Promise.all(
      activePeople.map(async (person) => {
        const activeCount = await this.orderRepo.count({
          where: {
            tenant_id: tenantId,
            delivery_person_id: person.id,
            status: OrderStatus.OUT_FOR_DELIVERY,
          },
        });
        return { person, activeCount };
      }),
    );

    // Sort by fewest active deliveries, then random for ties
    counts.sort((a, b) => {
      if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
      return Math.random() - 0.5;
    });

    const best = counts[0].person;

    // Assign to order
    await this.orderRepo.update(
      { id: orderId, tenant_id: tenantId },
      { delivery_person_id: best.id },
    );

    return best;
  }

  /**
   * Get delivery scoreboard with performance stats for each delivery person.
   */
  async getDeliveryScoreboard(
    tenantId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any[]> {
    const people = await this.deliveryPersonRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });

    if (!people.length) return [];

    const sinceDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const untilDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : new Date();

    const scoreboard = await Promise.all(
      people.map(async (person) => {
        // Get all orders assigned to this person in the date range
        const orders = await this.orderRepo
          .createQueryBuilder('o')
          .where('o.tenant_id = :tenantId', { tenantId })
          .andWhere('o.delivery_person_id = :personId', { personId: person.id })
          .andWhere('o.created_at >= :since', { since: sinceDate })
          .andWhere('o.created_at <= :until', { until: untilDate })
          .getMany();

        const totalAssigned = orders.length;
        const delivered = orders.filter((o) => o.status === OrderStatus.DELIVERED);
        const totalDelivered = delivered.length;
        const completionRate = totalAssigned > 0 ? (totalDelivered / totalAssigned) * 100 : 0;

        // Average delivery time (out_for_delivery_at -> delivered_at)
        const deliveryTimes = delivered
          .filter((o) => o.out_for_delivery_at && o.delivered_at)
          .map((o) => {
            const start = new Date(o.out_for_delivery_at).getTime();
            const end = new Date(o.delivered_at).getTime();
            return (end - start) / 60000; // minutes
          })
          .filter((t) => t > 0 && t < 300); // filter outliers over 5 hours

        const avgDeliveryTime = deliveryTimes.length > 0
          ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
          : 0;

        // Calculate commission earned
        let totalCommission = 0;
        for (const order of delivered) {
          if (person.commission_type === 'fixed') {
            totalCommission += Number(person.commission_value);
          } else if (person.commission_type === 'percent') {
            totalCommission += (Number(order.total) * Number(person.commission_value)) / 100;
          }
          if (person.receives_delivery_fee) {
            totalCommission += Number(order.delivery_fee || 0);
          }
        }

        // Score: weighted completion rate (60%) and inverse of avg time (40%)
        const timeScore = avgDeliveryTime > 0 ? Math.max(0, 100 - avgDeliveryTime) : 50;
        const score = Math.round(completionRate * 0.6 + timeScore * 0.4);

        return {
          id: person.id,
          name: person.name,
          phone: person.phone,
          vehicle: person.vehicle,
          is_active: person.is_active,
          total_deliveries: totalDelivered,
          total_assigned: totalAssigned,
          avg_delivery_time: avgDeliveryTime,
          completion_rate: Math.round(completionRate * 100) / 100,
          total_commission: Math.round(totalCommission * 100) / 100,
          score,
        };
      }),
    );

    return scoreboard.sort((a, b) => b.score - a.score);
  }
}
