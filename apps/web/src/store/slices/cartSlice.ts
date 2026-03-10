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
  variation_ids?: string[];
  variation_name: string | null;
  variation_quantities?: Record<string, number>;
  unit_price: number;
  quantity: number;
  extras: CartItemExtra[];
  notes?: string;
}

export type OrderMode = 'delivery' | 'pickup' | 'dine_in';

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  orderType: OrderMode;
  tableId: string | null;
  tableSessionId: string | null;
  tableNumber: number | null;
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
  orderType: 'delivery',
  tableId: null,
  tableSessionId: null,
  tableNumber: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, 'quantity'> & { quantity?: number }>) {
      const item: CartItem = { ...action.payload, quantity: action.payload.quantity || 1 };
      state.items.push(item);
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
    setOrderType(state, action: PayloadAction<OrderMode>) {
      state.orderType = action.payload;
    },
    setTableContext(state, action: PayloadAction<{ tableId: string; tableSessionId?: string; tableNumber?: number }>) {
      state.tableId = action.payload.tableId;
      state.tableSessionId = action.payload.tableSessionId || null;
      state.tableNumber = action.payload.tableNumber || null;
      state.orderType = 'dine_in';
    },
    clearTableContext(state) {
      state.tableId = null;
      state.tableSessionId = null;
      state.tableNumber = null;
      if (state.orderType === 'dine_in') {
        state.orderType = 'delivery';
      }
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

export const selectOrderType = (state: RootState) => state.cart.orderType;
export const selectTableId = (state: RootState) => state.cart.tableId;
export const selectTableSessionId = (state: RootState) => state.cart.tableSessionId;
export const selectTableNumber = (state: RootState) => state.cart.tableNumber;

export const { addItem, removeItem, updateQuantity, clearCart, openDrawer, closeDrawer, toggleDrawer, setOrderType, setTableContext, clearTableContext } =
  cartSlice.actions;
export default cartSlice.reducer;
