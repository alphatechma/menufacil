/**
 * Regras de preço de promoção compartilhadas entre vitrine, detalhe, carrinho e checkout.
 *
 * Espelha a regra por item do backend (PromotionService) para que o valor exibido seja igual
 * ao cobrado. Apenas tipos por item têm desconto de preço: `discount`, `happy_hour`, `weekday`.
 * `combo`/`buy_x_get_y` aparecem só como badge (não alteram preço unitário).
 */

export type PromoInfo = {
  id: string;
  name: string;
  label: string;
  type: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
};

const PRICED_TYPES = ['discount', 'happy_hour', 'weekday'];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function promoLabel(promo: any): string {
  const valueLabel =
    promo.discount_type === 'percent'
      ? `${promo.discount_value}%`
      : `R$${Number(promo.discount_value).toFixed(2)}`;
  switch (promo.type) {
    case 'happy_hour':
      return `Happy Hour -${valueLabel}`;
    case 'combo':
      return `Combo: ${promo.name}`;
    case 'buy_x_get_y':
      return `Compre ${promo.rules?.buy_quantity || ''} Leve ${(promo.rules?.buy_quantity || 0) + (promo.rules?.get_quantity || 0)}`;
    default:
      return `-${valueLabel}`;
  }
}

export function toPromoInfo(promo: any): PromoInfo {
  return {
    id: promo.id,
    name: promo.name,
    label: promoLabel(promo),
    type: promo.type,
    discountType: promo.discount_type,
    discountValue: Number(promo.discount_value),
    minOrderValue:
      promo.rules?.min_order_value != null ? Number(promo.rules.min_order_value) : undefined,
  };
}

/**
 * Primeira promoção ativa com escopo neste produto. Escopo de produto tem precedência sobre
 * categoria. Promoções sem escopo (sem produtos/categorias) não pintam item individual.
 */
export function findItemPromo(
  activePromotions: any[],
  product: { id?: string; product_id?: string; category_id?: string | null },
): PromoInfo | null {
  const pid = product.id ?? product.product_id;
  const cid = product.category_id ?? null;

  for (const promo of activePromotions) {
    const products = promo.rules?.products || [];
    if (pid && products.includes(pid)) return toPromoInfo(promo);
  }
  for (const promo of activePromotions) {
    const categories = promo.rules?.categories || [];
    if (cid && categories.includes(cid)) return toPromoInfo(promo);
  }
  return null;
}

/** Preço unitário com desconto (tipos por item), ou null se não houver desconto aplicável. */
export function unitDiscountedPrice(basePrice: number, promo?: PromoInfo | null): number | null {
  if (!promo || !PRICED_TYPES.includes(promo.type)) return null;
  const price =
    promo.discountType === 'percent'
      ? basePrice * (1 - promo.discountValue / 100)
      : Math.max(0, basePrice - promo.discountValue);
  const rounded = round2(price);
  return rounded < basePrice ? rounded : null;
}

export interface PricedLine {
  promo: PromoInfo | null;
  originalUnitPrice: number;
  discountedUnitPrice: number; // igual ao original quando não há desconto
}

/**
 * Calcula o preço com desconto por item do carrinho, respeitando `min_order_value` por promoção
 * (discount/weekday checam o subtotal dos itens casados; happy_hour não), igual ao backend.
 */
export function priceCartItems(
  activePromotions: any[],
  items: { product_id: string; category_id?: string | null; unit_price: number; quantity: number }[],
): { lines: PricedLine[]; totalDiscount: number } {
  const candidates = items.map((it) =>
    findItemPromo(activePromotions, {
      product_id: it.product_id,
      category_id: it.category_id ?? null,
    }),
  );

  // Subtotal dos itens casados por promoção (para a trava de pedido mínimo)
  const matchedSubtotal: Record<string, number> = {};
  candidates.forEach((promo, i) => {
    if (!promo) return;
    matchedSubtotal[promo.id] =
      (matchedSubtotal[promo.id] || 0) + items[i].unit_price * items[i].quantity;
  });

  const lines: PricedLine[] = items.map((it, i) => {
    let promo = candidates[i];
    if (
      promo &&
      promo.minOrderValue != null &&
      (promo.type === 'discount' || promo.type === 'weekday') &&
      (matchedSubtotal[promo.id] || 0) < promo.minOrderValue
    ) {
      promo = null;
    }
    const discounted = unitDiscountedPrice(it.unit_price, promo);
    return {
      promo: discounted != null ? promo : null,
      originalUnitPrice: it.unit_price,
      discountedUnitPrice: discounted != null ? discounted : it.unit_price,
    };
  });

  const totalDiscount = round2(
    lines.reduce(
      (sum, line, i) => sum + (line.originalUnitPrice - line.discountedUnitPrice) * items[i].quantity,
      0,
    ),
  );

  return { lines, totalDiscount };
}
