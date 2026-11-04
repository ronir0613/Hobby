begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.categories (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.interests (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  type text not null check (type in ('hobby', 'habit', 'both')),
  cover_image_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (category_id, slug)
);

create table public.starter_ideas (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  interest_id uuid not null references public.interests (id) on delete restrict,
  title text not null,
  description text,
  instructions text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  difficulty text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  unique (id, interest_id)
);

create table public.attempts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  interest_id uuid references public.interests (id) on delete restrict,
  starter_idea_id uuid,
  custom_title text,
  intention_note text,
  planned_for_date date not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'dropped')),
  started_at timestamptz,
  completed_at timestamptz,
  dropped_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint attempts_starter_requires_interest check (starter_idea_id is null or interest_id is not null),
  constraint attempts_custom_title_required check (interest_id is not null or nullif(pg_catalog.btrim(custom_title), '') is not null),
  constraint attempts_starter_interest_fk foreign key (starter_idea_id, interest_id)
    references public.starter_ideas (id, interest_id) on delete restrict,
  unique (id, user_id)
);

create table public.checkins (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  local_date date not null,
  result text not null check (result in ('tried', 'skipped')),
  created_at timestamptz not null default pg_catalog.now(),
  constraint checkins_attempt_owner_fk foreign key (attempt_id, user_id)
    references public.attempts (id, user_id) on delete cascade,
  unique (attempt_id, local_date)
);

create table public.journal_entries (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  content text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint journal_entries_attempt_owner_fk foreign key (attempt_id, user_id)
    references public.attempts (id, user_id) on delete cascade,
  unique (id, attempt_id, user_id)
);

