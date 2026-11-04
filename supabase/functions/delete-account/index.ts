// Deletes the calling user's account (Google Play requires in-app account deletion).
//
// 1. Who: the user from the Authorization header JWT (never from the request body).
// 2. Storage: every object under `<user_id>/` in `activity-media` is removed through
//    the Storage API (hosted storage.objects blocks direct SQL deletes).
// 3. Auth: auth.admin.deleteUser(user_id). All public rows cascade from auth.users.
//
// If any Storage step fails, the user is NOT deleted, so the call can be retried.

import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '@supabase/supabase-js/cors';

const BUCKET = 'activity-media';
const PAGE_SIZE = 1000;
const REMOVE_BATCH = 1000;

type ErrorCode =
  | 'method_not_allowed'
  | 'unauthorized'
  | 'server_misconfigured'
  | 'storage_delete_failed'
  | 'user_delete_failed';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: ErrorCode, message: string) {
  return json(status, { ok: false, error: { code, message } });
}

/** Service key: legacy SUPABASE_SERVICE_ROLE_KEY, else the `default` new-style secret key. */
function serviceKey(): string | undefined {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  } catch {
    return undefined;
  }
}

/** Lists one folder level (paginated). Folders come back with `id === null`. */
async function listLevel(admin: SupabaseClient, prefix: string) {
  const files: string[] = [];
  const folders: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) folders.push(path);
      else files.push(path);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return { files, folders };
}

/** Every object path under `<userId>/` — files at the root plus `<attempt>/<file>`. */
async function listUserObjects(admin: SupabaseClient, userId: string) {
  const root = await listLevel(admin, userId);
  const paths = [...root.files];
  for (const folder of root.folders) {
    const level = await listLevel(admin, folder);
    // Paths should be exactly two levels deep; anything deeper is not expected.
    if (level.folders.length > 0) {
      throw new Error(`unexpected nested folders under ${folder}`);
    }
    paths.push(...level.files);
  }
  return paths;
}

async function removeUserObjects(admin: SupabaseClient, userId: string) {
  const paths = await listUserObjects(admin, userId);
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) throw new Error(`remove: ${error.message}`);
  }
  // Confirm nothing is left (e.g. a photo uploaded while we were deleting).
  const left = await listUserObjects(admin, userId);
  if (left.length > 0) throw new Error(`${left.length} file(s) still present after removal`);
  return paths.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const key = serviceKey();
  if (!supabaseUrl || !key) {
    console.error('delete-account: missing SUPABASE_URL or service key');
    return fail(500, 'server_misconfigured', 'The server is not configured.');
  }

  const jwt = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jwt) return fail(401, 'unauthorized', 'Missing bearer token.');

  const admin = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Asks Auth to validate the token; the user id comes only from here.
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (userError || !userId) return fail(401, 'unauthorized', 'Invalid or expired session.');

  let filesRemoved: number;
  try {
    filesRemoved = await removeUserObjects(admin, userId);
  } catch (error) {
    console.error('delete-account: storage', userId, error);
    return fail(
      500,
      'storage_delete_failed',
      'Could not delete your files. Your account was not deleted; please try again.',
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('delete-account: auth', userId, deleteError);
    return fail(
      500,
      'user_delete_failed',
      'Your files were deleted but the account could not be. Please try again.',
    );
  }

  return json(200, { ok: true, files_removed: filesRemoved });
});
