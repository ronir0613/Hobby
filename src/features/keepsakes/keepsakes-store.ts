import { create } from 'zustand';

import { currentData, spaceKey, useAuthStore } from '@/features/auth/auth-store';
import type { JournalEntry } from '@/services/journal';
import type { MediaAsset } from '@/services/media';

type KeepsakesState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  notes: JournalEntry[]; // newest first, all hobbies
  photos: MediaAsset[]; // newest first, all hobbies
  urls: Record<string, string>; // display URLs by storage path (signed, or file URIs on the phone)
};

const initial: KeepsakesState = { status: 'idle', notes: [], photos: [], urls: {} };

export const useKeepsakesStore = create<KeepsakesState>(() => initial);

const byNewest = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at);

let inFlight: Promise<void> | null = null;
let inFlightSpace: string | null = null;

/** Loads (or reloads) every note and photo, with fresh display URLs. A failed reload keeps what was shown. */
export function loadKeepsakes() {
  const space = spaceKey(useAuthStore.getState());
  if (inFlight && inFlightSpace === space) return inFlight; // a load from another space is discarded
  inFlightSpace = space;
  useKeepsakesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading' }));
  const data = currentData();
  inFlight = Promise.all([data.listMyJournalEntries(), data.listMyMedia()])
    .then(async ([notes, photos]) => {
      const urls = await data.mediaUrls(photos.map((p) => p.storage_path));
      if (spaceKey(useAuthStore.getState()) !== space) return; // signed in or out meanwhile
      useKeepsakesStore.setState({ status: 'ready', notes, photos, urls });
    })
    .catch((error: unknown) => {
      if (spaceKey(useAuthStore.getState()) !== space) return;
      if (__DEV__) console.warn('Notes and photos failed to load', error);
      useKeepsakesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'error' }));
    })
    .finally(() => {
      if (inFlightSpace === space) inFlight = null;
    });
  return inFlight;
}

export async function addNote(attemptId: string, content: string) {
  const note = await currentData().createJournalEntry(attemptId, content);
  useKeepsakesStore.setState((state) => ({ notes: [note, ...state.notes].sort(byNewest) }));
}

export async function editNote(id: string, content: string) {
  const note = await currentData().updateJournalEntry(id, content);
  useKeepsakesStore.setState((state) => ({ notes: state.notes.map((n) => (n.id === id ? note : n)) }));
}

export async function removeNote(id: string) {
  await currentData().deleteJournalEntry(id);
  useKeepsakesStore.setState((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
}

/** Compresses a picked or taken photo, keeps it (account or phone), then shows it. */
export async function addPhoto(attemptId: string, uri: string) {
  const data = currentData();
  const photo = await data.addPhoto(attemptId, uri);
  const urls = await data.mediaUrls([photo.storage_path]).catch(() => ({}));
  useKeepsakesStore.setState((state) => ({
    photos: [photo, ...state.photos].sort(byNewest),
    urls: { ...state.urls, ...urls },
  }));
}

/** File first, then the row. */
export async function removePhoto(photo: MediaAsset) {
  await currentData().deleteMedia(photo);
  useKeepsakesStore.setState((state) => ({ photos: state.photos.filter((p) => p.id !== photo.id) }));
}

/** Forgets what is shown, so the next load reads the current space again. */
export function resetKeepsakes() {
  useKeepsakesStore.setState(initial);
}

// Never show one space's notes and photos in the next.
let lastSpace = spaceKey(useAuthStore.getState());
useAuthStore.subscribe((auth) => {
  const space = spaceKey(auth);
  if (space === lastSpace) return;
  lastSpace = space;
  resetKeepsakes();
});
