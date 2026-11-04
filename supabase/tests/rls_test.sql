begin;

select no_plan();

-- All fixture writes happen before role changes. User-facing assertions set both claim variables.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000301', 'authenticated', 'authenticated', 'rls-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000302', 'authenticated', 'authenticated', 'rls-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb);

insert into public.categories (id, name, slug, sort_order, is_published)
values
  ('00000000-0000-0000-0000-000000000311', 'Published', 'published', 1, true),
  ('00000000-0000-0000-0000-000000000312', 'Hidden', 'hidden', 2, false);
insert into public.interests (id, category_id, name, slug, type, is_published)
values
  ('00000000-0000-0000-0000-000000000321', '00000000-0000-0000-0000-000000000311', 'Published interest', 'published-interest', 'hobby', true),
  ('00000000-0000-0000-0000-000000000322', '00000000-0000-0000-0000-000000000312', 'Hidden parent', 'hidden-parent', 'hobby', true),
  ('00000000-0000-0000-0000-000000000323', '00000000-0000-0000-0000-000000000311', 'Hidden interest', 'hidden-interest', 'hobby', false);
insert into public.starter_ideas (id, interest_id, title, sort_order, is_published)
values
  ('00000000-0000-0000-0000-000000000331', '00000000-0000-0000-0000-000000000321', 'Visible idea', 1, true),
  ('00000000-0000-0000-0000-000000000332', '00000000-0000-0000-0000-000000000322', 'Hidden category idea', 1, true),
  ('00000000-0000-0000-0000-000000000333', '00000000-0000-0000-0000-000000000323', 'Hidden interest idea', 1, true);
insert into public.attempts (id, user_id, custom_title, planned_for_date)
values
  ('00000000-0000-0000-0000-000000000341', '00000000-0000-0000-0000-000000000301', 'A attempt', current_date),
  ('00000000-0000-0000-0000-000000000342', '00000000-0000-0000-0000-000000000302', 'B attempt', current_date);
insert into public.journal_entries (id, user_id, attempt_id, content)
values ('00000000-0000-0000-0000-000000000351', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000342', 'B journal');
insert into public.checkins (id, user_id, attempt_id, local_date, result)
values ('00000000-0000-0000-0000-000000000371', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000342', current_date, 'skipped');
insert into public.media_assets (id, user_id, attempt_id, journal_entry_id, storage_path, mime_type, file_size)
values ('00000000-0000-0000-0000-000000000361', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000342', '00000000-0000-0000-0000-000000000351', '00000000-0000-0000-0000-000000000302/00000000-0000-0000-0000-000000000342/00000000-0000-0000-0000-000000000361.jpg', 'image/jpeg', 1);

select ok(has_table_privilege('anon', 'public.categories', 'SELECT'), 'anonymous role can select catalogue rows');
select ok(not has_table_privilege('anon', 'public.categories', 'INSERT'), 'anonymous role cannot write catalogue rows');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anonymous role has no personal-table privileges');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'authenticated role cannot insert profiles');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'DELETE'), 'authenticated role cannot delete profiles');
select ok(has_column_privilege('authenticated', 'public.attempts', 'intention_note', 'UPDATE'), 'authenticated role may update intention notes');
select ok(not has_column_privilege('authenticated', 'public.attempts', 'status', 'UPDATE'), 'authenticated role cannot update attempt status directly');
select ok(not has_column_privilege('authenticated', 'public.attempts', 'planned_for_date', 'UPDATE'), 'authenticated role cannot update planned dates directly');
select ok(not has_column_privilege('authenticated', 'public.attempts', 'started_at', 'UPDATE'), 'authenticated role cannot update lifecycle timestamps directly');
select ok(not has_table_privilege('authenticated', 'public.checkins', 'INSERT'), 'authenticated role cannot directly insert check-ins');
select ok(not has_table_privilege('authenticated', 'public.checkins', 'UPDATE'), 'authenticated role cannot directly update check-ins');
select ok(not has_table_privilege('authenticated', 'public.checkins', 'DELETE'), 'authenticated role cannot directly delete check-ins');
select ok(has_table_privilege('authenticated', 'public.media_assets', 'DELETE'), 'authenticated role can delete media metadata after the storage policy allows it');
select ok(not has_table_privilege('anon', 'storage.objects', 'SELECT'), 'anonymous role cannot read private Storage objects');
select ok(not has_table_privilege('authenticated', 'storage.objects', 'UPDATE'), 'authenticated role cannot update or upsert Storage objects');
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'media_assets' and cmd = 'DELETE'
      and policyname = 'media_assets_delete_own_after_storage_removal'
      and lower(qual) like '%storage.objects%' and lower(qual) like '%not%'
  ),
  'media metadata deletion is denied until its Storage object has been removed'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::integer from public.categories), 1, 'anonymous users read only published categories');
