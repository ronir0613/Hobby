import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { Attempt, AttemptStatus, NewAttempt } from './attempts';
import type { Checkin, CheckinResult } from './checkins';
import { toLocalDate } from './checkin-rules';
import { DuplicateError, afterFirstCheckin, withStatus } from './guest-lifecycle';
import type { JournalEntry } from './journal';
import type { MediaAsset } from './media';
import { MEDIA_LIMIT_BYTES, type MediaUsage } from './media-limit';
import type { ReminderSettings, ReminderSettingsChanges } from './reminders';
import { toQuizAnswers, type QuizAnswers } from '../features/quiz/quiz-model';

// Guest mode: everything a signed-out user saves lives on this phone. Rows have the same shape as
// the Supabase ones (user_id 'guest') so the screens and the shared rules work on both. Small JSON
// in AsyncStorage; photos are JPEG files under the app's document directory.

export const GUEST_USER_ID = 'guest';
const KEY = 'hobby.guest.v1';
const PHOTO_FOLDER = 'guest-photos';

export type GuestData = {
  attempts: Attempt[];
  checkins: Checkin[];
  notes: JournalEntry[];
  photos: MediaAsset[]; // storage_path is relative to the document directory
  reminders: ReminderSettings | null;
  /** The starting quiz's answers, if the guest took it. */
  quiz: QuizAnswers | null;
};

const empty = (): GuestData => ({ attempts: [], checkins: [], notes: [], photos: [], reminders: null, quiz: null });

let cache: GuestData | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<GuestData> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? { ...empty(), ...(JSON.parse(raw) as Partial<GuestData>) } : empty();
  return cache;
}

/** Reads the guest data (a snapshot; don't mutate it). */
export async function readGuestData(): Promise<GuestData> {
  await queue.catch(() => undefined);
  return load();
}

