export const INTEREST_CATEGORIES = [
  'All',
  'Arts & Crafts',
  'Music',
  'Outdoors & Nature',
  'Cooking & Food',
  'Home & Garden',
  'Fitness & Movement',
  'Mindfulness',
  'Learning & Culture',
  'Travel & Exploration',
] as const;

export type InterestCategory = Exclude<(typeof INTEREST_CATEGORIES)[number], 'All'>;
export type InterestCategoryFilter = (typeof INTEREST_CATEGORIES)[number];

export type Interest = {
  id: string;
  name: string;
  category: InterestCategory;
  description: string;
  estimatedMinutes: number;
  starterIdea: string;
  coverImageUrl?: string;
};

// Local starter content for Phase 1. It is not fetched from Supabase.
export const INTERESTS: Interest[] = [
  {
    id: 'photography',
    name: 'Photography',
    category: 'Arts & Crafts',
    description: 'Notice light and small details in familiar places.',
    estimatedMinutes: 20,
    starterIdea: 'Photograph a reflection you pass today.',
    coverImageUrl:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'drawing',
    name: 'Drawing',
    category: 'Arts & Crafts',
    description: 'Make a quick sketch of one everyday object.',
    estimatedMinutes: 15,
    starterIdea: 'Sketch a cup, plant, or window nearby.',
  },
  {
    id: 'guitar',
    name: 'Guitar',
    category: 'Music',
    description: 'Get to know a few chords at your own pace.',
    estimatedMinutes: 20,
    starterIdea: 'Try two chords and notice how they sound together.',
  },
  {
    id: 'cooking',
    name: 'Cooking',
    category: 'Cooking & Food',
    description: 'Try one new ingredient in a familiar meal.',
    estimatedMinutes: 30,
    starterIdea: 'Choose a seasonal vegetable and build dinner around it.',
  },
  {
    id: 'gardening',
    name: 'Gardening',
    category: 'Home & Garden',
    description: 'Grow something small and watch it change.',
    estimatedMinutes: 15,
    starterIdea: 'Plant a few herb seeds in a pot.',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    category: 'Fitness & Movement',
    description: 'Take a familiar route at an unhurried pace.',
    estimatedMinutes: 25,
    starterIdea: 'Ride one street you have not explored yet.',
  },
  {
    id: 'meditation',
    name: 'Meditation',
    category: 'Mindfulness',
    description: 'Take a quiet pause and notice your breathing.',
    estimatedMinutes: 5,
    starterIdea: 'Sit comfortably and follow five slow breaths.',
  },
  {
    id: 'reading',
    name: 'Reading',
    category: 'Learning & Culture',
    description: 'Spend a little time with a subject that interests you.',
    estimatedMinutes: 15,
    starterIdea: 'Read one short article or a few pages of a book.',
  },
  {
    id: 'city-walks',
    name: 'City walks',
    category: 'Travel & Exploration',
    description: 'See a nearby place from a different direction.',
    estimatedMinutes: 20,
    starterIdea: 'Walk a route you usually travel by car or bus.',
  },
];
