import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface OrderNotification {
  id: string;
  type: 'new_order' | 'status_update';
  title: string;
  message: string;
  orderId: string;
  orderNumber: string;
  status?: string;
  timestamp: number;
}

interface NotificationSettings {
  soundEnabled: boolean;
  soundNewOrder: boolean;
  soundOutForDelivery: boolean;
  soundDelivered: boolean;
  pushEnabled: boolean;
}

interface NotificationState {
  settings: NotificationSettings;
  toasts: OrderNotification[];
  pendingOrderIds: string[]; // orders awaiting confirmation — sound loops until confirmed
}

const STORAGE_KEY = 'menufacil-notification-settings';

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    soundEnabled: true,
    soundNewOrder: true,
    soundOutForDelivery: true,
    soundDelivered: true,
    pushEnabled: false,
  };
}

const initialState: NotificationState = {
  settings: loadSettings(),
  toasts: [],
  pendingOrderIds: [],
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    updateSettings(state, action: PayloadAction<Partial<NotificationSettings>>) {
      state.settings = { ...state.settings, ...action.payload };
    },
    addToast(state, action: PayloadAction<OrderNotification>) {
      state.toasts.push(action.payload);
      // Keep max 5 toasts
      if (state.toasts.length > 5) {
        state.toasts = state.toasts.slice(-5);
      }
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
    addPendingOrder(state, action: PayloadAction<string>) {
      if (!state.pendingOrderIds.includes(action.payload)) {
        state.pendingOrderIds.push(action.payload);
      }
    },
    removePendingOrder(state, action: PayloadAction<string>) {
      state.pendingOrderIds = state.pendingOrderIds.filter((id) => id !== action.payload);
    },
  },
});

export const selectNotificationSettings = (state: RootState) => state.notification.settings;
export const selectToasts = (state: RootState) => state.notification.toasts;
export const selectPendingOrderIds = (state: RootState) => state.notification.pendingOrderIds;

export const { updateSettings, addToast, removeToast, clearToasts, addPendingOrder, removePendingOrder } = notificationSlice.actions;
export default notificationSlice.reducer;