select is((select count(*)::integer from public.interests), 1, 'anonymous users read only published interests with published categories');
select is((select count(*)::integer from public.starter_ideas), 1, 'anonymous users do not see starter ideas through unpublished parents');
select throws_ok($$insert into public.categories (name, slug, sort_order) values ('x', 'x', 1)$$, '.*permission.*|.*denied.*', 'anonymous catalogue writes are unavailable');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}', true);
select is((select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000301'), 1, 'user A reads own profile');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000302'), 0, 'user A cannot read user B profile');
select is((select count(*)::integer from public.attempts), 1, 'user A reads only own attempts');
select is((select count(*)::integer from public.checkins), 0, 'user A cannot read user B check-ins');
select is((select count(*)::integer from public.journal_entries), 0, 'user A cannot read user B journal entries');
select is((select count(*)::integer from public.media_assets), 0, 'user A cannot read user B media metadata');
select lives_ok($$update public.profiles set display_name = 'A' where id = '00000000-0000-0000-0000-000000000301'$$, 'user A can update own profile');
select throws_ok($$insert into public.profiles (id) values ('00000000-0000-0000-0000-000000000301')$$, '.*permission.*|.*denied.*', 'users cannot insert profiles directly');
select throws_ok($$delete from public.profiles where id = '00000000-0000-0000-0000-000000000301'$$, '.*permission.*|.*denied.*', 'users cannot delete profiles directly');
select throws_ok($$insert into public.checkins (user_id, attempt_id, local_date, result) values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000341', current_date, 'tried')$$, '.*permission.*|.*denied.*', 'direct check-in insert is denied');
select throws_ok($$update public.checkins set result = 'tried' where id = '00000000-0000-0000-0000-000000000371'$$, '.*permission.*|.*denied.*', 'direct check-in update is denied');
select throws_ok($$delete from public.checkins where id = '00000000-0000-0000-0000-000000000371'$$, '.*permission.*|.*denied.*', 'direct check-in delete is denied');
select lives_ok($$insert into public.notification_preferences (user_id) values ('00000000-0000-0000-0000-000000000301')$$, 'user A can create own notification preferences');
select lives_ok($$update public.notification_preferences set morning_enabled = true where user_id = '00000000-0000-0000-0000-000000000301'$$, 'user A can update own notification preferences');
select is((select count(*)::integer from public.notification_preferences where user_id = '00000000-0000-0000-0000-000000000302'), 0, 'user A cannot read user B notification preferences');
select is(
  (with deleted as (delete from public.attempts where id = '00000000-0000-0000-0000-000000000342' returning id) select count(*)::integer from deleted),
  0, 'user A cannot delete user B attempt'
);
select throws_ok($$insert into public.journal_entries (user_id, attempt_id, content) values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000342', 'cross-user')$$, '.*permission.*|.*denied.*|.*foreign key.*', 'user A cannot attach a child row to user B attempt');
select lives_ok($$insert into public.journal_entries (user_id, attempt_id, content) values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000341', 'own journal')$$, 'user A can attach a journal entry to own attempt');
select lives_ok($$insert into public.attempts (custom_title, planned_for_date) values ('A new attempt', current_date)$$, 'user A can create an owned planned attempt using database defaults');
select is(
  (with changed as (update public.attempts set intention_note = 'cross-user edit' where id = '00000000-0000-0000-0000-000000000342' returning id) select count(*)::integer from changed),
  0, 'user A cannot mutate user B attempt'
);
select is(
  (with changed as (delete from public.journal_entries where id = '00000000-0000-0000-0000-000000000351' returning id) select count(*)::integer from changed),
  0, 'user A cannot delete user B journal entry'
);
select throws_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000342', current_date, 'tried', 'UTC')$$, '.*owner.*|.*not found.*|.*permission.*', 'RPC rejects cross-user attempt access');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}', true);
select is((select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000302'), 1, 'user B reads own profile');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000301'), 0, 'user B cannot read user A profile');
select is((select count(*)::integer from public.attempts), 1, 'user B reads only own attempts');
select is((select count(*)::integer from public.checkins), 1, 'user B reads own check-in');
select is((select count(*)::integer from public.journal_entries), 1, 'user B reads own journal entry');
select is((select count(*)::integer from public.media_assets), 1, 'user B reads own media metadata');
select lives_ok($$update public.attempts set intention_note = 'B note' where id = '00000000-0000-0000-0000-000000000342'$$, 'user B can update their own intention note');
select is(
  (with changed as (update public.attempts set intention_note = 'cross-user edit' where id = '00000000-0000-0000-0000-000000000341' returning id) select count(*)::integer from changed),
  0, 'user B cannot mutate user A attempt'
);
select is(
  (with deleted as (delete from public.attempts where id = '00000000-0000-0000-0000-000000000341' returning id) select count(*)::integer from deleted),
  0, 'user B cannot delete user A attempt'
);
reset role;

select row_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'activity-media'$$,
  row(false, 10485760::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  'activity-media is private, capped at 10 MiB, and allows JPEG/PNG/WebP only'
);
select ok(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname ilike '%activity%') >= 3,
  'activity-media Storage has owner-scoped select/insert/delete policies'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%auth.uid()%'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%attempt%'
  ),
  'Storage policies require an authenticated owner path and an owned attempt'
);

select * from finish();
rollback;
