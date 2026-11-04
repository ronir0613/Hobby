> **SUPERSEDED (2026-11-04)** by `docs/superpowers/specs/2026-11-04-lean-backend-design.md`. Kept for reference only; do not implement from this file.

# Supabase Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Each task below has a test cycle and a reviewable result.

**Goal:** Prepare the Hobby Expo app for Supabase Auth, typed database access, secure PostgreSQL/RLS and private Storage without changing the Phase 1 mobile experience.

**Architecture:** Keep local discovery independent from the optional Supabase client. Use AsyncStorage for native sessions and browser storage on web; put auth, profile, attempt RPC, and media operations in services. Version the database schema and security policies in Supabase migrations, and generate TypeScript types from that schema.

**Tech Stack:** Expo SDK 58.0.22, React Native 0.88.1, TypeScript, `@supabase/supabase-js` 2.118.0, AsyncStorage, Expo Linking/WebBrowser, Supabase CLI, PostgreSQL, pgTAP, and the existing Node `node:test` runner.

**Spec:** `docs/superpowers/specs/2026-11-03-supabase-backend-foundation-design.md`

## Global Constraints

- Use `npx expo install` for Expo/React Native dependencies; this repository uses npm and `package-lock.json`.
- Keep `@supabase/supabase-js` at 2.118.0 unless SDK compatibility checks show a required change; it was the latest published version when checked.
- Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` belong in the mobile client; never ship a service-role key.
- Missing or invalid Supabase configuration must leave the app launchable and local Discover/Explore usable.
- Native auth uses `@react-native-async-storage/async-storage`, persistent sessions, automatic refresh, and `detectSessionInUrl: false`; web uses Supabase's browser storage and URL detection.
- OAuth code exchange uses Supabase Auth's PKCE flow (`flowType: 'pkce'`); native URL detection remains disabled and the app explicitly exchanges the returned code.
- AsyncStorage is not application-level encrypted at rest. Do not add a custom SecureStore adapter.
- Use `hobby://auth/callback` for the app OAuth redirect. Provider credentials remain in Supabase/Google/Apple dashboards.
- Preserve all four Phase 1 tabs, themes, navigation, local interest data, and search/filter behavior. Do not build catalogue, attempts, check-in, journal, media-gallery, notifications, community, or auth UI.
- Every user-specific table and Storage object remains protected by RLS/Storage policies and database grants; never rely on frontend ownership checks alone.
- Do not apply migrations to a hosted Supabase project without user-configured project access and an explicit remote operation.
- Do not add Cloudflare backend services or implement Phase 2 features.

## Review Focus

1. **Missing/partial/invalid env:** no client is created, backend calls return a configuration error, and local screens still launch. Test each missing key and malformed URL.
2. **Native/web session differences:** native uses AsyncStorage and restores after restart; web uses browser storage and URL detection. Test client option selection and document that live persistence needs a configured Auth project.
3. **Local-date edges:** before planned date, future local date, invalid timezone, duplicate check-in, and failed check-in insertion must not partially activate an attempt. Pin each in the database tests.
4. **Related-row ownership and publication:** user A cannot access user B's attempt or attach child rows to it; unpublished category/interest parents hide child catalogue rows. Test with two Auth users and anonymous role.
5. **Storage partial failure:** failed removal retains metadata; an already-absent object can be verified and metadata cleanup retried safely. Test owner and non-owner paths.

---

