# Backend Foundation — Lean Design (Phase 1.5)

**Status:** Active. Supersedes `2026-11-03-supabase-backend-foundation-design.md` and
`plans/2026-11-04-supabase-backend-foundation.md`.

## Decisions

- **Android / Play Store first.** iOS later.
- **Reminders are in the MVP.** Scheduled locally with `expo-notifications`; Supabase stores only the settings (`notification_preferences`: morning and evening on/off and times, the time zone, and one set of `weekdays` shared by both, ISO 1 = Monday, migration `20261104190000`). Every day → one daily trigger per reminder; otherwise one weekly trigger per chosen day.
- **Check-ins are for today only** (changed 2026-11-04). Today is answered `tried` or `skipped` and can be switched until midnight; past days are locked. There is no undo in the app.
- **Status follows check-ins** (changed 2026-11-04); the user never picks it. No check-ins: `planned`. First check-in: `active`. 7 tried days in the current go: `completed`. Two skipped days in a row: `dropped` ("Maybe it wasn't your thing"). The only user action is "Give it another go" on a completed or dropped hobby, which moves it back to `planned` and keeps the history; check-ins from before that no longer count (the current go starts at `started_at`).
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
- One attempt per catalogue interest per user (partial unique index, migration `20261104170000`);
  coming back to a hobby moves the same attempt back to `planned`. Custom attempts are not limited.
- Private `activity-media` bucket, 10 MiB, JPEG/PNG/WebP, path `<user>/<attempt>/<uuid>.<ext>`, owner-only.

What lives in the app instead:

- The completed/dropped rules (`statusAfterCheckins` and `currentRun` in `src/services/checkin-rules.ts`). The database still lets clients set any status and delete check-ins; the app just doesn't offer it.
- Photo delete order: remove the file, then the metadata row. Delete an attempt's files before deleting the attempt.
- Image compression/conversion before upload (`expo-image-manipulator`).

## Catalogue

`20261104090100_seed_catalogue.sql` seeds the 9 local interests (slugs match the ids in
`src/data/interest-catalog.ts`) with a type each and one starter idea. Explore and the interest
detail screen read the catalogue from the database (step 7); Discover still shows the local list,
and its cards open the live detail screen by slug.

## Verification

`supabase/tests/*.sql` are pgTAP tests (57 assertions: schema, lifecycle/undo, RLS between two
users, Storage paths). They were run against PostgreSQL 16 with stand-ins for Supabase's `auth`
and `storage` schemas. `attempt_lifecycle_test.sql` (22 assertions, incl. one attempt per
interest) has also passed on hosted, run through `supabase db query --remote` inside a
rolled-back transaction (no Docker).

## Account deletion

`supabase/functions/delete-account` (deployed, `verify_jwt = true`). It takes the user only from
the JWT (`auth.getUser`), removes every `activity-media` object under `<user>/` via the Storage
API (paginated, re-listed to confirm empty), then calls `auth.admin.deleteUser`. A Storage failure
leaves the user in place. App: `deleteAccount()` in `src/services/auth.ts`.

Auth deletes users as `supabase_auth_admin`, and triggers fired by the FK cascade run as that
role, so `checkins_sync_attempt_status` is `SECURITY DEFINER` (migration `20261104120000`).
Verified end to end on hosted with `scripts/e2e-delete-account.mjs` (seed, then delete): all rows
and files gone.

## Next steps

1. `db push` the migrations; generate types.
2. Client + auth service (email, Google), `.env` → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Data services: attempts, check-ins (incl. undo), journal, media, reminder settings.
4. ~~`delete-account` Edge Function.~~ Done.
5. ~~Local reminder scheduling with `expo-notifications` (dev build).~~ Done; verified on an Android 15 device (permission prompt, "Gentle reminders" channel, delivery, cancel). Dev builds need `expo-dev-client`.

### Wiring the app to the backend (agreed 2026-11-04)

These steps change screens, so the user has approved screen work for them. Visual or theme choices
are still checked with the user first.

6. ~~**Sign-in, real Profile, tab icons.**~~ Done (55ac854); email verified on device (sign up +
   confirm link, sign in, relaunch, sign out, delete account). Google is enabled on hosted
   (corrected 2026-11-04) and Google sign-in is verified on device: the test account's only
   identity on hosted is `google`, and Profile shows "Signed in with Google".
   Sign-in screen (email + Google), Profile shows the
   account with sign out and delete account, and icons on all four tabs.
   *Done:* on device, sign-in works both ways, the session survives a relaunch, Profile shows the
   email, sign out works, and delete account removes the user on hosted.
7. ~~**Pick a hobby (catalogue from Supabase).**~~ Done (b404444); verified on device: the 9
   interests load from hosted, airplane mode (Wi-Fi off too) shows the error state and retry
   recovers, and "Try this" created `planned` attempts (with their starter idea) on hosted.
   Signed-out "Try this" goes to sign-in and returns to the interest afterwards (also through the
   Google browser redirect, which leaves sign-in before the session lands). Discover cards open
   the same detail screen. Explore reads categories/interests/starter ideas
   from the database. Tapping a card opens an interest detail screen with "Try this", which creates
   an attempt.
   *Done:* the 9 seeded interests load from hosted with loading and error states, and "Try this"
   creates a `planned` attempt visible in the database.
8. ~~**My hobbies and check-ins.**~~ Done (ef43d3b); verified on device against hosted rows: the
   first check-in makes an attempt `active`, two skips in a row drop it with the note, the 7th tried
   day completes it, and "Give it another go" returns it to `planned`. A list of the user's attempts on Profile; an attempt screen to
   answer today tried/skipped (switchable until midnight), a read-only history, and a read-only
   status that follows the rules above. One attempt per interest.
   *Done:* the first check-in makes an attempt `active`, two skipped days in a row drop it with the
   "Maybe it wasn't your thing" note, the 7th tried day completes it, and "Give it another go" returns
   it to `planned`.
9. **Reminder settings.** On/off, time and days, saved to `notification_preferences` and scheduled
   locally.
   *Done:* changing the time on device delivers a notification at the new time, turning reminders
   off cancels them, and settings survive sign out and back in.
10. **Journal and photos (Media tab).** Notes and photos per attempt, compressed before upload,
    with the file deleted before its row.
    *Done:* add and delete a note and a photo on device, and Storage paths follow
    `<user>/<attempt>/<uuid>.<ext>`.
11. **Installable preview build.** EAS preview APK that runs without the dev-client launcher or
    Metro.
    *Done:* the APK installs on the test phone and opens straight into the app.
