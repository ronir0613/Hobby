import { supabase } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types';

import { removeAttemptFiles } from './media';

export type AttemptStatus = 'planned' | 'active' | 'completed' | 'dropped';
export type Attempt = Omit<Tables<'attempts'>, 'status'> & { status: AttemptStatus };

// Only the columns clients are granted. The database owns user_id and the timestamps.
export type NewAttempt = Pick<
  TablesInsert<'attempts'>,
  'interest_id' | 'starter_idea_id' | 'custom_title' | 'intention_note' | 'planned_for_date'
> & { status?: AttemptStatus };
export type AttemptChanges = Pick<
  TablesUpdate<'attempts'>,
  'custom_title' | 'intention_note' | 'planned_for_date'
>;

export async function listAttempts(filter: { status?: AttemptStatus } = {}): Promise<Attempt[]> {
  let query = supabase.from('attempts').select('*').order('created_at', { ascending: false });
  if (filter.status) query = query.eq('status', filter.status);
  const { data, error } = await query;
  if (error) throw error;
  return data as Attempt[];
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  const { data, error } = await supabase.from('attempts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Attempt | null;
}

export async function createAttempt(attempt: NewAttempt): Promise<Attempt> {
  const { data, error } = await supabase.from('attempts').insert(attempt).select().single();
  if (error) throw error;
  return data as Attempt;
}

export async function updateAttempt(id: string, changes: AttemptChanges): Promise<Attempt> {
  const { data, error } = await supabase
    .from('attempts')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Attempt;
}

/** Any direction is allowed (retry, reopen, drop, pick back up). The DB sets the timestamps. */
export async function setAttemptStatus(id: string, status: AttemptStatus): Promise<Attempt> {
  const { data, error } = await supabase
    .from('attempts')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Attempt;
}

/** Removes the attempt's photos from Storage first, then the attempt (its rows cascade). */
export async function deleteAttempt(id: string): Promise<void> {
  const { data: attempt, error: readError } = await supabase
    .from('attempts')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw readError;
  if (!attempt) return; // already gone (or not ours)

  await removeAttemptFiles(attempt.user_id, attempt.id);

  const { error } = await supabase.from('attempts').delete().eq('id', id);
  if (error) throw error;
}