### Task 1: Version the database schema, lifecycle rules, RLS, grants, and Storage bucket

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20261104090000_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/tests/schema_test.sql`
- Create: `supabase/tests/attempt_lifecycle_test.sql`
- Create: `supabase/tests/rls_test.sql`

**Interfaces:**
- Produces the nine public tables and the `activity-media` private bucket.
- Produces RPCs:
  - `public.record_checkin(uuid, date, text, text) -> public.checkins`
  - `public.transition_attempt(uuid, text) -> public.attempts`
  - `public.set_attempt_planned_date(uuid, date, text, boolean) -> public.attempts`
- Each RPC uses `SECURITY DEFINER`, a fixed empty `search_path`, `auth.uid()` ownership validation, and `EXECUTE` only for `authenticated`.

- [ ] **Step 1: Write schema and constraint pgTAP tests first.** Assert all nine tables/required columns, allowed attempt/check-in values, custom-title rule, one check-in per `(attempt_id, local_date)`, catalogue publication fields, notification preference uniqueness/defaults, profile creation from an inserted `auth.users` fixture through the security-definer trigger, no uniqueness constraint on `(user_id, interest_id)`, and delete rules: attempt deletion cascades check-ins/journal entries but is restricted by media metadata; account deletion cascades personal rows but is restricted by media metadata; journal deletion nulls its optional media link; catalogue deletes with dependants are restricted. Assert the exact composite parent keys: `starter_ideas(id, interest_id)`, `attempts(id, user_id)`, and `journal_entries(id, attempt_id, user_id)`.
- [ ] **Step 2: Write lifecycle pgTAP tests.** Cover planned-to-active on first `tried` and first `skipped` check-ins; `started_at`; before-plan/future/invalid-timezone rejection; rollback of both status and check-in on a failed insert; valid/invalid status transitions; active retry updating the same row to a date after the latest skipped local date while preserving all prior check-ins; two-day prompt detection for adjacent explicit skips once the later date reaches the planned date, plus missing-date, nonadjacent, different-attempt, and post-acknowledgement cases; retry acknowledgement and prevention of repeated prompts for the same pair; completed/dropped retries creating a separate attempt for the same interest while preserving terminal history; and append-only check-ins. Assert direct updates to `id`, `user_id`, `created_at`, lifecycle timestamps, `updated_at`, `status`, and `planned_for_date` are denied while `intention_note` updates succeed and trigger `updated_at`.
- [ ] **Step 3: Write RLS/grant pgTAP tests with two users.** Insert fixtures as the migration test role. For each user scenario, run assertions under `SET LOCAL ROLE authenticated` after setting both `request.jwt.claim.sub` and `request.jwt.claims` to that user's UUID and role; run catalogue-publication assertions under `SET LOCAL ROLE anon` with anonymous claims. For profiles, attempts, check-ins, journal entries, media metadata, and notification preferences, assert permitted own-row operations and that user A cannot read, mutate, delete, or attach a child record to user B's rows. Assert authenticated users cannot directly insert/delete profiles, check-in insert/update/delete is denied, and required grants are otherwise present; assert anonymous users can select only published catalogue rows, unpublished interest/category parents hide starter ideas, and mobile catalogue writes are unavailable. Call the lifecycle RPCs under the matching authenticated role and claims, including a cross-user attempt rejection.
- [ ] **Step 4: Write Storage policy pgTAP tests.** Assert the bucket is private, capped at 10 MiB, and restricted to JPEG/PNG/WebP; assert policies require an authenticated owner path and an attempt owned by that user. Do not treat pgTAP as a substitute for exercising the Storage API.
- [ ] **Step 5: Initialize Supabase CLI configuration and empty seed.** Use the CLI's `init` output for pinned Supabase CLI 3.0.0, set the project identifier, and leave `seed.sql` without catalog rows because the local data does not define reliable hobby/habit types.
- [ ] **Step 6: Run the new database tests against the empty local schema.** Run `npx --yes supabase@3.0.0 start`, then `npx --yes supabase@3.0.0 test db`; CLI 3.0.0 targets the local stack by default and remote targets require `--remote`. Confirm the tests fail for the missing schema before implementing it. If the local stack cannot start because Docker/runtime is unavailable, record the exact failure and continue with the migration while marking database execution unverified.
- [ ] **Step 7: Implement the timestamped migration.** Create all nine tables, UUID defaults, FKs, allowed-value checks, indexes, update triggers, `public.handle_new_user()` as a `SECURITY DEFINER` function with an empty fixed `search_path`, and the `on_auth_user_created` trigger on `auth.users`; insert exactly one profile for each new auth user. Add the three composite FK parent unique keys and relationships: attempts `(starter_idea_id, interest_id)` to starter ideas `(id, interest_id)` with catalogue deletes restricted; check-ins and journal entries `(attempt_id, user_id)` to attempts `(id, user_id)` with attempt deletion cascading; media assets `(attempt_id, user_id)` to attempts `(id, user_id)` with attempt deletion restricted; and media assets `(journal_entry_id, attempt_id, user_id)` to journal entries `(id, attempt_id, user_id)` using `ON DELETE SET NULL (journal_entry_id)` so only the optional journal link clears. Restrict deletion of catalogue rows with dependants, cascade Auth-user deletion through profiles/attempts/notification preferences, and restrict Auth-user deletion while media metadata exists. Include `CHECK (starter_idea_id IS NULL OR interest_id IS NOT NULL)`.
- [ ] **Step 8: Implement attempt field protections.** Set database defaults for `id`, `user_id`, `status`, and timestamps; reject changes to `id`, `user_id`, and `created_at`; allow only the documented lifecycle transitions; set lifecycle timestamps only in the transition trigger; and maintain `updated_at` in a trigger.
- [ ] **Step 9: Implement the atomic check-in RPC.** Lock and verify the owned attempt; validate the supplied IANA timezone; reject `local_date < planned_for_date` and dates after the current local date; transition planned to active before inserting either result; and rely on the transaction to roll back both writes on any error.
- [ ] **Step 10: Implement transition and planned-date RPCs.** `transition_attempt` permits only planned-to-dropped or active-to-completed/dropped. `set_attempt_planned_date` permits planned/active rows and rejects past dates. For an active attempt with skipped history, require the new date to follow the latest skipped local date; if the two-day decision is pending, require explicit acknowledgement and a date after that pair, and reject acknowledgement when no pair is pending.
- [ ] **Step 11: Implement RLS and minimum SQL grants.** Public roles get SELECT only on published catalogue rows with published-parent predicates. Personal-row policies use `auth.uid()` in both `USING` and `WITH CHECK` where applicable. Grant attempts only SELECT/DELETE, column-level INSERT for the user-editable creation fields, and column-level UPDATE for `intention_note`; grant no direct status/planned-date/timestamp update and no direct check-in insert/update/delete. Revoke public/anon function execution and grant the three RPCs to authenticated only.
- [ ] **Step 12: Create and secure `activity-media`.** Insert a private bucket capped at 10 MiB with JPEG/PNG/WebP MIME restrictions; add Storage SELECT/INSERT/DELETE policies requiring an owned attempt and exact user/attempt/file path structure.
- [ ] **Step 13: Reset the local database and run pgTAP.** Run `npx --yes supabase@3.0.0 db reset` then `npx --yes supabase@3.0.0 test db`. These CLI 3.0.0 commands target the local stack by default; do not pass `--remote`. Expected result: all schema, lifecycle, RLS/grant, profile trigger, and bucket policy tests pass. No remote push is part of this task.
- [ ] **Step 14: Exercise Storage API behavior when a local stack is available.** Using two Auth users, upload/read/sign/delete an allowed image as its owner and verify the other user is denied; verify unsupported MIME and oversized uploads fail; remove an object before retrying metadata cleanup and verify the retry is idempotent. If no local Storage API is available, report these checks as unverified rather than claiming pgTAP covered them.
- [ ] **Step 15: Commit the completed database task.** Stage only the `supabase/` files and commit with message `feat: add Supabase schema and security policies`.

### Task 2: Configure the optional Supabase client and authentication foundation

**Files:**
- Create: `src/lib/supabase/config.ts`
- Create: `src/lib/supabase/errors.ts`
- Create: `src/lib/supabase/auth.ts`
- Create: `src/lib/supabase/client.test.mjs`
- Create: `src/lib/supabase/config.test.mjs`
- Create: `src/lib/supabase/auth.test.mjs`
- Modify: `src/lib/supabase/client.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`

**Interfaces:**
- `src/lib/supabase/errors.ts` exports `type Result<T, E = BackendError> = { ok: true; value: T } | { ok: false; error: E }` and `type BackendError = { code: string; message: string; cause?: unknown }`.
- `readSupabaseConfig(env: Readonly<Record<string, string | undefined>>) -> Result<SupabaseConfig, BackendError>`
- Until CLI-generated database types exist, `getSupabaseClient() -> SupabaseClient | null`; `requireSupabaseClient() -> Result<SupabaseClient, BackendError>`. This task performs no database table queries. Task 3 replaces these annotations with `SupabaseClient<Database>` from the generated file.
- `signUpWithEmail(email: string, password: string) -> Promise<Result<{ session: Session | null; user: User | null }, BackendError>>`; `signInWithEmail(email: string, password: string) -> Promise<Result<{ session: Session | null; user: User | null }, BackendError>>`; `signOut() -> Promise<Result<void, BackendError>>`.
- `getCurrentSession() -> Promise<Result<Session | null, BackendError>>`; `restoreSession() -> Promise<Result<Session | null, BackendError>>`; `observeAuthState(callback: (session: Session | null) => void) -> { unsubscribe(): void }`.
- `signInWithOAuth(provider: 'google' | 'apple') -> Promise<Result<{ session: Session | null; user: User | null }, BackendError>>`. The client is configured with `flowType: 'pkce'`; it uses the system browser and app callback, then exchanges the returned authorization code for a session. Cancellation and provider/configuration errors remain failures.

- [ ] **Step 1: Add failing tests for configuration.** Cover missing URL, missing publishable key, malformed URL, both keys present, and rejection of service-role-shaped credentials. Confirm local discovery does not import or require these values.
- [ ] **Step 2: Add failing client tests.** Assert native config passes AsyncStorage with persistence, automatic refresh, and `detectSessionInUrl: false`; web omits native storage and leaves browser URL detection enabled; missing config returns no client; and the single native AppState listener starts/stops auto refresh on active/background transitions and is not duplicated.
- [ ] **Step 3: Add failing auth tests.** Use Node's built-in `mock.module` for the Supabase client and Expo browser/linking modules. Assert empty-config errors are explicit, auth SDK errors are propagated, session restoration returns the actual session, subscriptions unsubscribe, the client is configured for PKCE, and OAuth extracts and exchanges the returned code exactly once; cancellation/provider errors do not produce a session. When a configured native test app and Auth project are available, verify a sign-in survives app restart; otherwise explicitly mark native persistence as unverified.
- [ ] **Step 4: Install compatible packages.** Run `npx expo install @react-native-async-storage/async-storage react-native-url-polyfill expo-web-browser`. Remove `expo-secure-store` and its config plugin after confirming no remaining code uses it. Keep Supabase JS at 2.118.0.
- [ ] **Step 5: Implement configuration/error handling.** Validate the URL and publishable key; export an optional client state with a typed configuration error and never fall back to a legacy anon key or service-role key.
- [ ] **Step 6: Implement the centralized client.** Import the required URL polyfill, use AsyncStorage only on iOS/Android, default browser storage on web, set persistence/refresh and `flowType: 'pkce'` options, and register one native AppState listener to start/stop auto refresh.
- [ ] **Step 7: Implement auth methods.** Add email/password methods, current/restored session, state observation, and Google/Apple system-browser OAuth using `hobby://auth/callback`, `skipBrowserRedirect`, and one-time authorization-code exchange. Provider enablement errors remain real errors; do not add login UI.
- [ ] **Step 8: Configure module mocking, run client/auth tests, and commit.** Add Node's `--experimental-test-module-mocks` flag to the existing test command (the project requires Node `>=22.13.0`, where this built-in module mocking API is available). Run `npm test`; expected result: tests pass with no network or credentials. Commit with message `feat: configure Supabase client and auth services`.

