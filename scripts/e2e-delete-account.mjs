// End-to-end check for the delete-account Edge Function against the hosted project.
// Use a THROWAWAY user only: `delete` permanently deletes it.
//
//   node --env-file=.env scripts/e2e-delete-account.mjs seed   <email>
//   node --env-file=.env scripts/e2e-delete-account.mjs delete <email>
//
// The password is read from TEST_PASSWORD or asked for (hidden) in the terminal.
// `seed` adds 2 attempts, a check-in, a journal entry, reminder settings and 3 photos
// (two in one attempt folder, one in the other) so the function's folder walk is exercised.

import { randomUUID } from 'node:crypto';
import readline from 'node:readline';

import { createClient } from '@supabase/supabase-js';

const [mode, email] = process.argv.slice(2);
if (!['seed', 'delete'].includes(mode) || !email) {
  console.error('Usage: node --env-file=.env scripts/e2e-delete-account.mjs <seed|delete> <email>');
  process.exit(2);
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Run with --env-file=.env');

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const password = process.env.TEST_PASSWORD || (await askHidden(`Password for ${email}: `));
const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;
const userId = auth.user.id;
console.log('Signed in as', userId);

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

if (mode === 'seed') {
  const today = new Date().toISOString().slice(0, 10);
  const attempts = must(
    await supabase
      .from('attempts')
      .insert([{ custom_title: 'E2E attempt A' }, { custom_title: 'E2E attempt B' }])
      .select('id'),
    'attempts',
  );
  const [a, b] = attempts.map((row) => row.id);
  must(await supabase.from('checkins').insert({ attempt_id: a, local_date: today, result: 'tried' }), 'checkin');
  must(await supabase.from('journal_entries').insert({ attempt_id: a, content: 'E2E note' }), 'journal');
  const prefs = await supabase.from('notification_preferences').insert({ morning_enabled: true });
  if (prefs.error) console.log('notification_preferences skipped:', prefs.error.message);

  for (const attemptId of [a, a, b]) {
    const id = randomUUID();
    const path = `${userId}/${attemptId}/${id}.png`;
    must(
      await supabase.storage.from('activity-media').upload(path, PNG, { contentType: 'image/png' }),
      `upload ${path}`,
    );
    must(
      await supabase.from('media_assets').insert({
        id,
        attempt_id: attemptId,
        storage_path: path,
        mime_type: 'image/png',
        file_size: PNG.length,
      }),
      'media_assets',
    );
  }
  console.log('Seeded: attempts', attempts.length, '| photos 3 | user', userId);
}

if (mode === 'delete') {
  // Same call the app makes: invoke() sends the session JWT as the Authorization header.
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) {
    const body = await error.context?.text?.().catch(() => '');
    throw new Error(`delete-account failed: ${error.message} ${body ?? ''}`);
  }
  console.log('Function response:', JSON.stringify(data));

  const again = await supabase.auth.signInWithPassword({ email, password });
  console.log('Sign-in after deletion:', again.error ? `rejected (${again.error.message})` : 'STILL WORKS');
}
