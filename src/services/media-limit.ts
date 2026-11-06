// Pure rules for the per-person photo limit (no Supabase), unit tested with node --test.
// The server enforces the same total (public.media_limit_bytes); guests' photos stay on the phone
// and use the same number, so a merge rarely goes over.

export const MEDIA_LIMIT_BYTES = 10 * 1024 * 1024;

/** With less room than the smallest photos we see, nothing can fit, so the buttons turn off. */
export const SMALLEST_PHOTO_BYTES = 50 * 1024;

/** Remaining space is shown only once it starts to matter. */
const SHOW_REMAINING_FROM = 0.8;

const MB = 1024 * 1024;

export type MediaUsage = { usedBytes: number; limitBytes: number };

export class MediaLimitError extends Error {
  constructor() {
    super('media limit reached');
    this.name = 'MediaLimitError';
  }
}

export const roomLeft = (usage: MediaUsage) => Math.max(0, usage.limitBytes - usage.usedBytes);

export const isMediaFull = (usage: MediaUsage | null) => usage !== null && roomLeft(usage) < SMALLEST_PHOTO_BYTES;

/** Unknown usage (offline, or a server without the limit yet) lets the server decide. */
export const photoFits = (usage: MediaUsage | null, bytes: number) => usage === null || bytes <= roomLeft(usage);

export function usageAfterDelete(usage: MediaUsage | null, bytes: number): MediaUsage | null {
  return usage && { ...usage, usedBytes: Math.max(0, usage.usedBytes - bytes) };
}

const megabytes = (bytes: number) => {
  const value = bytes / MB;
  return value >= 10 || Number.isInteger(value) ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
};

/** e.g. "10 MB". */
export const limitLabel = (usage: MediaUsage | null) => megabytes(usage?.limitBytes ?? MEDIA_LIMIT_BYTES);

/** e.g. "1.2 MB of 10 MB left", or null while there is plenty of room or none at all. */
export function remainingLabel(usage: MediaUsage | null): string | null {
  if (!usage || isMediaFull(usage) || usage.usedBytes < usage.limitBytes * SHOW_REMAINING_FROM) return null;
  return `${megabytes(roomLeft(usage))} of ${limitLabel(usage)} left`;
}

/** Keeps the order and takes each photo that still fits, so one large photo doesn't block smaller ones. */
export function splitByRoom<T extends { file_size: number }>(photos: readonly T[], room: number) {
  const fits: T[] = [];
  const leftOver: T[] = [];
  let left = room;
  for (const photo of photos) {
    if (photo.file_size <= left) {
      fits.push(photo);
      left -= photo.file_size;
    } else {
      leftOver.push(photo);
    }
  }
  return { fits, leftOver };
}
