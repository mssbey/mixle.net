'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((x) => x !== id)
            : [id, ...state.ids],
        })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: 'mixle-favorites', version: 1 },
  ),
);

interface RecentlyViewedState {
  ids: string[];
  push: (id: string) => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) =>
        set((state) => ({
          ids: [id, ...state.ids.filter((x) => x !== id)].slice(0, 8),
        })),
    }),
    { name: 'mixle-recent', version: 1 },
  ),
);

interface SearchHistoryState {
  terms: string[];
  add: (term: string) => void;
  clear: () => void;
}

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set) => ({
      terms: [],
      add: (term) =>
        set((state) => {
          const t = term.trim();
          if (t.length < 2) return state;
          return { terms: [t, ...state.terms.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6) };
        }),
      clear: () => set({ terms: [] }),
    }),
    { name: 'mixle-search-history', version: 1 },
  ),
);