/** Applies a change and saves it. Changes run one after another, so none is lost. */
function update<T>(change: (data: GuestData) => { data: GuestData; result: T }): Promise<T> {
  const run = async () => {
    const { data, result } = change(await load());
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    cache = data;
    return result;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();
const newestFirst = <T extends { created_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

function notFound(): never {
  throw new Error('That is no longer on this phone.');
}

export function hasGuestData(data: GuestData) {
  return data.attempts.length > 0 || data.reminders !== null || data.quiz !== null;
}

// Attempts

export async function listAttempts(): Promise<Attempt[]> {
  return newestFirst((await readGuestData()).attempts);
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  return (await readGuestData()).attempts.find((a) => a.id === id) ?? null;
}

export function createAttempt(input: NewAttempt): Promise<Attempt> {
  return update((data) => {
    if (input.interest_id && data.attempts.some((a) => a.interest_id === input.interest_id)) {
      throw new DuplicateError('This interest is already in My hobbies.');
    }
    const at = now();
    const attempt: Attempt = withStatus(
      {
        id: Crypto.randomUUID(),
        user_id: GUEST_USER_ID,
        interest_id: input.interest_id ?? null,
        starter_idea_id: input.starter_idea_id ?? null,
        custom_title: input.custom_title ?? null,
        intention_note: input.intention_note ?? null,
        planned_for_date: input.planned_for_date ?? null,
        status: 'planned',
        started_at: null,
        completed_at: null,
        dropped_at: null,
        created_at: at,
        updated_at: at,
      },
      input.status ?? 'planned',
      at,
    );
    return { data: { ...data, attempts: [...data.attempts, attempt] }, result: attempt };
  });
}

export function setAttemptStatus(id: string, status: AttemptStatus): Promise<Attempt> {
  return update((data) => {
    const current = data.attempts.find((a) => a.id === id) ?? notFound();
    const attempt = withStatus(current, status, now());
    return { data: { ...data, attempts: data.attempts.map((a) => (a.id === id ? attempt : a)) }, result: attempt };
  });
}

// Check-ins

export async function listMyCheckins(): Promise<Checkin[]> {
  return [...(await readGuestData()).checkins].sort((a, b) => b.local_date.localeCompare(a.local_date));
}

/** One per attempt per day; the first one on a planned attempt makes it active (like the database). */
export function addCheckin(input: { attemptId: string; result: CheckinResult; localDate?: string }): Promise<Checkin> {
  return update((data) => {
    const attempt = data.attempts.find((a) => a.id === input.attemptId) ?? notFound();
    const localDate = input.localDate ?? toLocalDate();
    if (data.checkins.some((c) => c.attempt_id === attempt.id && c.local_date === localDate)) {
      throw new DuplicateError('Today already has an answer.');
    }
    const at = now();
    const checkin: Checkin = {
      id: Crypto.randomUUID(),
      user_id: GUEST_USER_ID,
      attempt_id: attempt.id,
      local_date: localDate,
      result: input.result,
      created_at: at,
      updated_at: at,
    };
    const next = afterFirstCheckin(attempt, at);
    return {
      data: {
        ...data,
        checkins: [...data.checkins, checkin],
        attempts: data.attempts.map((a) => (a.id === attempt.id ? next : a)),
      },
      result: checkin,
    };
  });
}

export function setCheckinResult(id: string, result: CheckinResult): Promise<Checkin> {
  return update((data) => {
    const current = data.checkins.find((c) => c.id === id) ?? notFound();
    const checkin = { ...current, result, updated_at: now() };
    return { data: { ...data, checkins: data.checkins.map((c) => (c.id === id ? checkin : c)) }, result: checkin };
  });
}

// Notes

export async function listMyJournalEntries(): Promise<JournalEntry[]> {
  return newestFirst((await readGuestData()).notes);
}

export function createJournalEntry(attemptId: string, content: string): Promise<JournalEntry> {
  return update((data) => {
    if (!data.attempts.some((a) => a.id === attemptId)) notFound();
    const at = now();
    const note: JournalEntry = {
      id: Crypto.randomUUID(),
      user_id: GUEST_USER_ID,
      attempt_id: attemptId,
      content,
      created_at: at,
      updated_at: at,
    };
    return { data: { ...data, notes: [...data.notes, note] }, result: note };
  });
}

export function updateJournalEntry(id: string, content: string): Promise<JournalEntry> {
  return update((data) => {
    const current = data.notes.find((n) => n.id === id) ?? notFound();
    const note = { ...current, content, updated_at: now() };
    return { data: { ...data, notes: data.notes.map((n) => (n.id === id ? note : n)) }, result: note };
  });
}

export function deleteJournalEntry(id: string): Promise<void> {
  return update((data) => ({ data: { ...data, notes: data.notes.filter((n) => n.id !== id) }, result: undefined }));
}

// Photos

const photoFolder = () => new Directory(Paths.document, PHOTO_FOLDER);
export const guestPhotoFile = (storagePath: string) => new File(Paths.document, storagePath);

export async function listMyMedia(): Promise<MediaAsset[]> {
  return newestFirst((await readGuestData()).photos);
}

/** The same limit as an account, so signing in rarely leaves photos behind. */
export async function getMediaUsage(): Promise<MediaUsage> {
  const { photos } = await readGuestData();
  return { usedBytes: photos.reduce((sum, photo) => sum + photo.file_size, 0), limitBytes: MEDIA_LIMIT_BYTES };
}

/** File URIs for display, keyed by storage path (files that are gone are left out). */
export function guestPhotoUrls(paths: readonly string[]): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const path of paths) {
    const file = guestPhotoFile(path);
    if (file.exists) urls[path] = file.uri;
  }
  return urls;
}

/** Keeps an already compressed JPEG: moves it out of the cache into the document directory. */
export async function addPhotoFile(attemptId: string, compressedUri: string): Promise<MediaAsset> {
  const data = await readGuestData();
  if (!data.attempts.some((a) => a.id === attemptId)) notFound();

  const id = Crypto.randomUUID();
  const storagePath = `${PHOTO_FOLDER}/${id}.jpg`;
  photoFolder().create({ idempotent: true, intermediates: true });
  const source = new File(compressedUri);
  const size = source.size;
  if (!size) throw new Error('The photo could not be read.');
  await source.move(guestPhotoFile(storagePath));

  try {
    return await update((current) => {
      const photo: MediaAsset = {
        id,
        user_id: GUEST_USER_ID,
        attempt_id: attemptId,
        journal_entry_id: null,
        storage_path: storagePath,
        mime_type: 'image/jpeg',
        file_size: size,
        created_at: now(),
      };
      return { data: { ...current, photos: [...current.photos, photo] }, result: photo };
    });
  } catch (error) {
    deleteFile(storagePath);
    throw error;
  }
}

function deleteFile(storagePath: string) {
  try {
    const file = guestPhotoFile(storagePath);
    if (file.exists) file.delete();
  } catch {
    // already gone
  }
}

/** File first, then the row, as for the account. */
export function deleteMedia(asset: Pick<MediaAsset, 'id' | 'storage_path'>): Promise<void> {
  deleteFile(asset.storage_path);
  return update((data) => ({ data: { ...data, photos: data.photos.filter((p) => p.id !== asset.id) }, result: undefined }));
}

// Reminder settings

export async function getReminderSettings(): Promise<ReminderSettings | null> {
  return (await readGuestData()).reminders;
}

export function saveReminderSettings(changes: ReminderSettingsChanges): Promise<ReminderSettings> {
  return update((data) => {
    const at = now();
    const settings: ReminderSettings = {
      morning_enabled: false,
      morning_time: '08:00',
      evening_enabled: false,
      evening_time: '20:00',
      timezone: 'UTC',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      created_at: at,
      user_id: GUEST_USER_ID,
      ...data.reminders,
      ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
      updated_at: at,
    };
    return { data: { ...data, reminders: settings }, result: settings };
  });
}

// After sign-in (see guest-sync.ts) and "Clear this phone"

/** Drops one attempt with its days, notes and photo files once they are on the account. */
export function removeGuestAttempt(attemptId: string): Promise<void> {
  return update((data) => {
    for (const photo of data.photos) if (photo.attempt_id === attemptId) deleteFile(photo.storage_path);
    return {
      data: {
        ...data,
        attempts: data.attempts.filter((a) => a.id !== attemptId),
        checkins: data.checkins.filter((c) => c.attempt_id !== attemptId),
        notes: data.notes.filter((n) => n.attempt_id !== attemptId),
        photos: data.photos.filter((p) => p.attempt_id !== attemptId),
      },
      result: undefined,
    };
  });
}

/**
 * After a merge that hit the account's limit: the attempt's days, notes and uploaded photos are on
 * the account, so they go; the photos that didn't fit stay on the phone with their attempt.
 */
export function keepOnlyGuestPhotos(attemptId: string, keepPhotoIds: ReadonlySet<string>): Promise<void> {
  return update((data) => {
    const uploaded = (p: MediaAsset) => p.attempt_id === attemptId && !keepPhotoIds.has(p.id);
    for (const photo of data.photos) if (uploaded(photo)) deleteFile(photo.storage_path);
    return {
      data: {
        ...data,
        checkins: data.checkins.filter((c) => c.attempt_id !== attemptId),
        notes: data.notes.filter((n) => n.attempt_id !== attemptId),
        photos: data.photos.filter((p) => !uploaded(p)),
      },
      result: undefined,
    };
  });
}

// Starting quiz

export async function getQuizAnswers(): Promise<QuizAnswers | null> {
  return toQuizAnswers((await readGuestData()).quiz);
}

export function saveQuizAnswers(answers: QuizAnswers): Promise<QuizAnswers> {
  return update((data) => ({ data: { ...data, quiz: answers }, result: answers }));
}

export function clearGuestQuiz(): Promise<void> {
  return update((data) => ({ data: { ...data, quiz: null }, result: undefined }));
}

export function clearGuestReminders(): Promise<void> {
  return update((data) => ({ data: { ...data, reminders: null }, result: undefined }));
}

/** Removes everything the guest kept on this phone. */
export async function clearGuestData(): Promise<void> {
  const run = async () => {
    await AsyncStorage.removeItem(KEY);
    cache = empty();
    const folder = photoFolder();
    if (folder.exists) folder.delete();
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