### Task 3: Generate TypeScript database types from the migrated local schema

**Files:**
- Create: `src/types/database.types.ts` (CLI output only)
- Modify: `src/lib/supabase/client.ts` (apply generated `Database` generic)
- Modify: `src/lib/supabase/client.test.mjs` (assert typed client factory contract)
- Create: `src/lib/supabase/client.type-test.ts` (compile-time generic assignment checked by `tsc --noEmit`)

**Interfaces:**
- Exports CLI-generated `Database`, including all table rows/inserts/updates and the three RPC signatures from Task 1.
- Updates `getSupabaseClient() -> SupabaseClient<Database> | null` and `requireSupabaseClient() -> Result<SupabaseClient<Database>, BackendError>` without changing runtime behavior.

- [ ] **Step 1: Reset only the local schema.** Run `npx --yes supabase@3.0.0 db reset` so the local database matches committed migrations. CLI 3.0.0 targets local by default; no `--remote` flag or project link is used.
- [ ] **Step 2: Generate types from the local database.** Run `npx --yes supabase@3.0.0 gen types --lang typescript --schema public > src/types/database.types.ts`. CLI 3.0.0 targets local by default; never pass `--remote`. The command must fail if the local database is unavailable. Do not hand-author or edit the generated file.
- [ ] **Step 3: Check generated output and type the client.** Confirm all nine tables, nullability, composite relationships, and RPC function names/arguments are present. Add the generated `Database` generic to the centralized client. In `client.type-test.ts`, assign the returned client to `SupabaseClient<Database> | null`; verify this compile-time contract with `npx tsc --noEmit` because Node runtime tests cannot observe erased TypeScript generics. If the local stack is unavailable, mark Task 3 BLOCKED, do not fabricate the file, and hold Task 4 until local Supabase with Docker is available.
- [ ] **Step 4: Commit generated types and client typing.** Stage only the CLI-generated types and client typing changes; commit with message `chore: generate Supabase database types`.

