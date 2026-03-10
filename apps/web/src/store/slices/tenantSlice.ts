import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string | null;
  accent_color: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: string | null;
  is_open: boolean;
  next_open_label: string | null;
  hours_label: string | null;
  delivery_fee: number;
  min_order_value: number;
  estimated_delivery_time: string | null;
  business_hours?: Record<string, { open: boolean; openTime: string; closeTime: string }> | null;
  order_modes?: {
    delivery: boolean;
    pickup: boolean;
    dine_in: boolean;
  } | null;
  plan?: {
    name: string;
    modules?: Array<{ key: string; name: string }>;
  } | null;
}

interface TenantState {
  tenant: Tenant | null;
  selectedUnitId: string | null;
}

const initialState: TenantState = {
  tenant: null,
  selectedUnitId: null,
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setTenant(state, action: PayloadAction<Tenant>) {
      state.tenant = action.payload;
    },
    clearTenant(state) {
      state.tenant = null;
    },
    setSelectedUnitId(state, action: PayloadAction<string | null>) {
      state.selectedUnitId = action.payload;
    },
  },
});

export const selectTenant = (state: RootState) => state.tenant.tenant;
export const selectHasModule = (state: RootState, key: string) => {
  const tenant = state.tenant.tenant;
  if (!tenant?.plan?.modules) return false;
  return tenant.plan.modules.some((m) => m.key === key);
};

export const selectSelectedUnitId = (state: RootState) => state.tenant.selectedUnitId;

export const { setTenant, clearTenant, setSelectedUnitId } = tenantSlice.actions;
export default tenantSlice.reducer;