create table public.media_assets (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  attempt_id uuid not null,
  journal_entry_id uuid,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default pg_catalog.now(),
  constraint media_assets_path_matches_owner check (
    storage_path ~* ('^' || user_id::text || '/' || attempt_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')
  ),
  constraint media_assets_path_matches_mime check (
    (mime_type = 'image/jpeg' and storage_path ~* '\.(jpg|jpeg)$') or
    (mime_type = 'image/png' and storage_path ~* '\.png$') or
    (mime_type = 'image/webp' and storage_path ~* '\.webp$')
  ),
  constraint media_assets_attempt_owner_fk foreign key (attempt_id, user_id)
    references public.attempts (id, user_id) on delete restrict,
  constraint media_assets_journal_attempt_owner_fk foreign key (journal_entry_id, attempt_id, user_id)
    references public.journal_entries (id, attempt_id, user_id) on delete set null (journal_entry_id)
);

create table public.notification_preferences (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  morning_enabled boolean not null default false,
  morning_time time not null default time '08:00',
  evening_enabled boolean not null default false,
  evening_time time not null default time '20:00',
  timezone text not null default 'UTC',
  updated_at timestamptz not null default pg_catalog.now()
);

create index interests_category_id_idx on public.interests (category_id);
create index starter_ideas_interest_id_idx on public.starter_ideas (interest_id);
create index attempts_user_id_created_at_idx on public.attempts (user_id, created_at desc);
create index attempts_user_id_status_idx on public.attempts (user_id, status);
create index attempts_interest_id_idx on public.attempts (interest_id) where interest_id is not null;
create index checkins_user_id_local_date_idx on public.checkins (user_id, local_date desc);
create index checkins_attempt_id_local_date_idx on public.checkins (attempt_id, local_date desc);
create index journal_entries_user_id_created_at_idx on public.journal_entries (user_id, created_at desc);
create index journal_entries_attempt_id_created_at_idx on public.journal_entries (attempt_id, created_at desc);
create index media_assets_user_id_attempt_id_idx on public.media_assets (user_id, attempt_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger interests_set_updated_at
before update on public.interests
for each row execute function public.set_updated_at();

create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

create or replace function public.protect_attempt_fields()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'planned'
       or new.started_at is not null
       or new.completed_at is not null
       or new.dropped_at is not null then
      raise exception 'New attempts must start planned without lifecycle timestamps'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Attempt identity and creation fields are immutable'
      using errcode = '42501';
  end if;

  if new.planned_for_date is distinct from old.planned_for_date
     and old.status not in ('planned', 'active') then
    raise exception 'Terminal attempts cannot be rescheduled'
      using errcode = '23514';
  end if;

  if new.status is not distinct from old.status then
    if new.started_at is distinct from old.started_at
       or new.completed_at is distinct from old.completed_at
       or new.dropped_at is distinct from old.dropped_at then
      raise exception 'Lifecycle timestamps are maintained by database transitions'
        using errcode = '42501';
    end if;
  else
    if new.started_at is distinct from old.started_at
       or new.completed_at is distinct from old.completed_at
       or new.dropped_at is distinct from old.dropped_at then
      raise exception 'Lifecycle timestamps cannot be supplied by callers'
        using errcode = '42501';
    end if;

    if old.status = 'planned' and new.status = 'active' then
      new.started_at := pg_catalog.clock_timestamp();
    elsif old.status = 'planned' and new.status = 'dropped' then
      new.dropped_at := pg_catalog.clock_timestamp();
    elsif old.status = 'active' and new.status = 'completed' then
      new.completed_at := pg_catalog.clock_timestamp();
    elsif old.status = 'active' and new.status = 'dropped' then
      new.dropped_at := pg_catalog.clock_timestamp();
    else
      raise exception 'Invalid attempt status transition: % to %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$function$;

create trigger attempts_protect_fields
before insert or update on public.attempts
for each row execute function public.protect_attempt_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$function$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.record_checkin(
  p_attempt_id uuid,
  p_local_date date,
  p_result text,
  p_local_timezone text
)
returns public.checkins
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.attempts%rowtype;
  v_checkin public.checkins%rowtype;
  v_local_today date;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if p_result is null or p_result not in ('tried', 'skipped') then
    raise exception 'Check-in result must be tried or skipped' using errcode = '23514';
  end if;

  if p_local_date is null then
    raise exception 'Check-in local date is required' using errcode = '22004';
  end if;

  if p_local_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_local_timezone
  ) then
    raise exception 'A valid IANA timezone is required' using errcode = '22023';
  end if;

  select a.* into v_attempt
  from public.attempts as a
  where a.id = p_attempt_id and a.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt not found or not owned by the current user' using errcode = 'P0002';
  end if;

  if v_attempt.status not in ('planned', 'active') then
    raise exception 'Check-ins are only allowed for planned or active attempts' using errcode = '23514';
  end if;

  v_local_today := (pg_catalog.now() at time zone p_local_timezone)::date;
  if p_local_date < v_attempt.planned_for_date then
    raise exception 'Check-in date cannot be before the planned date' using errcode = '22023';
  end if;
  if p_local_date > v_local_today then
    raise exception 'Check-in date cannot be in the future' using errcode = '22023';
  end if;

  if v_attempt.status = 'planned' then
    update public.attempts set status = 'active' where id = v_attempt.id;
  end if;

  insert into public.checkins (user_id, attempt_id, local_date, result)
  values (auth.uid(), v_attempt.id, p_local_date, p_result)
  returning * into v_checkin;

  return v_checkin;
end;
$function$;

create or replace function public.transition_attempt(
  p_attempt_id uuid,
  p_new_status text
)
returns public.attempts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.attempts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select a.* into v_attempt
  from public.attempts as a
  where a.id = p_attempt_id and a.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt not found or not owned by the current user' using errcode = 'P0002';
  end if;

  if not (
    (v_attempt.status = 'planned' and p_new_status = 'dropped')
    or (v_attempt.status = 'active' and p_new_status in ('completed', 'dropped'))
  ) then
    raise exception 'Invalid attempt status transition: % to %', v_attempt.status, p_new_status
      using errcode = '23514';
  end if;

  update public.attempts set status = p_new_status where id = v_attempt.id
  returning * into v_attempt;
  return v_attempt;
end;
$function$;

create or replace function public.set_attempt_planned_date(
  p_attempt_id uuid,
  p_new_date date,
  p_local_timezone text,
  p_acknowledge_skipped_pair boolean
)
returns public.attempts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.attempts%rowtype;
  v_local_today date;
  v_latest_skipped_date date;
  v_pending_pair_date date;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if p_new_date is null then
    raise exception 'A planned date is required' using errcode = '22004';
  end if;

  if p_acknowledge_skipped_pair is null then
    raise exception 'Acknowledgement choice is required' using errcode = '22004';
  end if;

  if p_local_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_local_timezone
  ) then
    raise exception 'A valid IANA timezone is required' using errcode = '22023';
  end if;

  select a.* into v_attempt
  from public.attempts as a
  where a.id = p_attempt_id and a.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt not found or not owned by the current user' using errcode = 'P0002';
  end if;

  if v_attempt.status not in ('planned', 'active') then
    raise exception 'Only planned or active attempts can be rescheduled' using errcode = '23514';
  end if;

  v_local_today := (pg_catalog.now() at time zone p_local_timezone)::date;
  if p_new_date < v_local_today then
    raise exception 'Planned date cannot be in the past' using errcode = '22023';
  end if;

  if v_attempt.status = 'active' then
    select pg_catalog.max(c.local_date) into v_latest_skipped_date
    from public.checkins as c
    where c.attempt_id = v_attempt.id and c.user_id = v_attempt.user_id and c.result = 'skipped';

    select pg_catalog.max(later.local_date) into v_pending_pair_date
    from public.checkins as later
    join public.checkins as earlier
      on earlier.attempt_id = later.attempt_id
     and earlier.local_date = later.local_date - 1
    where later.attempt_id = v_attempt.id
      and later.user_id = v_attempt.user_id
      and later.result = 'skipped'
      and earlier.result = 'skipped'
      and later.local_date >= v_attempt.planned_for_date;

    if v_latest_skipped_date is not null and p_new_date <= v_latest_skipped_date then
      raise exception 'A retry date must follow the latest explicitly skipped local date' using errcode = '23514';
    end if;

    if v_pending_pair_date is not null then
      if not p_acknowledge_skipped_pair then
        raise exception 'The adjacent skipped-day decision requires acknowledgement' using errcode = '23514';
      end if;
      if p_new_date <= v_pending_pair_date then
        raise exception 'An acknowledged retry date must follow the skipped-day pair' using errcode = '23514';
      end if;
    elsif p_acknowledge_skipped_pair then
      raise exception 'There is no pending skipped-day pair to acknowledge' using errcode = '23514';
    end if;
  elsif p_acknowledge_skipped_pair then
    raise exception 'Only an active attempt can acknowledge skipped days' using errcode = '23514';
  end if;

  update public.attempts set planned_for_date = p_new_date where id = v_attempt.id
  returning * into v_attempt;
  return v_attempt;