### Task 4: Add typed profile, attempt RPC, and private media services

**Files:**
- Create: `src/services/supabase/database.ts` (aliases derived from generated `Database` types and supported media MIME union)
- Create: `src/services/supabase/profiles.ts`
- Create: `src/services/supabase/attempts.ts`
- Create: `src/services/supabase/media.ts`
- Create: `src/lib/supabase/storage.ts`
- Create: `src/services/supabase/profiles.test.mjs`
- Create: `src/services/supabase/attempts.test.mjs`
- Create: `src/lib/supabase/storage.test.mjs`
- Modify: `package.json` (include these tests in the existing Node test command)

**Interfaces:**
- `getOwnProfile() -> Promise<Result<Profile, BackendError>>`; `updateOwnProfile(input: { displayName?: string | null; avatarPath?: string | null }) -> Promise<Result<Profile, BackendError>>` use the typed client and centralized errors.
- `recordCheckin(input: { attemptId: string; localDate: string; result: 'tried' | 'skipped'; localTimezone: string }) -> Promise<Result<Checkin, BackendError>>` calls `record_checkin`.
- `transitionAttempt(attemptId: string, status: 'completed' | 'dropped') -> Promise<Result<Attempt, BackendError>>` calls `transition_attempt`.
- `setAttemptPlannedDate(input: { attemptId: string; plannedForDate: string; localTimezone: string; acknowledgeSkippedPair: boolean }) -> Promise<Result<Attempt, BackendError>>` calls `set_attempt_planned_date`.
- `src/services/supabase/database.ts` exports `Profile`, `Attempt`, `Checkin`, and `MediaAsset` as row aliases from generated `Database` types, plus `SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp'`.
- `buildActivityMediaPath(userId: string, attemptId: string, fileId: string, mimeType: SupportedImageMime) -> string` uses `.jpg` for JPEG, `.png` for PNG, and `.webp` for WebP.
- `uploadActivityMedia(input: { attemptId: string; journalEntryId?: string; data: ArrayBuffer | Uint8Array; mimeType: SupportedImageMime }) -> Promise<Result<MediaAsset, BackendError>>` validates the actual byte length against 10 MiB, uploads the byte buffer, and then creates metadata. React Native upload data must be an ArrayBuffer/typed array, not Blob/FormData.
- `getSignedMediaUrl(path: string) -> Promise<Result<{ signedUrl: string; expiresAt: string }, BackendError>>` returns a temporary URL with a 300-second lifetime only.
- `deleteActivityMedia(metadataId: string) -> Promise<Result<void, BackendError>>` removes Storage first and performs idempotent metadata cleanup. If object removal succeeded but metadata deletion failed, it returns a distinguishable `BackendError` code `MEDIA_METADATA_CLEANUP_PENDING`; metadata remains so the caller can safely retry.

