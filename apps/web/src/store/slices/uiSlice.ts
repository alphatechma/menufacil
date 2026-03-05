import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    closeMobileMenu(state) {
      state.mobileMenuOpen = false;
    },
  },
});

export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed;
export const selectMobileMenuOpen = (state: RootState) => state.ui.mobileMenuOpen;

export const { toggleSidebar, toggleMobileMenu, closeMobileMenu } = uiSlice.actions;
export default uiSlice.reducer;
