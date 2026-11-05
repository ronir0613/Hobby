// The starting quiz and how Discover ranks the catalogue with its answers.
// Pure (no Expo, no Supabase), unit tested with node --test.

import type { CatalogueInterest, Mood } from '../explore/catalogue-model.ts';

export type QuizSetting = 'indoor' | 'outdoor' | 'either';
export type QuizSocial = 'solo' | 'together' | 'either';
/** short: about 15 minutes; medium: up to half an hour; long: an hour or more is fine. */
export type QuizTime = 'short' | 'medium' | 'long';
/** any: happy to buy some kit. */
export type QuizCost = 'free' | 'low' | 'any';

export type QuizAnswers = {
  setting: QuizSetting;
  social: QuizSocial;
  time: QuizTime;
  mood: Mood;
  cost: QuizCost;
};

export type QuizKey = keyof QuizAnswers;

export type QuizQuestion<K extends QuizKey = QuizKey> = {
  key: K;
  title: string;
  options: readonly { value: QuizAnswers[K]; label: string }[];
};

/** Asked in this order, one per screen. */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    key: 'mood',
    title: 'What should it feel like?',
    options: [
      { value: 'calm', label: 'Calm' },
      { value: 'creative', label: 'Creative' },
      { value: 'active', label: 'Active' },
      { value: 'learning', label: 'Learning something new' },
    ],
  },
  {
    key: 'setting',
    title: 'Indoors or out?',
    options: [
      { value: 'indoor', label: 'Indoors' },
      { value: 'outdoor', label: 'Outdoors' },
      { value: 'either', label: 'Either is fine' },
    ],
  },
  {
    key: 'social',
    title: 'On your own or with others?',
    options: [
      { value: 'solo', label: 'On my own' },
      { value: 'together', label: 'With others' },
      { value: 'either', label: 'Either is fine' },
    ],
  },
  {
    key: 'time',
    title: 'How much time do you have?',
    options: [
      { value: 'short', label: 'About 15 minutes' },
      { value: 'medium', label: 'Up to half an hour' },
      { value: 'long', label: 'An hour or more' },
    ],
  },
  {
    key: 'cost',
    title: 'How much would you spend to start?',
    options: [
      { value: 'free', label: 'Nothing' },
      { value: 'low', label: 'A little' },
      { value: 'any', label: 'Some kit is fine' },
    ],
  },
] as QuizQuestion[];

const ALLOWED: { [K in QuizKey]: readonly QuizAnswers[K][] } = {
  setting: ['indoor', 'outdoor', 'either'],
  social: ['solo', 'together', 'either'],
  time: ['short', 'medium', 'long'],
  mood: ['calm', 'creative', 'active', 'learning'],
  cost: ['free', 'low', 'any'],
};

/** A complete, valid set of answers from stored data, else null (so a bad row falls back to the rotation). */
export function toQuizAnswers(raw: Partial<Record<QuizKey, unknown>> | null | undefined): QuizAnswers | null {
  if (!raw) return null;
  const out: Partial<QuizAnswers> = {};
  for (const key of Object.keys(ALLOWED) as QuizKey[]) {
    const value = raw[key];
    if (!(ALLOWED[key] as readonly unknown[]).includes(value)) return null;
    (out as Record<QuizKey, unknown>)[key] = value;
  }
  return out as QuizAnswers;
}

const SHORT_TIME: Record<QuizTime, string> = { short: '15 min', medium: 'Half an hour', long: 'An hour or more' };

/** One-line summary for Profile: "Calm · Indoors · On my own · 15 min" (cost left out to keep it short). */
export function quizSummary(answers: QuizAnswers) {
  const label = (key: 'mood' | 'setting' | 'social') =>
    QUIZ_QUESTIONS.find((q) => q.key === key)?.options.find((o) => o.value === answers[key])?.label;
  return [label('mood'), label('setting'), label('social'), SHORT_TIME[answers.time]]
    .filter((text): text is string => !!text && text !== 'Either is fine')
    .join(' · ');
}

type Rankable = Pick<CatalogueInterest, 'categorySlug' | 'setting' | 'social' | 'sessionMinutes' | 'cost' | 'moods'>;

type Part = { points: number; reason?: string };

const MOOD_REASONS: Record<Mood, string> = {
  calm: 'Calm',
  creative: 'Creative',
  active: 'Active',
  learning: 'Something to learn',
};

function moodPart(answer: Mood, interest: Rankable): Part {
  return interest.moods.includes(answer) ? { points: 3, reason: MOOD_REASONS[answer] } : { points: 0 };
}

