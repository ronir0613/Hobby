import { File } from 'expo-file-system';

import * as attempts from './attempts';
import * as checkins from './checkins';
import * as guest from './guest-store';
import * as journal from './journal';
import * as media from './media';
import * as reminders from './reminders';

// The screens and stores read and write through one of these: the account (Supabase) when signed
// in, this phone (guest-store) when not. Both return rows of the same shape.

export type HobbyData = {
  kind: 'account' | 'guest';
  listAttempts: () => Promise<attempts.Attempt[]>;
  getAttempt: (id: string) => Promise<attempts.Attempt | null>;
  createAttempt: (attempt: attempts.NewAttempt) => Promise<attempts.Attempt>;
  setAttemptStatus: (id: string, status: attempts.AttemptStatus) => Promise<attempts.Attempt>;
  listMyCheckins: () => Promise<checkins.Checkin[]>;
  addCheckin: typeof checkins.addCheckin;
  setCheckinResult: typeof checkins.setCheckinResult;
  listMyJournalEntries: () => Promise<journal.JournalEntry[]>;
  createJournalEntry: typeof journal.createJournalEntry;
  updateJournalEntry: typeof journal.updateJournalEntry;
  deleteJournalEntry: typeof journal.deleteJournalEntry;
  listMyMedia: () => Promise<media.MediaAsset[]>;
  /** Compresses a picked photo and keeps it. */
  addPhoto: (attemptId: string, uri: string) => Promise<media.MediaAsset>;
  deleteMedia: typeof media.deleteMedia;
  /** Display URLs keyed by storage path. */
  mediaUrls: (paths: readonly string[]) => Promise<Record<string, string>>;
  getReminderSettings: typeof reminders.getReminderSettings;
  saveReminderSettings: typeof reminders.saveReminderSettings;
};

export const accountData: HobbyData = {
  kind: 'account',
  listAttempts: () => attempts.listAttempts(),
  getAttempt: attempts.getAttempt,
  createAttempt: attempts.createAttempt,
  setAttemptStatus: attempts.setAttemptStatus,
  listMyCheckins: checkins.listMyCheckins,
  addCheckin: checkins.addCheckin,
  setCheckinResult: checkins.setCheckinResult,
  listMyJournalEntries: journal.listMyJournalEntries,
  createJournalEntry: journal.createJournalEntry,
  updateJournalEntry: journal.updateJournalEntry,
  deleteJournalEntry: journal.deleteJournalEntry,
  listMyMedia: media.listMyMedia,
  addPhoto: (attemptId, uri) => media.uploadAttemptPhoto({ attemptId, uri }),
  deleteMedia: media.deleteMedia,
  mediaUrls: (paths) => media.getSignedMediaUrls(paths),
  getReminderSettings: reminders.getReminderSettings,
  saveReminderSettings: reminders.saveReminderSettings,
};

export const guestData: HobbyData = {
  kind: 'guest',
  listAttempts: guest.listAttempts,
  getAttempt: guest.getAttempt,
  createAttempt: guest.createAttempt,
  setAttemptStatus: guest.setAttemptStatus,
  listMyCheckins: guest.listMyCheckins,
  addCheckin: guest.addCheckin,
  setCheckinResult: guest.setCheckinResult,
  listMyJournalEntries: guest.listMyJournalEntries,
  createJournalEntry: guest.createJournalEntry,
  updateJournalEntry: guest.updateJournalEntry,
  deleteJournalEntry: guest.deleteJournalEntry,
  listMyMedia: guest.listMyMedia,
  addPhoto: async (attemptId, uri) => {
    const compressed = await media.compressImage(uri);
    try {
      return await guest.addPhotoFile(attemptId, compressed.uri);
    } catch (error) {
      const left = new File(compressed.uri);
      if (left.exists) left.delete();
      throw error;
    }
  },
  deleteMedia: guest.deleteMedia,
  mediaUrls: async (paths) => guest.guestPhotoUrls(paths),
  getReminderSettings: guest.getReminderSettings,
  saveReminderSettings: guest.saveReminderSettings,
};

export const dataFor = (signedIn: boolean): HobbyData => (signedIn ? accountData : guestData);
