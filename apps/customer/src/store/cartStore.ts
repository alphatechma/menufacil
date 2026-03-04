import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartItemExtra } from '../types';

function buildCartItemKey(item: CartItem): string {
  const extrasKey = item.extras
    .map((e) => e.name)
    .sort()
    .join(',');
  return `${item.product_id}:${item.variation_id || 'none'}:${extrasKey}`;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;

  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  getItemTotal: (item: CartItem) => number;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (newItem) => {
        const item: CartItem = { ...newItem, quantity: newItem.quantity || 1 };
        set((state) => {
          const key = buildCartItemKey(item);
          const existingIndex = state.items.findIndex(
            (existing) => buildCartItemKey(existing) === key,
          );

          if (existingIndex >= 0) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + item.quantity,
            };
            return { items: updated };
          }

          return { items: [...state.items, item] };
        });
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateQuantity: (index, quantity) => {
        if (quantity <= 0) {
          get().removeItem(index);
          return;
        }
        set((state) => {
          const updated = [...state.items];
          updated[index] = { ...updated[index], quantity };
          return { items: updated };
        });
      },

      clear: () => set({ items: [] }),

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),

      getItemTotal: (item: CartItem) => {
        const extrasTotal = item.extras.reduce((sum, e) => sum + e.price, 0);
        return (item.unit_price + extrasTotal) * item.quantity;
      },

      getSubtotal: () => {
        const { items, getItemTotal } = get();
        return items.reduce((sum, item) => sum + getItemTotal(item), 0);
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'menufacil-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
