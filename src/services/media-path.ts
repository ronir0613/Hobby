// Pure Storage path helpers (no Supabase), so they can be unit tested with node --test.
// The bucket policy and media_assets check require: <user_id>/<attempt_id>/<uuid>.<ext>

export const MEDIA_BUCKET = 'activity-media';
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export type MediaMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

const EXTENSIONS: Record<MediaMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function attemptMediaFolder(userId: string, attemptId: string): string {
  if (!UUID.test(userId) || !UUID.test(attemptId)) throw new Error('Invalid user or attempt id.');
  return `${userId}/${attemptId}`;
}

export function buildMediaPath(
  userId: string,
  attemptId: string,
  fileId: string,
  mimeType: MediaMimeType,
): string {
  if (!UUID.test(fileId)) throw new Error('Invalid file id.');
  return `${attemptMediaFolder(userId, attemptId)}/${fileId}.${EXTENSIONS[mimeType]}`;
}
