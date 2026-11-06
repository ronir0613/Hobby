// Shapes the catalogue rows from Supabase into what the screens use.
// Kept free of the Supabase client so it can be unit tested.

export type InterestType = 'hobby' | 'habit' | 'both';
export type Setting = 'indoor' | 'outdoor' | 'either';
export type Social = 'solo' | 'together' | 'either';
export type Cost = 'free' | 'low' | 'medium';
export type Mood = 'calm' | 'creative' | 'active' | 'learning';
export type Difficulty = 'easy' | 'moderate' | 'stretch';

export type CatalogueCategory = { id: string; slug: string; name: string };

export type IdeaLink = { id: string; title: string; url: string; publisher: string };

export type StarterIdea = {
  id: string;
  title: string;
  estimatedMinutes: number | null;
  difficulty: Difficulty | null;
  steps: string[];
  links: IdeaLink[];
};

export type CatalogueInterest = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: InterestType;
  category: string;
  categorySlug: string;
  /** "What you'll need", one line. Empty if missing. */
  needs: string;
  /** One short safety line, or empty. */
  safetyNote: string;
  setting: Setting;
  social: Social;
  sessionMinutes: number | null;
  cost: Cost;
  moods: Mood[];
  starterIdeas: StarterIdea[];
};

export type Catalogue = { categories: CatalogueCategory[]; interests: CatalogueInterest[] };

export type CategoryRow = { id: string; slug: string; name: string; sort_order: number };

export type IdeaLinkRow = { id: string; title: string; url: string; publisher: string; sort_order: number };

export type StarterIdeaRow = {
  id: string;
  title: string;
  estimated_minutes: number | null;
  sort_order: number;
  difficulty: string | null;
  instructions: string | null;
  starter_idea_links?: IdeaLinkRow[];
};

export type InterestRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  needs: string | null;
  safety_note?: string | null;
  setting: string | null;
  social: string | null;
  session_minutes: number | null;
  cost: string | null;
  moods: string[] | null;
  category: CategoryRow | null;
  starter_ideas: StarterIdeaRow[];
};

/** Narrows a free-text column to one of the allowed values, else the fallback. */
function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const INTEREST_TYPES = ['hobby', 'habit', 'both'] as const;
const SETTINGS = ['indoor', 'outdoor', 'either'] as const;
const SOCIALS = ['solo', 'together', 'either'] as const;
const COSTS = ['free', 'low', 'medium'] as const;
const MOODS: readonly Mood[] = ['calm', 'creative', 'active', 'learning'];
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'moderate', 'stretch'];

function bySortThenText<T>(sort: (item: T) => number, text: (item: T) => string) {
  return (a: T, b: T) => sort(a) - sort(b) || text(a).localeCompare(text(b));
}

/** Starter idea steps are stored one per line. */
export function toSteps(instructions: string | null): string[] {
  return (instructions ?? '')
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
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
      type: oneOf(row.type, INTEREST_TYPES, 'both'),
      category: row.category.name,
      categorySlug: row.category.slug,
      needs: row.needs ?? '',
      safetyNote: row.safety_note ?? '',
      setting: oneOf(row.setting, SETTINGS, 'either'),
      social: oneOf(row.social, SOCIALS, 'either'),
      sessionMinutes: row.session_minutes,
      cost: oneOf(row.cost, COSTS, 'low'),
      moods: MOODS.filter((mood) => row.moods?.includes(mood)),
      starterIdeas: [...row.starter_ideas]
        .sort(bySortThenText((idea) => idea.sort_order, (idea) => idea.title))
        .map((idea) => ({
          id: idea.id,
          title: idea.title,
          estimatedMinutes: idea.estimated_minutes,
          difficulty: DIFFICULTIES.includes(idea.difficulty as Difficulty) ? (idea.difficulty as Difficulty) : null,
          steps: toSteps(idea.instructions),
          links: [...(idea.starter_idea_links ?? [])]
            .sort(bySortThenText((link) => link.sort_order, (link) => link.title))
            .map(({ id, title, url, publisher }) => ({ id, title, url, publisher })),
        })),
    }));

  return { categories, interests };
}

export function interestTypeLabel(type: InterestType) {
  if (type === 'hobby') return 'A hobby';
  if (type === 'habit') return 'A habit';
  return 'A hobby or a habit';
}

export function difficultyLabel(difficulty: Difficulty) {
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'moderate') return 'A bit more';
  return 'A stretch';
}

/** "15 min", "1 hour", "1½ hours", "3 hours". */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 2) / 2;
  const whole = Math.floor(hours);
  const text = hours === whole ? String(whole) : `${whole}½`;
  return `${text} ${hours === 1 ? 'hour' : 'hours'}`;
}

const SETTING_LABELS: Record<Setting, string> = { indoor: 'Indoors', outdoor: 'Outdoors', either: 'Indoors or out' };
const SOCIAL_LABELS: Record<Social, string> = { solo: 'On your own', together: 'With others', either: 'Alone or together' };
const COST_LABELS: Record<Cost, string> = { free: 'Free', low: 'Low cost', medium: 'Some kit' };

/** The short facts shown under an interest: setting, company, time, cost. */
export function guideFacts(interest: Pick<CatalogueInterest, 'setting' | 'social' | 'sessionMinutes' | 'cost'>) {
  const facts = [SETTING_LABELS[interest.setting], SOCIAL_LABELS[interest.social]];
  if (interest.sessionMinutes) facts.push(`About ${formatMinutes(interest.sessionMinutes)}`);
  facts.push(COST_LABELS[interest.cost]);
  return facts;
}

/** Days since 1970 in the phone's time zone, so Discover's picks change at local midnight. */
export function localDayNumber(date: Date) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);
}