end;
$function$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.protect_attempt_fields() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.record_checkin(uuid, date, text, text) from public, anon, authenticated;
revoke all on function public.transition_attempt(uuid, text) from public, anon, authenticated;
revoke all on function public.set_attempt_planned_date(uuid, date, text, boolean) from public, anon, authenticated;
grant execute on function public.record_checkin(uuid, date, text, text) to authenticated;
grant execute on function public.transition_attempt(uuid, text) to authenticated;
grant execute on function public.set_attempt_planned_date(uuid, date, text, boolean) to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.interests enable row level security;
alter table public.starter_ideas enable row level security;
alter table public.attempts enable row level security;
alter table public.checkins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.media_assets enable row level security;
alter table public.notification_preferences enable row level security;

create policy categories_public_read on public.categories
for select to anon, authenticated using (is_published);

create policy interests_public_read on public.interests
for select to anon, authenticated using (
  is_published and exists (
    select 1 from public.categories as c
    where c.id = category_id and c.is_published
  )
);

create policy starter_ideas_public_read on public.starter_ideas
for select to anon, authenticated using (
  is_published and exists (
    select 1
    from public.interests as i
    join public.categories as c on c.id = i.category_id
    where i.id = interest_id and i.is_published and c.is_published
  )
);

create policy profiles_read_own on public.profiles
for select to authenticated using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy attempts_read_own on public.attempts
for select to authenticated using (user_id = (select auth.uid()));

