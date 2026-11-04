-- Hobby: initial schema (lean Phase 1.5)
--
-- Principles
--   * Every personal row belongs to auth.uid(); RLS + composite FKs enforce it.
--   * Guilt-free: attempts can move between any status, check-ins can be
--     changed or undone (deleted). The database only keeps timestamps honest.
--   * Product rules that are still being explored (e.g. "two skipped days ->
--     ask the user") live in the app, not here.
--   * Reminders are scheduled locally on the device; this table only stores
--     the user's settings so they survive a reinstall.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  type text not null check (type in ('hobby', 'habit', 'both')),
  cover_image_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.starter_ideas (
  id uuid primary key default gen_random_uuid(),
  interest_id uuid not null references public.interests (id) on delete restrict,
  title text not null,
  description text,
  instructions text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  difficulty text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, interest_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  interest_id uuid references public.interests (id) on delete restrict,
  starter_idea_id uuid,
  custom_title text,
  intention_note text,
  planned_for_date date,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'completed', 'dropped')),
  started_at timestamptz,
  completed_at timestamptz,
  dropped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A custom attempt (no catalogue interest) needs its own title.
  constraint attempts_custom_title_required
    check (interest_id is not null or nullif(btrim(custom_title), '') is not null),
  -- A starter idea must belong to the attempt's interest.
  constraint attempts_starter_requires_interest
    check (starter_idea_id is null or interest_id is not null),
  constraint attempts_starter_interest_fk foreign key (starter_idea_id, interest_id)
    references public.starter_ideas (id, interest_id) on delete restrict,
  unique (id, user_id)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  local_date date not null,
  result text not null check (result in ('tried', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- current_date is UTC; +1 day covers every user time zone.
  constraint checkins_not_in_future check (local_date <= current_date + 1),
  constraint checkins_attempt_owner_fk foreign key (attempt_id, user_id)
    references public.attempts (id, user_id) on delete cascade,
  unique (attempt_id, local_date)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entries_attempt_owner_fk foreign key (attempt_id, user_id)
    references public.attempts (id, user_id) on delete cascade,
  unique (id, attempt_id, user_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  journal_entry_id uuid,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default now(),
  -- Path shape: <user_id>/<attempt_id>/<uuid>.<ext>
  constraint media_assets_path_matches_owner check (
    storage_path ~* ('^' || user_id::text || '/' || attempt_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')
  ),
  constraint media_assets_attempt_owner_fk foreign key (attempt_id, user_id)
    references public.attempts (id, user_id) on delete cascade,
  constraint media_assets_journal_fk foreign key (journal_entry_id, attempt_id, user_id)
    references public.journal_entries (id, attempt_id, user_id)
    on delete set null (journal_entry_id)
);

create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  morning_enabled boolean not null default false,
  morning_time time not null default '08:00',
  evening_enabled boolean not null default false,
  evening_time time not null default '20:00',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (FK lookups + the user's own lists)
-- ---------------------------------------------------------------------------

create index interests_category_id_idx on public.interests (category_id);
create index starter_ideas_interest_id_idx on public.starter_ideas (interest_id);
create index attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index attempts_interest_id_idx on public.attempts (interest_id) where interest_id is not null;
create index attempts_starter_idx on public.attempts (starter_idea_id, interest_id) where starter_idea_id is not null;
create index checkins_attempt_owner_idx on public.checkins (attempt_id, user_id);
create index checkins_user_date_idx on public.checkins (user_id, local_date desc);
create index journal_entries_attempt_owner_idx on public.journal_entries (attempt_id, user_id);
create index media_assets_attempt_owner_idx on public.media_assets (attempt_id, user_id);
create index media_assets_journal_idx on public.media_assets (journal_entry_id) where journal_entry_id is not null;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger interests_set_updated_at before update on public.interests
  for each row execute function public.set_updated_at();
create trigger checkins_set_updated_at before update on public.checkins
  for each row execute function public.set_updated_at();
create trigger journal_entries_set_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Lifecycle timestamps are owned by the database. Any status change is
-- allowed (retry, reopen, drop, pick back up); the timestamps follow it.
create function public.attempts_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.started_at   := case when new.status in ('active', 'completed', 'dropped') then now() end;
    new.completed_at := case when new.status = 'completed' then now() end;
    new.dropped_at   := case when new.status = 'dropped' then now() end;
    return new;
  end if;

  new.started_at   := old.started_at;
  new.completed_at := old.completed_at;
  new.dropped_at   := old.dropped_at;

  if new.status is distinct from old.status then
    case new.status
      when 'planned' then
        new.started_at := null; new.completed_at := null; new.dropped_at := null;
      when 'active' then
        new.started_at := coalesce(old.started_at, now());
        new.completed_at := null; new.dropped_at := null;
      when 'completed' then
        new.started_at := coalesce(old.started_at, now());
        new.completed_at := now(); new.dropped_at := null;
      when 'dropped' then
        new.dropped_at := now(); new.completed_at := null;
    end case;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger attempts_lifecycle before insert or update on public.attempts
  for each row execute function public.attempts_lifecycle();

-- First check-in on a planned attempt makes it active.
-- Undoing the last check-in of an active attempt puts it back to planned.
-- Runs as the caller, so RLS and column grants still apply.
create function public.checkins_sync_attempt_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.attempts
       set status = 'active'
     where id = new.attempt_id and status = 'planned';
    return new;
  end if;

  update public.attempts a
     set status = 'planned'
   where a.id = old.attempt_id
     and a.status = 'active'
     and not exists (select 1 from public.checkins c where c.attempt_id = old.attempt_id);
  return old;
end;
$$;

create trigger checkins_sync_attempt_status after insert or delete on public.checkins
  for each row execute function public.checkins_sync_attempt_status();

-- One profile per new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.attempts_lifecycle() from public, anon, authenticated;
revoke all on function public.checkins_sync_attempt_status() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.interests enable row level security;
alter table public.starter_ideas enable row level security;
alter table public.attempts enable row level security;
alter table public.checkins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.media_assets enable row level security;
alter table public.notification_preferences enable row level security;

-- Catalogue: anyone can read published rows whose parents are published.
create policy categories_read_published on public.categories
  for select to anon, authenticated using (is_published);

create policy interests_read_published on public.interests
  for select to anon, authenticated using (
    is_published and exists (
      select 1 from public.categories c where c.id = category_id and c.is_published
    )
  );

create policy starter_ideas_read_published on public.starter_ideas
  for select to anon, authenticated using (
    is_published and exists (
      select 1 from public.interests i
      join public.categories c on c.id = i.category_id
      where i.id = interest_id and i.is_published and c.is_published
    )
  );

-- Profiles: read/update your own. Created by trigger, deleted with the user.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Personal tables: full access to your own rows only. Child tables reference
-- attempts through (attempt_id, user_id), so a row owned by you can only
-- point at an attempt owned by you.
create policy attempts_own on public.attempts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy checkins_own on public.checkins
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy journal_entries_own on public.journal_entries
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy media_assets_own on public.media_assets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (Supabase grants everything on new tables by default; tighten it)
-- The app may choose row ids (UUIDs) on insert, e.g. to build a photo path first.
-- ---------------------------------------------------------------------------

revoke all on table
  public.profiles, public.categories, public.interests, public.starter_ideas,
  public.attempts, public.checkins, public.journal_entries, public.media_assets,
  public.notification_preferences
from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.categories, public.interests, public.starter_ideas to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;

grant select, delete on public.attempts to authenticated;
grant insert (id, interest_id, starter_idea_id, custom_title, intention_note, planned_for_date, status)
  on public.attempts to authenticated;
grant update (custom_title, intention_note, planned_for_date, status)
  on public.attempts to authenticated;

grant select, delete on public.checkins to authenticated;
grant insert (id, attempt_id, local_date, result) on public.checkins to authenticated;
grant update (result) on public.checkins to authenticated;

grant select, delete on public.journal_entries to authenticated;
grant insert (id, attempt_id, content) on public.journal_entries to authenticated;
grant update (content) on public.journal_entries to authenticated;

grant select, delete on public.media_assets to authenticated;
grant insert (id, attempt_id, journal_entry_id, storage_path, mime_type, file_size)
  on public.media_assets to authenticated;
grant update (journal_entry_id) on public.media_assets to authenticated;

grant select, delete on public.notification_preferences to authenticated;
grant insert (morning_enabled, morning_time, evening_enabled, evening_time, timezone)
  on public.notification_preferences to authenticated;
grant update (morning_enabled, morning_time, evening_enabled, evening_time, timezone)
  on public.notification_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private photo bucket
-- Path: <user_id>/<attempt_id>/<uuid>.<jpg|jpeg|png|webp>
-- Grants on storage.objects are managed by Supabase; we only add policies.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-media', 'activity-media', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create function public.is_own_media_path(object_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    array_length(storage.foldername(object_name), 1) = 2
    and (storage.foldername(object_name))[1] = (select auth.uid())::text
    and storage.filename(object_name)
          ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    and exists (
      select 1 from public.attempts a
      where a.id::text = (storage.foldername(object_name))[2]
        and a.user_id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function public.is_own_media_path(text) from public, anon;
grant execute on function public.is_own_media_path(text) to authenticated;

create policy activity_media_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'activity-media' and public.is_own_media_path(name));

create policy activity_media_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'activity-media' and public.is_own_media_path(name));

create policy activity_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'activity-media' and public.is_own_media_path(name));

commit;
