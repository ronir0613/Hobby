begin;
select plan(19);

-- What user B could try by calling the API directly. Rolled back; counts are scoped to the test users.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2');

select set_config('storage.allow_delete_query', 'true', true);

-- ---------- A's data ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
insert into public.attempts (id, custom_title) values ('20000000-0000-0000-0000-00000000000a', 'A attempt');
insert into public.journal_entries (id, attempt_id, content)
  values ('40000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'A private note');
insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
  '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg', '{"size": 1000}');
insert into public.media_assets (id, attempt_id, storage_path, mime_type, file_size) values
  ('50000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg',
   'image/jpeg', 1000);
reset role;

-- ---------- B attacks ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
set local role authenticated;
insert into public.attempts (id, custom_title) values ('20000000-0000-0000-0000-00000000000b', 'B attempt');
insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
  '00000000-0000-0000-0000-0000000000b2/20000000-0000-0000-0000-00000000000b/30000000-0000-0000-0000-000000000002.jpg', '{"size": 1000}');
insert into public.media_assets (id, attempt_id, storage_path, mime_type, file_size) values
  ('50000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-0000000000b2/20000000-0000-0000-0000-00000000000b/30000000-0000-0000-0000-000000000002.jpg',
   'image/jpeg', 1000);

select throws_ok($$ update public.attempts set user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'B cannot give an attempt to A or take one (user_id is not writable)');
select throws_ok($$ update public.profiles set id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'B cannot change a profile id');
select throws_ok(
  $$ insert into public.checkins (user_id, attempt_id, local_date, result)
     values ('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-00000000000a', current_date, 'tried') $$,
  '42501', null, 'B cannot write a check-in as A');
select throws_ok(
  $$ update public.attempts set started_at = now() $$,
  '42501', null, 'B cannot write lifecycle timestamps');
select throws_ok(
  $$ insert into public.media_assets (attempt_id, storage_path, mime_type, file_size) values
     ('20000000-0000-0000-0000-00000000000b',
      '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg',
      'image/jpeg', 1000) $$,
  '23514', null, 'B cannot claim A''s file as a photo');
select throws_ok(
  $$ update public.media_assets set journal_entry_id = '40000000-0000-0000-0000-00000000000a'
     where id = '50000000-0000-0000-0000-00000000000b' $$,
  '23503', null, 'B cannot link a photo to A''s note');
select is(public.is_own_media_file(
    '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg'),
  false, 'A''s file is not B''s');
select is(public.is_own_media_path(
    '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000009.jpg'),
  false, 'A''s folder is not an upload path for B');
select is((select count(*)::int from public.profiles), 1, 'B sees only their own profile');
select is((select count(*)::int from public.journal_entries where id = '40000000-0000-0000-0000-00000000000a'), 0, 'B cannot read A''s note by id');
select is((select count(*)::int from storage.objects), 1, 'B sees only their own file');

-- These do nothing rather than fail, so the check is afterwards.
update public.journal_entries set content = 'hacked' where id = '40000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'hacked' where id = '00000000-0000-0000-0000-0000000000a1';
delete from public.media_assets where id = '50000000-0000-0000-0000-00000000000a';
delete from public.attempts where id = '20000000-0000-0000-0000-00000000000a';
delete from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%';
reset role;

select is((select content from public.journal_entries where id = '40000000-0000-0000-0000-00000000000a'),
  'A private note', 'B''s edit changed nothing');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  null, 'B''s profile edit changed nothing');
select is((select count(*)::int from public.media_assets where id = '50000000-0000-0000-0000-00000000000a'),
  1, 'B''s delete left A''s photo row');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%'),
  1, 'B''s delete left A''s file');

-- ---------- anon ----------
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.journal_entries $$, '42501', null, 'anon cannot read notes');
select throws_ok($$ insert into public.attempts (custom_title) values ('x') $$, '42501', null, 'anon cannot write');
select is((select count(*)::int from storage.objects), 0, 'anon sees no files');
reset role;

select * from finish();
rollback;
