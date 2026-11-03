import assert from 'node:assert/strict';
import test from 'node:test';

import { filterInterests } from './filter-interests.ts';
import { useExploreStore } from './explore-store.ts';

const interests = [
  {
    id: 'photography',
    name: 'Photography',
    category: 'Creative',
    description: 'Notice light in familiar places.',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    category: 'Outdoors & Nature',
    description: 'Take a different route through town.',
  },
  {
    id: 'gardening',
    name: 'Gardening',
    category: 'Home & Garden',
    description: 'Grow herbs in a small pot.',
  },
];

test('filters interests by category', () => {
  const result = filterInterests(interests, '', 'Outdoors & Nature');

  assert.deepEqual(result.map(({ id }) => id), ['cycling']);
});

test('search ignores letter case and surrounding spaces', () => {
  const result = filterInterests(interests, '  PHOTO  ', 'All');

  assert.deepEqual(result.map(({ id }) => id), ['photography']);
});

test('stores the current search and category filters', () => {
  useExploreStore.getState().setSearchText('  cycling ');
  useExploreStore.getState().setSelectedCategory('Outdoors & Nature');

  const state = useExploreStore.getState();
  const result = filterInterests(interests, state.searchText, state.selectedCategory);

  assert.deepEqual(result.map(({ id }) => id), ['cycling']);
  state.resetFilters();
});
