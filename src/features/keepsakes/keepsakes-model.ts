// Pure helpers for notes and photos (no Supabase), so they can be unit tested with node --test.

export const MAX_NOTE_LENGTH = 2000;

/** The note to save, or null when there is nothing to save. */
export function cleanNote(text: string): string | null {
  const trimmed = text.trim();
  return trimmed ? trimmed.slice(0, MAX_NOTE_LENGTH) : null;
}

/** Rows grouped by attempt, keeping their order (newest first when the input is). */
export function groupByAttempt<T extends { attempt_id: string }>(rows: readonly T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const row of rows) (grouped[row.attempt_id] ??= []).push(row);
  return grouped;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** e.g. "2 notes · 1 photo", or "Nothing kept yet". */
export function keepsakesSummary(notes: number, photos: number): string {
  const parts = [];
  if (notes > 0) parts.push(plural(notes, 'note'));
  if (photos > 0) parts.push(plural(photos, 'photo'));
  return parts.length ? parts.join(' · ') : 'Nothing kept yet';
}

/** One line of a note for a preview, cut at `max` characters. */
export function notePreview(content: string, max = 120): string {
  const line = content.trim().split(/\r?\n/)[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
