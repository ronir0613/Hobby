begin;

select no_plan();

-- The initial migration is deliberately not part of this gate.  These tests
-- are the schema contract that migration must satisfy.
with required_columns(table_name, column_name) as (
  values
    ('profiles', 'id'), ('profiles', 'display_name'), ('profiles', 'avatar_path'), ('profiles', 'created_at'), ('profiles', 'updated_at'),
    ('categories', 'id'), ('categories', 'name'), ('categories', 'slug'), ('categories', 'description'), ('categories', 'sort_order'), ('categories', 'is_published'), ('categories', 'created_at'),
    ('interests', 'id'), ('interests', 'category_id'), ('interests', 'name'), ('interests', 'slug'), ('interests', 'description'), ('interests', 'type'), ('interests', 'cover_image_path'), ('interests', 'is_published'), ('interests', 'created_at'), ('interests', 'updated_at'),
    ('starter_ideas', 'id'), ('starter_ideas', 'interest_id'), ('starter_ideas', 'title'), ('starter_ideas', 'description'), ('starter_ideas', 'instructions'), ('starter_ideas', 'estimated_minutes'), ('starter_ideas', 'difficulty'), ('starter_ideas', 'sort_order'), ('starter_ideas', 'is_published'), ('starter_ideas', 'created_at'),
    ('attempts', 'id'), ('attempts', 'user_id'), ('attempts', 'interest_id'), ('attempts', 'starter_idea_id'), ('attempts', 'custom_title'), ('attempts', 'intention_note'), ('attempts', 'planned_for_date'), ('attempts', 'status'), ('attempts', 'started_at'), ('attempts', 'completed_at'), ('attempts', 'dropped_at'), ('attempts', 'created_at'), ('attempts', 'updated_at'),
    ('checkins', 'id'), ('checkins', 'user_id'), ('checkins', 'attempt_id'), ('checkins', 'local_date'), ('checkins', 'result'), ('checkins', 'created_at'),
    ('journal_entries', 'id'), ('journal_entries', 'user_id'), ('journal_entries', 'attempt_id'), ('journal_entries', 'content'), ('journal_entries', 'created_at'), ('journal_entries', 'updated_at'),
    ('media_assets', 'id'), ('media_assets', 'user_id'), ('media_assets', 'attempt_id'), ('media_assets', 'journal_entry_id'), ('media_assets', 'storage_path'), ('media_assets', 'mime_type'), ('media_assets', 'file_size'), ('media_assets', 'created_at'),
    ('notification_preferences', 'id'), ('notification_preferences', 'user_id'), ('notification_preferences', 'morning_enabled'), ('notification_preferences', 'morning_time'), ('notification_preferences', 'evening_enabled'), ('notification_preferences', 'evening_time'), ('notification_preferences', 'timezone'), ('notification_preferences', 'updated_at')
)
select ok(
  exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required_columns.table_name
      and c.column_name = required_columns.column_name
  ),
  format('public.%s has required column %s', table_name, column_name)
)
from required_columns;

select ok(
  exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = table_name
  ),
  format('public.%s exists', table_name)
)
from unnest(array[
  'profiles', 'categories', 'interests', 'starter_ideas', 'attempts', 'checkins',
  'journal_entries', 'media_assets', 'notification_preferences'
]) as table_name;

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'attempts' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%planned%'
      and pg_get_constraintdef(c.oid) like '%active%'
      and pg_get_constraintdef(c.oid) like '%completed%'
      and pg_get_constraintdef(c.oid) like '%dropped%'
  ),
  'attempts restrict status to planned, active, completed, or dropped'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'checkins' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%tried%'
      and pg_get_constraintdef(c.oid) like '%skipped%'
  ),
  'checkins restrict result to tried or skipped'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'attempts' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%interest_id%'
      and pg_get_constraintdef(c.oid) like '%custom_title%'
  ),
  'custom attempts require custom_title when interest_id is null'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.attempts'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%starter_idea_id is null or interest_id is not null%'
  ),
  'starter ideas cannot be attached without their matching interest'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'checkins' and c.contype in ('u', 'p')
      and (select array_agg(a.attname order by x.ordinality)
           from unnest(c.conkey) with ordinality x(attnum, ordinality)
           join pg_attribute a on a.attrelid = r.oid and a.attnum = x.attnum) = array['attempt_id', 'local_date']
  ),
  'checkins have one row per attempt and local date'
);

