import { create } from 'zustand';

type ExploreStore = {
  searchText: string;
  /** A category name from the catalogue, or ALL_CATEGORIES ('All'). */
  selectedCategory: string;
  setSearchText: (searchText: string) => void;
  setSelectedCategory: (category: string) => void;
  resetFilters: () => void;
};

const initialFilters = {
  searchText: '',
  // ALL_CATEGORIES; a literal so this file stays import-free for the Node tests.
  selectedCategory: 'All',
};

export const useExploreStore = create<ExploreStore>((set) => ({
  ...initialFilters,
  setSearchText: (searchText) => set({ searchText }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  resetFilters: () => set(initialFilters),
}));
