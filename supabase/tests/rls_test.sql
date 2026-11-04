begin;
select plan(19);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2');

-- An unpublished interest, invisible to everyone
insert into public.interests (category_id, name, slug, type, is_published)
select id, 'Secret', 'secret', 'hobby', false from public.categories where slug = 'music';

-- ---------- anonymous ----------
set local role anon;
select is((select count(*)::int from public.interests), 9, 'anon sees only published interests');
select is((select count(*)::int from public.starter_ideas), 9, 'anon can read starter ideas');
select throws_ok($$ insert into public.categories (name, slug) values ('x', 'x') $$,
  '42501', null, 'anon cannot write the catalogue');
select throws_ok($$ select * from public.attempts $$, '42501', null, 'anon cannot read attempts');
reset role;

-- ---------- user A creates data ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

select throws_ok($$ insert into public.categories (name, slug) values ('x', 'x') $$,
  '42501', null, 'signed-in users cannot write the catalogue');

insert into public.attempts (id, custom_title) values ('20000000-0000-0000-0000-00000000000a', 'A attempt');
insert into public.checkins (attempt_id, local_date, result)
values ('20000000-0000-0000-0000-00000000000a', current_date, 'tried');
insert into public.journal_entries (attempt_id, content)
values ('20000000-0000-0000-0000-00000000000a', 'A private note');
insert into public.notification_preferences (morning_enabled, timezone) values (true, 'Asia/Kolkata');

select throws_ok(
  $$ insert into public.attempts (user_id, custom_title) values ('00000000-0000-0000-0000-0000000000b2', 'x') $$,
  '42501', null, 'you cannot create rows for someone else');

select results_eq(
  $$ select morning_enabled, morning_time, evening_enabled, evening_time from public.notification_preferences $$,
  $$ values (true, '08:00'::time, false, '20:00'::time) $$,
  'reminder settings get sensible defaults');

-- Storage: own path works, foreign/malformed paths do not
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg') $$,
  'A can upload to their own attempt folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/photo.jpg') $$,
  '42501', null, 'malformed file names are rejected');
select lives_ok(
  $$ insert into public.media_assets (attempt_id, storage_path, mime_type, file_size) values
     ('20000000-0000-0000-0000-00000000000a',
      '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg',
      'image/jpeg', 1024) $$,
  'A can save photo metadata');
reset role;

-- ---------- user B tries to reach A's data ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
set local role authenticated;

select is((select count(*)::int from public.attempts), 0, 'B cannot see A''s attempts');
select is((select count(*)::int from public.checkins) + (select count(*)::int from public.journal_entries)
          + (select count(*)::int from public.media_assets) + (select count(*)::int from public.notification_preferences),
  0, 'B cannot see A''s check-ins, journal, photos or reminders');
select is((select count(*)::int from storage.objects), 0, 'B cannot see A''s files');

update public.attempts set custom_title = 'hacked';
delete from public.checkins;
delete from storage.objects;

select throws_ok(
  $$ insert into public.checkins (attempt_id, local_date, result)
     values ('20000000-0000-0000-0000-00000000000a', current_date - 1, 'tried') $$,
  '23503', null, 'B cannot check in on A''s attempt');
select throws_ok(
  $$ insert into public.journal_entries (attempt_id, content)
     values ('20000000-0000-0000-0000-00000000000a', 'sneaky') $$,
  '23503', null, 'B cannot write into A''s journal');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('activity-media',
     '00000000-0000-0000-0000-0000000000b2/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000002.jpg') $$,
  '42501', null, 'B cannot upload into A''s attempt folder');
reset role;

-- ---------- A's data is untouched ----------
select is((select custom_title from public.attempts where id = '20000000-0000-0000-0000-00000000000a'),
  'A attempt', 'B''s update did nothing');
select is((select count(*)::int from public.checkins), 1, 'B''s delete did nothing to check-ins');
select is((select count(*)::int from storage.objects), 1, 'B''s delete did nothing to files');

select * from finish();
rollback;
