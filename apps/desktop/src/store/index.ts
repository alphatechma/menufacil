import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/authSlice';
import { baseApi } from '@/api/baseApi';

const persistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState() as RootState;

  if (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof (action as { type: string }).type === 'string' &&
    (action as { type: string }).type.startsWith('auth/')
  ) {
    const { user, tenantSlug, token, isAuthenticated } = state.auth;
    localStorage.setItem(
      'menufacil-desktop-auth',
      JSON.stringify({ user, tenantSlug, token, isAuthenticated }),
    );
  }

  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, persistMiddleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
