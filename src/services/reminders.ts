import { supabase } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/types/database.types';

// Settings only. Scheduling with expo-notifications happens on the device (step 5).

export type ReminderSettings = Tables<'notification_preferences'>;
export type ReminderSettingsChanges = Pick<
  TablesInsert<'notification_preferences'>,
  'morning_enabled' | 'morning_time' | 'evening_enabled' | 'evening_time' | 'timezone'
>;

/** Null until the user saves settings once; use the column defaults (08:00 / 20:00) until then. */
export async function getReminderSettings(): Promise<ReminderSettings | null> {
  const { data, error } = await supabase.from('notification_preferences').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

/** Creates or updates the signed-in user's row. Times are 'HH:MM' (the DB returns 'HH:MM:SS'). */
export async function saveReminderSettings(
  changes: ReminderSettingsChanges,
): Promise<ReminderSettings> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(changes, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
