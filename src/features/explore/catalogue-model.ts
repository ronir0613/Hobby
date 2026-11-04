// Shapes the catalogue rows from Supabase into what the screens use.
// Kept free of the Supabase client so it can be unit tested.

export type InterestType = 'hobby' | 'habit' | 'both';

export type CatalogueCategory = { id: string; slug: string; name: string };

export type StarterIdea = { id: string; title: string; estimatedMinutes: number | null };

export type CatalogueInterest = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: InterestType;
  category: string;
  categorySlug: string;
  starterIdeas: StarterIdea[];
};

export type Catalogue = { categories: CatalogueCategory[]; interests: CatalogueInterest[] };

export type CategoryRow = { id: string; slug: string; name: string; sort_order: number };

export type InterestRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  category: CategoryRow | null;
  starter_ideas: { id: string; title: string; estimated_minutes: number | null; sort_order: number }[];
};

const INTEREST_TYPES: readonly string[] = ['hobby', 'habit', 'both'];

function bySortThenText<T>(sort: (item: T) => number, text: (item: T) => string) {
  return (a: T, b: T) => sort(a) - sort(b) || text(a).localeCompare(text(b));
}

export function toCatalogue(categoryRows: CategoryRow[], interestRows: InterestRow[]): Catalogue {
  const categories = [...categoryRows]
    .sort(bySortThenText((c) => c.sort_order, (c) => c.name))
    .map(({ id, slug, name }) => ({ id, slug, name }));

  const interests = interestRows
    // RLS hides interests in unpublished categories; this guards the join anyway.
    .filter((row): row is InterestRow & { category: CategoryRow } => row.category !== null)
    .sort(bySortThenText((row) => row.category.sort_order, (row) => row.name))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      type: (INTEREST_TYPES.includes(row.type) ? row.type : 'both') as InterestType,
      category: row.category.name,
      categorySlug: row.category.slug,
      starterIdeas: [...row.starter_ideas]
        .sort(bySortThenText((idea) => idea.sort_order, (idea) => idea.title))
        .map((idea) => ({ id: idea.id, title: idea.title, estimatedMinutes: idea.estimated_minutes })),
    }));

  return { categories, interests };
}

export function interestTypeLabel(type: InterestType) {
  if (type === 'hobby') return 'A hobby';
  if (type === 'habit') return 'A habit';
  return 'A hobby or a habit';
}