function settingPart(answer: QuizSetting, interest: Rankable): Part {
  if (answer === 'either') return { points: 0 };
  if (interest.setting === answer) return { points: 2, reason: answer === 'indoor' ? 'indoors' : 'outdoors' };
  return { points: interest.setting === 'either' ? 1 : -2 };
}

function socialPart(answer: QuizSocial, interest: Rankable): Part {
  if (answer === 'either') return { points: 0 };
  if (interest.social === answer) return { points: 2, reason: answer === 'solo' ? 'on your own' : 'with others' };
  return { points: interest.social === 'either' ? 1 : -2 };
}

function timePart(answer: QuizTime, interest: Rankable): Part {
  const minutes = interest.sessionMinutes;
  if (minutes === null) return { points: 0 };
  if (answer === 'short') {
    if (minutes <= 15) return { points: 2, reason: '15 minutes or less' };
    return { points: minutes <= 20 ? 1 : -2 };
  }
  if (answer === 'medium') {
    if (minutes <= 30) return { points: 2, reason: '30 minutes or less' };
    return { points: minutes <= 45 ? 1 : -1 };
  }
  // An hour or more is fine: longer sessions fit best, short ones still fit.
  return minutes >= 45 ? { points: 2, reason: 'time to settle in' } : { points: 0 };
}

function costPart(answer: QuizCost, interest: Rankable): Part {
  if (answer === 'any') return { points: 0 };
  if (interest.cost === 'free') return { points: 2, reason: 'free' };
  if (interest.cost === 'low') return answer === 'low' ? { points: 1, reason: 'low cost' } : { points: 0 };
  return { points: -2 };
}

/** How well an interest fits the answers, and the matching tags in reading order. */
export function scoreInterest(interest: Rankable, answers: QuizAnswers) {
  const parts = [
    moodPart(answers.mood, interest),
    settingPart(answers.setting, interest),
    timePart(answers.time, interest),
    socialPart(answers.social, interest),
    costPart(answers.cost, interest),
  ];
  const score = parts.reduce((sum, part) => sum + part.points, 0);
  const reasons = parts.flatMap((part) => (part.reason ? [part.reason] : []));
  return { score, reasons };
}

/** "Calm, indoors, 30 minutes or less": up to three matching tags. */
export function reasonLine(reasons: readonly string[]) {
  const line = reasons.slice(0, 3).join(', ');
  return line ? line.charAt(0).toUpperCase() + line.slice(1) : 'Something a little different';
}

export type DiscoverPick<T> = { interest: T; reason: string | null };
export type DiscoverPicks<T> = { featured: DiscoverPick<T>; more: DiscoverPick<T>[] };

/**
 * Discover's picks for a day: one featured interest and up to two more, each from a different
 * category. With quiz answers, interests are ranked by how many tags match, with today's
 * rotation breaking ties (so equal fits still change day to day), and each pick says why.
 * Without answers (never taken, or skipped), it is the plain daily rotation with no reasons.
 */
export function discoverPicks<T extends Rankable>(
  interests: readonly T[],
  answers: QuizAnswers | null,
  day: number,
): DiscoverPicks<T> | null {
  const count = interests.length;
  if (count === 0) return null;
  const start = ((day % count) + count) % count;

  if (!answers) {
    const featured = interests[start];
    const more: T[] = [];
    const usedCategories = new Set([featured.categorySlug]);
    // Start a third of the way round so the extra picks aren't the featured one's neighbours.
    const offset = Math.max(1, Math.floor(count / 3));
    for (let step = 0; step < count && more.length < 2; step += 1) {
      const candidate = interests[(start + offset + step) % count];
      if (candidate === featured || usedCategories.has(candidate.categorySlug)) continue;
      usedCategories.add(candidate.categorySlug);
      more.push(candidate);
    }
    return {
      featured: { interest: featured, reason: null },
      more: more.map((interest) => ({ interest, reason: null })),
    };
  }

  const ranked = interests
    .map((interest, index) => ({ interest, rotation: (index - start + count) % count, ...scoreInterest(interest, answers) }))
    .sort((a, b) => b.score - a.score || a.rotation - b.rotation);

  const chosen: typeof ranked = [];
  const usedCategories = new Set<string>();
  for (const entry of ranked) {
    if (usedCategories.has(entry.interest.categorySlug)) continue;
    usedCategories.add(entry.interest.categorySlug);
    chosen.push(entry);
    if (chosen.length === 3) break;
  }
  const [featured, ...more] = chosen.map((entry) => ({ interest: entry.interest, reason: reasonLine(entry.reasons) }));
  return { featured, more };
}
