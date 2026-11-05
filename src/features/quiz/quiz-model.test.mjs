import assert from 'node:assert/strict';
import test from 'node:test';

import { QUIZ_QUESTIONS, discoverPicks, quizSummary, reasonLine, scoreInterest, toQuizAnswers } from './quiz-model.ts';

const interest = (slug, categorySlug, tags = {}) => ({
  slug,
  categorySlug,
  setting: 'either',
  social: 'either',
  sessionMinutes: null,
  cost: 'low',
  moods: [],
  ...tags,
});

const answers = (overrides = {}) => ({
  setting: 'either',
  social: 'either',
  time: 'long',
  mood: 'calm',
  cost: 'any',
  ...overrides,
});

const slugs = (picks) => [picks.featured, ...picks.more].map((pick) => pick.interest.slug);

// The plain rotation (no answers: never taken, or skipped)

const rotation = [
  interest('a1', 'a'),
  interest('a2', 'a'),
  interest('b1', 'b'),
  interest('b2', 'b'),
  interest('c1', 'c'),
  interest('c2', 'c'),
];

test('without answers, rotates one step a day with two more from other categories', () => {
  const today = discoverPicks(rotation, null, 0);
  assert.deepEqual(slugs(today), ['a1', 'b1', 'c1']);
  assert.equal(today.featured.reason, null);
  assert.deepEqual(today.more.map((pick) => pick.reason), [null, null]);

  // The next day moves on, and the day wraps around the catalogue.
  assert.equal(discoverPicks(rotation, null, 1).featured.interest.slug, 'a2');
  assert.equal(discoverPicks(rotation, null, 6).featured.interest.slug, 'a1');
  assert.equal(discoverPicks(rotation, null, -1).featured.interest.slug, 'c2');

  const categories = slugs(discoverPicks(rotation, null, 3)).map((slug) => slug[0]);
  assert.equal(new Set(categories).size, 3);
});

test('picks fewer when there are few categories, and nothing from an empty catalogue', () => {
  assert.deepEqual(discoverPicks([interest('a1', 'a')], null, 4).more, []);
  assert.deepEqual(discoverPicks([interest('a1', 'a')], answers(), 4).more, []);
  assert.equal(discoverPicks([], null, 0), null);
  assert.equal(discoverPicks([], answers(), 0), null);
});

// Ranking with answers

const knitting = interest('knitting', 'crafts', { setting: 'indoor', social: 'solo', sessionMinutes: 20, cost: 'low', moods: ['calm', 'creative'] });
const meditation = interest('meditation', 'mind', { setting: 'indoor', social: 'solo', sessionMinutes: 10, cost: 'free', moods: ['calm'] });
const running = interest('running', 'move', { setting: 'outdoor', social: 'solo', sessionMinutes: 25, cost: 'free', moods: ['active'] });
const climbing = interest('climbing', 'move-2', { setting: 'indoor', social: 'together', sessionMinutes: 90, cost: 'medium', moods: ['active', 'learning'] });
const birding = interest('birding', 'nature', { setting: 'outdoor', social: 'either', sessionMinutes: 30, cost: 'free', moods: ['calm', 'learning'] });
const choir = interest('choir', 'music', { setting: 'indoor', social: 'together', sessionMinutes: 60, cost: 'free', moods: ['creative', 'learning'] });
const catalogue = [knitting, meditation, running, climbing, birding, choir];

test('different answers give different picks', () => {
  const calmIndoors = discoverPicks(catalogue, answers({ mood: 'calm', setting: 'indoor', social: 'solo', time: 'short', cost: 'free' }), 0);
  const activeOutdoors = discoverPicks(catalogue, answers({ mood: 'active', setting: 'outdoor', time: 'medium' }), 0);
  const learnTogether = discoverPicks(catalogue, answers({ mood: 'learning', social: 'together', time: 'long' }), 0);

  assert.equal(calmIndoors.featured.interest.slug, 'meditation');
  assert.equal(activeOutdoors.featured.interest.slug, 'running');
  assert.equal(learnTogether.featured.interest.slug, 'climbing');
  assert.notDeepEqual(slugs(calmIndoors), slugs(activeOutdoors));
});

