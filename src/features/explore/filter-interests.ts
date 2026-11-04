/** The category filter value that shows every interest. */
export const ALL_CATEGORIES = 'All';

type FilterableInterest = { name: string; category: string; description: string | null };

export function filterInterests<T extends FilterableInterest>(
  interests: readonly T[],
  searchText: string,
  selectedCategory: string,
): T[] {
  const query = searchText.trim().toLowerCase();

  return interests.filter((interest) => {
    const matchesCategory =
      selectedCategory === ALL_CATEGORIES || interest.category === selectedCategory;
    const searchableText =
      `${interest.name} ${interest.category} ${interest.description ?? ''}`.toLowerCase();

    return matchesCategory && (!query || searchableText.includes(query));
  });
}