select ok(
  exists (
    select 1 from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname = 'notification_preferences' and c.contype = 'u'
      and (select array_agg(a.attname order by x.ordinality)
           from unnest(c.conkey) with ordinality x(attnum, ordinality)
           join pg_attribute a on a.attrelid = r.oid and a.attnum = x.attnum) = array['user_id']
  ),
  'notification preferences are unique per user'
);

select ok(
  exists (
    select 1 from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname = 'starter_ideas' and c.contype in ('u', 'p')
      and (select array_agg(a.attname order by x.ordinality)
           from unnest(c.conkey) with ordinality x(attnum, ordinality)
           join pg_attribute a on a.attrelid = r.oid and a.attnum = x.attnum) = array['id', 'interest_id']
  ),
  'starter_ideas has unique parent key (id, interest_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname = 'attempts' and c.contype in ('u', 'p')
      and (select array_agg(a.attname order by x.ordinality
           ) from unnest(c.conkey) with ordinality x(attnum, ordinality)
             join pg_attribute a on a.attrelid = r.oid and a.attnum = x.attnum) = array['id', 'user_id']
  ),
  'attempts has unique parent key (id, user_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname = 'journal_entries' and c.contype in ('u', 'p')
      and (select array_agg(a.attname order by x.ordinality
           ) from unnest(c.conkey) with ordinality x(attnum, ordinality)
             join pg_attribute a on a.attrelid = r.oid and a.attnum = x.attnum) = array['id', 'attempt_id', 'user_id']
  ),
  'journal_entries has unique parent key (id, attempt_id, user_id)'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.attempts'::regclass and c.contype = 'f'
      and c.confrelid = 'public.starter_ideas'::regclass
      and pg_get_constraintdef(c.oid) ilike '%foreign key (starter_idea_id, interest_id) references public.starter_ideas(id, interest_id)%'
  ),
  'attempt starter ideas must reference the matching interest through the composite foreign key'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.checkins'::regclass and c.contype = 'f'
      and c.confrelid = 'public.attempts'::regclass
      and pg_get_constraintdef(c.oid) ilike '%foreign key (attempt_id, user_id) references public.attempts(id, user_id)%'
      and pg_get_constraintdef(c.oid) ilike '%on delete cascade%'
  ),
  'check-ins reference attempts through the owner composite key and cascade on attempt deletion'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.journal_entries'::regclass and c.contype = 'f'
      and c.confrelid = 'public.attempts'::regclass
      and pg_get_constraintdef(c.oid) ilike '%foreign key (attempt_id, user_id) references public.attempts(id, user_id)%'
      and pg_get_constraintdef(c.oid) ilike '%on delete cascade%'
  ),
  'journal entries reference attempts through the owner composite key and cascade on attempt deletion'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.media_assets'::regclass and c.contype = 'f'
      and c.confrelid = 'public.journal_entries'::regclass
      and pg_get_constraintdef(c.oid) ilike '%foreign key (journal_entry_id, attempt_id, user_id) references public.journal_entries(id, attempt_id, user_id)%'
      and pg_get_constraintdef(c.oid) ilike '%on delete set null (journal_entry_id)%'
  ),
  'media journal links use the attempt and owner composite key and clear only the journal link'
);

select ok(
  not exists (
    select 1 from pg_constraint c join pg_class r on r.oid = c.conrelid
    where r.relname = 'attempts' and c.contype in ('u', 'p')
      and (select array_agg(a.attname order by x.ordinality
           ) from unnest(c.conkey) with ordinality x(attnum, ordinality)
             join pg_attribute a on a.attrelid = r.oid and a.attnum = x.attnum) = array['user_id', 'interest_id']
  ),
  'attempt retries are not made unique by user and interest'
);

