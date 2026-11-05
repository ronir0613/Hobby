# Backend Foundation — Lean Design (Phase 1.5)

**Status:** Active. Supersedes `2026-11-03-supabase-backend-foundation-design.md` and
`plans/2026-11-04-supabase-backend-foundation.md`.

## Decisions

- **Android / Play Store first.** iOS later.
- **Reminders are in the MVP.** Scheduled locally with `expo-notifications`; Supabase stores only the settings (`notification_preferences`: morning and evening on/off and times, the time zone, and one set of `weekdays` shared by both, ISO 1 = Monday, migration `20261104190000`). Every day → one daily trigger per reminder; otherwise one weekly trigger per chosen day.
- **Check-ins are for today only** (changed 2026-11-04). Today is answered `tried` or `skipped` and can be switched until midnight; past days are locked. There is no undo in the app.
- **Status follows check-ins** (changed 2026-11-04); the user never picks it. No check-ins: `planned`. First check-in: `active`. 7 tried days in the current go: `completed`. Two skipped days in a row: `dropped` ("Maybe it wasn't your thing"). The only user action is "Give it another go" on a completed or dropped hobby, which moves it back to `planned` and keeps the history; check-ins from before that no longer count (the current go starts at `started_at`).
- **Auth:** email + Google. Apple is deferred until iOS. Google sign-in moves to the native Android
  account picker (step 12) so users never see the `supabase.co` address.
- **Guest mode and sign-in, both** (decided 2026-11-05). Everything works without an account,
  saved on the phone; signing in backs it up and syncs it (step 13).
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

`20261104090100_seed_catalogue.sql` seeded the first 9 interests. `20261105090000_catalogue_guides.sql`
(step 14) grows it to 68 interests in 10 categories (Games & Puzzles is new) with 204 starter
ideas, and adds to `interests`: `needs` ("what you'll need") and the quiz tags `setting`
(indoor/outdoor/either), `social` (solo/together/either), `session_minutes` (a typical session),
`cost` (free/low/medium) and `moods` (1–4 of calm/creative/active/learning), all checked and not
null. Starter ideas get `difficulty` (easy/moderate/stretch, checked) and their steps in
`instructions`, one per line; `(interest_id, sort_order)` is unique. The migration upserts by slug
and by (interest, sort order), so the 9 original interests and their first idea keep their ids
(attempts reference both); nothing is deleted. Explore, Discover and the detail screen all read
the catalogue from the database; `src/data/interest-catalog.ts` is gone. The catalogue is public
(anon read), so guests see it too.

## Verification

`supabase/tests/*.sql` are pgTAP tests (61 assertions: schema and catalogue shape, lifecycle/undo,
RLS between two users, Storage paths). All three files passed on hosted after step 14 (2026-11-05),
each run through `supabase db query --remote` inside a rolled-back transaction (no Docker): pgtap
is created inside the transaction and each assertion row is collected in a temp table, since
`db query` returns only the last result set. The RLS test counts only its own user's check-ins and
files, because hosted also holds real users' rows.

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
9. ~~**Reminder settings.**~~ Done (0f594f3); verified on device against the hosted row: a time
   changed to 23:35 delivered "How did today feel?" at 23:35, turning it off left no scheduled
   alarms, weekdays-only scheduled five weekly alarms (weekend skipped), and signing out cleared
   them while the row stayed, then signing back in rescheduled them. Reminders is its own screen
   from a Profile row; morning and evening each have on/off and a time (Android clock dialog),
   with one shared set of days (`weekdays`, migration `20261104190000`). On/off, time and days,
   saved to `notification_preferences` and scheduled locally.
   *Done:* changing the time on device delivers a notification at the new time, turning reminders
   off cancels them, and settings survive sign out and back in.
