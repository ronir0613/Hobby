begin;
select plan(20);

select has_table('public', t, 'table ' || t || ' exists')
from unnest(array['profiles','categories','interests','starter_ideas','attempts',
                  'checkins','journal_entries','media_assets','notification_preferences']) t;

select ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'RLS is enabled on every public table'
);

select is((select count(*)::int from public.categories where is_published), 10, 'catalogue: 10 categories');
select is((select count(*)::int from public.interests where is_published), 68, 'catalogue: 68 interests');
select is((select count(*)::int from public.starter_ideas where is_published), 204, 'catalogue: 204 starter ideas');
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

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'activity-media' $$,
  $$ values (false, 10485760::bigint, array['image/jpeg','image/png','image/webp']) $$,
  'activity-media bucket is private, 10 MiB, images only'
);

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'a profile is created for each new auth user');

select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public'
                and p.proname in ('record_checkin','transition_attempt','set_attempt_planned_date')),
  'no heavy lifecycle RPCs from the old design'
);

select * from finish();
rollback;
