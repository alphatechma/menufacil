import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

const STORAGE_KEY = 'menufacil-favorites';

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

interface FavoritesState {
  productIds: string[];
}

const initialState: FavoritesState = {
  productIds: loadFavorites(),
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite(state, action: PayloadAction<string>) {
      const id = action.payload;
      const index = state.productIds.indexOf(id);
      if (index >= 0) {
        state.productIds.splice(index, 1);
      } else {
        state.productIds.push(id);
      }
    },
    clearFavorites(state) {
      state.productIds = [];
    },
  },
});

export const selectFavoriteIds = (state: RootState) => state.favorites.productIds;
export const selectIsFavorite = (state: RootState, productId: string) =>
  state.favorites.productIds.includes(productId);

export const { toggleFavorite, clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
