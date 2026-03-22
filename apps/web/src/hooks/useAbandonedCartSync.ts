import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectCartItems, selectSubtotal } from '@/store/slices/cartSlice';
import { useSaveAbandonedCartMutation } from '@/api/customerApi';
import { useParams } from 'react-router-dom';

/**
 * Syncs the cart to the abandoned cart API when:
 * 1. Customer is logged in
 * 2. Cart has items
 * 3. Debounced at 10 seconds to avoid excessive API calls
 */
export function useAbandonedCartSync() {
  const { slug } = useParams<{ slug: string }>();
  const isAuthenticated = useAppSelector((s) => s.customerAuth.isAuthenticated);
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector((s) => selectSubtotal(s));
  const [saveCart] = useSaveAbandonedCartMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !slug || items.length === 0) return;

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Debounce save by 10 seconds
    timerRef.current = setTimeout(() => {
      saveCart({
        slug,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          variation_name: item.variation_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          extras: item.extras,
        })),
        total: subtotal,
      });
    }, 10000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [items, isAuthenticated, slug, subtotal, saveCart]);
}
