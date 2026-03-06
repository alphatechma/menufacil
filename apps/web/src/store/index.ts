import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import adminAuthReducer from './slices/adminAuthSlice';
import customerAuthReducer from './slices/customerAuthSlice';
import cartReducer from './slices/cartSlice';
import tenantReducer from './slices/tenantSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';
import { baseApi } from '../api/baseApi';

const persistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState() as RootState;

  // Persist admin auth
  if (typeof action === 'object' && action !== null && 'type' in action && typeof (action as { type: string }).type === 'string' && (action as { type: string }).type.startsWith('adminAuth/')) {
    const { user, tenantSlug, modules, permissions, plan, isAuthenticated } = state.adminAuth;
    localStorage.setItem(
      'menufacil-admin-auth',
      JSON.stringify({ user, tenantSlug, modules, permissions, plan, isAuthenticated }),
    );
  }

  // Persist cart
  if (typeof action === 'object' && action !== null && 'type' in action && typeof (action as { type: string }).type === 'string' && (action as { type: string }).type.startsWith('cart/')) {
    localStorage.setItem('menufacil-cart', JSON.stringify({ items: state.cart.items }));
  }

  // Persist notification settings
  if (typeof action === 'object' && action !== null && 'type' in action && typeof (action as { type: string }).type === 'string' && (action as { type: string }).type.startsWith('notification/')) {
    localStorage.setItem('menufacil-notification-settings', JSON.stringify(state.notification.settings));
  }

  // Persist theme
  if (typeof action === 'object' && action !== null && 'type' in action && typeof (action as { type: string }).type === 'string' && (action as { type: string }).type.startsWith('ui/')) {
    localStorage.setItem('menufacil-theme', state.ui.themeMode);
  }

  return result;
};

export const store = configureStore({
  reducer: {
    adminAuth: adminAuthReducer,
    customerAuth: customerAuthReducer,
    cart: cartReducer,
    tenant: tenantReducer,
    ui: uiReducer,
    notification: notificationReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, persistMiddleware),
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
