import type {
  Interest,
  InterestCategoryFilter,
} from '../../data/interest-catalog';

export function filterInterests(
  interests: readonly Interest[],
  searchText: string,
  selectedCategory: InterestCategoryFilter,
): Interest[] {
  const query = searchText.trim().toLowerCase();

  return interests.filter((interest) => {
    const matchesCategory =
      selectedCategory === 'All' || interest.category === selectedCategory;
    const searchableText =
      `${interest.name} ${interest.category} ${interest.description}`.toLowerCase();

    return matchesCategory && (!query || searchableText.includes(query));
  });
}
