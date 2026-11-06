-- Limits so one account can't fill the shared database (500 MB on the Free plan).
-- The app already keeps within these; a modified client now can't go past them.
-- At the row limits below, the worst one account can write is about 3 MB.

begin;

alter table public.journal_entries
  add constraint journal_entries_content_length check (char_length(content) <= 2000);

alter table public.attempts
  add constraint attempts_custom_title_length check (custom_title is null or char_length(custom_title) <= 200),
  add constraint attempts_intention_note_length check (intention_note is null or char_length(intention_note) <= 2000);

alter table public.profiles
  add constraint profiles_avatar_path_length check (avatar_path is null or char_length(avatar_path) <= 500);

alter table public.notification_preferences
  add constraint notification_preferences_timezone_length check (char_length(timezone) <= 64);

-- Counts this person's rows in the table it fires on, under a per-person lock so that inserts
-- at the same moment can't both pass. The limit is the trigger's argument.
create function public.enforce_row_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.user_id::text, 0));
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
    into used using new.user_id;
  if used >= tg_argv[0]::bigint then
    raise exception 'row limit reached';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_row_limit() from public, anon, authenticated;

-- 100 catalogue hobbies plus plenty of custom ones.
create trigger enforce_row_limit before insert on public.attempts
  for each row execute function public.enforce_row_limit('300');
create trigger enforce_row_limit before insert on public.journal_entries
  for each row execute function public.enforce_row_limit('1000');
-- About 14 years of one check-in a day.
create trigger enforce_row_limit before insert on public.checkins
  for each row execute function public.enforce_row_limit('5000');

create index journal_entries_user_idx on public.journal_entries (user_id);

commit;