- [ ] **Step 1: Add failing profile and attempt service tests.** Cover missing client errors, propagated database errors, typed profile update input, RPC argument mapping, and no duplicate attempt creation on active retry.
- [ ] **Step 2: Add failing media tests.** Cover UUID path format, actual byte length at/over the 10 MiB limit, unsupported HEIC rejection, metadata insert only after successful upload, cleanup after metadata failure, signed URL creation, failed Storage delete preserving metadata, object removal followed by metadata-delete failure returning `MEDIA_METADATA_CLEANUP_PENDING` while retaining metadata, and already-absent object cleanup retry. For `StorageFileApi.exists`, distinguish the expected owner-scoped missing-object response (`data: false` with an HTTP 400/404 Storage error after ownership/path validation) from authorization, malformed-path, transport, and server errors; only the former may permit metadata cleanup.
- [ ] **Step 3: Implement profile and attempt services.** Keep queries out of UI; map service calls to Task 1 RPCs without duplicating ownership logic.
- [ ] **Step 4: Implement Storage helpers.** Generate `<user>/<attempt>/<file>.<extension>`, upload supported image bytes, create metadata after upload, request 300-second signed URLs, and delete the object before metadata. Read the metadata row under RLS and validate the path matches its authenticated owner and attempt before calling `supabase.storage.from('activity-media').exists(path)`. Treat only the documented `data: false` 400/404 response as absence; propagate malformed-path, authorization, transport, and server failures without deleting metadata. Return `MEDIA_METADATA_CLEANUP_PENDING` when the object is gone but metadata deletion fails; retain metadata for a safe retry.
- [ ] **Step 5: Run the focused tests and full Node suite.** Run `npm test`. Expected result: new tests and both existing Phase 1 regression tests pass.
- [ ] **Step 6: Commit service modules.** Stage only service/helper/test files and commit with message `feat: add typed Supabase data services`.

