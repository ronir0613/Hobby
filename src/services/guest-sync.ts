import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase/client';

import type { Attempt, AttemptStatus } from './attempts';
import { currentRun, statusAfterCheckins } from './checkin-rules';
import { planGuestMerge, isAlreadyThere, type AttemptMergePlan, type AttemptStep } from './guest-merge';
import {
  clearGuestData,
  clearGuestQuiz,
  clearGuestReminders,
  guestPhotoFile,
  hasGuestData,
  keepOnlyGuestPhotos,
  readGuestData,
  removeGuestAttempt,
} from './guest-store';
import { getMediaUsage } from './media';
import { photoFits, roomLeft, splitByRoom } from './media-limit';
import { MEDIA_BUCKET } from './media-path';
import { saveQuizAnswers } from './quiz';
import { syncReminders } from './reminder-scheduler';
import { saveReminderSettings } from './reminders';

// Moves a guest's phone data onto the account they just signed in to (rules in guest-merge.ts).
// Each attempt is uploaded with its days, notes and photos, then removed from the phone, so a run
// that stops halfway leaves only what is still to do; the next run plans again from the account's
// current rows and skips anything already there (same ids).

/** Inserts that may already have happened in an earlier run count as done. */
async function insertOnce(promise: PromiseLike<{ error: unknown }>) {
  const { error } = await promise;
  if (error && !isAlreadyThere(error)) throw error;
}

async function runStep(plan: AttemptMergePlan<Attempt>, step: AttemptStep) {
  switch (step.op) {
    case 'insert-attempt': {
      const a = plan.guest;
      const { error } = await supabase.from('attempts').insert({
        id: step.id,
        interest_id: step.interest_id,
        starter_idea_id: a.starter_idea_id,
        custom_title: a.custom_title,
        intention_note: a.intention_note,
        planned_for_date: a.planned_for_date,
        status: 'planned',
      });
      if (error) throw error;
      return;
    }
    case 'insert-checkins': {
      const { error } = await supabase
        .from('checkins')
        .insert(step.checkins.map((c) => ({ ...c, attempt_id: plan.targetId })));
      if (error) throw error;
      return;
    }
    case 'set-status': {
      const { error } = await supabase
        .from('attempts')
        .update({ status: step.status })
        .eq('id', plan.targetId);
      if (error) throw error;
    }
  }
}

/** After days were added to an account attempt, apply the shared rules (7 tried → completed, …). */
async function applyStatusRules(attemptId: string) {
  const [{ data: attempt, error }, { data: rows, error: rowsError }] = await Promise.all([
    supabase.from('attempts').select('status, started_at').eq('id', attemptId).single(),
    supabase.from('checkins').select('local_date, result, created_at').eq('attempt_id', attemptId),
  ]);
  if (error) throw error;
  if (rowsError) throw rowsError;
  const next = statusAfterCheckins(attempt.status, currentRun(rows, attempt.started_at)) as AttemptStatus;
  if (next === attempt.status) return;
  const { error: updateError } = await supabase.from('attempts').update({ status: next }).eq('id', attemptId);
  if (updateError) throw updateError;
}

async function uploadPhoto(plan: AttemptMergePlan<Attempt>, photo: AttemptMergePlan<Attempt>['photos'][number]) {
  const file: File = guestPhotoFile(photo.localPath);
  if (!file.exists) return; // nothing left to upload
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(photo.cloudPath, await file.arrayBuffer(), { contentType: 'image/jpeg', upsert: false });
  if (uploadError && !isAlreadyThere(uploadError)) throw uploadError;
  await insertOnce(
    supabase.from('media_assets').insert({
      id: photo.id,
      attempt_id: plan.targetId,
      storage_path: photo.cloudPath,
      mime_type: 'image/jpeg',
      file_size: photo.file_size,
    }),
  );
}

/** `photosLeft`: photos that didn't fit in the account's limit and stay on the phone. */
export type MergeResult = { attempts: number; reminders: boolean; quiz: boolean; photosLeft: number };

let inFlight: Promise<MergeResult> | null = null;

/** Uploads whatever guest data is on the phone to the signed-in account, then clears it. Safe to call again. */
export function mergeGuestData(userId: string): Promise<MergeResult> {
  if (inFlight) return inFlight;
  inFlight = run(userId).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function hasDataToMerge() {
  return hasGuestData(await readGuestData());
}

async function run(userId: string): Promise<MergeResult> {
  const guest = await readGuestData();
  if (!hasGuestData(guest)) {
    await clearGuestData(); // stray photo files, if any
    return { attempts: 0, reminders: false, quiz: false, photosLeft: 0 };
  }

  const [attempts, checkins] = await Promise.all([
    supabase.from('attempts').select('id, interest_id'),
    supabase.from('checkins').select('attempt_id, local_date'),
  ]);
  if (attempts.error) throw attempts.error;
  if (checkins.error) throw checkins.error;

  const plans = planGuestMerge(guest, { attempts: attempts.data, checkins: checkins.data }, userId);
  let usage = await getMediaUsage();
  let photosLeft = 0;
  for (const plan of plans) {
    for (const step of plan.steps) await runStep(plan, step);
    if (plan.kind === 'join' && plan.steps.length > 0) await applyStatusRules(plan.targetId);
    for (const note of plan.notes) {
      await insertOnce(supabase.from('journal_entries').insert({ id: note.id, attempt_id: plan.targetId, content: note.content }));
    }

    // Photos over the account's limit stay on the phone; nothing is dropped. With usage unknown,
    // every photo is tried and the server decides.
    const { fits, leftOver } = usage ? splitByRoom(plan.photos, roomLeft(usage)) : { fits: plan.photos, leftOver: [] };
    const keep = new Set(leftOver.map((photo) => photo.id));
    for (const photo of fits) {
      try {
        await uploadPhoto(plan, photo);
        if (usage) usage = { ...usage, usedBytes: usage.usedBytes + photo.file_size };
      } catch (error) {
        usage = await getMediaUsage();
        if (photoFits(usage, photo.file_size)) throw error;
        keep.add(photo.id); // another upload took the space meanwhile
      }
    }
    if (keep.size > 0) {
      await keepOnlyGuestPhotos(plan.guest.id, keep);
      photosLeft += keep.size;
    } else {
      await removeGuestAttempt(plan.guest.id);
    }
  }

  // Settings the guest saved here are the latest choice made on this phone, so they replace the account's.
  let reminders = false;
  if (guest.reminders) {
    const { morning_enabled, morning_time, evening_enabled, evening_time, timezone, weekdays } = guest.reminders;
    const settings = await saveReminderSettings({ morning_enabled, morning_time, evening_enabled, evening_time, timezone, weekdays });
    await clearGuestReminders();
    await syncReminders(settings).catch(() => undefined);
    reminders = true;
  }

  // Same for quiz answers: the ones taken on this phone are the latest, so they replace the account's.
  let quiz = false;
  if (guest.quiz) {
    await saveQuizAnswers(guest.quiz);
    await clearGuestQuiz();
    quiz = true;
  }

  // This would delete the photo folder, so only when no photo is waiting for room.
  if (photosLeft === 0) await clearGuestData();
  return { attempts: plans.length, reminders, quiz, photosLeft };
}
