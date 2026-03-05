import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  loyalty_points: number;
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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: CustomerAuthState = {
  customer: null,
  isAuthenticated: false,
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
    customerLoginSuccess(state, action: PayloadAction<Customer>) {
      state.customer = action.payload;
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
      state.isAuthenticated = false;
      state.error = null;
    },
    setCustomer(state, action: PayloadAction<Customer>) {
      state.customer = action.payload;
      state.isAuthenticated = true;
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
