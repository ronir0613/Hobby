-- Account deletion fix.
--
-- Auth deletes users as `supabase_auth_admin`, which has no privileges on public tables.
-- The FK cascade from auth.users deletes check-ins, and Postgres fires the queued
-- AFTER DELETE trigger as that caller, so the invoker-rights UPDATE of public.attempts
-- failed with "permission denied" and auth.admin.deleteUser() returned an error for
-- every user with at least one check-in.
--
-- Running the trigger as its owner is safe: it only changes the status of the attempt
-- referenced by the check-in, and the (attempt_id, user_id) FK plus RLS on checkins
-- already guarantee that attempt belongs to the same user. search_path stays empty and
-- EXECUTE stays revoked from clients.

alter function public.checkins_sync_attempt_status() security definer;
