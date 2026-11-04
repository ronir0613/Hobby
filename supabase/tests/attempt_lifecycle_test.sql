begin;
select plan(20);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');

-- Act as user A
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

insert into public.attempts (id, interest_id, planned_for_date)
select '10000000-0000-0000-0000-000000000001', id, current_date from public.interests where slug = 'guitar';

select results_eq(
  $$ select status, started_at is null from public.attempts where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('planned'::text, true) $$,
  'new attempt starts planned with no started_at'
);

-- First check-in activates the attempt
insert into public.checkins (attempt_id, local_date, result)
values ('10000000-0000-0000-0000-000000000001', current_date - 1, 'tried');
select results_eq(
  $$ select status, started_at is not null from public.attempts where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('active'::text, true) $$,
  'first check-in makes the attempt active and sets started_at'
);

insert into public.checkins (attempt_id, local_date, result)
values ('10000000-0000-0000-0000-000000000001', current_date, 'skipped');
select is((select count(*)::int from public.checkins), 2, 'a skipped day is just another check-in');

select throws_ok(
  $$ insert into public.checkins (attempt_id, local_date, result)
     values ('10000000-0000-0000-0000-000000000001', current_date, 'tried') $$,
  '23505', null, 'one check-in per attempt per day'
);

select throws_ok(
  $$ insert into public.checkins (attempt_id, local_date, result)
     values ('10000000-0000-0000-0000-000000000001', current_date + 3, 'tried') $$,
  '23514', null, 'check-ins cannot be in the future'
);

-- Fix a wrong check-in
update public.checkins set result = 'tried' where local_date = current_date;
select is((select result from public.checkins where local_date = current_date), 'tried',
  'a check-in result can be corrected');

-- Undo check-ins
delete from public.checkins where local_date = current_date;
select is((select status from public.attempts where id = '10000000-0000-0000-0000-000000000001'),
  'active', 'undoing one of several check-ins keeps the attempt active');

delete from public.checkins where local_date = current_date - 1;
select results_eq(
  $$ select status, started_at is null from public.attempts where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('planned'::text, true) $$,
  'undoing the last check-in puts the attempt back to planned'
);

-- Free status changes; timestamps follow
insert into public.checkins (attempt_id, local_date, result)
values ('10000000-0000-0000-0000-000000000001', current_date, 'tried');
update public.attempts set status = 'completed' where id = '10000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select completed_at is not null, dropped_at is null from public.attempts where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values (true, true) $$, 'completing sets completed_at'
);

update public.attempts set status = 'active' where id = '10000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select completed_at is null, started_at is not null from public.attempts where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values (true, true) $$, 'a completed attempt can be reopened'
);

update public.attempts set status = 'dropped' where id = '10000000-0000-0000-0000-000000000001';
select isnt((select dropped_at from public.attempts where id = '10000000-0000-0000-0000-000000000001'),
  null, 'dropping sets dropped_at');

update public.attempts set status = 'active' where id = '10000000-0000-0000-0000-000000000001';
select is((select dropped_at from public.attempts where id = '10000000-0000-0000-0000-000000000001'),
  null, 'a dropped attempt can be picked back up');

insert into public.checkins (attempt_id, local_date, result)
values ('10000000-0000-0000-0000-000000000001', current_date - 2, 'tried');
update public.attempts set status = 'completed' where id = '10000000-0000-0000-0000-000000000001';
delete from public.checkins where local_date = current_date - 2;
select is((select status from public.attempts where id = '10000000-0000-0000-0000-000000000001'),
  'completed', 'undoing a check-in never changes a completed attempt');

-- Timestamps cannot be written by the app
select throws_ok(
  $$ update public.attempts set started_at = now() - interval '1 year' $$,
  '42501', null, 'started_at is not writable by clients'
);
select throws_ok(
  $$ update public.attempts set user_id = gen_random_uuid() $$,
  '42501', null, 'user_id is not writable by clients'
);

-- Shape rules
select throws_ok(
  $$ insert into public.attempts (custom_title) values ('  ') $$,
  '23514', null, 'a custom attempt needs a title'
);
select lives_ok(
  $$ insert into public.attempts (custom_title) values ('Learn to juggle') $$,
  'a custom attempt with a title and no date is fine'
);
select throws_ok(
  $$ insert into public.attempts (interest_id, starter_idea_id)
     select i.id, s.id from public.interests i, public.starter_ideas s
     join public.interests si on si.id = s.interest_id
     where i.slug = 'guitar' and si.slug = 'drawing' $$,
  '23503', null, 'a starter idea must belong to the attempt''s interest'
);

-- Deleting an attempt removes its history
insert into public.journal_entries (attempt_id, content)
values ('10000000-0000-0000-0000-000000000001', 'Fingers hurt but fun');
delete from public.attempts where id = '10000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.checkins), 0, 'deleting an attempt removes its check-ins');
select is((select count(*)::int from public.journal_entries), 0, 'deleting an attempt removes its journal');

select * from finish();
rollback;
