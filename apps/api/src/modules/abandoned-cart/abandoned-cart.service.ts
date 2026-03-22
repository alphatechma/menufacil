import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { AbandonedCart } from './abandoned-cart.entity';

@Injectable()
export class AbandonedCartService {
  constructor(
    @InjectRepository(AbandonedCart)
    private readonly repo: Repository<AbandonedCart>,
  ) {}

  async saveCart(
    customerId: string,
    tenantId: string,
    items: any[],
    total: number,
  ) {
    // Upsert: find existing non-recovered cart for this customer
    let cart = await this.repo.findOne({
      where: {
        customer_id: customerId,
        tenant_id: tenantId,
        recovered: false,
      },
    });

    if (cart) {
      cart.items = items;
      cart.total = total;
      cart.created_at = new Date(); // Reset timer
    } else {
      cart = this.repo.create({
        customer_id: customerId,
        tenant_id: tenantId,
        items,
        total,
      });
    }

    return this.repo.save(cart);
  }

  async markRecovered(customerId: string, tenantId: string) {
    const cart = await this.repo.findOne({
      where: {
        customer_id: customerId,
        tenant_id: tenantId,
        recovered: false,
      },
    });

    if (cart) {
      cart.recovered = true;
      cart.recovered_at = new Date();
      return this.repo.save(cart);
    }

    return null;
  }

  async getAbandonedCarts(tenantId: string) {
    // Carts not recovered, older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const carts = await this.repo.find({
      where: {
        tenant_id: tenantId,
        recovered: false,
        created_at: LessThan(thirtyMinutesAgo),
      },
      relations: ['customer'],
      order: { created_at: 'DESC' },
    });

    return carts.map((c) => ({
      id: c.id,
      customer_name: c.customer?.name || 'Cliente',
      customer_phone: c.customer?.phone || '',
      items: c.items,
      total: c.total,
      created_at: c.created_at,
      notification_sent: c.notification_sent,
      items_summary: Array.isArray(c.items)
        ? c.items
            .slice(0, 3)
            .map((i: any) => i.product_name)
            .join(', ') + (c.items.length > 3 ? ` +${c.items.length - 3}` : '')
        : '',
    }));
  }

  async getStats(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const allCarts = await this.repo.find({
      where: {
        tenant_id: tenantId,
        created_at: MoreThan(thirtyDaysAgo),
      },
    });

    const totalAbandoned = allCarts.filter((c) => !c.recovered).length;
    const totalRecovered = allCarts.filter((c) => c.recovered).length;
    const totalAll = allCarts.length;
    const recoveryRate = totalAll > 0
      ? Math.round((totalRecovered / totalAll) * 100)
      : 0;
    const lostRevenue = allCarts
      .filter((c) => !c.recovered)
      .reduce((sum, c) => sum + Number(c.total), 0);

    return {
      total_abandoned: totalAbandoned,
      total_recovered: totalRecovered,
      recovery_rate: recoveryRate,
      lost_revenue: Math.round(lostRevenue * 100) / 100,
    };
  }

  async getRecoverableCart(customerId: string, tenantId: string) {
    const cart = await this.repo.findOne({
      where: {
        customer_id: customerId,
        tenant_id: tenantId,
        recovered: false,
      },
      order: { created_at: 'DESC' },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return null;
    }

    return {
      id: cart.id,
      items: cart.items,
      total: cart.total,
      created_at: cart.created_at,
    };
  }
}
