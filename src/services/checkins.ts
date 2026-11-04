import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';

import { toLocalDate, type CheckinResult } from './checkin-rules';

export { shouldAskAfterSkips, toLocalDate, type CheckinResult } from './checkin-rules';

export type Checkin = Omit<Tables<'checkins'>, 'result'> & { result: CheckinResult };

/** Newest first. */
export async function listCheckins(attemptId: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('local_date', { ascending: false });
  if (error) throw error;
  return data as Checkin[];
}

/**
 * One check-in per attempt per day (a second one fails with code 23505; change it with
 * `setCheckinResult` instead). The first check-in on a planned attempt makes it active.
 */
export async function addCheckin(input: {
  attemptId: string;
  result: CheckinResult;
  localDate?: string;
}): Promise<Checkin> {
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      attempt_id: input.attemptId,
      result: input.result,
      local_date: input.localDate ?? toLocalDate(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Checkin;
}

export async function setCheckinResult(id: string, result: CheckinResult): Promise<Checkin> {
  const { data, error } = await supabase
    .from('checkins')
    .update({ result })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Checkin;
}

/** Undo. Removing the last check-in of an active attempt puts it back to planned. */
export async function deleteCheckin(id: string): Promise<void> {
  const { error } = await supabase.from('checkins').delete().eq('id', id);
  if (error) throw error;
}
