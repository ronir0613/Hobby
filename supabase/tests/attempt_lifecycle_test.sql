begin;

select no_plan();

-- Lifecycle tests use fixed test UUIDs so the migration can be validated with no seed catalogue.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'lifecycle-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', 'lifecycle-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb);

insert into public.categories (id, name, slug, sort_order, is_published)
values ('00000000-0000-0000-0000-000000000208', 'Lifecycle', 'lifecycle', 1, true);
insert into public.interests (id, category_id, name, slug, type, is_published)
values ('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000208', 'Retry interest', 'retry-interest', 'hobby', true);

-- A migration-side test fixture may create custom planned attempts as postgres. The RPC behavior is tested
-- with authenticated claims below; no direct client check-in writes are used.
insert into public.attempts (id, user_id, custom_title, planned_for_date)
values
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', 'Tried activation', current_date),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000201', 'Skipped activation', current_date),
  ('00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000201', 'Rollback', current_date),
  ('00000000-0000-0000-0000-000000000214', '00000000-0000-0000-0000-000000000201', 'Transitions', current_date),
  ('00000000-0000-0000-0000-000000000215', '00000000-0000-0000-0000-000000000201', 'Retry', current_date - 1),
  ('00000000-0000-0000-0000-000000000217', '00000000-0000-0000-0000-000000000201', 'Terminal drop retry', current_date),
  ('00000000-0000-0000-0000-000000000218', '00000000-0000-0000-0000-000000000201', 'No skipped pair', current_date),
  ('00000000-0000-0000-0000-000000000219', '00000000-0000-0000-0000-000000000201', 'Nonadjacent skips', current_date - 2),
  ('00000000-0000-0000-0000-000000000220', '00000000-0000-0000-0000-000000000201', 'Other attempt pair', current_date - 1),
  ('00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000201', 'Terminal complete retry', current_date),
  ('00000000-0000-0000-0000-000000000216', '00000000-0000-0000-0000-000000000202', 'Other owner', current_date);

update public.attempts
set interest_id = '00000000-0000-0000-0000-000000000209', custom_title = null
where id in ('00000000-0000-0000-0000-000000000217', '00000000-0000-0000-0000-000000000221');

-- Simulate a constraint failure after activation so the RPC transaction must roll both writes back.
insert into public.checkins (id, user_id, attempt_id, local_date, result)
values ('00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000213', current_date, 'tried');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}', true);

-- Explicit skipped history models the two-day decision rule without bypassing lifecycle triggers.
select lives_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000215', current_date - 1, 'skipped', 'UTC')$$, 'first retry skip activates the retry fixture');
select lives_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000215', current_date, 'skipped', 'UTC')$$, 'second adjacent retry skip is recorded');
select lives_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000220', current_date - 1, 'skipped', 'UTC')$$, 'another attempt records its first skipped day');
select lives_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000220', current_date, 'skipped', 'UTC')$$, 'another attempt records its own adjacent skipped pair');
select lives_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000219', current_date - 2, 'skipped', 'UTC')$$, 'nonadjacent fixture records its first skipped day');
select lives_ok($$select public.record_checkin('00000000-0000-0000-0000-000000000219', current_date, 'skipped', 'UTC')$$, 'nonadjacent fixture records a later skip with a missing calendar date');

select lives_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000211', current_date, 'tried', 'UTC')$$,
  'first tried check-in records through the atomic RPC'
);
select row_eq(
  $$select status, started_at is not null from public.attempts where id = '00000000-0000-0000-0000-000000000211'$$,
  row('active'::text, true),
  'first tried check-in activates a planned attempt and sets started_at'
);

select lives_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000212', current_date, 'skipped', 'UTC')$$,
  'first skipped check-in records through the atomic RPC'
);
select row_eq(
  $$select status, started_at is not null from public.attempts where id = '00000000-0000-0000-0000-000000000212'$$,
  row('active'::text, true),
  'first skipped check-in activates a planned attempt and sets started_at'
);

select throws_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000213', current_date - 1, 'tried', 'UTC')$$,
  '.*planned.*', 'check-ins before planned date are rejected'
);

select throws_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000215', current_date + 1, 'UTC', false)$$,
  '.*acknowledg.*|.*skipped.*', 'pending adjacent skipped days require acknowledgement'
);
select lives_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000215', current_date + 1, 'UTC', true)$$,
  'acknowledged active retry advances the same attempt after the latest skip'
);
select is(
  (select count(*)::integer from public.checkins where attempt_id = '00000000-0000-0000-0000-000000000215'),
  2, 'active retry retains prior check-ins'
);
select is(
  (select count(*)::integer from public.attempts where id = '00000000-0000-0000-0000-000000000215'),
  1, 'active retry updates the existing attempt rather than creating another'
);
select throws_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000215', current_date + 2, 'UTC', true)$$,
  '.*no pending.*|.*acknowledg.*', 'the same acknowledged pair cannot trigger the decision again'
);
select throws_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000219', current_date + 1, 'UTC', true)$$,
  '.*no pending.*|.*acknowledg.*', 'a missing date prevents nonadjacent skipped days from forming a pair'
);
select throws_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000218', current_date + 1, 'UTC', true)$$,
  '.*no pending.*|.*acknowledg.*', 'skipped days on another attempt cannot be acknowledged for this attempt'
);
select throws_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000220', current_date + 1, 'UTC', false)$$,
  '.*acknowledg.*|.*skipped.*', 'a pending pair on this attempt requires explicit acknowledgement'
);
select lives_ok(
  $$select public.set_attempt_planned_date('00000000-0000-0000-0000-000000000220', current_date + 1, 'UTC', true)$$,
  'the owner can acknowledge this attempt’s adjacent skipped pair'
);
select ok(
  exists (
    select 1 from public.checkins newer
    join public.checkins older on older.attempt_id = newer.attempt_id and older.local_date = newer.local_date - 1
    join public.attempts a on a.id = newer.attempt_id
    where newer.attempt_id = '00000000-0000-0000-0000-000000000215'
      and newer.result = 'skipped' and older.result = 'skipped' and newer.local_date >= a.planned_for_date
  ) is false,
  'advancing planned_for_date acknowledges the skipped pair and prevents repeat prompting'
);
select throws_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000213', current_date + 1, 'tried', 'UTC')$$,
  '.*future.*', 'future local-date check-ins are rejected'
);