create policy attempts_insert_own on public.attempts
for insert to authenticated with check (user_id = (select auth.uid()));

create policy attempts_update_own_note on public.attempts
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy attempts_delete_own on public.attempts
for delete to authenticated using (user_id = (select auth.uid()));

create policy checkins_read_own on public.checkins
for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);

create policy journal_entries_read_own on public.journal_entries
for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);

create policy journal_entries_insert_own on public.journal_entries
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);

create policy journal_entries_update_own on public.journal_entries
for update to authenticated
using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);

create policy journal_entries_delete_own on public.journal_entries
for delete to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);

create policy media_assets_read_own on public.media_assets
for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);

create policy media_assets_insert_own_after_upload on public.media_assets
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
  and exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'activity-media' and o.name = storage_path
  )
);

create policy media_assets_delete_own_after_storage_removal on public.media_assets
for delete to authenticated using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.attempts as a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
  and not exists (
    select 1 from storage.objects as o
    where o.bucket_id = 'activity-media' and o.name = storage_path
  )
);

create policy notification_preferences_read_own on public.notification_preferences
for select to authenticated using (user_id = (select auth.uid()));

create policy notification_preferences_insert_own on public.notification_preferences
for insert to authenticated with check (user_id = (select auth.uid()));

create policy notification_preferences_update_own on public.notification_preferences
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy notification_preferences_delete_own on public.notification_preferences
for delete to authenticated using (user_id = (select auth.uid()));

revoke all privileges on table
  public.categories,
  public.interests,
  public.starter_ideas,
  public.profiles,
  public.attempts,
  public.checkins,
  public.journal_entries,
  public.media_assets,
  public.notification_preferences
from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.categories, public.interests, public.starter_ideas to anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_path) on table public.profiles to authenticated;
grant select, delete on table public.attempts to authenticated;
grant insert (interest_id, starter_idea_id, custom_title, intention_note, planned_for_date)
  on table public.attempts to authenticated;
grant update (intention_note) on table public.attempts to authenticated;
grant select, insert, update, delete on table public.journal_entries, public.notification_preferences to authenticated;
grant select on table public.checkins to authenticated;
grant select, insert, delete on table public.media_assets to authenticated;

revoke all privileges on table storage.objects from public, anon, authenticated;
grant usage on schema storage to authenticated;
grant select, insert, delete on table storage.objects to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-media', 'activity-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy activity_media_select_owned_attempt on storage.objects
for select to authenticated using (
  bucket_id = 'activity-media'
  and pg_catalog.array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1 from public.attempts as a
    where a.id::text = (storage.foldername(name))[2] and a.user_id = (select auth.uid())
  )
);

create policy activity_media_insert_owned_attempt on storage.objects
for insert to authenticated with check (
  bucket_id = 'activity-media'
  and pg_catalog.array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1 from public.attempts as a
    where a.id::text = (storage.foldername(name))[2] and a.user_id = (select auth.uid())
  )
);

create policy activity_media_delete_owned_attempt on storage.objects
for delete to authenticated using (
  bucket_id = 'activity-media'
  and pg_catalog.array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1 from public.attempts as a
    where a.id::text = (storage.foldername(name))[2] and a.user_id = (select auth.uid())
  )
);

commit;