### Task 5: Document setup and run repository verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `.gitignore` only if inspection finds `.env` is not already ignored
- Modify: `package.json` if final scripts need CLI/test updates

**Interfaces:**
- README explains the implemented local foundation, environment-dependent client, dashboard-dependent OAuth, and unverified remote state.

- [ ] **Step 1: Update `.env.example`.** Include only placeholder `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; confirm `.env` remains ignored.
- [ ] **Step 2: Update README setup instructions.** Cover project creation, URL/publishable key, local CLI, `supabase start` / `db reset` / `test db`, type generation, migration push workflow (remote only when configured), private bucket/policies, email/Google/Apple dashboard setup, redirect URLs, and running the app. Separate implemented code, local setup, dashboard work, and live verification.
- [ ] **Step 3: Run unit/regression checks.** Run `npm test`, `npx tsc --noEmit`, and `npm run lint`. Expected: all pass.
- [ ] **Step 4: Run Expo compatibility checks.** Run `npx expo install --check`, `npx expo-doctor`, and `npx expo export -p android`. Record each exact result.
- [ ] **Step 5: Run local Supabase checks if the stack is available.** Run the pinned CLI 3.0.0 commands `npx --yes supabase@3.0.0 db reset`, `npx --yes supabase@3.0.0 test db`, and `npx --yes supabase@3.0.0 gen types --lang typescript --schema public`. CLI 3.0.0 help confirms each command targets local by default; none may include `--remote`. If this Windows environment has no usable Docker or local runtime, list migration/RLS/Storage execution and generated types as blocked; do not claim remote success or invent types.
- [ ] **Step 6: Confirm scope and commit docs.** Verify `git diff` shows no changes to screens, navigation, theme, or local catalogue. Commit README and `.env.example` changes with message `docs: document Supabase backend setup`.

## Execution Notes

- Current inspection found no Supabase CLI executable, Docker executable, local Supabase project, or configured remote credentials. Supabase CLI 3.0.0 runs transiently via `npx` without changing project dependencies; its help confirms database commands target local by default and accept `--remote` only when explicitly supplied. WSL is not installed and the current account is not an administrator, so do not attempt machine-level Docker/WSL installation. If the local stack is unavailable, finish independent client/auth work, mark Task 3 and dependent Task 4 BLOCKED, and report that Docker-backed local Supabase is required. Do not fabricate generated types or claim live RLS/Storage verification.
- The established Phase 1 app remains local-first throughout the plan; no existing screen imports the optional client.
