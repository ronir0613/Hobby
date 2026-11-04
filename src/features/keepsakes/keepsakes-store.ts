import { create } from 'zustand';

import { useAuthStore } from '@/features/auth/auth-store';
import {
  createJournalEntry,
  deleteJournalEntry,
  listMyJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '@/services/journal';
import {
  deleteMedia,
  getSignedMediaUrls,
  listMyMedia,
  uploadAttemptPhoto,
  type MediaAsset,
} from '@/services/media';

type KeepsakesState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  notes: JournalEntry[]; // newest first, all hobbies
  photos: MediaAsset[]; // newest first, all hobbies
  urls: Record<string, string>; // signed display URLs by storage path
};

const initial: KeepsakesState = { status: 'idle', notes: [], photos: [], urls: {} };

export const useKeepsakesStore = create<KeepsakesState>(() => initial);

const byNewest = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at);

let inFlight: Promise<void> | null = null;

/** Loads (or reloads) every note and photo, with fresh signed URLs. A failed reload keeps what was shown. */
export function loadKeepsakes() {
  if (inFlight) return inFlight;
  useKeepsakesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading' }));
  const userId = useAuthStore.getState().session?.user.id;
  inFlight = Promise.all([listMyJournalEntries(), listMyMedia()])
    .then(async ([notes, photos]) => {
      const urls = await getSignedMediaUrls(photos.map((p) => p.storage_path));
      if (useAuthStore.getState().session?.user.id !== userId) return; // signed out meanwhile
      useKeepsakesStore.setState({ status: 'ready', notes, photos, urls });
    })
    .catch((error: unknown) => {
      if (__DEV__) console.warn('Notes and photos failed to load', error);
      useKeepsakesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'error' }));
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function addNote(attemptId: string, content: string) {
  const note = await createJournalEntry(attemptId, content);
  useKeepsakesStore.setState((state) => ({ notes: [note, ...state.notes].sort(byNewest) }));
}

export async function editNote(id: string, content: string) {
  const note = await updateJournalEntry(id, content);
  useKeepsakesStore.setState((state) => ({ notes: state.notes.map((n) => (n.id === id ? note : n)) }));
}

export async function removeNote(id: string) {
  await deleteJournalEntry(id);
  useKeepsakesStore.setState((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
}

/** Compresses and uploads a picked or taken photo, then shows it. */
export async function addPhoto(attemptId: string, uri: string) {
  const photo = await uploadAttemptPhoto({ attemptId, uri });
  const urls = await getSignedMediaUrls([photo.storage_path]).catch(() => ({}));
  useKeepsakesStore.setState((state) => ({
    photos: [photo, ...state.photos].sort(byNewest),
    urls: { ...state.urls, ...urls },
  }));
}

/** File first, then the row (see deleteMedia). */
export async function removePhoto(photo: MediaAsset) {
  await deleteMedia(photo);
  useKeepsakesStore.setState((state) => ({ photos: state.photos.filter((p) => p.id !== photo.id) }));
}

// Never show one account's notes and photos to the next: clear everything when the user changes.
let lastUserId: string | null = null;
useAuthStore.subscribe((auth) => {
  const userId = auth.session?.user.id ?? null;
  if (userId === lastUserId) return;
  lastUserId = userId;
  useKeepsakesStore.setState(initial);
});
