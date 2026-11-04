import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';

export type JournalEntry = Tables<'journal_entries'>;

/** Newest first. */
export async function listJournalEntries(attemptId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createJournalEntry(attemptId: string, content: string): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({ attempt_id: attemptId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournalEntry(id: string, content: string): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .update({ content })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Photos linked to the entry stay on the attempt (their journal_entry_id becomes null). */
export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}