select lives_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000217', current_date, 'tried', 'UTC')$$,
  'terminal drop fixture first becomes active with a historical check-in'
);
select lives_ok(
  $$select public.transition_attempt('00000000-0000-0000-0000-000000000217', 'dropped')$$,
  'active attempt can be dropped'
);
select lives_ok(
  $$insert into public.attempts (interest_id, planned_for_date) values ('00000000-0000-0000-0000-000000000209', current_date)$$,
  'a dropped interest can be started again as a new attempt'
);
select row_eq(
  $$select status, dropped_at is not null, (select count(*) from public.checkins where attempt_id = '00000000-0000-0000-0000-000000000217')
      from public.attempts where id = '00000000-0000-0000-0000-000000000217'$$,
  row('dropped'::text, true, 1::bigint),
  'dropping preserves the terminal row, timestamp, and historical check-in'
);
select lives_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000221', current_date, 'tried', 'UTC')$$,
  'terminal completion fixture first becomes active'
);
select lives_ok(
  $$select public.transition_attempt('00000000-0000-0000-0000-000000000221', 'completed')$$,
  'active attempt can be completed'
);
select lives_ok(
  $$insert into public.attempts (interest_id, planned_for_date) values ('00000000-0000-0000-0000-000000000209', current_date)$$,
  'a completed interest can be started again as a new attempt'
);
select row_eq(
  $$select status, completed_at is not null, (select count(*) from public.checkins where attempt_id = '00000000-0000-0000-0000-000000000221')
      from public.attempts where id = '00000000-0000-0000-0000-000000000221'$$,
  row('completed'::text, true, 1::bigint),
  'completion preserves the terminal row, timestamp, and historical check-in'
);
select throws_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000213', current_date, 'tried', 'Not/AZone')$$,
  '.*timezone.*', 'invalid timezones are rejected'
);
select throws_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000211', current_date, 'tried', 'UTC')$$,
  '.*duplicate.*|.*unique.*', 'duplicate attempt/date check-ins are rejected'
);
select row_eq(
  $$select status, (select count(*) from public.checkins where attempt_id = '00000000-0000-0000-0000-000000000213')
      from public.attempts where id = '00000000-0000-0000-0000-000000000213'$$,
  row('planned'::text, 1::bigint),
  'failed insert rolls back the planned-to-active transition and preserves prior history'
);

select lives_ok(
  $$select public.transition_attempt('00000000-0000-0000-0000-000000000214', 'dropped')$$,
  'planned attempts may transition to dropped'
);
select throws_ok(
  $$select public.transition_attempt('00000000-0000-0000-0000-000000000214', 'active')$$,
  '.*transition.*|.*terminal.*', 'terminal attempts cannot be reopened'
);
select throws_ok(
  $$select public.transition_attempt('00000000-0000-0000-0000-000000000213', 'active')$$,
  '.*transition.*', 'planned to active is reserved for record_checkin'
);

select throws_ok(
  $$select public.record_checkin('00000000-0000-0000-0000-000000000216', current_date, 'tried', 'UTC')$$,
  '.*owner.*|.*not found.*|.*permission.*', 'RPC rejects cross-user attempt access'
);

reset role;

-- Run grants under the same claims to prove only intention_note is directly mutable.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}', true);
select lives_ok(
  $$update public.attempts set intention_note = 'updated directly' where id = '00000000-0000-0000-0000-000000000211'$$,
  'owners can update intention_note directly'
);
select ok(
  (select updated_at > created_at from public.attempts where id = '00000000-0000-0000-0000-000000000211'),
  'updated_at is maintained by a database trigger when intention_note changes'
);
select throws_ok($$update public.attempts set status = 'completed' where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct status edits are denied');
select throws_ok($$update public.attempts set planned_for_date = current_date + 1 where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct planned date edits are denied');
select throws_ok($$update public.attempts set id = '00000000-0000-0000-0000-000000000299' where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct id edits are denied');
select throws_ok($$update public.attempts set user_id = '00000000-0000-0000-0000-000000000202' where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct owner edits are denied');
select throws_ok($$update public.attempts set created_at = now() where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct created_at edits are denied');
select throws_ok($$update public.attempts set started_at = now() where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct lifecycle timestamp edits are denied');
select throws_ok($$update public.attempts set updated_at = now() where id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'direct updated_at edits are denied');
select throws_ok($$update public.checkins set result = 'skipped' where attempt_id = '00000000-0000-0000-0000-000000000211'$$, '.*permission.*|.*denied.*', 'check-ins are append-only');

select * from finish();
rollback;
