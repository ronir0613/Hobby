begin;
select plan(28);

select has_table('public', t, 'table ' || t || ' exists')
from unnest(array['profiles','categories','interests','starter_ideas','starter_idea_links','attempts',
                  'checkins','journal_entries','media_assets','notification_preferences']) t;

select ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'RLS is enabled on every public table'
);

select is((select count(*)::int from public.categories where is_published), 15, 'catalogue: 15 categories');
select is((select count(*)::int from public.interests where is_published), 100, 'catalogue: 100 hobbies');
select is((select count(*)::int from public.starter_ideas where is_published), 300, 'catalogue: 300 starter ideas');
select is(
  (select count(*)::int from public.interests
   where slug in ('photography','drawing','guitar','cooking','gardening','cycling','meditation','reading','city-walks')),
  9, 'catalogue: the 9 original slugs are kept');
select ok(
  (select bool_and(n between 2 and 3) from (
     select count(s.id) as n from public.interests i
     left join public.starter_ideas s on s.interest_id = i.id and s.is_published
     where i.is_published group by i.id) t),
  'catalogue: every interest has 2 or 3 starter ideas');
select ok(
  not exists (select 1 from public.starter_ideas
              where is_published and (difficulty is null or estimated_minutes is null
                                      or coalesce(instructions, '') = '')),
  'catalogue: every starter idea has steps, minutes and a difficulty');
select ok(
  not exists (select 1 from public.interests where is_published and coalesce(description, '') = ''),
  'catalogue: every interest has a description');
select is((select count(*)::int from public.starter_idea_links where is_published), 93, 'catalogue: 93 reference links');
select ok(
  not exists (select 1 from public.starter_idea_links
              where url not like 'https://%' or title = '' or publisher = ''),
  'catalogue: every link is https with a title and publisher');
select is((select count(*)::int from public.interests where is_published and safety_note is not null),
  15, 'catalogue: 15 hobbies have a safety note');

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'activity-media' $$,
  $$ values (false, 10485760::bigint, array['image/jpeg','image/png','image/webp']) $$,
  'activity-media bucket is private, 10 MiB, images only'
);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'a profile is created for each new auth user');

-- Step 15: quiz answers on the profile (all five and the time, or none).
select throws_ok(
  $$ update public.profiles set quiz_mood = 'calm' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'quiz: a partial set of answers is rejected');
select throws_ok(
  $$ update public.profiles set quiz_setting = 'indoor', quiz_social = 'solo', quiz_time = 'short',
       quiz_mood = 'sleepy', quiz_cost = 'free', quiz_answered_at = now()
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'quiz: an unknown answer is rejected');
select lives_ok(
  $$ update public.profiles set quiz_setting = 'indoor', quiz_social = 'solo', quiz_time = 'short',
       quiz_mood = 'calm', quiz_cost = 'free', quiz_answered_at = now()
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'quiz: a full set of answers is saved');
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'quiz_mood', 'UPDATE')
    and has_column_privilege('authenticated', 'public.profiles', 'quiz_answered_at', 'UPDATE')
    and not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'),
  'quiz: signed-in users can write their answers, not the id');

select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public'
                and p.proname in ('record_checkin','transition_attempt','set_attempt_planned_date')),
  'no heavy lifecycle RPCs from the old design'
);

select * from finish();
rollback;
