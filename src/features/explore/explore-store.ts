import { create } from 'zustand';

import type { InterestCategoryFilter } from '../../data/interest-catalog';

type ExploreStore = {
  searchText: string;
  selectedCategory: InterestCategoryFilter;
  setSearchText: (searchText: string) => void;
  setSelectedCategory: (category: InterestCategoryFilter) => void;
  resetFilters: () => void;
};

const initialFilters = {
  searchText: '',
  selectedCategory: 'All' as const,
};

export const useExploreStore = create<ExploreStore>((set) => ({
  ...initialFilters,
  setSearchText: (searchText) => set({ searchText }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  resetFilters: () => set(initialFilters),
}));