10. ~~**Journal and photos (Media tab).**~~ Done (4499472); verified on device against hosted: a note
    was added, edited and deleted (journal_entries row created, updated, gone), and a gallery photo
    was uploaded as a 134 KB JPEG at `<user>/<attempt>/<uuid>.jpg` (media_assets row and
    storage.objects name match), then deleted with both the file and the row gone. Notes and photos
    live on the attempt screen; Media lists them across hobbies. Photos come from the camera or the
    Android photo picker (`expo-image-picker`). Camera and signed-out prompts verified on the
    preview APK (2026-11-05): the camera prompt shows the app.json copy, "Don't allow" shows the
    muted box and "Open phone settings" opens the app's settings page, a retry clears the box, and a
    camera shot uploaded as a 46 KB JPEG at `<user>/<attempt>/<uuid>.jpg`, then was deleted (row and
    file gone). Signed out, Profile, Media, an attempt, a photo and Reminders each show their
    sign-in prompt, and Media's opens the sign-in screen. Notes and photos per attempt, compressed before upload,
    with the file deleted before its row.
    *Done:* add and delete a note and a photo on device, and Storage paths follow
    `<user>/<attempt>/<uuid>.<ext>`.
11. ~~**Installable preview build.**~~ Done (b17d4cb); verified on device: the EAS preview APK
    (build a960cdf2, versionCode 1, not debuggable) installed with `adb install` after removing the
    debug-signed dev build, and opened straight into Discover with no Metro or `adb reverse`. Signed
    in with email and Google, and Explore, My hobbies, a check-in, reminders, a note and a photo
    worked against hosted. EAS project `@roni1306/hobby-discovery`; the `preview` profile reads
    `EXPO_PUBLIC_SUPABASE_URL` (plain text) and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sensitive)
    from the EAS `preview` environment; the keystore is EAS-managed. (Google sign-in then went through
    Supabase's web OAuth; step 12 replaced it with the native account sheet.) The project
    `.npmrc` sets `legacy-peer-deps=true` because the lock file has no auto-installed peers and
    EAS runs `npm ci`. EAS preview APK that runs without the dev-client launcher or
    Metro.
    *Done:* the APK installs on the test phone and opens straight into the app.

### Before the Play Store release (agreed 2026-11-05)

Asked for by the user after trying the preview APK. Done in this order, one chat per step; each
ends with lint, typecheck, tests, a device check, commit and push. Ask before any cloud build or
hosted change.

12. ~~**Native Google sign-in.**~~ Done; verified on device with preview build 4a4db3cf (installed
    with `adb install -r`): "Continue with Google" opens Android's "Choose an account to continue to
    Hobby" sheet with no browser, and Profile then shows "Signed in with Google" (it returns to
    Profile). The free `@react-native-google-signin/google-signin` can't send a nonce (its Android
    side is the deprecated Google Sign-In API; nonces are in the paid version), so the app uses a
    small local Expo module, `modules/google-id`: Android Credential Manager (`GetGoogleIdOption`,
    falling back to `GetSignInWithGoogleOption` when the phone has no usable account) with
    `setNonce(sha256(raw))`, and `signInWithIdToken({ token, nonce: raw })`; "Skip nonce check" stays
    off. `googleid` is pinned to 1.2.0 (1.2.1 is built with Kotlin 2.4; SDK 58 uses 2.2).
    `expo-web-browser` is removed. The web client ID is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`.env`
    and the EAS `preview` environment, plain text). Google Cloud has the existing Web client plus
    Android clients for the EAS upload key (SHA-1 `17:1C:F4:84:…:DD:F2:01`) and the local debug key
    (`5E:8F:16:06:…:AB:F6:25`); Supabase's Google Client IDs list is web, EAS, debug. Branding uses
    the "hobby" script logo in `assets/brand` (Sacramento, OFL); verification waits for the privacy
    policy page (step 17). The account sheet shows the launcher icon, still Expo's default.
    Email sign-in code is unchanged (not re-tested on device).
    Original plan: replace the browser OAuth flow (which shows
    `<ref>.supabase.co`) with `@react-native-google-signin/google-signin` and
    `supabase.auth.signInWithIdToken` (nonce checked). Needs a Google Cloud web client ID (first in
    Supabase's Google client list) and Android OAuth clients with the SHA-1 of each signing key: the
    EAS upload key now, the Play App Signing key in step 17. The user does the Google Cloud and
    Supabase dashboard parts; Claude reads the docs for the library's current Expo config plugin.
    Also start Google brand verification (app name and logo on the consent screen). Native code, so
    a new dev build and preview APK.
    *Done:* on the preview APK, "Continue with Google" opens the Android account sheet, no browser,
    and Profile shows "Signed in with Google"; email sign-in unchanged.
13. ~~**Guest mode.**~~ Done; verified on device with preview build e94815d3 (installed after
    removing 4a4db3cf; a local debug build fails on Windows because ninja can't create a 266-char
    codegen path for `react-native-safe-area-context`). Signed out, Photography was added, checked in
    (planned → active), a note and a gallery photo were saved and the evening reminder set for weekdays,
    with no sign-in prompts. After Google sign-in, the account's existing Photography won: today's
    check-in was not duplicated, and the note and photo were added to it on hosted (new
    `media_assets` row with its Storage file, `notification_preferences.updated_at` rewritten). Signing
    out then showed an empty guest space and no scheduled alarms, so the local copy was cleared.
    Not run on device: the "create" path (a guest attempt for an interest the account doesn't have),
    "Clear this phone's data", and a merge that fails halfway (covered by `guest-merge.test.mjs`).
    *How it works:* guest rows live in AsyncStorage (`hobby.guest.v1`, same shape as the Supabase rows,
    `user_id` 'guest'; `src/services/guest-store.ts`), photos as JPEGs in `Paths.document/guest-photos`.
    `src/services/data-source.ts` gives the stores one interface with an account and a guest
    implementation, picked by the session; `guest-lifecycle.ts` copies the database's lifecycle
    triggers, and status still comes from `checkin-rules.ts` for both. Merge rules are pure in
    `guest-merge.ts` (node tests); `guest-sync.ts` runs them on sign-in (and on launch if an earlier run
    stopped). Guest UUIDs are kept in the cloud, so a retry skips what is already there; each attempt is
    removed from the phone once its days, notes and photos are uploaded. A new attempt is rebuilt in
    order (earlier go's days, back to planned, current go's days, then its status) so started_at
    matches; days on an account attempt are added only where missing, then the shared rules run.
    Guest reminder settings, if saved, replace the account's (the latest choice on this phone). Guest
    notes and photos get the upload time as `created_at` (clients can't write it; no migration).
    Original plan: Attempts, check-ins, notes, photos and reminder settings work signed out, kept on
    the phone (a local store; photos as files in the app's document directory; reminders scheduled
    the same way). The same screens read from a local or remote source depending on the session, so
    the status rules (`checkin-rules.ts`) are shared. Signing in uploads the guest data to the
    account: per interest, an attempt already on the account wins and the guest check-ins are added
    for days it doesn't have; notes and photos are added; then the local copy is cleared. Signing
    out leaves the account data in the cloud and starts an empty guest space. Profile signed out
    shows the guest's hobbies with a "Back up and sync" sign-in card instead of a bare prompt; the
    sign-in prompts on Media, attempts and Reminders go away. Delete account still removes cloud data;
    a guest can clear the phone data from Profile.
    *Done:* signed out on the phone, try a hobby, check in, add a note and a photo, set a reminder;
    sign in and see them on hosted with the local copy gone.
14. ~~**Bigger catalogue with guides.**~~ Done; verified on device with preview build f7d36f0f
    (installed with `adb install -r` over e94815d3, signed out): Explore shows "68 interests" from
    hosted, and Knitting, Chess (the new Games & Puzzles category) and Photography (an original slug)
    each show their fact pills, "What you'll need" and three starter ideas; the second idea opens on
    tap, and light and dark both look right. Discover shows the day's live picks (Bread baking,
    Gratitude practice, A new language). Migration `20261105090000_catalogue_guides.sql` is on hosted;
    the 9 original interests and their first ideas kept their ids, so existing attempts still point at
    them. All 61 pgTAP assertions pass on hosted (rolled back; two tests were fixed to cope with three
    ideas per interest and with real rows on hosted). The detail screen was reviewed with Better Design
    on the web build: the second and third ideas fold (spacing score 65 → 85, copy 168 → 132 words).
    Left for step 16: the app-wide 22 px gutter, 20 px card padding and 13/9 px title stack are off the
    4/8 scale, and Discover's copy runs long. The catalogue content was generated by Claude and reviewed
    by the user before the push.
    Original plan: About 60–80 interests across 8–10 categories, each with a short
    description, a "what you'll need" line, 2–3 starter ideas from easy to a bit more (title,
    instructions as short steps, minutes, difficulty), and tags for step 15 (setting
    indoor/outdoor, social solo/together, time, cost, mood calm/creative/active/learning). One
    migration; the user reviews the list before `db push`. The detail screen shows the guide.
    Discover's local list is replaced by the live catalogue.
    *Done:* Explore shows the full catalogue from hosted and each detail screen shows its guide.
15. **Starting quiz.** 4–5 single-tap questions on first open (with Skip), answers kept on the
    phone (and on the profile when signed in), retake from Profile. Discover ranks interests by tag
    matches and says why ("Calm, indoors, under 30 minutes").
    *Done:* different answers on the phone give different Discover picks.
16. **UI refresh.** More refined, not "AI-looking": clearer type scale, more space, fewer nested
    boxes, hobby images or illustrations, subtle press feedback and transitions. Use the Better Design
    tools if they're connected. Proposal for Discover, an interest and Profile first; the user
    approves before the other screens change. DESIGN.md updated to match.
    *Done:* every screen follows the approved direction on the phone, in light and dark.

### Play Store release (planned 2026-11-05)

17. **Production release.** Nothing here has run yet; every cloud build, EAS change and hosted
    change waits for the user's go-ahead.
    - *Permissions.* The preview APK requests permissions the app never uses: `SYSTEM_ALERT_WINDOW`,
      `USE_BIOMETRIC` / `USE_FINGERPRINT` (from `expo-secure-store`), `com.google.android.c2dm.permission.RECEIVE`
      (remote push is off) and the launcher badge permissions. Add them to `android.blockedPermissions`
      in app.json, keeping `CAMERA`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE`,
      `WAKE_LOCK`, `INTERNET` and `ACCESS_NETWORK_STATE`. Check with a new preview APK that camera,
      reminders (incl. after reboot) and sign-in still work.
    - *Backend.* The production app points at the current hosted project (the one already linked);
      no second project for now. Remove test users and their rows before launch.
    - *EAS `production` environment.* Empty today. Create `EXPO_PUBLIC_SUPABASE_URL` (plain text) and
      `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sensitive), and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
      (plain text), as for `preview`.
    - *Google sign-in.* Add the Play App Signing SHA-1 (Play Console → App integrity) as another
      Android OAuth client and append its ID to Supabase's Google Client IDs. Submit brand
      verification once the privacy policy and home page are live.
    - *Build.* `eas build --platform android --profile production` makes an .aab; versionCode comes
      from EAS (`appVersionSource: remote`, `autoIncrement`). Same EAS-managed upload key; enrol in
      Play App Signing.
    - *Privacy policy.* A public page covering: guest data stays on the phone until sign-in; email
      and Google sign-in (email address), attempts,
      check-ins, notes and photos stored in Supabase, reminder times kept on the account and
      scheduled on the phone, no ads, no analytics, no data sold or shared; in-app account deletion
      removes everything; a contact email. The same text drives Play's Data safety form.
    - *Account deletion web link.* Play also asks for a web URL where users can request deletion;
      the privacy page can carry a short "how to delete" section with the in-app path and the contact email.
    - *Play Console.* Create the app (Hobby, free, no ads), content rating questionnaire, target
      audience (not for children), Data safety, store listing (short and full description, 512 px
      icon, 1024×500 feature graphic, at least 2 phone screenshots). A personal developer account
      needs a closed test with at least 12 testers for 14 days before production access.
    - *Submit.* First .aab uploaded by hand to internal testing (or `eas submit` with a Google service
      account key and `releaseStatus: "draft"`), then closed testing, then production.
    *Done:* the production .aab is on a Play testing track and installs from the Play Store on the
    test phone, signed in against hosted.
