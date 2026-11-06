-- A limit on what each person keeps in the activity-media bucket: 10 MB in total.
--
-- Why a trigger on storage.objects, not a row policy or a count of media_assets:
--   * Storage checks the insert policy without seeing other uploads in progress, so two uploads
--     at once would both pass. The trigger takes a per-person lock until the insert commits.
--   * Files are what cost space. A client can upload without a media_assets row, or delete the
--     row and keep the file, so the limit adds up real files and their real sizes.
--   * Storage's first permission check may not know the size yet. The final insert always does,
--     so a too-large file is rejected there, and Storage then removes the uploaded bytes.
--
-- Older app versions upload the file first and then save the row. All of this keeps that order
-- working; at the limit they only see their general "didn't save" message.

begin;

create function public.media_limit_bytes()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 10485760::bigint $$;

-- Stops huge numbers of tiny files, which cost database rows. Real photos are 40 KB or more,
-- so the byte limit always comes first for them.
create function public.media_limit_files()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 500::bigint $$;

create function public.enforce_media_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  person text := split_part(new.name, '/', 1);
  new_bytes bigint := coalesce((new.metadata ->> 'size')::bigint, 0);
  used_bytes bigint;
  used_files bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('activity-media:' || person, 0));

  -- The same path again is a retry, which the unique key answers; it adds nothing.
  if exists (
    select 1 from storage.objects o
    where o.bucket_id = new.bucket_id and o.name = new.name
  ) then
    return new;
  end if;

  select coalesce(sum((o.metadata ->> 'size')::bigint), 0), count(*)
    into used_bytes, used_files
  from storage.objects o
  where o.bucket_id = new.bucket_id and split_part(o.name, '/', 1) = person;

  -- greatest(…, 1): with the size still unknown, a full account is refused before any upload.
  if used_files >= public.media_limit_files()
     or used_bytes + greatest(new_bytes, 1) > public.media_limit_bytes() then
    raise exception 'media limit reached' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger enforce_media_limit
  before insert on storage.objects
  for each row
  when (new.bucket_id = 'activity-media')
  execute function public.enforce_media_limit();

-- A photo row must point at a file that is really there, and its size comes from that file.
create function public.media_assets_use_real_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  real_size bigint;
begin
  select (o.metadata ->> 'size')::bigint into real_size
  from storage.objects o
  where o.bucket_id = 'activity-media' and o.name = new.storage_path;

  if not found then
    raise exception 'photo file not found' using errcode = '23503';
  end if;

  new.file_size := coalesce(real_size, new.file_size);
  return new;
end;
$$;

create trigger media_assets_use_real_file
  before insert on public.media_assets
  for each row execute function public.media_assets_use_real_file();

-- What the signed-in person is using, counting every file they have, with or without a row.
create function public.my_media_usage()
returns table (used_bytes bigint, limit_bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint, public.media_limit_bytes()
  from storage.objects o
  where o.bucket_id = 'activity-media'
    and split_part(o.name, '/', 1) = (select auth.uid())::text;
$$;

-- The person's files with no row, once they are old enough not to be an upload still finishing.
create function public.my_orphan_media_paths()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'activity-media'
    and split_part(o.name, '/', 1) = (select auth.uid())::text
    and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from public.media_assets m where m.storage_path = o.name);
$$;

-- Someone can always reach their own files, even after the attempt is gone, so they can remove
-- them and free the space. Uploading still needs an attempt of theirs (is_own_media_path).
create function public.is_own_media_file(object_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    array_length(storage.foldername(object_name), 1) = 2
    and (storage.foldername(object_name))[1] = (select auth.uid())::text,
    false
  );
$$;

drop policy activity_media_select_own on storage.objects;
create policy activity_media_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'activity-media' and public.is_own_media_file(name));

drop policy activity_media_delete_own on storage.objects;
create policy activity_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'activity-media' and public.is_own_media_file(name));

revoke all on function public.media_limit_bytes() from public, anon, authenticated;
revoke all on function public.media_limit_files() from public, anon, authenticated;
revoke all on function public.enforce_media_limit() from public, anon, authenticated;
revoke all on function public.media_assets_use_real_file() from public, anon, authenticated;
revoke all on function public.my_media_usage() from public, anon;
revoke all on function public.my_orphan_media_paths() from public, anon;
revoke all on function public.is_own_media_file(text) from public, anon;
grant execute on function public.my_media_usage() to authenticated;
grant execute on function public.my_orphan_media_paths() to authenticated;
grant execute on function public.is_own_media_file(text) to authenticated;

commit;
