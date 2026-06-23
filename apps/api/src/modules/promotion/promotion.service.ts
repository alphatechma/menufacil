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
    // Schedule (days/start_time/end_time) is configured in the restaurant's timezone
    // (America/Sao_Paulo), but the server runs in UTC — compute day/time in SP to match.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const currentDay = weekdayMap[get('weekday')] ?? now.getUTCDay(); // 0=Sun ... 6=Sat
    const currentTime = `${get('hour')}:${get('minute')}`;

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

  /**
   * Preço unitário com desconto por item (tipos por item: discount/happy_hour/weekday).
   * Espelha `apps/web/src/utils/promotions.ts` para que o valor exibido seja igual ao cobrado.
   * Respeita `min_order_value` (discount/weekday checam o subtotal dos itens casados; happy_hour não).
   * Retorna o `unit_price` (com desconto quando aplicável) na mesma ordem dos itens.
   */
  priceItems(
    activePromotions: Promotion[],
    items: { product_id: string; category_id?: string | null; unit_price: number; quantity: number }[],
  ): number[] {
    const pricedTypes = [
      PromotionType.DISCOUNT,
      PromotionType.HAPPY_HOUR,
      PromotionType.WEEKDAY,
    ];

    const findPromo = (item: { product_id: string; category_id?: string | null }): Promotion | null => {
      for (const p of activePromotions) {
        if ((p.rules?.products || []).includes(item.product_id)) return p;
      }
      for (const p of activePromotions) {
        if (item.category_id && (p.rules?.categories || []).includes(item.category_id)) return p;
      }
      return null;
    };

    const candidates = items.map(findPromo);

    const matchedSubtotal: Record<string, number> = {};
    candidates.forEach((promo, i) => {
      if (promo) {
        matchedSubtotal[promo.id] =
          (matchedSubtotal[promo.id] || 0) + items[i].unit_price * items[i].quantity;
      }
    });

    return items.map((item, i) => {
      const promo = candidates[i];
      if (!promo || !pricedTypes.includes(promo.type)) return item.unit_price;

      const min = promo.rules?.min_order_value;
      if (
        min != null &&
        (promo.type === PromotionType.DISCOUNT || promo.type === PromotionType.WEEKDAY) &&
        (matchedSubtotal[promo.id] || 0) < Number(min)
      ) {
        return item.unit_price;
      }

      const value = Number(promo.discount_value);
      const price =
        promo.discount_type === PromotionDiscountType.PERCENT
          ? item.unit_price * (1 - value / 100)
          : Math.max(0, item.unit_price - value);
      const rounded = Math.round(price * 100) / 100;
      return rounded < item.unit_price ? rounded : item.unit_price;
    });
  }

  /**
   * Desconto em NÍVEL DE PEDIDO para promoções de carrinho (combo / buy_x_get_y), que não
   * alteram o preço unitário e por isso não são cobertas por `priceItems`. Soma os
   * `discount_amount` de cada promoção combo/buy_x_get_y casada e arredonda para 2 casas.
   *
   * Não inclui discount/happy_hour/weekday (aplicadas por item em `priceItems`) para evitar
   * dupla contagem. Os `unit_price` recebidos já devem estar com o desconto por item aplicado.
   */
  getCartLevelDiscount(
    activePromotions: Promotion[],
    items: { product_id: string; category_id?: string | null; unit_price: number; quantity: number }[],
  ): number {
    let total = 0;
    for (const promo of activePromotions) {
      let applied: AppliedDiscount | null = null;
      if (promo.type === PromotionType.COMBO) {
        applied = this.applyCombo(promo, items as CartItemDto[]);
      } else if (promo.type === PromotionType.BUY_X_GET_Y) {
        applied = this.applyBuyXGetY(promo, items as CartItemDto[]);
      }
      if (applied) {
        total += applied.discount_amount;
      }
    }
    return Math.round(total * 100) / 100;
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
