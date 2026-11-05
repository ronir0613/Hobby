import assert from 'node:assert/strict';
import test from 'node:test';

import {
  difficultyLabel,
  formatMinutes,
  guideFacts,
  interestTypeLabel,
  localDayNumber,
  toCatalogue,
  toSteps,
} from './catalogue-model.ts';

const music = { id: 'c2', slug: 'music', name: 'Music', sort_order: 2 };
const arts = { id: 'c1', slug: 'arts-crafts', name: 'Arts & Crafts', sort_order: 1 };

const row = (overrides) => ({
  id: overrides.slug,
  name: overrides.slug,
  description: null,
  type: 'hobby',
  needs: null,
  setting: null,
  social: null,
  session_minutes: null,
  cost: null,
  moods: null,
  category: arts,
  starter_ideas: [],
  ...overrides,
});

const idea = (overrides) => ({
  id: overrides.title,
  estimated_minutes: null,
  sort_order: 1,
  difficulty: null,
  instructions: null,
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

test('maps starter ideas in sort order with their steps and difficulty', () => {
  const [interest] = toCatalogue(
    [arts],
    [
      row({
        slug: 'drawing',
        starter_ideas: [
          idea({ title: 'Second', sort_order: 2, difficulty: 'moderate', instructions: 'Look.\nDraw.' }),
          idea({ title: 'First', estimated_minutes: 15, difficulty: 'easy', instructions: 'Sit down.' }),
          idea({ title: 'Third', sort_order: 3, difficulty: 'heroic' }),
        ],
      }),
    ],
  ).interests;

  assert.deepEqual(interest.starterIdeas, [
    { id: 'First', title: 'First', estimatedMinutes: 15, difficulty: 'easy', steps: ['Sit down.'] },
    { id: 'Second', title: 'Second', estimatedMinutes: null, difficulty: 'moderate', steps: ['Look.', 'Draw.'] },
    { id: 'Third', title: 'Third', estimatedMinutes: null, difficulty: null, steps: [] },
  ]);
});

test('maps the guide and quiz tags', () => {
  const [interest] = toCatalogue(
    [arts],
    [
      row({
        slug: 'knitting',
        needs: 'Needles and yarn.',
        setting: 'indoor',
        social: 'together',
        session_minutes: 30,
        cost: 'low',
        moods: ['creative', 'unknown', 'calm'],
      }),
    ],
  ).interests;

  assert.equal(interest.needs, 'Needles and yarn.');
  assert.equal(interest.setting, 'indoor');
  assert.equal(interest.social, 'together');
  assert.equal(interest.sessionMinutes, 30);
  assert.equal(interest.cost, 'low');
  // Known moods only, in a fixed order.
  assert.deepEqual(interest.moods, ['calm', 'creative']);
});

test('fills missing or unknown values', () => {
  const [interest] = toCatalogue([arts], [row({ slug: 'drawing', type: 'surprise', setting: 'space' })]).interests;

  assert.equal(interest.description, '');
  assert.equal(interest.needs, '');
  assert.equal(interest.type, 'both');
  assert.equal(interest.setting, 'either');
  assert.equal(interest.social, 'either');
  assert.equal(interest.cost, 'low');
  assert.equal(interest.sessionMinutes, null);
  assert.deepEqual(interest.moods, []);
});

test('skips interests without a visible category', () => {
  const { interests } = toCatalogue([arts], [row({ slug: 'orphan', category: null })]);

  assert.deepEqual(interests, []);
});

test('splits steps on lines and drops blanks', () => {
  assert.deepEqual(toSteps(' One. \r\n\nTwo.\n'), ['One.', 'Two.']);
  assert.deepEqual(toSteps(null), []);
});

test('describes interest types and difficulty in plain words', () => {
  assert.equal(interestTypeLabel('habit'), 'A habit');
  assert.equal(interestTypeLabel('both'), 'A hobby or a habit');
  assert.equal(difficultyLabel('easy'), 'Easy');
  assert.equal(difficultyLabel('moderate'), 'A bit more');
  assert.equal(difficultyLabel('stretch'), 'A stretch');
});

test('formats minutes and hours', () => {
  assert.equal(formatMinutes(15), '15 min');
  assert.equal(formatMinutes(60), '1 hour');
  assert.equal(formatMinutes(90), '1½ hours');
  assert.equal(formatMinutes(180), '3 hours');
});

test('lists the guide facts in order', () => {
  assert.deepEqual(guideFacts({ setting: 'outdoor', social: 'solo', sessionMinutes: 20, cost: 'free' }), [
    'Outdoors',
    'On your own',
    'About 20 min',
    'Free',
  ]);
  assert.deepEqual(guideFacts({ setting: 'either', social: 'either', sessionMinutes: null, cost: 'medium' }), [
    'Indoors or out',
    'Alone or together',
    'Some kit',
  ]);
});

test('counts days in local time', () => {
  const day = localDayNumber(new Date(2026, 10, 5, 0, 5));
  assert.equal(localDayNumber(new Date(2026, 10, 5, 23, 55)), day);
  assert.equal(localDayNumber(new Date(2026, 10, 6, 0, 5)), day + 1);
});
