import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';

import { MediaLimitError, photoFits, type MediaUsage } from './media-limit';
import {
  MAX_MEDIA_BYTES,
  MEDIA_BUCKET,
  attemptMediaFolder,
  buildMediaPath,
} from './media-path';

export type MediaAsset = Tables<'media_assets'>;

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.8;
const SIGNED_URL_SECONDS = 60 * 60;

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to add photos.');
  return userId;
}

/** Downscales to at most 2048 px and re-encodes as JPEG (HEIC and large PNGs included). */
export async function compressImage(uri: string) {
  const context = ImageManipulator.manipulate(uri, {
    maxWidth: MAX_DIMENSION,
    maxHeight: MAX_DIMENSION,
  });
  try {
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

/** What this account is using. Null when that can't be read (offline): the server still enforces the limit. */
export async function getMediaUsage(): Promise<MediaUsage | null> {
  const { data, error } = await supabase.rpc('my_media_usage').maybeSingle();
  if (error || !data) return null;
  return { usedBytes: data.used_bytes, limitBytes: data.limit_bytes };
}

/** Removes files left without a row (an upload that stopped halfway), so they stop using space. */
export async function removeOrphanFiles(): Promise<void> {
  const { data, error } = await supabase.rpc('my_orphan_media_paths');
  if (error || !data?.length) return;
  await supabase.storage.from(MEDIA_BUCKET).remove(data);
}

/**
 * Compresses a local image, uploads it to `<user>/<attempt>/<uuid>.jpg` in the private bucket,
 * then saves its media_assets row. If the row can't be saved, the uploaded file is removed.
 * A photo that doesn't fit in the person's limit throws MediaLimitError.
 */
export async function uploadAttemptPhoto(input: {
  attemptId: string;
  uri: string;
  journalEntryId?: string | null;
}): Promise<MediaAsset> {
  const userId = await currentUserId();
  const compressed = await compressImage(input.uri);
  const file = new File(compressed.uri);

  try {
    const size = file.size;
    if (!size) throw new Error('The photo could not be read.');
    if (size > MAX_MEDIA_BYTES) throw new Error('The photo is larger than 10 MB.');
    if (!photoFits(await getMediaUsage(), size)) throw new MediaLimitError();

    const id = Crypto.randomUUID();
    const path = buildMediaPath(userId, input.attemptId, id, 'image/jpeg');

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: 'image/jpeg', upsert: false });
    if (uploadError) {
      // Another upload may have used the space meanwhile; the server's answer doesn't say which.
      if (!photoFits(await getMediaUsage(), size)) throw new MediaLimitError();
      throw uploadError;
    }

    const { data, error } = await supabase
      .from('media_assets')
      .insert({
        id,
        attempt_id: input.attemptId,
        journal_entry_id: input.journalEntryId ?? null,
        storage_path: path,
        mime_type: 'image/jpeg',
        file_size: size,
      })
      .select()
      .single();
    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]);
      throw error;
    }
    return data;
  } finally {
    try {
      file.delete(); // the compressed copy in the cache
    } catch {
      // already gone
    }
  }
}

/** Newest first. Pass `journalEntryId` to list only that entry's photos. */
export async function listMedia(
  attemptId: string,
  journalEntryId?: string,
): Promise<MediaAsset[]> {
  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: false });
  if (journalEntryId) query = query.eq('journal_entry_id', journalEntryId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** All of the signed-in user's photos (RLS), newest first. */
export async function listMyMedia(): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Links a photo to a journal entry of the same attempt, or unlinks it with null. */
export async function setMediaJournalEntry(
  id: string,
  journalEntryId: string | null,
): Promise<MediaAsset> {
  const { data, error } = await supabase
    .from('media_assets')
    .update({ journal_entry_id: journalEntryId })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Short-lived URLs for display, keyed by storage path. Paths that fail are left out. */
export async function getSignedMediaUrls(
  paths: readonly string[],
  expiresIn = SIGNED_URL_SECONDS,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls([...paths], expiresIn);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  }
  return urls;
}

/** Removes the file first, then the row, so a failure never leaves an unlisted file behind. */
export async function deleteMedia(asset: Pick<MediaAsset, 'id' | 'storage_path'>): Promise<void> {
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const { data: removed, error: storageError } = await bucket.remove([asset.storage_path]);
  if (storageError) throw storageError;
  // Storage reports a denied delete as "nothing removed". Only go on if the file is really gone
  // (it may already be, after an earlier try whose row delete failed).
  if (removed.length === 0) {
    const slash = asset.storage_path.lastIndexOf('/');
    const name = asset.storage_path.slice(slash + 1);
    const { data: left, error: listError } = await bucket.list(asset.storage_path.slice(0, slash), {
      search: name,
    });
    if (listError) throw listError;
    if (left.some((item) => item.name === name)) throw new Error('Could not remove this photo.');
  }

  const { error } = await supabase.from('media_assets').delete().eq('id', asset.id);
  if (error) throw error;
}

/** Removes every file in `<user>/<attempt>/`, including any without a row. */
export async function removeAttemptFiles(userId: string, attemptId: string): Promise<void> {
  const folder = attemptMediaFolder(userId, attemptId);
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const pageSize = 100;

  // Removing shifts later files forward, so always read the first page until it's empty.
  for (;;) {
    const { data, error } = await bucket.list(folder, { limit: pageSize });
    if (error) throw error;
    const paths = data.filter((item) => item.id).map((item) => `${folder}/${item.name}`);
    if (paths.length === 0) return;
    const { data: removed, error: removeError } = await bucket.remove(paths);
    if (removeError) throw removeError;
    // Storage reports a denied delete as "nothing removed", not as an error.
    if (removed.length === 0) throw new Error('Could not remove this attempt’s photos.');
    if (data.length < pageSize) return;
  }
}