test('says why under each pick, mood first, at most three tags', () => {
  const picks = discoverPicks(catalogue, answers({ mood: 'calm', setting: 'indoor', social: 'solo', time: 'short', cost: 'free' }), 0);
  assert.equal(picks.featured.reason, 'Calm, indoors, 15 minutes or less');
  for (const pick of picks.more) assert.ok(pick.reason && pick.reason.length > 0);

  const half = discoverPicks(catalogue, answers({ mood: 'calm', setting: 'either', time: 'medium', cost: 'any' }), 0);
  assert.equal(half.featured.reason, 'Calm, 30 minutes or less');
});

test('keeps each pick in a different category', () => {
  const sameCategory = [
    interest('k1', 'crafts', { moods: ['calm'] }),
    interest('k2', 'crafts', { moods: ['calm'] }),
    interest('m1', 'mind', { moods: ['active'] }),
  ];
  assert.deepEqual(slugs(discoverPicks(sameCategory, answers({ mood: 'calm' }), 0)), ['k1', 'm1']);
});

test('equal fits still rotate day to day', () => {
  const equals = [interest('x', 'a', { moods: ['calm'] }), interest('y', 'b', { moods: ['calm'] }), interest('z', 'c', { moods: ['calm'] })];
  const featured = [0, 1, 2].map((day) => discoverPicks(equals, answers(), day).featured.interest.slug);
  assert.deepEqual(featured, ['x', 'y', 'z']);
});

test('a clash counts against an interest; "either" on the interest half fits', () => {
  assert.ok(scoreInterest(running, answers({ setting: 'indoor' })).score < scoreInterest(running, answers({ setting: 'either' })).score);
  const either = interest('e', 'e', { setting: 'either' });
  assert.deepEqual(scoreInterest(either, answers({ setting: 'outdoor', mood: 'active' })), { score: 1, reasons: [] });
});

test('time: short fits quick sessions, long prefers longer ones but still allows short', () => {
  assert.deepEqual(scoreInterest(meditation, answers({ time: 'short', mood: 'active' })), { score: 2, reasons: ['15 minutes or less'] });
  assert.equal(scoreInterest(climbing, answers({ time: 'short', mood: 'calm' })).score, -2);
  assert.equal(scoreInterest(meditation, answers({ time: 'long', mood: 'active' })).score, 0);
  assert.deepEqual(scoreInterest(choir, answers({ time: 'long', mood: 'calm' })).reasons, ['time to settle in']);
  assert.equal(scoreInterest(interest('n', 'n'), answers({ time: 'short', mood: 'active' })).score, 0);
});

test('cost: "nothing" prefers free and pushes kit down', () => {
  assert.deepEqual(scoreInterest(meditation, answers({ cost: 'free', mood: 'active', time: 'long' })).reasons, ['free']);
  assert.ok(scoreInterest(climbing, answers({ cost: 'free' })).score < scoreInterest(climbing, answers({ cost: 'any' })).score);
  assert.deepEqual(scoreInterest(knitting, answers({ cost: 'low', mood: 'active' })).reasons, ['low cost']);
});

test('reason line capitalises the first tag and has a fallback', () => {
  assert.equal(reasonLine(['indoors', 'free']), 'Indoors, free');
  assert.equal(reasonLine(['Calm', 'indoors', '15 minutes or less', 'on your own']), 'Calm, indoors, 15 minutes or less');
  assert.equal(reasonLine([]), 'Something a little different');
});

test('reads stored answers only when every one is valid', () => {
  const stored = { setting: 'indoor', social: 'solo', time: 'short', mood: 'calm', cost: 'free' };
  assert.deepEqual(toQuizAnswers(stored), stored);
  assert.equal(toQuizAnswers({ ...stored, mood: 'sleepy' }), null);
  assert.equal(toQuizAnswers({ ...stored, cost: undefined }), null);
  assert.equal(toQuizAnswers(null), null);
});

test('every question has 3–4 options and the summary skips "either"', () => {
  assert.equal(QUIZ_QUESTIONS.length, 5);
  for (const q of QUIZ_QUESTIONS) assert.ok(q.options.length >= 3 && q.options.length <= 4, q.key);
  assert.equal(
    quizSummary({ setting: 'either', social: 'solo', time: 'short', mood: 'calm', cost: 'free' }),
    'Calm · On my own · 15 min',
  );
});
