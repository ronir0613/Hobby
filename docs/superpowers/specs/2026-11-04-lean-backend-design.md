# Backend Foundation — Lean Design (Phase 1.5)

**Status:** Active. Supersedes `2026-11-03-supabase-backend-foundation-design.md` and
`plans/2026-11-04-supabase-backend-foundation.md`.

## Decisions

- **Android / Play Store first.** iOS later.
- **Reminders are in the MVP.** Scheduled locally with `expo-notifications`; Supabase stores only the settings (`notification_preferences`).
- **Check-ins can be corrected or undone.** Users can change `tried`/`skipped` or delete a check-in.
- **Guilt-free status.** Attempts can move between `planned`, `active`, `completed` and `dropped` in any direction (retry, reopen, pick back up).
- **Auth:** email + Google. Apple is deferred until iOS.
- **Account deletion is in the MVP** (Play policy): an Edge Function deletes the user's Storage files, then the Auth user. All rows cascade.
- **Hosted dev project, no Docker.** Migrations are pushed with `supabase db push` to the linked project.

## Database

Tables: `profiles`, `categories`, `interests`, `starter_ideas`, `attempts`, `checkins`,
`journal_entries`, `media_assets`, `notification_preferences`.

What the database enforces:

- RLS on every table. Personal rows: owner only (`user_id = auth.uid()`). Catalogue: public read of published rows with published parents; no client writes.
- Child rows reference attempts by `(attempt_id, user_id)`, so nothing can be attached to another user's attempt.
- Column-level grants: clients can't write `user_id`, lifecycle timestamps or `updated_at`.
- `attempts_lifecycle` trigger owns `started_at` / `completed_at` / `dropped_at`.
- First check-in on a planned attempt makes it `active`; deleting the last check-in of an `active` attempt puts it back to `planned`. Completed/dropped attempts are not touched by check-in changes.
- One check-in per attempt per day; no check-ins more than a day ahead of UTC.
- Private `activity-media` bucket, 10 MiB, JPEG/PNG/WebP, path `<user>/<attempt>/<uuid>.<ext>`, owner-only.

What lives in the app instead:

- The "two skipped days in a row → ask what to do" prompt (computed from check-ins).
- Photo delete order: remove the file, then the metadata row. Delete an attempt's files before deleting the attempt.
- Image compression/conversion before upload (`expo-image-manipulator`).

## Catalogue

`20261104090100_seed_catalogue.sql` seeds the 9 local interests (slugs match the ids in
`src/data/interest-catalog.ts`) with a type each and one starter idea. The app keeps its local
catalogue until screens are wired to the database.

## Verification

`supabase/tests/*.sql` are pgTAP tests (55 assertions: schema, lifecycle/undo, RLS between two
users, Storage paths). They were run against PostgreSQL 16 with stand-ins for Supabase's `auth`
and `storage` schemas. They have **not** yet run on the hosted project.

## Next steps

1. `db push` the migrations; generate types.
2. Client + auth service (email, Google), `.env` → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Data services: attempts, check-ins (incl. undo), journal, media, reminder settings.
4. `delete-account` Edge Function.
5. Local reminder scheduling with `expo-notifications` (dev build).