select ok(
  (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass),
  format('RLS is enabled on public.%s', table_name)
)
from unnest(array[
  'profiles', 'categories', 'interests', 'starter_ideas', 'attempts', 'checkins',
  'journal_entries', 'media_assets', 'notification_preferences'
]) as table_name;

-- Fixture creation proves the auth trigger inserts exactly one profile and defaults remain database-owned.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'schema-test@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb);

select is(
  (select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  1,
  'new auth user receives exactly one profile from the security-definer trigger'
);

insert into public.notification_preferences (user_id)
values ('00000000-0000-0000-0000-000000000101');

select row_eq(
  $$select morning_enabled, morning_time, evening_enabled, evening_time, timezone
      from public.notification_preferences where user_id = '00000000-0000-0000-0000-000000000101'$$,
  row(false, '08:00'::time, false, '20:00'::time, 'UTC'::text),
  'notification preferences have documented defaults'
);

-- Foreign-key delete actions are inspected instead of depending on incidental constraint names.
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.checkins'::regclass and c.contype = 'f' and c.confrelid = 'public.attempts'::regclass limit 1),
  'c', 'attempt deletion cascades checkins'
);
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.journal_entries'::regclass and c.contype = 'f' and c.confrelid = 'public.attempts'::regclass limit 1),
  'c', 'attempt deletion cascades journal entries'
);
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.media_assets'::regclass and c.contype = 'f' and c.confrelid = 'public.attempts'::regclass limit 1),
  'r', 'media metadata restricts attempt deletion'
);
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.media_assets'::regclass and c.contype = 'f' and c.confrelid = 'public.journal_entries'::regclass limit 1),
  'n', 'journal deletion nulls an optional media journal link'
);
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.attempts'::regclass and c.contype = 'f' and c.confrelid = 'public.interests'::regclass limit 1),
  'r', 'catalogue interests with dependent attempts cannot be deleted'
);
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.interests'::regclass and c.contype = 'f' and c.confrelid = 'public.categories'::regclass limit 1),
  'r', 'categories with dependent interests cannot be deleted'
);
select is(
  (select c.confdeltype from pg_constraint c where c.conrelid = 'public.attempts'::regclass and c.contype = 'f' and c.confrelid = 'auth.users'::regclass limit 1),
  'c', 'auth-user deletion cascades into owned attempt history when no media remains'
);

insert into public.attempts (id, user_id, custom_title, planned_for_date)
values ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000101', 'Deletion fixture', current_date);
insert into public.checkins (id, user_id, attempt_id, local_date, result)
values ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000111', current_date, 'tried');
insert into public.journal_entries (id, user_id, attempt_id, content)
values ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000111', 'Deletion fixture');
insert into public.media_assets (id, user_id, attempt_id, journal_entry_id, storage_path, mime_type, file_size)
values ('00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000101/00000000-0000-0000-0000-000000000111/00000000-0000-0000-0000-000000000114.jpg', 'image/jpeg', 1);
select lives_ok($$delete from public.journal_entries where id = '00000000-0000-0000-0000-000000000113'$$, 'journal fixture can be deleted');
select is((select journal_entry_id from public.media_assets where id = '00000000-0000-0000-0000-000000000114'), null::uuid, 'journal deletion clears only the optional media link');
select throws_ok($$delete from auth.users where id = '00000000-0000-0000-0000-000000000101'$$, '.*foreign key.*|.*restrict.*', 'media metadata restricts auth-user deletion');
select lives_ok($$delete from public.media_assets where id = '00000000-0000-0000-0000-000000000114'$$, 'media metadata can be removed after Storage cleanup');
select lives_ok($$delete from auth.users where id = '00000000-0000-0000-0000-000000000101'$$, 'auth-user deletion cascades personal rows once media metadata is removed');
select is((select count(*)::integer from public.attempts where id = '00000000-0000-0000-0000-000000000111'), 0, 'auth deletion cascades attempts and check-ins');

select * from finish();
rollback;
