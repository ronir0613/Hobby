import assert from 'node:assert/strict';
import test from 'node:test';

import { interestTypeLabel, toCatalogue } from './catalogue-model.ts';

const music = { id: 'c2', slug: 'music', name: 'Music', sort_order: 2 };
const arts = { id: 'c1', slug: 'arts-crafts', name: 'Arts & Crafts', sort_order: 1 };

const row = (overrides) => ({
  id: overrides.slug,
  name: overrides.slug,
  description: null,
  type: 'hobby',
  category: arts,
  starter_ideas: [],
  ...overrides,
});

test('orders categories and interests by category order, then name', () => {
  const { categories, interests } = toCatalogue(
    [music, arts],
    [
      row({ slug: 'guitar', name: 'Guitar', category: music }),
      row({ slug: 'photography', name: 'Photography' }),
      row({ slug: 'drawing', name: 'Drawing' }),
    ],
  );

  assert.deepEqual(categories.map(({ slug }) => slug), ['arts-crafts', 'music']);
  assert.deepEqual(interests.map(({ slug }) => slug), ['drawing', 'photography', 'guitar']);
  assert.equal(interests[2].category, 'Music');
});

test('maps starter ideas in sort order and fills missing text', () => {
  const [interest] = toCatalogue(
    [arts],
    [
      row({
        slug: 'drawing',
        type: 'surprise',
        starter_ideas: [
          { id: 's2', title: 'Second', estimated_minutes: null, sort_order: 2 },
          { id: 's1', title: 'First', estimated_minutes: 15, sort_order: 1 },
        ],
      }),
    ],
  ).interests;

  assert.equal(interest.description, '');
  assert.equal(interest.type, 'both');
  assert.deepEqual(interest.starterIdeas, [
    { id: 's1', title: 'First', estimatedMinutes: 15 },
    { id: 's2', title: 'Second', estimatedMinutes: null },
  ]);
});

test('skips interests without a visible category', () => {
  const { interests } = toCatalogue([arts], [row({ slug: 'orphan', category: null })]);

  assert.deepEqual(interests, []);
});

test('describes interest types in plain words', () => {
  assert.equal(interestTypeLabel('habit'), 'A habit');
  assert.equal(interestTypeLabel('both'), 'A hobby or a habit');
});
