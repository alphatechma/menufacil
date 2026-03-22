import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Promotion, PromotionType, PromotionDiscountType } from './promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { CartItemDto } from './dto/evaluate-cart.dto';

export interface AppliedDiscount {
  promotion_id: string;
  promotion_name: string;
  type: PromotionType;
  discount_amount: number;
  description: string;
}

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
  ) {}

  async create(tenantId: string, dto: CreatePromotionDto): Promise<Promotion> {
    const promo = this.repo.create({ ...dto, tenant_id: tenantId });
    return this.repo.save(promo);
  }

  async findAll(tenantId: string): Promise<Promotion[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findById(tenantId: string, id: string): Promise<Promotion> {
    const promo = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async update(tenantId: string, id: string, dto: UpdatePromotionDto): Promise<Promotion> {
    await this.findById(tenantId, id);
    await this.repo.update({ id, tenant_id: tenantId }, dto as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await this.repo.delete({ id, tenant_id: tenantId });
  }

  async getActivePromotions(tenantId: string): Promise<Promotion[]> {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun ... 6=Sat
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const promotions = await this.repo.find({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
    });

    return promotions.filter((p) => {
      // Check date range
      if (p.valid_from && now < new Date(p.valid_from)) return false;
      if (p.valid_to && now > new Date(p.valid_to)) return false;

      // Check schedule
      if (p.schedule) {
        if (p.schedule.days && p.schedule.days.length > 0) {
          if (!p.schedule.days.includes(currentDay)) return false;
        }
        if (p.schedule.start_time && currentTime < p.schedule.start_time) return false;
        if (p.schedule.end_time && currentTime > p.schedule.end_time) return false;
      }

      return true;
    });
  }

  async evaluateCart(tenantId: string, items: CartItemDto[]): Promise<AppliedDiscount[]> {
    const activePromotions = await this.getActivePromotions(tenantId);
    const discounts: AppliedDiscount[] = [];

    for (const promo of activePromotions) {
      const discount = this.applyPromotion(promo, items);
      if (discount) {
        discounts.push(discount);
      }
    }

    return discounts;
  }

  private applyPromotion(promo: Promotion, items: CartItemDto[]): AppliedDiscount | null {
    switch (promo.type) {
      case PromotionType.COMBO:
        return this.applyCombo(promo, items);
      case PromotionType.HAPPY_HOUR:
        return this.applyHappyHour(promo, items);
      case PromotionType.WEEKDAY:
        return this.applyWeekday(promo, items);
      case PromotionType.BUY_X_GET_Y:
        return this.applyBuyXGetY(promo, items);
      case PromotionType.DISCOUNT:
        return this.applyDiscount(promo, items);
      default:
        return null;
    }
  }

  private applyCombo(promo: Promotion, items: CartItemDto[]): AppliedDiscount | null {
    const requiredProducts = promo.rules?.products || [];
    if (requiredProducts.length === 0) return null;

    const cartProductIds = items.map((i) => i.product_id);
    const allPresent = requiredProducts.every((pid) => cartProductIds.includes(pid));
    if (!allPresent) return null;

    const matchingItems = items.filter((i) => requiredProducts.includes(i.product_id));
    const subtotal = matchingItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const discountAmount = this.calculateDiscount(promo, subtotal);

    return {
      promotion_id: promo.id,
      promotion_name: promo.name,
      type: promo.type,
      discount_amount: discountAmount,
      description: `Combo: ${promo.name}`,
    };
  }

  private applyHappyHour(promo: Promotion, items: CartItemDto[]): AppliedDiscount | null {
    // Schedule is already checked in getActivePromotions
    const matchingItems = this.getMatchingItems(promo, items);
    if (matchingItems.length === 0) return null;

    const subtotal = matchingItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const discountAmount = this.calculateDiscount(promo, subtotal);

    return {
      promotion_id: promo.id,
      promotion_name: promo.name,
      type: promo.type,
      discount_amount: discountAmount,
      description: `Happy Hour: -${promo.discount_type === PromotionDiscountType.PERCENT ? `${promo.discount_value}%` : `R$${promo.discount_value}`}`,
    };
  }

  private applyWeekday(promo: Promotion, items: CartItemDto[]): AppliedDiscount | null {
    // Day check is already done in getActivePromotions
    const matchingItems = this.getMatchingItems(promo, items);
    const targetItems = matchingItems.length > 0 ? matchingItems : items;
    const subtotal = targetItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    if (promo.rules?.min_order_value && subtotal < promo.rules.min_order_value) return null;

    const discountAmount = this.calculateDiscount(promo, subtotal);

    return {
      promotion_id: promo.id,
      promotion_name: promo.name,
      type: promo.type,
      discount_amount: discountAmount,
      description: `Promo do dia: ${promo.name}`,
    };
  }

  private applyBuyXGetY(promo: Promotion, items: CartItemDto[]): AppliedDiscount | null {
    const buyQty = promo.rules?.buy_quantity || 0;
    const getQty = promo.rules?.get_quantity || 0;
    if (buyQty === 0 || getQty === 0) return null;

    const matchingItems = this.getMatchingItems(promo, items);
    const totalQty = matchingItems.reduce((s, i) => s + i.quantity, 0);

    if (totalQty < buyQty + getQty) return null;

    // Sort by price ascending to discount cheapest items
    const allUnits = matchingItems.flatMap((i) =>
      Array(i.quantity).fill(i.unit_price),
    );
    allUnits.sort((a: number, b: number) => a - b);

    const freeItems = allUnits.slice(0, getQty);
    const discountAmount = freeItems.reduce((s: number, p: number) => s + p, 0);

    return {
      promotion_id: promo.id,
      promotion_name: promo.name,
      type: promo.type,
      discount_amount: discountAmount,
      description: `Compre ${buyQty} Leve ${buyQty + getQty}`,
    };
  }

  private applyDiscount(promo: Promotion, items: CartItemDto[]): AppliedDiscount | null {
    const matchingItems = this.getMatchingItems(promo, items);
    if (matchingItems.length === 0) return null;

    const subtotal = matchingItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    if (promo.rules?.min_order_value && subtotal < promo.rules.min_order_value) return null;

    const discountAmount = this.calculateDiscount(promo, subtotal);

    return {
      promotion_id: promo.id,
      promotion_name: promo.name,
      type: promo.type,
      discount_amount: discountAmount,
      description: `${promo.name}: -${promo.discount_type === PromotionDiscountType.PERCENT ? `${promo.discount_value}%` : `R$${promo.discount_value}`}`,
    };
  }

  private getMatchingItems(promo: Promotion, items: CartItemDto[]): CartItemDto[] {
    const productIds = promo.rules?.products || [];
    const categoryIds = promo.rules?.categories || [];

    if (productIds.length === 0 && categoryIds.length === 0) return items;

    return items.filter((item) => {
      if (productIds.length > 0 && productIds.includes(item.product_id)) return true;
      if (categoryIds.length > 0 && item.category_id && categoryIds.includes(item.category_id)) return true;
      return false;
    });
  }

  private calculateDiscount(promo: Promotion, subtotal: number): number {
    if (promo.discount_type === PromotionDiscountType.PERCENT) {
      return Math.round((subtotal * Number(promo.discount_value)) / 100 * 100) / 100;
    }
    return Math.min(Number(promo.discount_value), subtotal);
  }
}
