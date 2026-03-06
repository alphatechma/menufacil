import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

type ThemeMode = 'light' | 'dark' | 'system';

function getInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('menufacil-theme');
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'light';
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  themeMode: ThemeMode;
  isDark: boolean;
}

const themeMode = getInitialTheme();

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  themeMode,
  isDark: resolveIsDark(themeMode),
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
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
      state.isDark = resolveIsDark(action.payload);
    },
    toggleDarkMode(state) {
      const next = state.isDark ? 'light' : 'dark';
      state.themeMode = next;
      state.isDark = !state.isDark;
    },
  },
});

export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed;
export const selectMobileMenuOpen = (state: RootState) => state.ui.mobileMenuOpen;
export const selectIsDark = (state: RootState) => state.ui.isDark;
export const selectThemeMode = (state: RootState) => state.ui.themeMode;

export const { toggleSidebar, toggleMobileMenu, closeMobileMenu, setThemeMode, toggleDarkMode } = uiSlice.actions;
export default uiSlice.reducer;
