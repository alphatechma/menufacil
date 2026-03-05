import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface CartItemExtra {
  name: string;
  price: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  product_image?: string | null;
  variation_id: string | null;
  variation_name: string | null;
  unit_price: number;
  quantity: number;
  extras: CartItemExtra[];
}

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
}

const STORAGE_KEY = 'menufacil-cart';

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).items ?? [];
  } catch {
    return [];
  }
}

const initialState: CartState = {
  items: loadCartFromStorage(),
  isDrawerOpen: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, 'quantity'> & { quantity?: number }>) {
      const item: CartItem = { ...action.payload, quantity: action.payload.quantity || 1 };
      const key = buildCartItemKey(item);
      const existingIndex = state.items.findIndex((existing) => buildCartItemKey(existing) === key);

      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += item.quantity;
      } else {
        state.items.push(item);
      }
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items.splice(action.payload, 1);
    },
    updateQuantity(state, action: PayloadAction<{ index: number; quantity: number }>) {
      const { index, quantity } = action.payload;
      if (quantity <= 0) {
        state.items.splice(index, 1);
      } else {
        state.items[index].quantity = quantity;
      }
    },
    clearCart(state) {
      state.items = [];
    },
    openDrawer(state) {
      state.isDrawerOpen = true;
    },
    closeDrawer(state) {
      state.isDrawerOpen = false;
    },
    toggleDrawer(state) {
      state.isDrawerOpen = !state.isDrawerOpen;
    },
  },
});

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectIsDrawerOpen = (state: RootState) => state.cart.isDrawerOpen;

export const selectItemTotal = (_state: RootState, item: CartItem) => {
  const extrasTotal = item.extras.reduce((sum, e) => sum + e.price, 0);
  return (item.unit_price + extrasTotal) * item.quantity;
};

export const selectSubtotal = (state: RootState) => {
  return state.cart.items.reduce((sum, item) => {
    const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
    return sum + (item.unit_price + extrasTotal) * item.quantity;
  }, 0);
};

export const selectTotalItems = (state: RootState) => {
  return state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
};

export const { addItem, removeItem, updateQuantity, clearCart, openDrawer, closeDrawer, toggleDrawer } =
  cartSlice.actions;
export default cartSlice.reducer;
