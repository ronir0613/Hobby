# Hobby

A lightweight Expo app for finding gentle, beginner-friendly hobby ideas.

## Run locally

```sh
npm install
npm start
```

For an Android emulator or connected device, use `npm run android`. Expo SDK 58 requires Node.js 22.13 or newer.

## Phase 1 notes

- Discover, Explore, Media, and Profile are local-first layouts. Explore's nine starter interests are in `src/data/interest-catalog.ts`; they are not fetched from a backend.
- Search and category filters are held in a small Zustand store. Media saving and profile/auth flows are intentionally placeholders for later phases.
- Supabase client setup is in `src/lib/supabase/client.ts`. Copy `.env.example` to `.env` and add a project URL and public anon key when a Supabase project is ready. Do not add a service-role key to this client app.
- The Supabase client stays uninitialized on web because this scaffold uses native secure storage for session persistence.
- Theme tokens live in `src/theme/tokens.json` and are shared with Tailwind. NativeWind is configured in `babel.config.js`, `metro.config.js`, `tailwind.config.js`, and `global.css`.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npx expo-doctor
```
