begin;
select plan(13);

-- Rolled back. Counts are scoped to the test users: hosted also holds real people's data.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
insert into public.attempts (id, custom_title) values ('20000000-0000-0000-0000-00000000000a', 'A attempt');
insert into public.journal_entries (id, attempt_id, content)
  values ('40000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'short');

-- ---------- Text ----------
select lives_ok(
  $$ insert into public.journal_entries (attempt_id, content)
     values ('20000000-0000-0000-0000-00000000000a', repeat('x', 2000)) $$,
  'a note of 2000 characters is accepted, the app''s own maximum');
select throws_ok(
  $$ insert into public.journal_entries (attempt_id, content)
     values ('20000000-0000-0000-0000-00000000000a', repeat('x', 2001)) $$,
  '23514', null, 'a longer note is refused');
select throws_ok(
  $$ update public.journal_entries set content = repeat('x', 2001) where id = '40000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'a note can''t grow past the limit by editing');
select throws_ok(
  $$ insert into public.attempts (custom_title) values (repeat('x', 201)) $$,
  '23514', null, 'an oversized custom title is refused');
select throws_ok(
  $$ update public.attempts set intention_note = repeat('x', 2001) $$,
  '23514', null, 'an oversized intention note is refused');
select throws_ok(
  $$ update public.profiles set avatar_path = repeat('x', 501) $$,
  '23514', null, 'an oversized avatar path is refused');
select throws_ok(
  $$ insert into public.notification_preferences (timezone) values (repeat('x', 65)) $$,
  '23514', null, 'an oversized time zone is refused');
reset role;

-- ---------- Row counts ----------
insert into public.journal_entries (user_id, attempt_id, content)
select '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-00000000000a', 'n'
from generate_series(1, 998);

set local role authenticated;
select is((select count(*)::int from public.journal_entries), 1000, 'A has reached 1000 notes');
select throws_ok(
  $$ insert into public.journal_entries (attempt_id, content)
     values ('20000000-0000-0000-0000-00000000000a', 'one more') $$,
  'P0001', 'row limit reached', 'the 1001st note is refused');
select lives_ok(
  $$ update public.journal_entries set content = 'edited' where id = '40000000-0000-0000-0000-00000000000a' $$,
  'notes can still be edited at the limit');
reset role;

insert into public.attempts (user_id, custom_title)
select '00000000-0000-0000-0000-0000000000b2', 'b' from generate_series(1, 300);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
set local role authenticated;
select throws_ok(
  $$ insert into public.attempts (custom_title) values ('one more') $$,
  'P0001', 'row limit reached', 'the 301st attempt is refused');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
select lives_ok(
  $$ insert into public.attempts (custom_title) values ('A again') $$,
  'B''s limit does not affect A');
reset role;

select has_trigger('public', 'checkins', 'enforce_row_limit', 'check-ins have the row limit too');

select * from finish();
rollback;
