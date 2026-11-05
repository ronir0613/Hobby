-- Step 15: the starting quiz. A signed-in user's answers live on their profile row (one per user,
-- created by handle_new_user), so Discover ranks the same way on any phone. Guests keep theirs on
-- the phone, and they move here on sign-in. Either all five answers and the time are set, or none.

alter table public.profiles
  add column quiz_setting text check (quiz_setting in ('indoor', 'outdoor', 'either')),
  add column quiz_social text check (quiz_social in ('solo', 'together', 'either')),
  add column quiz_time text check (quiz_time in ('short', 'medium', 'long')),
  add column quiz_mood text check (quiz_mood in ('calm', 'creative', 'active', 'learning')),
  add column quiz_cost text check (quiz_cost in ('free', 'low', 'any')),
  add column quiz_answered_at timestamptz,
  add constraint profiles_quiz_all_or_none check (
    num_nulls(quiz_setting, quiz_social, quiz_time, quiz_mood, quiz_cost, quiz_answered_at) in (0, 6)
  );

-- Owner-only update is already enforced by profiles_update_own; this only widens the column grant.
grant update (quiz_setting, quiz_social, quiz_time, quiz_mood, quiz_cost, quiz_answered_at)
  on public.profiles to authenticated;
