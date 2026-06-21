import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  loyalty_points: number;
  birth_date?: string | null;
  gender?: string | null;
  cpf?: string | null;
  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  is_default: boolean;
}

interface CustomerAuthState {
  customer: Customer | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'menufacil-customer-auth';

function loadFromStorage(): Partial<CustomerAuthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const persisted = loadFromStorage();

const initialState: CustomerAuthState = {
  customer: persisted.customer ?? null,
  accessToken: persisted.accessToken ?? null,
  refreshToken: persisted.refreshToken ?? null,
  isAuthenticated: Boolean(persisted.accessToken && persisted.customer),
  isLoading: false,
  error: null,
};

const customerAuthSlice = createSlice({
  name: 'customerAuth',
  initialState,
  reducers: {
    customerLoginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    customerLoginSuccess(
      state,
      action: PayloadAction<{ customer: Customer; accessToken: string; refreshToken?: string | null }>,
    ) {
      const { customer, accessToken, refreshToken = null } = action.payload;
      state.customer = customer;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    customerLoginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    customerLogout(state) {
      state.customer = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setCustomer(state, action: PayloadAction<Customer>) {
      state.customer = action.payload;
      state.isAuthenticated = state.accessToken !== null;
    },
    clearCustomerError(state) {
      state.error = null;
    },
  },
});

export const {
  customerLoginStart,
  customerLoginSuccess,
  customerLoginFailure,
  customerLogout,
  setCustomer,
  clearCustomerError,
} = customerAuthSlice.actions;
export default customerAuthSlice.reducer;
export { STORAGE_KEY as CUSTOMER_AUTH_STORAGE_KEY };
