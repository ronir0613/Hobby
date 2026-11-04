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
`src/data/interest-catalog.ts`) with a type each and one starter idea. Explore and the interest
detail screen read the catalogue from the database (step 7); Discover still shows the local list,
and its cards open the live detail screen by slug.

## Verification

`supabase/tests/*.sql` are pgTAP tests (55 assertions: schema, lifecycle/undo, RLS between two
users, Storage paths). They were run against PostgreSQL 16 with stand-ins for Supabase's `auth`
and `storage` schemas. They have **not** yet run on the hosted project.

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
   confirm link, sign in, relaunch, sign out, delete account). Google code is in place, but the
   Google provider is **not enabled on hosted** yet (needs a Google OAuth web client, the provider
   switched on in the dashboard, and `hobby://auth/callback` in Redirect URLs), so it is untested.
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
8. **My hobbies and check-ins.** A list of the user's attempts; check in tried/skipped, correct or
   undo a check-in, move status freely between planned/active/completed/dropped, and the
   two-skipped-days prompt.
   *Done:* the first check-in makes an attempt `active`, undo returns it to `planned`, and the
   prompt appears after two skips.
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
