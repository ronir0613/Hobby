begin;
select plan(20);

-- The test users' rows and files are all rolled back. Counts are scoped to them: hosted also holds real people's data.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000c3');

select set_config('storage.allow_delete_query', 'true', true);

-- ---------- A fills up ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
insert into public.attempts (id, custom_title) values ('20000000-0000-0000-0000-00000000000a', 'A attempt');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg',
     '{"size": 10000000}') $$,
  'a file under the limit is accepted');
select results_eq(
  $$ select used_bytes, limit_bytes from public.my_media_usage() $$,
  $$ values (10000000::bigint, 10485760::bigint) $$,
  'usage reports real bytes and the limit');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000002.jpg',
     '{"size": 485761}') $$,
  '42501', 'media limit reached', 'one byte over the limit is refused');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000003.jpg',
     '{"size": 485760}') $$,
  'exactly up to the limit is accepted');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000004.jpg') $$,
  '42501', 'media limit reached', 'a full account is refused before the size is known');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg',
     '{"size": 1}') $$,
  '23505', null, 'a retry of the same path gets the duplicate answer, not the limit');

-- Files without rows count, so skipping media_assets gains nothing (nothing above has a row).
select is((select count(*)::int from public.media_assets), 0, 'the limit was reached with no photo rows at all');

-- ---------- Rows must match real files ----------
select throws_ok(
  $$ insert into public.media_assets (attempt_id, storage_path, mime_type, file_size) values
     ('20000000-0000-0000-0000-00000000000a',
      '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000009.jpg',
      'image/jpeg', 1) $$,
  '23503', 'photo file not found', 'a row needs a real file');
insert into public.media_assets (attempt_id, storage_path, mime_type, file_size) values
  ('20000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000001.jpg',
   'image/jpeg', 1);
select is((select file_size from public.media_assets), 10000000::bigint, 'the size comes from the file, not the client');

-- ---------- Deleting frees space ----------
delete from storage.objects where name like '%30000000-0000-0000-0000-000000000003.jpg';
select is((select used_bytes from public.my_media_usage()), 10000000::bigint, 'deleting a file frees its space');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-00000000000a/30000000-0000-0000-0000-000000000005.jpg',
     '{"size": 1000}') $$,
  'there is room again after deleting');
reset role;

-- ---------- Limits are per person ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
set local role authenticated;
insert into public.attempts (id, custom_title) values ('20000000-0000-0000-0000-00000000000b', 'B attempt');
select is((select used_bytes from public.my_media_usage()), 0::bigint, 'B does not see A''s usage');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000b2/20000000-0000-0000-0000-00000000000b/30000000-0000-0000-0000-000000000006.jpg',
     '{"size": 1000}') $$,
  'A''s usage does not limit B');
select is((select count(*)::int from public.my_orphan_media_paths()), 0, 'a new file without a row is not cleaned up yet');
reset role;

-- ---------- Orphans ----------
-- created_at is backdated as postgres, past the hour an upload may need to finish.
update storage.objects set created_at = now() - interval '2 hours'
where name like '00000000-0000-0000-0000-0000000000a1/%';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
select is((select count(*)::int from public.my_orphan_media_paths()), 1, 'A has one old file without a row');
delete from public.attempts where id = '20000000-0000-0000-0000-00000000000a';
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
set local role authenticated;
delete from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%';
reset role;
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%'),
  2, 'B cannot delete A''s files');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
delete from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%';
select is((select used_bytes from public.my_media_usage()), 0::bigint, 'A can remove files whose attempt is gone');
reset role;

-- ---------- Tiny files ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
insert into public.attempts (id, user_id, custom_title)
  values ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c3', 'C attempt');
insert into storage.objects (bucket_id, name, metadata)
select 'activity-media',
  '00000000-0000-0000-0000-0000000000c3/20000000-0000-0000-0000-00000000000c/' || gen_random_uuid() || '.jpg',
  '{"size": 1}'
from generate_series(1, 500);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, metadata) values ('activity-media',
     '00000000-0000-0000-0000-0000000000c3/20000000-0000-0000-0000-00000000000c/30000000-0000-0000-0000-000000000007.jpg',
     '{"size": 1}') $$,
  '42501', 'media limit reached', 'the 501st tiny file is refused');

-- ---------- anon ----------
set local role anon;
select throws_ok($$ select * from public.my_media_usage() $$, '42501', null, 'anon cannot read usage');
select throws_ok($$ select * from public.my_orphan_media_paths() $$, '42501', null, 'anon cannot list orphans');
reset role;

select * from finish();
rollback;
